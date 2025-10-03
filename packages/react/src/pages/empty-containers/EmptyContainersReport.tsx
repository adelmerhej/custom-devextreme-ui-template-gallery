/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF as JsPdf } from 'jspdf';
import { saveAs } from 'file-saver-es';
import { Workbook } from 'exceljs';

// Add CSS for spinning animation
const spinningStyles = `
  .spinning-icon-button .dx-icon.dx-icon-refresh {
    animation: dx-spin 1s linear infinite;
  }
  
  @keyframes dx-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Inject styles into the document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = spinningStyles;
  document.head.appendChild(styleElement);
}

// Importing data fetching function
import { fetchEmptyContainers, syncEmptyContainersData } from '../../api/dx-xolog-data/admin/reports/empty-container/emptyContainerApiClient';

// Import auth context for token access
import { useAuth } from '../../contexts/auth';

import {
  DataGrid, DataGridRef,
  Sorting, Selection, HeaderFilter, Scrolling, SearchPanel,
  ColumnChooser, Export, Column, Toolbar, Item, LoadPanel,
  DataGridTypes, Paging, Pager, Grouping, GroupPanel,
  Summary,
  GroupItem,
  TotalItem,
  SortByGroupSummaryInfo
} from 'devextreme-react/data-grid';

import Button from 'devextreme-react/button';
import DropDownButton, { DropDownButtonTypes } from 'devextreme-react/drop-down-button';

import { exportDataGrid as exportDataGridToPdf } from 'devextreme/pdf_exporter';
import { exportDataGrid as exportDataGridToXLSX } from 'devextreme/excel_exporter';

import { JobStatusPayment as JobStatusPaymentType,
  IEmptyContainer, JobStatus, StatusList, JobStatusDepartments } from '@/types/emptyContainer';

import { JOB_STATUS_DEPARTMENTS, JOB_STATUS_PAYMENT } from '../../shared/constants';
import DataSource from 'devextreme/data/data_source';
import notify from 'devextreme/ui/notify';

type FilterJobStatusDepartmentType = JobStatusDepartments | 'All';
type FilterJobStatusPaymentType = JobStatusPaymentType | 'All';

const filterDepartmentList = ['All', ...JOB_STATUS_DEPARTMENTS];
const filterPaymentList = ['All', ...JOB_STATUS_PAYMENT];

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

const cellFullPaidRender = (cell: DataGridTypes.ColumnCellTemplateData) => {
  const isPaid = cell.data.FullPaid;
  return (
    <span
      style={{
        fontWeight: 'bold',
        color: isPaid ? '#4CAF50' : '#F44336',
        fontSize: '14px'
      }}
    >
      {isPaid ? 'PAID' : 'NOT PAID'}
    </span>
  );
};

const cellMissingDocumentsRender = (cell: DataGridTypes.ColumnCellTemplateData) => {
  const isMissed = cell.data.MissingDocuments;

  return (
    <input
      type='checkbox'

      checked={isMissed}
      readOnly
      style={{
        accentColor: isMissed ? '#F44336' : '#4CAF50',
      }}
    />
  );
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
  const gridRef = useRef<DataGridRef>(null);
  const [totalProfit, setTotalProfit] = useState<number>(0);

  const [departement, setDepartements] = useState(filterDepartmentList[0]);
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);

  const [paymentStatus, setPaymentStatus] = useState(filterPaymentList[0]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Helper function to get auth token (placeholder for when auth system includes tokens)
  const getAuthToken = useCallback(() => {
    // When your auth system includes tokens, you would get it like:
    // return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    // For now, return undefined since the current auth system doesn't use tokens
    return undefined;
  }, []);

  const syncAndUpdateData = useCallback(async() => {
    setIsSyncing(true);
    try {
      const result = await syncEmptyContainersData();

      if (!result.success) {
        throw new Error('Failed to sync Empty Containers', result);
      }
      loadEmptyContainersData();
      notify('Empty Containers data synced successfully', 'success', 3000);
    } catch (error) {
      console.error('Error loading Empty Containers:', error);
      notify('Failed to sync Empty Containers data', 'error', 3000);
      return [];
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Helper function to load data with current parameters
  const loadEmptyContainersData = useCallback(async() => {

    const params: {
        page: number;
        limit: number;
        departmentId?: number;
        fullPaid?: string;
        jobType?: number;
        SortBy?: string;
        SortOrder?: string;
      } = {
        page: 1,
        limit: 0, // 0 means no limit, load all data
      };

    const SortBy = 'OrderNo';
    const SortOrder = 'asc';

    params.SortBy = SortBy;
    params.SortOrder = SortOrder;

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

    console.log('Loading empty containers with params:', params);

    const data = await fetchEmptyContainers(params);
    return data;
  }, [paymentStatusFilter, departmentFilter]);

  useEffect(() => {
    setGridDataSource(new DataSource({
      key: '_id',
      load: async() => {
        const data = await loadEmptyContainersData();
        // If data has items, return items, else return data
        const returnedData = Array.isArray(data) ? data : (data?.items || []);
        return returnedData;
      },
    }));
  }, [loadEmptyContainersData]);

  // Highlight rows based on specific conditions
  const onRowPrepared = useCallback((e: DataGridTypes.RowPreparedEvent) => {
    if (e.rowType === 'data') {
      const { ArrivalDays, TejrimDays, DiffCntrToCnee, DepartmentId } = e.data;

      // Check if ArrivalDays > 0 and TejrimDays = 0 and DiffCntrToCnee = 0 and departmentId in (5, 16)
      if (ArrivalDays > 0 && TejrimDays === 0 && DiffCntrToCnee === 0 && [5, 16].includes(DepartmentId)) {
        e.rowElement.style.backgroundColor = '#E3F2FD';
      }
    }
  }, []);

  // Calculate total profit from the data source
  const onContentReady = useCallback((e: DataGridTypes.ContentReadyEvent) => {
    try {
      const gridInstance = e.component;
      const dataSource = gridInstance.getDataSource();

      if (dataSource) {
        // Get all items from the data source (this includes filtered data but not grouped)
        const allItems = dataSource.items();
        if (allItems && Array.isArray(allItems)) {
          const total = allItems.reduce((sum: number, item: IEmptyContainer) => {
            return sum + (item.TotalProfit || 0);
          }, 0);
          setTotalProfit(total);
        } else {
          // If items() doesn't work, load the data directly
          dataSource.load().then((data: IEmptyContainer[]) => {
            const total = data.reduce((sum, item) => sum + (item.TotalProfit || 0), 0);
            setTotalProfit(total);
          }).catch(() => {
            setTotalProfit(0);
          });
        }
      }
    } catch (error) {
      console.warn('Error calculating total profit:', error);
      setTotalProfit(0);
    }
  }, []);

  // Additional calculation when gridDataSource changes (for safety)
  useEffect(() => {
    if (gridDataSource) {
      gridDataSource.load().then((data: IEmptyContainer[]) => {
        if (Array.isArray(data)) {
          const total = data.reduce((sum, item) => sum + (item.TotalProfit || 0), 0);
          setTotalProfit(total);
        }
      }).catch(() => {
        setTotalProfit(0);
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
      key: '_id',
      load: loadEmptyContainersData,
    }));
  }, [loadEmptyContainersData]);

  const refresh = useCallback(() => {
    gridRef.current?.instance().refresh();
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
      load: loadEmptyContainersData,
    }));
  }, [loadEmptyContainersData]);

  return (
    <div className='view crm-contact-list'>
      <div className='view-wrapper view-wrapper-contact-list list-page'>
        <DataGrid
          className='grid theme-dependent'
          noDataText=''
          focusedRowEnabled
          height='100%'
          dataSource={gridDataSource}
          onRowPrepared={onRowPrepared}
          onExporting={onExporting}
          onContentReady={onContentReady}
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
                text={departement}
                dropDownOptions={dropDownOptions}
                useSelectMode
                onSelectionChanged={filterByJobDepartment}
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
            width={150}
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
            cellRender={(cell) => cellDateRender(cell, 'TejrimDate')}
            width={100}
          />
          <Column
            dataField='dtCntrToCnee'
            caption='Date To Cnee'
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
            dataField='MissingDocuments'
            caption='Missing Documents'
            width={100}
            cellRender={cellMissingDocumentsRender}
          />
          <Column
            dataField='ContainerNo'
            caption='Container#'
            width={100}
            visible={false}
          />
          <Column
            dataField='CarrierName'
            caption='Carrier Name'
            width={100}
            visible={false}
          />
          <Column
            dataField='UserName'
            caption='User Name'
            width={100}
            visible={false}
          />
          <Column
            dataField='Notes'
            caption='Notes'
            width={150}
          />
          <Column
            dataField='Departure'
            caption='Departure'
            width={100}
            visible={false}
          />
          <Column
            dataField='Destination'
            caption='Destination'
            width={100}
            visible={false}
          />
          <Column
            dataField='FullPaid'
            caption='Payment Status'
            dataType='boolean'
            width={120}
            cellRender={cellFullPaidRender}
          />
          <Column
            dataField='FullPaidDate'
            caption='Payment Date'
            dataType='date'
            visible={false}
            width={150}
            cellRender={(cell) => cellDateRender(cell, 'FullPaidDate')}
          />
          <Column
            dataField='TotalProfit'
            caption='Total Profit'
            dataType='number'
            width={100}
            cellRender={cellProfitRender}
            format='currency'
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
            //groupIndex={0}
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
              customizeText={(data) => {
                const value = typeof data.value === 'number' ? data.value : 0;
                const formattedValue = formatCurrency(value);
                return `Total: $ ${formattedValue}`;
              }}
              showInGroupFooter
            />
            {/* Add total summary for the entire grid */}
            <TotalItem
              column='TotalProfit'
              summaryType='sum'
              customizeText={(data) => {
                const value = typeof data.value === 'number' ? data.value : 0;
                const formattedValue = formatCurrency(value);
                return `Total: $ ${formattedValue}`;
              }}
            />
          </Summary>
          <SortByGroupSummaryInfo summaryItem='count' />
        </DataGrid>
        {/* <ContactPanel contactId={contactId} isOpened={isPanelOpened} changePanelOpened={changePanelOpened} changePanelPinned={changePanelPinned} /> */}
      </div>
    </div>
  );
};
