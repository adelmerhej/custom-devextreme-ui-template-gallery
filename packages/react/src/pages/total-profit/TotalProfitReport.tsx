/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF as JsPdf } from 'jspdf';
import { saveAs } from 'file-saver-es';
import { Workbook } from 'exceljs';

// Importing data fetching function
import { fetchTotalProfits } from '../../api/dx-xolog-data/admin/reports/total-profit/totalProfitApiClient';

// Import auth context for token access
import { useAuth } from '../../contexts/auth';

import {
  DataGrid,
  DataGridRef,
  Sorting,
  Selection,
  HeaderFilter,
  Scrolling,
  SearchPanel,
  ColumnChooser,
  Export,
  Column,
  Toolbar,
  Item,
  LoadPanel,
  DataGridTypes,
  Paging,
  Pager,
  Grouping,
  GroupPanel,
  Summary,
  GroupItem,
  SortByGroupSummaryInfo,
} from 'devextreme-react/data-grid';

import SelectBox from 'devextreme-react/select-box';
import TextBox from 'devextreme-react/text-box';
import Button from 'devextreme-react/button';
import DropDownButton, {
  DropDownButtonTypes,
} from 'devextreme-react/drop-down-button';

import { exportDataGrid as exportDataGridToPdf } from 'devextreme/pdf_exporter';
import { exportDataGrid as exportDataGridToXLSX } from 'devextreme/excel_exporter';

import {
  JobStatus as ContactStatusType,
  ITotalProfit,
} from '@/types/totalProfit';

import { FormPopup, ContactNewForm, ContactPanel } from '../../components';
import { ContactStatus } from '../../components';

import { JOB_STATUS, newJob } from '../../shared/constants';
import DataSource from 'devextreme/data/data_source';
import notify from 'devextreme/ui/notify';

type FilterContactStatus = ContactStatusType | 'All';

const filterStatusList = ['All', ...JOB_STATUS];

const cellNameRender = (cell: DataGridTypes.ColumnCellTemplateData) => (
  <div className='name-template'>
    <div>{cell.data.CustomerName}</div>
    <div className='position'>{cell.data.ConsigneeName}</div>
  </div>
);

const editCellStatusRender = () => (
  <SelectBox
    className='cell-info'
    dataSource={JOB_STATUS}
    itemRender={ContactStatus}
    fieldRender={fieldRender}
  />
);

const cellProfitRender = (cell: DataGridTypes.ColumnCellTemplateData) => (
  <span>${cell.data.TotalProfit?.toFixed(2) || '0.00'}</span>
);

const cellDateRender = (
  cell: DataGridTypes.ColumnCellTemplateData,
  field: string
) => {
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
      doc.save('TotalProfit.pdf');
    });
  } else {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('TotalProfit');

    exportDataGridToXLSX({
      component: e.component,
      worksheet,
      autoFilterEnabled: true,
    }).then(() => {
      workbook.xlsx.writeBuffer().then((buffer) => {
        saveAs(
          new Blob([buffer], { type: 'application/octet-stream' }),
          'TotalProfit.xlsx'
        );
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

export const TotalProfitReport = () => {
  // Get auth context for token access (when auth system includes tokens)
  const { user } = useAuth();

  const [gridDataSource, setGridDataSource] =
    useState<DataSource<ITotalProfit[], string>>();
  const [isPanelOpened, setPanelOpened] = useState(false);
  const [contactId, setContactId] = useState<number>(0);
  const [popupVisible, setPopupVisible] = useState(false);
  const [formDataDefaults, setFormDataDefaults] = useState({ ...newJob });
  const gridRef = useRef<DataGridRef>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [totalProfit, setTotalProfit] = useState<number>(0);

  let newContactData: ITotalProfit;

  // Helper function to get auth token (placeholder for when auth system includes tokens)
  const getAuthToken = useCallback(() => {
    // When your auth system includes tokens, you would get it like:
    // return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    // For now, return undefined since the current auth system doesn't use tokens
    return undefined;
  }, []);

  // Helper function to load data with current parameters
  const loadTotalProfitsData = useCallback(() => {
    return fetchTotalProfits({
      page: 1,
      limit: 100,
    });
  }, [getAuthToken]);

  useEffect(() => {
    setGridDataSource(
      new DataSource({
        key: '_id',
        load: loadTotalProfitsData,
      })
    );
  }, [loadTotalProfitsData]);

  // Calculate total profit when grid data changes
  useEffect(() => {
    if (gridDataSource) {
      gridDataSource.load().then((data: ITotalProfit[]) => {
        const total = data.reduce((sum, item) => sum + (item.TotalProfit || 0), 0);
        setTotalProfit(total);
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

  // Function to update grid dimensions on window resize
  // Function to sync data on button click
  const syncDataOnClick = useCallback(async() => {
    setError(null);

    try {
      console.log('Syncing...', new Date().toLocaleTimeString());

      const response = await fetch('/api/sync/reports/all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      //setPopupVisible(true);

      // Refresh data with current parameters
      setGridDataSource(
        new DataSource({
          key: '_id',
          load: loadTotalProfitsData,
        })
      );

      gridRef.current?.instance().refresh();
    } catch (err: unknown) {
      console.log('This error: ', err);
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred'
      );
    } finally {
      setIsSyncing(false);
    }
  }, [loadTotalProfitsData]);

  // Function to handle row click
  const onRowClick = useCallback(({ data }: DataGridTypes.RowClickEvent) => {
    setContactId(data._id);
    setPanelOpened(true);
  }, []);

  const [status, setStatus] = useState(filterStatusList[0]);

  const filterByStatus = useCallback(
    (e: DropDownButtonTypes.SelectionChangedEvent) => {
      const { item: status }: { item: FilterContactStatus } = e;
      if (status === 'All') {
        gridRef.current?.instance().clearFilter();
      } else {
        gridRef.current?.instance().filter(['StatusType', '=', status]);
      }

      setStatus(status);
    },
    []
  );

  // Function to update grid dimensions on window resize
  // Function to refresh the grid
  const refresh = useCallback(() => {
    gridRef.current?.instance().refresh();
  }, []);

  const onDataChanged = useCallback((data) => {
    newContactData = data;
  }, []);

  const onSaveClick = useCallback(() => {
    notify(
      {
        message: `New record "${newContactData.JobNo} - ${newContactData.CustomerName}" saved`,
        position: { at: 'bottom center', my: 'bottom center' },
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
              <div className='grid-header'>Total Profit Report</div>
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
            dataType='string'
            sortOrder='asc'
            hidingPriority={5}
          />
          <Column
            dataField='JobDate'
            caption='Job Date'
            dataType='date'
            hidingPriority={5}
            minWidth={150}
          />
          <Column
            dataField='CustomerName'
            caption='Customer'
            hidingPriority={5}
            dataType='string'
            minWidth={150}
            cellRender={cellNameRender}
          />
          <Column
            dataField='Eta'
            caption='ETA'
            dataType='date'
            hidingPriority={3}
          />
          <Column
            dataField='Ata'
            caption='ATA'
            dataType='date'
            hidingPriority={3}
          />
          <Column
            dataField='Arrival'
            caption='Arrival'
            dataType='date'
            hidingPriority={3}
          />
          <Column
            dataField='TotalProfit'
            caption='Total Profit'
            dataType='number'
            hidingPriority={5}
            cellRender={cellProfitRender}
            format='currency'
          />
          <Column
            dataField='StatusType'
            caption='Status Type'
            hidingPriority={1}
          />
          <Column
            dataField='DepartmentName'
            caption='Department Name'
            hidingPriority={1}
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

        <ContactPanel
          contactId={contactId}
          isOpened={isPanelOpened}
          changePanelOpened={changePanelOpened}
          changePanelPinned={changePanelPinned}
        />
        <FormPopup
          title='New Contact'
          visible={popupVisible}
          setVisible={changePopupVisibility}
          onSave={onSaveClick}
        >
          {/* <ContactNewForm initData={ formDataDefaults } onDataChanged={onDataChanged} /> */}
        </FormPopup>
      </div>
    </div>
  );
};
