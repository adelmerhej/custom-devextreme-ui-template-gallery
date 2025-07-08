/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF as JsPdf } from 'jspdf';
import { saveAs } from 'file-saver-es';
import { Workbook } from 'exceljs';

// Importing data fetching function
import { fetchClientInvoices } from '../../api/dx-xolog-data/admin/reports/client-invoice/clientInvoiceApiClient';

// Import auth context for token access
import { useAuth } from '../../contexts/auth';

import {
  DataGrid, DataGridRef,
  Sorting, Selection, HeaderFilter, Scrolling, SearchPanel,
  ColumnChooser, Export, Column, Toolbar, Item, LoadPanel,
  DataGridTypes, Paging, Pager, Grouping, GroupPanel,
  Summary,
  GroupItem,
  SortByGroupSummaryInfo
} from 'devextreme-react/data-grid';

import SelectBox from 'devextreme-react/select-box';
import TextBox from 'devextreme-react/text-box';
import Button from 'devextreme-react/button';
import DropDownButton, { DropDownButtonTypes } from 'devextreme-react/drop-down-button';

import { exportDataGrid as exportDataGridToPdf } from 'devextreme/pdf_exporter';
import { exportDataGrid as exportDataGridToXLSX } from 'devextreme/excel_exporter';

import { JobStatusPayment as JobStatusPaymentType,
  IClientInvoice, JobStatus, StatusList, JobStatusDepartments } from '@/types/clientInvoice';

import { FormPopup, ContactNewForm, ContactPanel } from '../../components';
import { ContactStatus } from '../../components';

import { JOB_STATUS, newJob } from '../../shared/constants';
import DataSource from 'devextreme/data/data_source';
import notify from 'devextreme/ui/notify';

type FilterContactStatus = JobStatusPaymentType | 'All';

const filterStatusList = ['All', ...JOB_STATUS];

const cellNameRender = (cell: DataGridTypes.ColumnCellTemplateData) => (
  <div className='name-template'>
    <div>{cell.data.Customer}</div>
    <div className='position'>{cell.data.Consignee}</div>
  </div>
);

const editCellStatusRender = () => (
  <SelectBox className='cell-info' dataSource={JOB_STATUS} itemRender={ContactStatus} fieldRender={fieldRender} />
);

const cellProfitRender = (cell: DataGridTypes.ColumnCellTemplateData) => (
  <span>${cell.data.TotalProfit?.toFixed(2) || '0.00'}</span>
);

const cellDateRender = (cell: DataGridTypes.ColumnCellTemplateData, field: string) => {
  const date = cell.data[field];
  return date ? new Date(date).toLocaleDateString() : '';
};

const fieldRender = (text: string) => (
  <>
    <ContactStatus text={text} />
    <TextBox readOnly />
  </>
);

const onExporting = (e: DataGridTypes.ExportingEvent) => {
  if (e.format === 'pdf') {
    const doc = new JsPdf();
    exportDataGridToPdf({
      jsPDFDocument: doc,
      component: e.component,
    }).then(() => {
      doc.save('EmptyContainer.pdf');
    });
  } else {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('EmptyContainer');

    exportDataGridToXLSX({
      component: e.component,
      worksheet,
      autoFilterEnabled: true,
    }).then(() => {
      workbook.xlsx.writeBuffer().then((buffer) => {
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'EmptyContainer.xlsx');
      });
    });
    e.cancel = true;
  }
};

const dropDownOptions = { width: 'auto' };
const exportFormats = ['xlsx', 'pdf'];

// Helper function to format number with thousand separators
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const ClientInvoicesReport = () => {
  // Get auth context for token access (when auth system includes tokens)
  const { user } = useAuth();

  const [gridDataSource, setGridDataSource] = useState<DataSource<IClientInvoice[], string>>();
  const [isPanelOpened, setPanelOpened] = useState(false);
  const [contactId, setContactId] = useState<number>(0);
  const [popupVisible, setPopupVisible] = useState(false);
  const [formDataDefaults, setFormDataDefaults] = useState({ ...newJob });
  const gridRef = useRef<DataGridRef>(null);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [totalInvoice, setTotalInvoice] = useState<number>(0);

  let newContactData: IClientInvoice;

  // Helper function to get auth token (placeholder for when auth system includes tokens)
  const getAuthToken = useCallback(() => {
    // When your auth system includes tokens, you would get it like:
    // return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    // For now, return undefined since the current auth system doesn't use tokens
    return undefined;
  }, []);

  // Helper function to load data with current parameters
  const loadClientInvoicesData = useCallback(() => {
    return fetchClientInvoices({
      page: 1,
      limit: 100,
    });
  }, [getAuthToken]);

  useEffect(() => {
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadClientInvoicesData,
    }));
  }, [loadClientInvoicesData]);

  // Calculate total profit when grid data changes
  useEffect(() => {
    if (gridDataSource) {
      gridDataSource.load().then((data: IClientInvoice[]) => {
        const totalInvoice = data.reduce((sum, item) => sum + (item.TotalInvoices || 0), 0);
        const totalProfit = data.reduce((sum, item) => sum + (item.TotalProfit || 0), 0);
        setTotalInvoice(totalInvoice);
        setTotalProfit(totalProfit);
      });
    }
  }, [gridDataSource]);

  const changePopupVisibility = useCallback((isVisble) => {
    setPopupVisible(isVisble);
  }, []);

  const changePanelOpened = useCallback(() => {
    setPanelOpened(!isPanelOpened);
    gridRef.current?.instance().option('focusedRowIndex', -1);
  }, [isPanelOpened]);

  const changePanelPinned = useCallback(() => {
    gridRef.current?.instance().updateDimensions();
  }, []);

  const syncDataOnClick = useCallback(() => {
    //setPopupVisible(true);
    setFormDataDefaults({ ...newJob });

    // Refresh data with current parameters
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadClientInvoicesData,
    }));

    gridRef.current?.instance().refresh();
  }, [loadClientInvoicesData]);

  const onRowClick = useCallback(({ data }: DataGridTypes.RowClickEvent) => {
    setContactId(data._id);
    setPanelOpened(true);
  }, []);

  const [status, setStatus] = useState(filterStatusList[0]);

  const filterByStatus = useCallback((e: DropDownButtonTypes.SelectionChangedEvent) => {
    const { item: status }: { item: FilterContactStatus } = e;
    if (status === 'All') {
      gridRef.current?.instance().clearFilter();
    } else {
      gridRef.current?.instance().filter(['StatusType', '=', status]);
    }

    setStatus(status);
  }, []);

  const refresh = useCallback(() => {
    gridRef.current?.instance().refresh();
  }, []);

  const onDataChanged = useCallback((data) => {
    newContactData = data;
  }, []);

  const onSaveClick = useCallback(() => {
    notify({
      message: `New record "${newContactData.JobNo} - ${newContactData.Customer}" saved`,
      position: { at: 'bottom center', my: 'bottom center' }
    },
    'success'
    );

    setFormDataDefaults({ ...formDataDefaults });
    setPopupVisible(false);
  }, []);

  return (
    <div className='view crm-contact-list'>
      <div className='view-wrapper view-wrapper-contact-list list-page'>
        <DataGrid
          className='grid theme-dependent'
          noDataText=''
          focusedRowEnabled
          height='100%'
          dataSource={gridDataSource}
          onRowClick={onRowClick}
          onExporting={onExporting}
          allowColumnReordering
          showBorders
          ref={gridRef}
          filterRow={{ visible: true, applyFilter: 'auto' }}
          pager={{
            showPageSizeSelector: true,
            allowedPageSizes: [100, 200, 1000, 0],
            showInfo: true,
            visible: true,
          }}
        >
          <Grouping contextMenuEnabled />
          <GroupPanel visible /> {/* or "auto" */}
          <Paging defaultPageSize={100} />
          <Pager visible showPageSizeSelector />
          <LoadPanel showPane={false} />
          <SearchPanel visible placeholder='Contact Search' />
          <ColumnChooser enabled />
          <Export enabled allowExportSelectedData formats={exportFormats} />
          <Selection
            selectAllMode='allPages'
            showCheckBoxesMode='always'
            mode='multiple'
          />
          <HeaderFilter visible />
          <Sorting mode='multiple' />
          <Scrolling mode='virtual' />
          <Toolbar>
            <Item location='before'>
              <div className='grid-header'>Client Invoices Report</div>
            </Item>
            <Item location='after'>
              <div className='total-profit-display'>Total Invoices: ${formatCurrency(totalInvoice)} &nbsp;&nbsp;&nbsp;&nbsp;</div>
            </Item>
            <Item location='after'>
              <div className='total-profit-display'>Total Profit: ${formatCurrency(totalProfit)} &nbsp;&nbsp;&nbsp;&nbsp;</div>
            </Item>
            <Item location='before' locateInMenu='auto'>
              <DropDownButton
                items={filterStatusList}
                stylingMode='text'
                text={status}
                dropDownOptions={dropDownOptions}
                useSelectMode
                onSelectionChanged={filterByStatus}
              />
            </Item>
            <Item location='after' locateInMenu='auto'>
              <Button
                icon='plus'
                text='Sync data'
                type='default'
                stylingMode='contained'
                onClick={syncDataOnClick}
              />
            </Item>
            <Item
              location='after'
              locateInMenu='auto'
              showText='inMenu'
              widget='dxButton'
            >
              <Button
                icon='refresh'
                text='Refresh'
                stylingMode='text'
                onClick={refresh}
              />
            </Item>
            <Item location='after' locateInMenu='auto'>
              <div className='separator' />
            </Item>
            <Item name='exportButton' />
            <Item location='after' locateInMenu='auto'>
              <div className='separator' />
            </Item>
            <Item name='columnChooserButton' locateInMenu='auto' />
            <Item name='searchPanel' locateInMenu='auto' />
          </Toolbar>
          <Column
            dataField='JobNo'
            caption='Job#'
            dataType='number'
            alignment='left'
            sortOrder='asc'
            width={100}
          />
          <Column
            dataField='QuotationNo'
            caption='XONO'
            width={150}
          />
          <Column
            dataField='InvoiceNo'
            caption='Invoice#'
            width={100}
          />
          <Column
            dataField='DueDate'
            caption='Due Date'
            dataType='date'
            width={100}
          />
          <Column
            dataField='POL'
            caption='POL'
            width={100}
          />
          <Column
            dataField='POD'
            caption='POD#'
            width={100}
          />
          <Column
            dataField='Customer'
            caption='Customer'
            dataType='string'
            width={150}
            cellRender={cellNameRender}
          />
          <Column
            dataField='Etd'
            caption='ETD'
            dataType='date'
            width={100}
          />
          <Column
            dataField='Eta'
            caption='ETA'
            dataType='date'
            width={100}
          />
          <Column
            dataField='Atd'
            caption='ATD'
            dataType='date'
            width={100}
          />
          <Column
            dataField='Ata'
            caption='ATA'
            dataType='date'
            width={100}
          />
          <Column
            dataField='StatusType'
            caption='Status Type'
          />
          <Column
            dataField='TotalInvoiceAmount'
            caption='Total Invoices'
            dataType='number'
            cellRender={cellProfitRender}
            format='currency'
            width={150}
          />
          <Column
            dataField='TotalProfit'
            caption='Total Profit'
            dataType='number'
            cellRender={cellProfitRender}
            format='currency'
            width={100}
            visible={false}
          />
          <Column
            dataField='DepartmentName'
            caption='Department'
            width={100}
            visible={false}
          />
          <Column
            dataField='Mbol'
            caption='MBL'
            width={100}
            visible={false}
          />
          <Column
            dataField='Volume'
            caption='Volume'
            width={100}
            visible={false}
          />
          <Column
            dataField='Consignee'
            caption='Consignee'
            width={100}
            visible={false}
          />
          <Column
            dataField='Status'
            caption='Status'
            width={150}
            visible={false}
          />
          <Summary>
            <GroupItem
              column='TotalProfit'
              summaryType='count'
              displayFormat='{0} orders'
            />
            <GroupItem
              column='TotalProfit'
              summaryType='sum'
              displayFormat='Total: {0}'
              showInGroupFooter
            />
          </Summary>
          <SortByGroupSummaryInfo summaryItem='count' />
        </DataGrid>
        <ContactPanel contactId={contactId} isOpened={isPanelOpened} changePanelOpened={changePanelOpened} changePanelPinned={changePanelPinned} />
        <FormPopup title='New Contact' visible={popupVisible} setVisible={changePopupVisibility} onSave={onSaveClick}>
          {/* <ContactNewForm initData={ formDataDefaults } onDataChanged={onDataChanged} /> */}
        </FormPopup>
      </div>
    </div>
  );
};
