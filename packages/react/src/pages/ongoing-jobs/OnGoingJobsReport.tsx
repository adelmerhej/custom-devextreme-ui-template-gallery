/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF as JsPdf } from 'jspdf';
import { saveAs } from 'file-saver-es';
import { Workbook } from 'exceljs';
import { LoadIndicator } from 'devextreme-react/load-indicator';
//import FilterBuilder, { type FilterBuilderTypes } from 'devextreme-react/filter-builder';

// Importing data fetching function
import { fetchOngoingJobs, syncOngoingJobsData } from '../../api/dx-xolog-data/admin/reports/on-going/ongoingJobApiClient';
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
  IOngoingJob, JobStatus, StatusList, JobStatusDepartments } from '@/types/ongoingJob';

import { JOB_STATUS, JOB_STATUS_DEPARTMENTS, JOB_STATUS_LIST, JOB_STATUS_PAYMENT, newJob } from '../../shared/constants';
import DataSource from 'devextreme/data/data_source';
import notify from 'devextreme/ui/notify';

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

const cellProfitRender = (cell: DataGridTypes.ColumnCellTemplateData) => (
  <span>${cell.data.TotalProfit?.toFixed(2) || '0.00'}</span>
);

const cellDateRender = (cell: DataGridTypes.ColumnCellTemplateData, field: string) => {
  const date = cell.data[field];
  return date ? new Date(date).toLocaleDateString() : '';
};

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

// Helper function to format number with thousand separators
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const OngoingJobsReport = () => {
  // Get auth context for token access (when auth system includes tokens)
  const { user } = useAuth();

  const [gridDataSource, setGridDataSource] = useState<DataSource<IOngoingJob, string>>();
  const [isPanelOpened, setPanelOpened] = useState(false);
  const [contactId, setContactId] = useState<number>(0);
  const [popupVisible, setPopupVisible] = useState(false);
  const [formDataDefaults, setFormDataDefaults] = useState({ ...newJob });

  const [departement, setDepartements] = useState(filterDepartmentList[0]);
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);

  const [jobStatus, setJobStatus] = useState(filterJobStatusList[0]);
  const [jobStatusFilter, setJobStatusFilter] = useState<string | null>(null);

  const [statusList, setStatusList] = useState('New');
  const [statusListFilter, setStatusListFilter] = useState<string>('New');

  const [paymentStatus, setPaymentStatus] = useState(filterPaymentList[0]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string | null>(null);

  const [totalProfit, setTotalProfit] = useState<number>(0);

  const gridRef = useRef<DataGridRef>(null);

  // Helper function to load data with current parameters
  const loadOngoingJobsData = useCallback(() => {
    const params: {
      page: number;
      limit: number;
      jobStatusType?: string;
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
      params.jobStatusType = jobStatusFilter;
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

    return fetchOngoingJobs(params).then(data => {
      console.log('API returned data:', data);
      console.log('Data type:', typeof data);
      console.log('Is array:', Array.isArray(data));
      console.log('Data length:', data?.length);

      // If API response has a totalProfit field, use it for accurate total
      if (data && typeof data === 'object' && 'totalProfit' in data) {
        console.log('Using API totalProfit:', data.totalProfit);
        setTotalProfit(data.totalProfit || 0);
        // Return the actual data array
        return data.data || data || [];
      }

      return data;
    });
  }, [paymentStatusFilter, statusListFilter, departmentFilter, jobStatusFilter]);

  useEffect(() => {
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadOngoingJobsData,
    }));
  }, [loadOngoingJobsData]);
  // Calculate total profit when grid data changes (only if not already set by API)
  useEffect(() => {
    if (gridDataSource && totalProfit === 0) {
      gridDataSource.load().then((data: IOngoingJob[]) => {
        console.log('UseEffect - Data received for total calculation:', data);
        console.log('UseEffect - Data type:', typeof data);
        console.log('UseEffect - Is array:', Array.isArray(data));
        console.log('UseEffect - Data length:', data?.length);

        if (Array.isArray(data)) {
          const total = data.reduce((sum, item) => {
            const profit = item.TotalProfit || 0;
            console.log(`Job ${item.JobNo}: TotalProfit = ${profit}`);
            return sum + profit;
          }, 0);
          setTotalProfit(total);
          console.log('Calculated Total Profit:', total);
        } else {
          console.warn('Data is not an array:', data);
          setTotalProfit(0);
        }
      }).catch(error => {
        console.error('Error loading data for total calculation:', error);
        setTotalProfit(0);
      });
    }
  }, [gridDataSource, totalProfit]);

  const syncAndUpdateData = useCallback(async() => {
    try {
      const result = await syncOngoingJobsData();

      if (!result.success) {
        throw new Error('Failed to sync Ongoing Jobs', result);
      }
      refresh();
      notify('Ongoing Jobs data synced successfully', 'success', 3000);
    } catch (error) {
      console.error('Error loading Ongoing Jobs:', error);
      return [];
    }

  }, []);

  const onRowClick = useCallback(({ data }: DataGridTypes.RowClickEvent) => {
    setContactId(data._id);
    setPanelOpened(true);
  }, []);

  const filterByJobStatus = useCallback((e: DropDownButtonTypes.SelectionChangedEvent) => {
    const { item: jobStatus }: { item: FilterJobStatusType } = e;

    setJobStatus(jobStatus);
    setTotalProfit(0); // Reset total to get fresh API total

    if (jobStatus === 'All') {
      setJobStatusFilter(null);
    } else {
      setJobStatusFilter(jobStatus);
    }

    // Refresh the grid data source with new filter
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadOngoingJobsData,
    }));
  }, [loadOngoingJobsData]);

  const filterByJobDepartment = useCallback((e: DropDownButtonTypes.SelectionChangedEvent) => {
    const { item: departement }: { item: FilterJobStatusDepartmentType } = e;

    setTotalProfit(0); // Reset total to get fresh API total

    if (departement === 'All') {
      setDepartmentFilter(null);
    } else {
      setDepartmentFilter(departement);
    }

    setDepartements(departement);

    // Refresh the grid data source with new filter
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadOngoingJobsData,
    }));
  }, [loadOngoingJobsData]);

  const filterByStatusList = useCallback((e: DropDownButtonTypes.SelectionChangedEvent) => {
    const { item: statusList }: { item: FilterStatusListType } = e;

    setTotalProfit(0); // Reset total to get fresh API total

    if (statusList === 'All') {
      setStatusListFilter('All');
    } else {
      setStatusListFilter(statusList);
    }

    setStatusList(statusList);

    // Refresh the grid data source with new filter
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadOngoingJobsData,
    }));
  }, [loadOngoingJobsData]);

  const filterByJobPaymentStatus = useCallback((e: DropDownButtonTypes.SelectionChangedEvent) => {
    const { item: paymentStatus }: { item: FilterJobStatusPaymentType } = e;

    setTotalProfit(0); // Reset total to get fresh API total

    if (paymentStatus === 'All') {
      setPaymentStatusFilter(null);
    } else {
      setPaymentStatusFilter(paymentStatus);
    }

    setPaymentStatus(paymentStatus);

    // Refresh the grid data source with new filter
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadOngoingJobsData,
    }));
  }, [loadOngoingJobsData]);

  const refresh = useCallback(() => {
    console.log('Refreshing grid...');
    gridRef.current?.instance().refresh();
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
              <div className='grid-header'>Ongoing Jobs Report</div>
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
                text='Sync data'
                type='default'
                stylingMode='contained'
                onClick={syncAndUpdateData}
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
            dataField='JobDate'
            caption='Job Date'
            dataType='date'
            width={100}
            cellRender={(cell) => cellDateRender(cell, 'JobDate')}
          />
          <Column
            dataField='ReferenceNo'
            caption='XONO'
            dataType='string'
            width={100}
          />
          <Column
            dataField='CustomerName'
            caption='Customer'
            dataType='string'
            width={250}
            cellRender={cellNameRender}
          />
          <Column
            dataField='Eta'
            caption='ETA'
            dataType='date'
            width={100}
            cellRender={(cell) => cellDateRender(cell, 'Eta')}
          />
          <Column
            dataField='Ata'
            caption='ATA'
            dataType='date'
            width={100}
            cellRender={(cell) => cellDateRender(cell, 'Ata')}
          />
          <Column
            dataField='StatusType'
            caption='Status Type'
            width={100}
          />
          <Column
            dataField='PaymentDate'
            caption='Payment Date'
            dataType='date'
            cellRender={(cell) => cellDateRender(cell, 'PaymentDate')}
          />
          <Column
            dataField='TotalProfit'
            caption='Total Profit'
            dataType='number'
            cellRender={cellProfitRender}
            format='currency'
          />
          <Column
            dataField='DepartmentName'
            caption='Department Name'
            visible={false}
          />
          <Column
            dataField='Arrival'
            caption='Arrival'
            visible={false}
          />
          <Column
            dataField='MemberOf'
            caption='Member Of'
            visible={false}
          />
          <Column
            dataField='OperatingUserId'
            caption='Operating User'
            visible={false}
          />
          <Column
            dataField='Tejrim'
            caption='Tejrim'
            visible={false}
          />
          <Column
            dataField='CanceledJob'
            caption='Canceled Job'
            visible={false}
          />
          <Column
            dataField='PendingCosts'
            caption='Pending Costs'
            visible={false}
          />
          <Column
            dataField='FullPaid'
            caption='Full Paid'
            visible={false}
          />
          <Column
            dataField='Status'
            caption='Status'
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
      </div>
    </div>
  );
};
