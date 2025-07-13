# Invoice Details API Usage Guide

This guide demonstrates how to query `invoiceDetails` from the API with sample data and real-world examples.

## API Functions Available

### 1. `fetchInvoiceDetails(jobNo, params)`
Fetches invoice details for a specific job number.

```typescript
import { fetchInvoiceDetails } from '../../api/dx-xolog-data/admin/reports/client-invoice/clientInvoiceApiClient';

// Basic usage
const invoiceDetails = await fetchInvoiceDetails('12345');

// With authentication token
const invoiceDetails = await fetchInvoiceDetails('12345', { 
  token: 'your-auth-token' 
});
```

### 2. `fetchJobsWithInvoiceDetails(params)`
Fetches jobs along with their associated invoice details.

```typescript
import { fetchJobsWithInvoiceDetails } from '../../api/dx-xolog-data/admin/reports/client-invoice/clientInvoiceApiClient';

const jobsWithDetails = await fetchJobsWithInvoiceDetails({
  page: 1,
  limit: 50,
  includeInvoiceDetails: true,
  departmentId: 16,
  token: 'your-auth-token'
});
```

### 3. `getSampleInvoiceDetails(jobNo)`
Returns sample invoice details data for testing and development.

```typescript
import { getSampleInvoiceDetails } from '../../api/dx-xolog-data/admin/reports/client-invoice/clientInvoiceApiClient';

const sampleData = getSampleInvoiceDetails('12345');
console.log(sampleData);
```

## Data Structure

### Invoice Detail Interface
```typescript
interface IInvoiceDetail {
  _id: string;
  JobNo: string;
  InvoiceNo?: string;
  InvoiceDate?: Date;
  DueDate?: Date;
  TotalInvoiceAmount?: number;
  InvoiceProfit?: number;
  InvoiceStatus?: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  PaymentStatus?: 'Pending' | 'Completed' | 'Partial' | 'Not Sent' | 'Failed';
  ClientName?: string;
  Description?: string;
  Currency?: 'USD' | 'EUR' | 'GBP' | 'AED';
  TaxAmount?: number;
  NetAmount?: number;
  CreatedBy?: string;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}
```

## Sample Data Examples

### Single Job Invoice Details
```json
[
  {
    "_id": "12345-inv-001",
    "JobNo": "12345",
    "InvoiceNo": "INV-12345-001",
    "InvoiceDate": "2024-01-15T00:00:00.000Z",
    "DueDate": "2024-02-15T00:00:00.000Z",
    "TotalInvoiceAmount": 15000.00,
    "InvoiceProfit": 3000.00,
    "InvoiceStatus": "Sent",
    "PaymentStatus": "Pending",
    "ClientName": "ABC Corporation",
    "Description": "Freight charges for sea export",
    "Currency": "USD",
    "TaxAmount": 1500.00,
    "NetAmount": 13500.00,
    "CreatedBy": "admin@xolog.com",
    "CreatedAt": "2024-01-15T00:00:00.000Z",
    "UpdatedAt": "2024-01-15T00:00:00.000Z"
  },
  {
    "_id": "12345-inv-002",
    "JobNo": "12345",
    "InvoiceNo": "INV-12345-002",
    "InvoiceDate": "2024-01-20T00:00:00.000Z",
    "DueDate": "2024-02-20T00:00:00.000Z",
    "TotalInvoiceAmount": 8500.00,
    "InvoiceProfit": 1700.00,
    "InvoiceStatus": "Paid",
    "PaymentStatus": "Completed",
    "ClientName": "XYZ Limited",
    "Description": "Customs clearance charges",
    "Currency": "USD",
    "TaxAmount": 850.00,
    "NetAmount": 7650.00,
    "CreatedBy": "admin@xolog.com",
    "CreatedAt": "2024-01-20T00:00:00.000Z",
    "UpdatedAt": "2024-01-25T00:00:00.000Z"
  }
]
```

## Usage Examples in React Components

### Example 1: Fetch and Display Invoice Details
```typescript
import React, { useState, useEffect } from 'react';
import { fetchInvoiceDetails } from '../../api/dx-xolog-data/admin/reports/client-invoice/clientInvoiceApiClient';

const InvoiceDetailsComponent = ({ jobNo }: { jobNo: string }) => {
  const [invoiceDetails, setInvoiceDetails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoiceDetails = async () => {
      try {
        setLoading(true);
        const details = await fetchInvoiceDetails(jobNo);
        setInvoiceDetails(details);
      } catch (error) {
        console.error('Error loading invoice details:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInvoiceDetails();
  }, [jobNo]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3>Invoice Details for Job #{jobNo}</h3>
      {invoiceDetails.map((invoice) => (
        <div key={invoice._id}>
          <p>Invoice: {invoice.InvoiceNo}</p>
          <p>Amount: ${invoice.TotalInvoiceAmount}</p>
          <p>Status: {invoice.PaymentStatus}</p>
        </div>
      ))}
    </div>
  );
};
```

### Example 2: Master-Detail Grid with Invoice Details
```typescript
// Used in DataGrid MasterDetail template
const InvoiceDetailTemplate = ({ data }: { data: IJobMaster }) => {
  const [invoiceDetails, setInvoiceDetails] = useState([]);

  useEffect(() => {
    fetchInvoiceDetails(data.JobNo).then(setInvoiceDetails);
  }, [data.JobNo]);

  return (
    <DataGrid dataSource={invoiceDetails}>
      <Column dataField="InvoiceNo" caption="Invoice#" />
      <Column dataField="TotalInvoiceAmount" caption="Amount" format="currency" />
      <Column dataField="PaymentStatus" caption="Status" />
    </DataGrid>
  );
};
```

### Example 3: Filter Invoice Details by Status
```typescript
const filterInvoicesByStatus = async (jobNo: string, status: string) => {
  const allInvoices = await fetchInvoiceDetails(jobNo);
  return allInvoices.filter(invoice => invoice.PaymentStatus === status);
};

// Usage
const pendingInvoices = await filterInvoicesByStatus('12345', 'Pending');
const paidInvoices = await filterInvoicesByStatus('12345', 'Completed');
```

### Example 4: Calculate Invoice Statistics
```typescript
const calculateInvoiceStatistics = async (jobNo: string) => {
  const invoices = await fetchInvoiceDetails(jobNo);
  
  return {
    totalAmount: invoices.reduce((sum, inv) => sum + (inv.TotalInvoiceAmount || 0), 0),
    totalProfit: invoices.reduce((sum, inv) => sum + (inv.InvoiceProfit || 0), 0),
    pendingCount: invoices.filter(inv => inv.PaymentStatus === 'Pending').length,
    paidCount: invoices.filter(inv => inv.PaymentStatus === 'Completed').length,
  };
};
```

## API Endpoints

The API functions call the following endpoints:

- **GET** `/api/v1/admin/reports/invoice-details/{jobNo}` - Get invoice details for a specific job
- **GET** `/api/v1/admin/reports/client-invoices?includeInvoiceDetails=true` - Get jobs with invoice details

## Error Handling

```typescript
try {
  const invoiceDetails = await fetchInvoiceDetails(jobNo);
  // Process the data
} catch (error) {
  console.error('Error fetching invoice details:', error);
  
  // Fallback to sample data
  const sampleData = getSampleInvoiceDetails(jobNo);
  // Use sample data for demonstration
}
```

## Testing with Sample Data

For development and testing purposes, you can use the sample data functions:

```typescript
// Get sample data for any job number
const sampleInvoices = getSampleInvoiceDetails('TEST-JOB-001');

// The sample data includes various invoice statuses and payment states
console.log('Sample invoice details:', sampleInvoices);
```

This provides a complete foundation for working with invoice details in your application, whether you're fetching from a real API or using sample data for development.
