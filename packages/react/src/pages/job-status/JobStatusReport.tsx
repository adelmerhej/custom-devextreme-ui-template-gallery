/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF as JsPdf } from 'jspdf';
import { saveAs } from 'file-saver-es';
import { Workbook } from 'exceljs';
//import FilterBuilder, { type FilterBuilderTypes } from 'devextreme-react/filter-builder';

// Importing data fetching function
import { fetchJobStatuses } from '../../api/dx-xolog-data/admin/reports/job-status/jobStatusApiClient';

// Import auth context for token access
import { useAuth } from '../../contexts/auth';

import {
  DataGrid, DataGridRef,
  Sorting, Selection, HeaderFilter, Scrolling, SearchPanel,
  ColumnChooser, Export, Column, Toolbar, Item, LoadPanel,
  DataGridTypes, Paging, Pager, Grouping, GroupPanel,
  FilterRow, Summary, GroupItem, SortByGroupSummaryInfo
} from 'devextreme-react/data-grid';

import SelectBox from 'devextreme-react/select-box';
import TextBox from 'devextreme-react/text-box';
import Button from 'devextreme-react/button';
import DropDownButton, { DropDownButtonTypes } from 'devextreme-react/drop-down-button';

import { exportDataGrid as exportDataGridToPdf } from 'devextreme/pdf_exporter';
import { exportDataGrid as exportDataGridToXLSX } from 'devextreme/excel_exporter';

import { JobStatusPayment as JobStatusPaymentType,
  IJobStatus, JobStatus, StatusList, JobStatusDepartments } from '@/types/jobStatus';

import { FormPopup, ContactNewForm, ContactPanel } from '../../components';
import { ContactStatus } from '../../components';

import { JOB_STATUS, JOB_STATUS_DEPARTMENTS, JOB_STATUS_LIST, JOB_STATUS_PAYMENT, newJob } from '../../shared/constants';
import DataSource from 'devextreme/data/data_source';
import notify from 'devextreme/ui/notify';

import './job-status-report.scss';

type FilterJobStatusType = JobStatus | 'All';
type FilterJobStatusDepartmentType = JobStatusDepartments | 'All';
type FilterStatusListType = StatusList | 'All';
type FilterJobStatusPaymentType = JobStatusPaymentType | 'All';

const filterJobStatusList = ['All', ...JOB_STATUS];
const filterDepartmentList = ['All', ...JOB_STATUS_DEPARTMENTS];
const filterStatusList = ['All', ...JOB_STATUS_LIST];
const filterPaymentList = ['All', ...JOB_STATUS_PAYMENT];

const cellNameRender = (cell: DataGridTypes.ColumnCellTemplateData) => (
  <div className='name-template'>
    <div>{cell.data.CustomerName}</div>
    <div className='position'>{cell.data.ConsigneeName}</div>
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

const getDepartmentId = (department: FilterJobStatusDepartmentType): { ids: number[], specialCondition?: { id: number, jobType: number } } => {
  switch (department) {
    case 'All':
      return { ids: [0] };
    case 'Air Export':
      return { ids: [2] };
    case 'Air Import':
      return { ids: [5] };
    case 'Land Freight':
      return { ids: [6] };
    case 'Air Clearance':
      return { ids: [8] };
    case 'Sea Import':
      return { ids: [16] };
    case 'Sea Clearance':
      return { ids: [17] };
    case 'Sea Export':
      return { ids: [18] };
    case 'Sea Cross':
      return { ids: [16], specialCondition: { id: 16, jobType: 3 } };
    default:
      return { ids: [0] };
  }
};

const onExporting = (e: DataGridTypes.ExportingEvent) => {
  if (e.format === 'pdf') {
    const doc = new JsPdf();
    exportDataGridToPdf({
      jsPDFDocument: doc,
      component: e.component,
    }).then(() => {
      doc.save('JobStatusReport.pdf');
    });
  } else {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('JobStatusReport');

    exportDataGridToXLSX({
      component: e.component,
      worksheet,
      autoFilterEnabled: true,
    }).then(() => {
      workbook.xlsx.writeBuffer().then((buffer) => {
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'JobStatusReport.xlsx');
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

export const JobStatusReport = () => {
  // Get auth context for token access (when auth system includes tokens)
  const { user } = useAuth();

  const [gridDataSource, setGridDataSource] = useState<DataSource<IJobStatus[], string>>();
  const [isPanelOpened, setPanelOpened] = useState(false);
  const [contactId, setContactId] = useState<number>(0);
  const [popupVisible, setPopupVisible] = useState(false);
  const [formDataDefaults, setFormDataDefaults] = useState({ ...newJob });

  const [jobStatus, setJobStatus] = useState(filterJobStatusList[0]);
  const [jobStatusFilter, setJobStatusFilter] = useState<string | null>(null);

  const [departement, setDepartements] = useState(filterDepartmentList[0]);
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);

  const [statusList, setStatusList] = useState('New');
  const [statusListFilter, setStatusListFilter] = useState<string>('New');

  const [paymentStatus, setPaymentStatus] = useState(filterPaymentList[0]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string | null>(null);

  const [totalProfit, setTotalProfit] = useState<number>(0);

  const gridRef = useRef<DataGridRef>(null);

  let newContactData: IJobStatus;

  // Helper function to load data with current parameters
  const loadJobStatusesData = useCallback(() => {
    const params: {
      page: number;
      limit: number;
      status?: string;
      fullPaid?: string;
      statusType?: string;
      departmentId?: number;
      jobType?: number;
    } = {
      page: 1,
      limit: 100,
    };

    // Add payment status filter if set
    if (paymentStatusFilter) {
      if (paymentStatusFilter === 'Full Paid') {
        params.fullPaid = 'true';
      } else if (paymentStatusFilter === 'Not Paid') {
        params.fullPaid = 'false';
      }else {
        params.fullPaid = undefined;
      }
    }

    // Add status filter if set
    if (jobStatusFilter && jobStatusFilter !== 'All') {
      params.status = jobStatusFilter;
    }

    // Add status list filter if set
    if (statusListFilter && statusListFilter !== 'All') {
      params.statusType = statusListFilter;
    }

    // Add department filter if set
    if (departmentFilter && departmentFilter !== 'All') {
      const departmentResult = getDepartmentId(departmentFilter as FilterJobStatusDepartmentType);
      if (departmentResult.ids[0] !== 0) {
        params.departmentId = departmentResult.ids[0];
        if (departmentResult.specialCondition) {
          params.jobType = departmentResult.specialCondition.jobType;
        }
      }
    }

    return fetchJobStatuses(params);
  }, [paymentStatusFilter, statusListFilter, departmentFilter, jobStatusFilter]);

  useEffect(() => {
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadJobStatusesData,
    }));
  }, [loadJobStatusesData]);

  // Calculate total profit when grid data changes
  useEffect(() => {
    if (gridDataSource) {
      gridDataSource.load().then((data: IJobStatus[]) => {
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

  const syncDataOnClick = useCallback(() => {
    //setPopupVisible(true);
    setFormDataDefaults({ ...newJob });

    // Refresh data with current parameters
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadJobStatusesData,
    }));

    gridRef.current?.instance().refresh();
  }, [loadJobStatusesData]);

  const onRowClick = useCallback(({ data }: DataGridTypes.RowClickEvent) => {
    setContactId(data._id);
    setPanelOpened(true);
  }, []);

  const filterByJobStatus = useCallback((e: DropDownButtonTypes.SelectionChangedEvent) => {
    const { item: jobStatus }: { item: FilterJobStatusType } = e;

    setJobStatus(jobStatus);

    if (jobStatus === 'All') {
      setJobStatusFilter(null);
    } else {
      setJobStatusFilter(jobStatus);
    }

    // Refresh the grid data source with new filter
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadJobStatusesData,
    }));
  }, [loadJobStatusesData]);

  const filterByJobDepartment = useCallback((e: DropDownButtonTypes.SelectionChangedEvent) => {
    const { item: departement }: { item: FilterJobStatusDepartmentType } = e;

    if (departement === 'All') {
      setDepartmentFilter(null);
    } else {
      setDepartmentFilter(departement);
    }

    setDepartements(departement);

    // Refresh the grid data source with new filter
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadJobStatusesData,
    }));
  }, [loadJobStatusesData]);

  const filterByStatusList = useCallback((e: DropDownButtonTypes.SelectionChangedEvent) => {
    const { item: statusList }: { item: FilterStatusListType } = e;

    if (statusList === 'All') {
      setStatusListFilter('All');
    } else {
      setStatusListFilter(statusList);
    }

    setStatusList(statusList);

    // Refresh the grid data source with new filter
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadJobStatusesData,
    }));
  }, [loadJobStatusesData]);

  const filterByJobPaymentStatus = useCallback((e: DropDownButtonTypes.SelectionChangedEvent) => {
    const { item: paymentStatus }: { item: FilterJobStatusPaymentType } = e;

    if (paymentStatus === 'All') {
      setPaymentStatusFilter(null);
    } else {
      setPaymentStatusFilter(paymentStatus);
    }

    setPaymentStatus(paymentStatus);

    // Refresh the grid data source with new filter
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadJobStatusesData,
    }));
  }, [loadJobStatusesData]);

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
          filterRow={{ visible: true, applyFilter: 'auto' }}
          pager={{
            showPageSizeSelector: true,
            allowedPageSizes: [100, 200, 1000, 0],
            showInfo: true,
            visible: true,
          }}
        >
          <Grouping contextMenuEnabled />
          <GroupPanel visible />
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
              <div className='grid-header'>Job Status Report</div>
            </Item>
            <Item location='after'>
              <div className='total-profit-display'>Total Profit: ${formatCurrency(totalProfit)} &nbsp;&nbsp;&nbsp;&nbsp;</div>
            </Item>
            <Item location='before' locateInMenu='auto'>
              <DropDownButton
                items={filterDepartmentList}
                stylingMode='text'
                text={departement}
                dropDownOptions={dropDownOptions}
                useSelectMode
                onSelectionChanged={filterByJobDepartment}
              />
            </Item>
            <Item location='before' locateInMenu='auto'>
              <DropDownButton
                items={filterJobStatusList}
                stylingMode='text'
                text={jobStatus}
                dropDownOptions={dropDownOptions}
                useSelectMode
                onSelectionChanged={filterByJobStatus}
              />
            </Item>
            <Item location='before' locateInMenu='auto'>
              <DropDownButton
                items={filterStatusList}
                stylingMode='text'
                text={statusList}
                dropDownOptions={dropDownOptions}
                useSelectMode
                onSelectionChanged={filterByStatusList}
              />
            </Item>
            <Item location='before' locateInMenu='auto'>
              <DropDownButton
                items={filterPaymentList}
                stylingMode='text'
                text={paymentStatus}
                dropDownOptions={dropDownOptions}
                useSelectMode
                onSelectionChanged={filterByJobPaymentStatus}
              />
            </Item>
            <Item location='after' locateInMenu='auto'>
              <Button
                icon='plus'
                text='Sync'
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
            hidingPriority={18}
          />
          <Column
            dataField='JobDate'
            caption='Job Date'
            dataType='date'
            hidingPriority={17}
            width={100}
            cellRender={(cell) => cellDateRender(cell, 'JobDate')}
          />
          <Column
            dataField='ReferenceNo'
            caption='XONO'
            dataType='string'
            width={100}
            hidingPriority={16}
          />
          <Column
            dataField='CustomerName'
            caption='Customer'
            hidingPriority={15}
            dataType='string'
            width={250}
            cellRender={cellNameRender}
          />
          <Column
            dataField='Eta'
            caption='ETA'
            dataType='date'
            width={100}
            hidingPriority={14}
            cellRender={(cell) => cellDateRender(cell, 'Eta')}
          />
          <Column
            dataField='Ata'
            caption='ATA'
            dataType='date'
            width={100}
            hidingPriority={13}
            cellRender={(cell) => cellDateRender(cell, 'Ata')}
          />
          <Column
            dataField='StatusType'
            caption='Status Type'
            width={100}
            hidingPriority={12}
          />
          <Column
            dataField='TotalProfit'
            caption='Total Profit'
            dataType='number'
            hidingPriority={11}
            cellRender={cellProfitRender}
            format='currency'
          />
          <Column
            dataField='PaymentDate'
            caption='Payment Date'
            dataType='date'
            hidingPriority={10}
            cellRender={(cell) => cellDateRender(cell, 'PaymentDate')}
          />
          <Column
            dataField='DepartmentName'
            caption='Department Name'
            hidingPriority={9}
          />
          <Column
            dataField='Arrival'
            caption='Arrival'
            hidingPriority={8}
          />
          <Column
            dataField='MemberOf'
            caption='Member Of'
            hidingPriority={7}
          />
          <Column
            dataField='OperatingUserId'
            caption='Operating User'
            hidingPriority={6}
          />
          <Column
            dataField='Tejrim'
            caption='Tejrim'
            hidingPriority={5}
          />
          <Column
            dataField='CanceledJob'
            caption='Canceled Job'
            hidingPriority={4}
          />
          <Column
            dataField='PendingCosts'
            caption='Pending Costs'
            hidingPriority={3}
          />
          <Column
            dataField='FullPaid'
            caption='Full Paid'
            hidingPriority={2}
          />
          <Column
            dataField='Status'
            caption='Status'
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
