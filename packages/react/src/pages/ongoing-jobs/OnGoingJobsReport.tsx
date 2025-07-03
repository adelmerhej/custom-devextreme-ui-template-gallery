/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF as JsPdf } from 'jspdf';
import { saveAs } from 'file-saver-es';
import { Workbook } from 'exceljs';

// Importing data fetching function
import { fetchOngoingJobs } from '../../api/dx-xolog-data/admin/reports/on-going/ongoingJobApiClient';

// Import auth context for token access
import { useAuth } from '../../contexts/auth';

import {
  DataGrid, DataGridRef,
  Sorting, Selection, HeaderFilter, Scrolling, SearchPanel,
  ColumnChooser, Export, Column, Toolbar, Item, LoadPanel,
  DataGridTypes, Paging, Pager, Grouping, GroupPanel
} from 'devextreme-react/data-grid';

import SelectBox from 'devextreme-react/select-box';
import TextBox from 'devextreme-react/text-box';
import Button from 'devextreme-react/button';
import DropDownButton, { DropDownButtonTypes } from 'devextreme-react/drop-down-button';

import { exportDataGrid as exportDataGridToPdf } from 'devextreme/pdf_exporter';
import { exportDataGrid as exportDataGridToXLSX } from 'devextreme/excel_exporter';

import { ContactStatus as ContactStatusType, IOngoingJob } from '@/types/ongoingJob';

import { FormPopup, ContactNewForm, ContactPanel } from '../../components';
import { ContactStatus } from '../../components';

import { CONTACT_STATUS_LIST, newContact } from '../../shared/constants';
import DataSource from 'devextreme/data/data_source';
import notify from 'devextreme/ui/notify';

type FilterContactStatus = ContactStatusType | 'All';

const filterStatusList = ['All', ...CONTACT_STATUS_LIST];

const cellNameRender = (cell: DataGridTypes.ColumnCellTemplateData) => (
  <div className='name-template'>
    <div>{cell.data.CustomerName}</div>
    <div className='position'>{cell.data.ConsigneeName}</div>
  </div>
);

const editCellStatusRender = () => (
  <SelectBox className='cell-info' dataSource={CONTACT_STATUS_LIST} itemRender={ContactStatus} fieldRender={fieldRender} />
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
      doc.save('OngoingJobsReport.pdf');
    });
  } else {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('OngoingJobsReport');

    exportDataGridToXLSX({
      component: e.component,
      worksheet,
      autoFilterEnabled: true,
    }).then(() => {
      workbook.xlsx.writeBuffer().then((buffer) => {
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'OngoingJobsReport.xlsx');
      });
    });
    e.cancel = true;
  }
};

const dropDownOptions = { width: 'auto' };
const exportFormats = ['xlsx', 'pdf'];

export const OngoingJobsReport = () => {
  // Get auth context for token access (when auth system includes tokens)
  const { user } = useAuth();

  const [gridDataSource, setGridDataSource] = useState<DataSource<IOngoingJob[], string>>();
  const [isPanelOpened, setPanelOpened] = useState(false);
  const [contactId, setContactId] = useState<number>(0);
  const [popupVisible, setPopupVisible] = useState(false);
  const [formDataDefaults, setFormDataDefaults] = useState({ ...newContact });
  const gridRef = useRef<DataGridRef>(null);

  let newContactData: IOngoingJob;

  // Helper function to get auth token (placeholder for when auth system includes tokens)
  const getAuthToken = useCallback(() => {
    // When your auth system includes tokens, you would get it like:
    // return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    // For now, return undefined since the current auth system doesn't use tokens
    return undefined;
  }, []);

  // Helper function to load data with current parameters
  const loadOnGoingJobsData = useCallback(() => {
    return fetchOngoingJobs({
      page: 1,
      limit: 100,
      // status: 'Active', // Optional: filter by status
      // TotalProfit: 0, // Optional: minimum profit filter
      token: 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NjU1NWVmN2VhM2U1OWEzYzk3NGM5NSIsImlhdCI6MTc1MTQ3NjY2NCwiZXhwIjoxNzUxNTAxODY0fQ.ZemXLz8jjApseTHaFckPNfqufF967TClfmFArFFllJY'//getAuthToken() // Will be undefined until auth system includes tokens
    });
  }, [getAuthToken]);

  useEffect(() => {
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadOnGoingJobsData,
    }));
  }, [loadOnGoingJobsData]);

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
    setFormDataDefaults({ ...newContact });

    // Refresh data with current parameters
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadOnGoingJobsData,
    }));

    gridRef.current?.instance().refresh();
  }, [loadOnGoingJobsData]);

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
          onExporting={onExporting}
          allowColumnReordering
          showBorders
          ref={gridRef}
          pager={{
            showPageSizeSelector: true,
            allowedPageSizes: [20, 50, 100, 200],
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
              <div className='grid-header'>Ongoing Jobs Report</div>
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
        </DataGrid>
        <ContactPanel contactId={contactId} isOpened={isPanelOpened} changePanelOpened={changePanelOpened} changePanelPinned={changePanelPinned} />
        <FormPopup title='New Contact' visible={popupVisible} setVisible={changePopupVisibility} onSave={onSaveClick}>
          {/* <ContactNewForm initData={ formDataDefaults } onDataChanged={onDataChanged} /> */}
        </FormPopup>
      </div>
    </div>
  );
};
