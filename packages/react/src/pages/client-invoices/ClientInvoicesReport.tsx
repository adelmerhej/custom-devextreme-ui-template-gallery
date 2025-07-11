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

import { IClientInvoice, JobStatus, InvoicePayment, JobStatusDepartments } from '@/types/clientInvoice';

import { FormPopup, ContactPanel } from '../../components';
import { ContactStatus } from '../../components';

import { INVOICE_PAYMENT, JOB_STATUS, JOB_STATUS_DEPARTMENTS,
  JOB_STATUS_LIST, JOB_STATUS_PAYMENT, newJob } from '../../shared/constants';
import DataSource from 'devextreme/data/data_source';
import notify from 'devextreme/ui/notify';
import { StatusList, JobStatusPayment as JobStatusPaymentType, } from '@/types/jobStatus';

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
      doc.save('ClientInvoices.pdf');
    });
  } else {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('ClientInvoices');

    exportDataGridToXLSX({
      component: e.component,
      worksheet,
      autoFilterEnabled: true,
    }).then(() => {
      workbook.xlsx.writeBuffer().then((buffer) => {
        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), 'ClientInvoices.xlsx');
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
  const gridRef = useRef<DataGridRef>(null);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [totalInvoice, setTotalInvoice] = useState<number>(0);

  const [departement, setDepartements] = useState(filterDepartmentList[0]);
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);

  const [jobStatus, setJobStatus] = useState(filterJobStatusList[0]);
  const [jobStatusFilter, setJobStatusFilter] = useState<string | null>(null);

  const [statusList, setStatusList] = useState('New');
  const [statusListFilter, setStatusListFilter] = useState<string>('New');

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
  const loadClientInvoicesData = useCallback(() => {
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

    return fetchClientInvoices(params);
  }, [paymentStatusFilter, departmentFilter, jobStatusFilter]);

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
      </div>
    </div>
  );
};
