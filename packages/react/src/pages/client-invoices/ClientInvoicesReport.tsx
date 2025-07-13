/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF as JsPdf } from 'jspdf';
import { saveAs } from 'file-saver-es';
import { Workbook } from 'exceljs';

// Importing data fetching function
import {
  fetchClientInvoices,
  fetchInvoiceDetails,
  fetchJobsWithInvoiceDetails,
  getSampleInvoiceDetails
} from '../../api/dx-xolog-data/admin/reports/client-invoice/clientInvoiceApiClient';

// Import auth context for token access
import { useAuth } from '../../contexts/auth';

import {
  DataGrid, DataGridRef,
  Sorting, Selection, HeaderFilter, Scrolling, SearchPanel,
  ColumnChooser, Export, Column, Toolbar, Item, LoadPanel,
  DataGridTypes, Paging, Pager, Grouping, GroupPanel,
  Summary,
  GroupItem,
  SortByGroupSummaryInfo,
  MasterDetail
} from 'devextreme-react/data-grid';

import SelectBox from 'devextreme-react/select-box';
import TextBox from 'devextreme-react/text-box';
import Button from 'devextreme-react/button';
import DropDownButton, { DropDownButtonTypes } from 'devextreme-react/drop-down-button';

import { exportDataGrid as exportDataGridToPdf } from 'devextreme/pdf_exporter';
import { exportDataGrid as exportDataGridToXLSX } from 'devextreme/excel_exporter';

import { IClientInvoice, JobStatus, InvoicePayment, JobStatusDepartments } from '@/types/clientInvoice';

import { FormPopup, ContactPanel } from '../../components';
import { ContactStatus } from '../../components';

// Import CSS for invoice details styling
import './InvoiceDetails.css';

import { INVOICE_PAYMENT, JOB_STATUS, JOB_STATUS_DEPARTMENTS,
  JOB_STATUS_LIST, JOB_STATUS_PAYMENT, newJob } from '../../shared/constants';
import DataSource from 'devextreme/data/data_source';
import notify from 'devextreme/ui/notify';
import { StatusList, JobStatusPayment as JobStatusPaymentType, } from '@/types/jobStatus';

// Interface for job master record
interface IJobMaster {
  _id: string;
  JobNo: number;
  JobDate?: Date;
  Customer?: string;
  Consignee?: string;
  DepartmentId: number;
  DepartmentName?: string;
  StatusType?: string;
  Eta?: Date;
  Ata?: Date;
  Etd?: Date;
  Atd?: Date;
  POL?: string;
  POD?: string;
  UserName?: string;
  Notes?: string;
  CountryOfDeparture?: string;
  Departure?: string;
  Destination?: string;
  ReferenceNo?: string;
  vessel?: string;
  TotalInvoices?: number;
  TotalCosts?: number;
  TotalProfit?: number;
  MemberOf: string;
  JobType: string;
  createdAt: Date;
  updatedAt: Date;
  invoiceDetails?: IInvoiceDetail[];
}

// Interface for invoice detail record
interface IInvoiceDetail {
  _id: string;
  JobNo: number;
  DepartmentId: number;
  InvoiceNo?: string;
  InvoiceDate?: Date;
  DueDate?: Date;
  TotalInvoiceAmount?: number;
  InvoiceProfit?: number;
  InvoiceStatus?: string;
  PaymentStatus?: string;
  ClientName?: string;
  Description?: string;
  Currency?: string;
  TaxAmount?: number;
  NetAmount?: number;
  CreatedBy?: string;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

type FilterJobStatusDepartmentType = JobStatusDepartments | 'All';
type FilterJobStatusType = JobStatus | 'All';
type InvoicePaymentType = InvoicePayment | 'All';
type FilterStatusListType = StatusList | 'All';
type FilterJobStatusPaymentType = JobStatusPaymentType | 'All';

const filterDepartmentList = ['All', ...JOB_STATUS_DEPARTMENTS];
const filterJobStatusList = ['All', ...JOB_STATUS];
const filterInvoiceStatusList = ['All', ...INVOICE_PAYMENT];
const filterPaymentList = ['All', ...JOB_STATUS_PAYMENT];

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

// Function to get department IDs based on the selected department
// This function returns an object with ids and an optional special condition for Sea Cross
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
      doc.save('JobsInvoiceDetails.pdf');
    });
  } else {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('JobsInvoiceDetails');

    exportDataGridToXLSX({
      component: e.component,
      worksheet,
      autoFilterEnabled: true,
    }).then(() => {
      workbook.xlsx.writeBuffer().then((buffer) => {
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'JobsInvoiceDetails.xlsx');
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

// Function to transform client invoice data to master-detail structure
const transformToMasterDetail = (clientInvoices: IClientInvoice[]): IJobMaster[] => {
  const jobMap = new Map<string, IJobMaster>();

  clientInvoices.forEach(invoice => {
    const jobKey = String(invoice.JobNo);

    if (!jobMap.has(jobKey)) {
      // Create master record for the job
      jobMap.set(jobKey, {
        _id: invoice._id,
        JobNo: invoice.JobNo,
        JobDate: invoice.JobDate,
        Customer: invoice.Customer,
        Consignee: invoice.Consignee,
        DepartmentName: invoice.DepartmentName,
        StatusType: invoice.StatusType,
        Eta: invoice.Eta,
        Ata: invoice.Ata,
        Etd: invoice.Etd,
        Atd: invoice.Atd,
        POL: invoice.POL,
        POD: invoice.POD,
        UserName: invoice.UserName,
        Notes: invoice.Notes,
        CountryOfDeparture: invoice.CountryOfDeparture,
        Departure: invoice.Departure,
        Destination: invoice.Destination,
        ReferenceNo: invoice.ReferenceNo,
        vessel: invoice.vessel,
        TotalInvoices: 0,
        TotalCosts: 0,
        TotalProfit: 0,
        DepartmentId: invoice.DepartmentId,
        MemberOf: invoice.MemberOf,
        JobType: invoice.JobType,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        invoiceDetails: []
      });
    }

    const job = jobMap.get(jobKey);
    if (!job) return;

    // Add invoice detail
    if (invoice.InvoiceNo) {
      if (!job.invoiceDetails) {
        job.invoiceDetails = [];
      }
      job.invoiceDetails.push({
        _id: `${invoice._id}-inv`,
        JobNo: invoice.JobNo,
        InvoiceNo: invoice.InvoiceNo,
        DueDate: invoice.DueDate,
        TotalInvoiceAmount: invoice.TotalInvoiceAmount || invoice.TotalInvoices,
        InvoiceProfit: invoice.TotalProfit,
        InvoiceStatus: invoice.StatusType,
        PaymentStatus: 'Pending',
        DepartmentId: 0
      });
    }

    // Aggregate totals
    job.TotalInvoices = (job.TotalInvoices || 0) + (invoice.TotalInvoices || 0);
    job.TotalCosts = (job.TotalCosts || 0) + (invoice.TotalCosts || 0);
    job.TotalProfit = (job.TotalProfit || 0) + (invoice.TotalProfit || 0);
  });

  return Array.from(jobMap.values());
};

// Detail template component for invoice details
const InvoiceDetailTemplate = (props: { data: IJobMaster }) => {
  const { data: masterData } = props;
  const [invoiceDetails, setInvoiceDetails] = useState<IInvoiceDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoiceDetails = async() => {
      try {
        setLoading(true);
        // Try to fetch from API first, fallback to sample data
        const details = await fetchInvoiceDetails(masterData.JobNo, masterData.DepartmentId, { token: undefined });
        setInvoiceDetails(details);
      } catch (error) {
        console.error('Error loading invoice details:', error);
        // Use sample data as fallback
        const sampleDetails = getSampleInvoiceDetails(masterData.JobNo).map(detail => ({
          DepartmentId: masterData.DepartmentId,
          ...detail
        }));
        setInvoiceDetails(sampleDetails);
      } finally {
        setLoading(false);
      }
    };

    loadInvoiceDetails();
  }, [masterData.JobNo]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading invoice details...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h4>Invoice Details for Job #{masterData.JobNo}</h4>
      <div style={{ marginBottom: '10px', color: '#666' }}>
        Customer: {masterData.Customer} | Total Invoices: ${formatCurrency(masterData.TotalInvoices || 0)}
      </div>
      <DataGrid
        dataSource={invoiceDetails}
        showBorders
        showRowLines
        rowAlternationEnabled
        height={400}
        columnAutoWidth
      >
        <Column
          dataField='InvoiceNo'
          caption='Invoice#'
          width={120}
        />
        <Column
          dataField='InvoiceDate'
          caption='Invoice Date'
          dataType='date'
          width={110}
        />
        <Column
          dataField='DueDate'
          caption='Due Date'
          dataType='date'
          width={100}
        />
        <Column
          dataField='ClientName'
          caption='Client'
          width={150}
        />
        <Column
          dataField='Description'
          caption='Description'
          width={200}
        />
        <Column
          dataField='NetAmount'
          caption='Net Amount'
          dataType='number'
          format='currency'
          width={120}
          cellRender={(cell) => (
            <span>${formatCurrency(cell.data.NetAmount || 0)}</span>
          )}
        />
        <Column
          dataField='TaxAmount'
          caption='Tax'
          dataType='number'
          format='currency'
          width={100}
          cellRender={(cell) => (
            <span>${formatCurrency(cell.data.TaxAmount || 0)}</span>
          )}
        />
        <Column
          dataField='TotalInvoiceAmount'
          caption='Total Amount'
          dataType='number'
          format='currency'
          width={130}
          cellRender={(cell) => (
            <span>${formatCurrency(cell.data.TotalInvoiceAmount || 0)}</span>
          )}
        />
        <Column
          dataField='InvoiceProfit'
          caption='Profit'
          dataType='number'
          format='currency'
          width={100}
          cellRender={(cell) => (
            <span>${formatCurrency(cell.data.InvoiceProfit || 0)}</span>
          )}
        />
        <Column
          dataField='PaymentStatus'
          caption='Payment Status'
          width={120}
          cellRender={(cell) => (
            <span className={`status-badge status-${cell.data.PaymentStatus?.toLowerCase().replace(' ', '-')}`}>
              {cell.data.PaymentStatus}
            </span>
          )}
        />
        <Column
          dataField='InvoiceStatus'
          caption='Invoice Status'
          width={120}
          cellRender={(cell) => (
            <span className={`status-badge status-${cell.data.InvoiceStatus?.toLowerCase()}`}>
              {cell.data.InvoiceStatus}
            </span>
          )}
        />
        <Column
          dataField='Currency'
          caption='Currency'
          width={80}
        />
        <Column
          dataField='CreatedBy'
          caption='Created By'
          width={150}
          visible={false}
        />
        <Summary>
          <GroupItem
            column='TotalInvoiceAmount'
            summaryType='sum'
            displayFormat='Total: ${0}'
            showInGroupFooter={false}
          />
          <GroupItem
            column='InvoiceProfit'
            summaryType='sum'
            displayFormat='Total Profit: ${0}'
            showInGroupFooter={false}
          />
        </Summary>
        <Paging defaultPageSize={10} />
        <Pager visible showPageSizeSelector allowedPageSizes={[5, 10, 20]} />
      </DataGrid>
    </div>
  );
};

export const ClientInvoicesReport = () => {
  // Get auth context for token access (when auth system includes tokens)
  const { user } = useAuth();

  const [gridDataSource, setGridDataSource] = useState<DataSource<IJobMaster, string>>();
  const [isPanelOpened, setPanelOpened] = useState(false);
  const [contactId, setContactId] = useState<number>(0);
  const [popupVisible, setPopupVisible] = useState(false);
  const gridRef = useRef<DataGridRef>(null);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [totalInvoice, setTotalInvoice] = useState<number>(0);

  const [departement, setDepartements] = useState(filterDepartmentList[0]);
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);

  const [jobStatus, setJobStatus] = useState(filterJobStatusList[0]);
  const [jobStatusFilter, setJobStatusFilter] = useState<string | null>(null);

  const [statusList, setStatusList] = useState('All');
  const [statusListFilter, setStatusListFilter] = useState<string>('All');

  const [paymentStatus, setPaymentStatus] = useState(filterPaymentList[0]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string | null>(null);

  // Helper function to get auth token (placeholder for when auth system includes tokens)
  const getAuthToken = useCallback(() => {
    // When your auth system includes tokens, you would get it like:
    // return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    // For now, return undefined since the current auth system doesn't use tokens
    return undefined;
  }, []);

  // Helper function to load data with current parameters
  const loadClientInvoicesData = useCallback(async() => {
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

    try {
      const clientInvoices = await fetchClientInvoices(params);
      const masterDetailData = transformToMasterDetail(clientInvoices);
      return masterDetailData;
    } catch (error) {
      console.error('Error loading client invoices:', error);
      return [];
    }
  }, [paymentStatusFilter, statusListFilter, departmentFilter, jobStatusFilter]);

  useEffect(() => {
    setGridDataSource(new DataSource({
      key: '_id',
      load: loadClientInvoicesData,
    }));
  }, [loadClientInvoicesData]);

  // Calculate total profit when grid data changes
  useEffect(() => {
    if (gridDataSource) {
      gridDataSource.load().then((data: IJobMaster[]) => {
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

  const refresh = useCallback(() => {
    gridRef.current?.instance().refresh();
  }, []);

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
      load: loadClientInvoicesData,
    }));
  }, [loadClientInvoicesData]);

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
      load: loadClientInvoicesData,
    }));
  }, [loadClientInvoicesData]);

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
      load: loadClientInvoicesData,
    }));
  }, [loadClientInvoicesData]);

  const syncDataOnClick = useCallback(() => {
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
      load: loadClientInvoicesData,
    }));
  }, [loadClientInvoicesData]);

  // Function to demonstrate querying invoice details for a specific job
  const queryInvoiceDetailsExample = useCallback(async(jobNo: number, departementId: number) => {
    try {
      console.log(`Querying invoice details for Job #${jobNo}...`);

      // Method 1: Query invoice details directly
      const invoiceDetails = await fetchInvoiceDetails(jobNo, departementId, { token: getAuthToken() });
      console.log('Invoice Details:', invoiceDetails);

      // Method 2: Get sample data (for demonstration)
      const sampleDetails = getSampleInvoiceDetails(jobNo);
      console.log('Sample Invoice Details:', sampleDetails);

      // Show notification with results
      notify({
        message: `Found ${invoiceDetails.length} invoice details for Job #${jobNo}`,
        type: 'success',
        displayTime: 3000
      });

      return invoiceDetails;
    } catch (error) {
      console.error('Error querying invoice details:', error);
      notify({
        message: 'Error loading invoice details',
        type: 'error',
        displayTime: 3000
      });
      return [];
    }
  }, [getAuthToken]);

  // Function to load jobs with their invoice details
  const loadJobsWithInvoiceDetails = useCallback(async() => {
    try {
      console.log('Loading jobs with invoice details...');

      const params = {
        page: 1,
        limit: 10,
        includeInvoiceDetails: true,
        token: getAuthToken()
      };

      const jobsWithDetails = await fetchJobsWithInvoiceDetails(params);
      console.log('Jobs with Invoice Details:', jobsWithDetails);

      return jobsWithDetails;
    } catch (error) {
      console.error('Error loading jobs with invoice details:', error);
      return [];
    }
  }, [getAuthToken]);

  return (
    <div className='view crm-contact-list'>
      <div className='view-wrapper view-wrapper-contact-list list-page'>
        <DataGrid
          className='grid theme-dependent'
          noDataText=''
          focusedRowEnabled
          height='100%'
          dataSource={gridDataSource}
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
          <MasterDetail
            enabled
            component={InvoiceDetailTemplate}
          />
          <Grouping contextMenuEnabled />
          <GroupPanel visible /> {/* or "auto" */}
          <Paging defaultPageSize={100} />
          <Pager visible showPageSizeSelector />
          <LoadPanel showPane={false} />
          <SearchPanel visible placeholder='Job Search' />
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
              <div className='grid-header'>Client Invoices</div>
            </Item>
            <Item location='after'>
              <div className='total-profit-display'>Total Invoices: ${formatCurrency(totalInvoice)} &nbsp;&nbsp;&nbsp;&nbsp;</div>
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
                items={filterInvoiceStatusList}
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
                onClick={syncDataOnClick}
              />
            </Item>
            <Item location='after' locateInMenu='auto'>
              <Button
                icon='search'
                text='Query Sample Invoice Details'
                type='default'
                stylingMode='outlined'
                onClick={() => queryInvoiceDetailsExample(12345, 2)}
              />
            </Item>
            <Item location='after' locateInMenu='auto'>
              <Button
                icon='folder'
                text='Load Jobs with Details'
                type='default'
                stylingMode='outlined'
                onClick={loadJobsWithInvoiceDetails}
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
            dataField='Customer'
            caption='Customer'
            dataType='string'
            width={150}
            cellRender={cellNameRender}
          />
          <Column
            dataField='DepartmentName'
            caption='Department'
            width={120}
            visible={false}
          />
          <Column
            dataField='StatusType'
            caption='Status Type'
            width={120}
          />
          <Column
            dataField='POL'
            caption='POL'
            width={100}
          />
          <Column
            dataField='POD'
            caption='POD'
            width={100}
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
            dataField='TotalInvoices'
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
            width={120}
            visible={false}
          />
          <Column
            dataField='Consignee'
            caption='Consignee'
            width={120}
            visible={false}
          />
          <Column
            dataField='Notes'
            caption='Notes'
            width={200}
            visible={false}
          />
          <Column
            dataField='vessel'
            caption='Vessel'
            width={120}
            visible={false}
          />
          <Summary>
            <GroupItem
              column='JobNo'
              summaryType='count'
              displayFormat='{0} jobs'
            />
            <GroupItem
              column='TotalProfit'
              summaryType='sum'
              displayFormat='Total Profit: {0}'
              showInGroupFooter
            />
            <GroupItem
              column='TotalInvoices'
              summaryType='sum'
              displayFormat='Total Invoice Amount: {0}'
              showInGroupFooter
            />
          </Summary>
          <SortByGroupSummaryInfo summaryItem='count' />
        </DataGrid>
        <ContactPanel contactId={contactId} isOpened={isPanelOpened} changePanelOpened={changePanelOpened} changePanelPinned={changePanelPinned} />
      </div>
    </div>
  );
};
