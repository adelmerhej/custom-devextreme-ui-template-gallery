/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF as JsPdf } from 'jspdf';
import { saveAs } from 'file-saver-es';
import { Workbook } from 'exceljs';

// Add CSS for spinning animation and custom invoice header
const spinningStyles = `
  .spinning-icon-button .dx-icon.dx-icon-refresh {
    animation: dx-spin 1s linear infinite;
  }
  
  @keyframes dx-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .invoice-detail-header {
    font-size: 14px !important;
    font-weight: 600 !important;
    margin: 0 0 8px 0 !important;
    color: #333 !important;
  }
`;

// Inject styles into the document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = spinningStyles;
  document.head.appendChild(styleElement);
}

// Importing data fetching function
import {
  fetchClientInvoices,
  syncClientInvoicesData,
} from '../../api/dx-xolog-data/admin/reports/client-invoice/clientInvoiceApi';

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

import Button from 'devextreme-react/button';
import DropDownButton, { DropDownButtonTypes } from 'devextreme-react/drop-down-button';
import { exportDataGrid as exportDataGridToPdf } from 'devextreme/pdf_exporter';
import { exportDataGrid as exportDataGridToXLSX } from 'devextreme/excel_exporter';
import DataSource from 'devextreme/data/data_source';
import notify from 'devextreme/ui/notify';

import { DetailTemplate } from './ClientInvoicesDetailed';
import { clientInvocies } from './data';
import { IClientInvoice, JobStatus, InvoicePayment, JobStatusDepartments } from '@/types/clientInvoice';
import { StatusList, JobStatusPayment as JobStatusPaymentType, } from '@/types/jobStatus';
import { INVOICE_PAYMENT, JOB_STATUS, JOB_STATUS_DEPARTMENTS,
  JOB_STATUS_LIST, JOB_STATUS_PAYMENT, newJob } from '../../shared/constants';

const dropDownOptions = { width: 'auto' };
const exportFormats = ['xlsx', 'pdf'];

type FilterJobStatusDepartmentType = JobStatusDepartments | 'All';
type FilterJobStatusType = JobStatus | 'All';
type InvoicePaymentType = InvoicePayment | 'All';
type FilterStatusListType = StatusList | 'All';
type FilterJobStatusPaymentType = JobStatusPaymentType | 'All';

const filterDepartmentList = ['All', ...JOB_STATUS_DEPARTMENTS];
const filterJobStatusList = ['All', ...JOB_STATUS];
const filterInvoiceStatusList = ['All', ...INVOICE_PAYMENT];
const filterPaymentList = ['All', ...JOB_STATUS_PAYMENT];

const cellTotalInvoicesRender = (cell: DataGridTypes.ColumnCellTemplateData) => (
  <span>${cell.data.TotalInvoices?.toFixed(2) || '0.00'}</span>
);

const cellProfitRender = (cell: DataGridTypes.ColumnCellTemplateData) => (
  <span>${cell.data.TotalProfit?.toFixed(2) || '0.00'}</span>
);

const cellNameRender = (cell: DataGridTypes.ColumnCellTemplateData) => (
  <div className='name-template'>
    <div>{cell.data.Customer}</div>
    <div className='position'>{cell.data.Consignee}</div>
  </div>
);

// Helper function to format number with thousand separators
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

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

export const ClientInvoicesReport = () => {
  const [gridDataSource, setGridDataSource] = useState<DataSource<IClientInvoice, string>>();
  const gridRef = useRef<DataGridRef>(null);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [totalInvoice, setTotalInvoice] = useState<number>(0);

  const [departement, setDepartements] = useState(filterDepartmentList[0]);
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);

  const [jobStatus, setJobStatus] = useState(filterJobStatusList[0]);
  const [jobStatusFilter, setJobStatusFilter] = useState<string | null>(null);

  const [statusList, setStatusList] = useState('All');
  const [statusListFilter, setStatusListFilter] = useState<string>('All');

  const [isSyncing, setIsSyncing] = useState(false);

  const refresh = useCallback(() => {
    gridRef.current?.instance().refresh();
  }, []);

  const syncAndUpdateData = useCallback(async() => {
    setIsSyncing(true);

    try {
      const result = await syncClientInvoicesData();

      if (!result.success) {
        throw new Error('Failed to sync Client Invoices', result);
      }
      refresh();
      notify('Client Invoices data synced successfully', 'success', 3000);
    } catch (error) {
      console.error('Error loading client invoices:', error);
      return [];
    }finally {
      setIsSyncing(false);
    }
  }, []);

  // Helper function to load data with current parameters
  const loadClientInvoicesData = useCallback(async() => {
    const params: {
      page: number;
      limit: number;
      jobStatusType?: string;
      statusType?: string;
      departmentId?: number;
      jobType?: number;
    } = {
      page: 1,
      limit: 0,
    };

    // Add status filter if set
    if (jobStatusFilter && jobStatusFilter !== 'All') {
      params.jobStatusType = jobStatusFilter;
    }

    console.log('Loading client invoices with params:', params);

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
      //const masterDetailData = transformToMasterDetail(clientInvoices);
      return clientInvoices as IClientInvoice[];
    } catch (error) {
      console.error('Error loading client invoices:', error);
      return [];
    }
  }, [statusListFilter, departmentFilter, jobStatusFilter]);

  useEffect(() => {
    loadClientInvoicesData();
  }, []);

  useEffect(() => {
    const dataSource = new DataSource({
      key: 'JobNo',
      load: loadClientInvoicesData,
    });

    setGridDataSource(dataSource);
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
      key: 'JobNo',
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
      key: 'JobNo',
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
      key: 'JobNo',
      load: loadClientInvoicesData,
    }));
  }, [loadClientInvoicesData]);

  const refreshOnClick = useCallback(() => {
    // Refresh data with current parameters
    setGridDataSource(new DataSource({
      key: 'JobNo',
      load: loadClientInvoicesData,
    }));

    gridRef.current?.instance().refresh();
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
          <MasterDetail
            enabled
            component={DetailTemplate}
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
            <Item location='after' locateInMenu='auto'>
              <Button
                icon={isSyncing ? 'refresh' : 'plus'}
                text='Sync data'
                type='default'
                stylingMode='contained'
                onClick={syncAndUpdateData}
                disabled={isSyncing}
                elementAttr={isSyncing ? { class: 'spinning-icon-button' } : {}}
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
            visible={false}
          />
          <Column
            dataField='Pol'
            caption='POL'
            width={100}
          />
          <Column
            dataField='Pod'
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
            caption='Total Invoices New'
            dataType='number'
            format='currency'
            width={120}
            customizeText={(data) => {
              const value = typeof data.value === 'number' ? data.value : 0;
              const formattedValue = formatCurrency(value);
              return `${formattedValue}`;
            }}
          />
          <Column
            dataField='TotalProfit'
            caption='Total Profit'
            dataType='number'
            format='currency'
            width={120}
            customizeText={(data) => {
              const value = typeof data.value === 'number' ? data.value : 0;
              const formattedValue = formatCurrency(value);
              return `${formattedValue}`;
            }}
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
          <Column
            dataField='Invoices'
            caption='Invoices Count'
            cellRender={(cell) => <span>{cell.data.Invoices?.length || 0}</span>}
            width={100}
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
              customizeText={(data) => {
                const value = typeof data.value === 'number' ? data.value : 0;
                const formattedValue = formatCurrency(value);
                return `Totals: $${formattedValue}`;
              }}
              showInGroupFooter
            />
            <GroupItem
              column='TotalInvoices'
              summaryType='sum'
              customizeText={(data) => {
                const value = typeof data.value === 'number' ? data.value : 0;
                const formattedValue = formatCurrency(value);
                return `Totals: $${formattedValue}`;
              }}
              showInGroupFooter
            />
          </Summary>
          <SortByGroupSummaryInfo summaryItem='count' />
        </DataGrid>
      </div>
    </div>
  );
};

export const TobeLoadedClientReport = () => {
  return (
    <div className='view crm-contact-list'>
      <div className='view-wrapper view-wrapper-contact-list list-page'>
        <h2>To be loaded Client Report</h2>
        <p>This report is under development.</p>
      </div>
    </div>
  );
};

export const OnWaterClientReport = () => {
  return (
    <div className='view crm-contact-list'>
      <div className='view-wrapper view-wrapper-contact-list list-page'>
        <h2>On Water Client Report</h2>
        <p>This report is under development.</p>
      </div>
    </div>
  );
};

export const UnderClearanceClientReport = () => {
  return (
    <div className='view crm-contact-list'>
      <div className='view-wrapper view-wrapper-contact-list list-page'>
        <h2>Under Clearance Client Report</h2>
        <p>This report is under development.</p>
      </div>
    </div>
  );
};

export const InvoiceStatusClientReport = () => {
  return (
    <div className='view crm-contact-list'>
      <div className='view-wrapper view-wrapper-contact-list list-page'>
        <h2>Invoice Status Client Report</h2>
        <p>This report is under development.</p>
      </div>
    </div>
  );
};

