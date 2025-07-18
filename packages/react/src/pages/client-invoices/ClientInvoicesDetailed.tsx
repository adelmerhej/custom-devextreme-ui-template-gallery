/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect } from 'react';
import { DataGrid, Column, type DataGridTypes } from 'devextreme-react/data-grid';
import { ArrayStore, DataSource } from 'devextreme-react/common/data';
import './InvoiceDetails.css';
import { IClientInvoice } from '@/types/clientInvoice';
// Importing data fetching function
import {
  fetchClientInvoices,
  syncClientInvoicesData,
} from '../../api/dx-xolog-data/admin/reports/client-invoice/clientInvoiceApi';

export const DetailTemplate = (props: DataGridTypes.MasterDetailTemplateData) => {
  const { Customer } = props.data.data;
  const [gridDataSource, setGridDataSource] = React.useState<DataSource | null>(null);

  const dataSource = new DataSource({
    store: new ArrayStore({
      data: props.data.data.Invoices || [],
      key: 'InvoiceNo', // Assuming InvoiceNo is unique for invoices
    }),
  });

  const loadClientInvoicesData = React.useCallback(async() => {
    // Simulate an API call to fetch client invoices data
    try {
      const clientInvoices = await fetchClientInvoices();
      //const masterDetailData = transformToMasterDetail(clientInvoices);
      return clientInvoices.invoices as IClientInvoice[];
    } catch (error) {
      console.error('Error loading client invoices:', error);
      return [];
    }
  }, []);

  useEffect(() => {
    const dataSource = new DataSource({
      key: 'JobNo',
      load: loadClientInvoicesData,
    });

    setGridDataSource(dataSource);
  }, [loadClientInvoicesData]);

  return (
    <React.Fragment>
      <div className='master-detail-caption'>
        {`${Customer}'s Invoices:`}
      </div>
      <DataGrid
        dataSource={dataSource}
        showBorders
        columnAutoWidth
      >
        <Column dataField='InvoiceNo' />
        <Column dataField='InvoiceDate' dataType='date' />
        <Column dataField='DueDate' dataType='date' />
        <Column dataField='CurrencyCode' />
        <Column dataField='TotalAmount' />
        <Column dataField='TotalReceived' />
        <Column dataField='TotalDue' />
      </DataGrid>
    </React.Fragment>
  );
};

