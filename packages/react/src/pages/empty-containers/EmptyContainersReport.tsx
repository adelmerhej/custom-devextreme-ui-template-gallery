/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF as JsPdf } from 'jspdf';
import { saveAs } from 'file-saver-es';
import { Workbook } from 'exceljs';

// Importing data fetching function
import { fetchEmptyContainers } from '../../api/dx-xolog-data/admin/reports/empty-container/emptyContainerApiClient';

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
  IEmptyContainer, JobStatus, StatusList, JobStatusDepartments } from '@/types/emptyContainer';

import { FormPopup, ContactNewForm, ContactPanel } from '../../components';

import { JOB_STATUS, JOB_STATUS_DEPARTMENTS, newJob } from '../../shared/constants';
import DataSource from 'devextreme/data/data_source';
import notify from 'devextreme/ui/notify';

type FilterByDepartment = JobStatusDepartments | 'All';

const filterDepartmentList = ['All', ...JOB_STATUS_DEPARTMENTS];

const cellNameRender = (cell: DataGridTypes.ColumnCellTemplateData) => (
  <div className='name-template'>
    <div>{cell.data.CustomerName}</div>
    <div className='position'>{cell.data.ConsigneeName}</div>
  </div>
);

const cellProfitRender = (cell: DataGridTypes.ColumnCellTemplateData) => {
  const profit = cell.data.TotalProfit || 0;
  return <span>${profit.toFixed(2)}</span>;
};

const cellDateRender = (cell: DataGridTypes.ColumnCellTemplateData, field: string) => {
  const date = cell.data[field];
  return date ? new Date(date).toLocaleDateString() : '';
};

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

export const EmptyContainersReport = () => {
  // Get auth context for token access (when auth system includes tokens)
  const { user } = useAuth();

  const [gridDataSource, setGridDataSource] = useState<DataSource<IEmptyContainer[], string>>();
  const [isPanelOpened, setPanelOpened] = useState(false);
  const [contactId, setContactId] = useState<number>(0);
  const [popupVisible, setPopupVisible] = useState(false);
  const [formDataDefaults, setFormDataDefaults] = useState({ ...newJob });
  const gridRef = useRef<DataGridRef>(null);
  const [totalProfit, setTotalProfit] = useState<number>(0);

  let newContactData: IEmptyContainer;

  // Helper function to get auth token (placeholder for when auth system includes tokens)
  const getAuthToken = useCallback(() => {
    // When your auth system includes tokens, you would get it like:
    // return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    // For now, return undefined since the current auth system doesn't use tokens
    return undefined;
  }, []);

  // Helper function to load data with current parameters
  const loadEmptyContainersData = useCallback(() => {
    return fetchEmptyContainers({
      page: 1,
      limit: 100,
      // status: 'Active', // Optional: filter by status
      // TotalProfit: 0, // Optional: minimum profit filter
    });
  }, [getAuthToken]);

  useEffect(() => {
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadEmptyContainersData,
    }));
  }, [loadEmptyContainersData]);

  // Calculate total profit when grid data changes
  useEffect(() => {
    if (gridDataSource) {
      gridDataSource.load().then((data: IEmptyContainer[]) => {
        const total = data.reduce((sum, item) => {
          const profit = item.TotalProfit || 0;
          return sum + profit;
        }, 0);
        console.log('Total Profit:', total);
        console.log('Sample data items:', data.slice(0, 3).map(item => ({
          JobNo: item.JobNo,
          TotalProfit: item.TotalProfit
        })));
        setTotalProfit(total);
      });
    }
  }, [gridDataSource]);

  const syncDataOnClick = useCallback(() => {
    //setPopupVisible(true);
    setFormDataDefaults({ ...newJob });

    // Refresh data with current parameters
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadEmptyContainersData,
    }));

    gridRef.current?.instance().refresh();
  }, [loadEmptyContainersData]);

  const onRowClick = useCallback(({ data }: DataGridTypes.RowClickEvent) => {
    setContactId(data._id);
    setPanelOpened(true);
  }, []);

  // Highlight rows based on specific conditions
  const onRowPrepared = useCallback((e: DataGridTypes.RowPreparedEvent) => {
    if (e.rowType === 'data') {
      const { ArrivalDays, TejrimDays, DiffCntrToCnee } = e.data;

      // Check if ArrivalDays > 0 and TejrimDays = 0 and DiffCntrToCnee = 0
      if (ArrivalDays > 0 && TejrimDays === 0 && DiffCntrToCnee === 0) {
        e.rowElement.style.backgroundColor = '#E3F2FD';
      }
    }
  }, []);

  const [status, setStatus] = useState(filterDepartmentList[0]);

  const filterByDepartment = useCallback((e: DropDownButtonTypes.SelectionChangedEvent) => {
    const { item: status }: { item: FilterByDepartment } = e;
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
      message: `New record "${newContactData.JobNo} - ${newContactData.CustomerName}" saved`,
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
          onRowPrepared={onRowPrepared}
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
              <div className='grid-header'>Empty Container Report</div>
            </Item>
            <Item location='after'>
              <div className='total-profit-display'>Total Profit: ${formatCurrency(totalProfit)} &nbsp;&nbsp;&nbsp;&nbsp;</div>
            </Item>
            <Item location='before' locateInMenu='auto'>
              <DropDownButton
                items={filterDepartmentList}
                stylingMode='text'
                text={status}
                dropDownOptions={dropDownOptions}
                useSelectMode
                onSelectionChanged={filterByDepartment}
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
            width={100}
            sortOrder='asc'
            sortIndex={1}
          />
          <Column
            dataField='JobDate'
            caption='Job Date'
            dataType='date'
            width={100}
            visible={false}
            cellRender={(cell) => cellDateRender(cell, 'JobDate')}
          />
          <Column
            dataField='ReferenceNo'
            caption='XONO'
            dataType='string'
            width={100}
            visible={false}
          />
          <Column
            dataField='CustomerName'
            caption='Customer'
            dataType='string'
            width={250}
            cellRender={cellNameRender}
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
            width={100}
            visible={false}
          />
          <Column
            dataField='TejrimDate'
            caption='Tejrim Date'
            dataType='date'
            width={150}
          />
          <Column
            dataField='dtCntrToCnee'
            caption='Cntr To Cnee'
            dataType='date'
            width={100}
            cellRender={(cell) => cellDateRender(cell, 'dtCntrToCnee')}
          />
          <Column
            dataField='ArrivalDays'
            caption='Arrival Days'
            width={100}
          />
          <Column
            dataField='TejrimDays'
            caption='Tejrim Days'
            width={100}
          />
          <Column
            dataField='DiffCntrToCnee'
            caption='Cntr to Cnee'
            width={100}
          />
          <Column
            dataField='TotalProfit'
            caption='Total Profit'
            dataType='number'
            cellRender={cellProfitRender}
            format='currency'
          />
          <Column
            dataField='ContainerNo'
            caption='Container#'
            visible={false}
          />
          <Column
            dataField='CarrierName'
            caption='Carrier Name'
            visible={false}
          />
          <Column
            dataField='UserName'
            caption='User Name'
            visible={false}
          />
          <Column
            dataField='Notes'
            caption='Notes'
            visible={false}
          />
          <Column
            dataField='Departure'
            caption='Departure'
            visible={false}
          />
          <Column
            dataField='Destination'
            caption='Destination'
            visible={false}
          />
          <Column
            dataField='FullPaid'
            caption='FullPaid'
            visible={false}
          />
          <Column
            dataField='PaidDO'
            caption='Paid D/O'
            visible={false}
          />
          <Column
            dataField='Mbol'
            caption='MBL'
            visible={false}
          />
          <Column
            dataField='DepartmentName'
            caption='Department'
            visible={false}
            groupIndex={0}
            sortOrder='desc'
            sortIndex={0}
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
              displayFormat='Total: $ {0}'
              showInGroupFooter
            />
          </Summary>
          <SortByGroupSummaryInfo summaryItem='count' />
        </DataGrid>
        {/* <ContactPanel contactId={contactId} isOpened={isPanelOpened} changePanelOpened={changePanelOpened} changePanelPinned={changePanelPinned} /> */}
      </div>
    </div>
  );
};
