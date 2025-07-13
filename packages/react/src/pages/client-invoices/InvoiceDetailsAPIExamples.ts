// Example: How to Query Invoice Details from API
// This file demonstrates various ways to query invoice details

import {
  fetchInvoiceDetails,
  fetchJobsWithInvoiceDetails,
  getSampleInvoiceDetails
} from '../../api/dx-xolog-data/admin/reports/client-invoice/clientInvoiceApiClient';

// Enhanced interface for invoice details with all fields
export interface IInvoiceDetailComplete {
  _id: string;
  JobNo: number;
  DepartmentId: number;
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

/**
 * Example 1: Query invoice details for a specific job
 */
export async function queryInvoiceDetailsExample(jobNo: number, departmentId: number, token?: string): Promise<IInvoiceDetailComplete[]> {
  try {
    console.log(`🔍 Querying invoice details for Job #${jobNo}...`);

    // Call the API to get invoice details
    const invoiceDetails = await fetchInvoiceDetails(jobNo, departmentId, { token });

    console.log(`✅ Found ${invoiceDetails.length} invoice details:`, invoiceDetails);

    // Process the data as needed
    const processedDetails = invoiceDetails.map((detail: IInvoiceDetailComplete) => ({
      ...detail,
      // Add any additional processing
      formattedAmount: `$${detail.TotalInvoiceAmount?.toLocaleString() || '0.00'}`,
      isOverdue: detail.DueDate ? new Date(detail.DueDate) < new Date() : false,
      profitMargin: detail.TotalInvoiceAmount ?
        `${((detail.InvoiceProfit || 0) / detail.TotalInvoiceAmount * 100).toFixed(2)}%` : '0%'
    }));

    return processedDetails;
  } catch (error) {
    console.error('❌ Error querying invoice details:', error);

    // Fallback to sample data for demonstration
    console.log('📋 Using sample data as fallback...');
    return getSampleInvoiceDetails(jobNo) as IInvoiceDetailComplete[];
  }
}

/**
 * Example 2: Query all jobs with their invoice details
 */
export async function queryJobsWithInvoiceDetailsExample(params: {
  page?: number;
  limit?: number;
  departmentId?: number;
  token?: string;
}) {
  try {
    console.log('🔍 Querying jobs with invoice details...', params);

    const jobsWithDetails = await fetchJobsWithInvoiceDetails({
      ...params,
      includeInvoiceDetails: true
    });

    console.log(`✅ Found ${jobsWithDetails.length} jobs with invoice details:`, jobsWithDetails);

    // Calculate summary statistics
    const summary = jobsWithDetails.reduce((acc, job) => {
      const invoiceCount = job.invoiceDetails?.length || 0;
      const totalAmount = job.invoiceDetails?.reduce((sum, inv) => sum + (inv.TotalInvoiceAmount || 0), 0) || 0;
      const totalProfit = job.invoiceDetails?.reduce((sum, inv) => sum + (inv.InvoiceProfit || 0), 0) || 0;

      return {
        totalJobs: acc.totalJobs + 1,
        totalInvoices: acc.totalInvoices + invoiceCount,
        totalAmount: acc.totalAmount + totalAmount,
        totalProfit: acc.totalProfit + totalProfit
      };
    }, { totalJobs: 0, totalInvoices: 0, totalAmount: 0, totalProfit: 0 });

    console.log('📊 Summary:', summary);

    return {
      jobs: jobsWithDetails,
      summary
    };
  } catch (error) {
    console.error('❌ Error querying jobs with invoice details:', error);
    throw error;
  }
}

/**
 * Example 3: Filter invoice details by status
 */
export async function filterInvoiceDetailsByStatus(
  jobNo: number,
  departmentId: number,
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled',
  token?: string
): Promise<IInvoiceDetailComplete[]> {
  try {
    const allInvoiceDetails = await fetchInvoiceDetails(jobNo, departmentId, { token });

    const filteredDetails = allInvoiceDetails.filter((detail: IInvoiceDetailComplete) =>
      detail.InvoiceStatus === status
    );

    console.log(`📋 Found ${filteredDetails.length} invoices with status '${status}' for Job #${jobNo}`);

    return filteredDetails;
  } catch (error) {
    console.error('❌ Error filtering invoice details:', error);
    return [];
  }
}

/**
 * Example 4: Get invoice details statistics
 */
export async function getInvoiceDetailsStatistics(jobNo: number, departmentId:number, token?: string) {
  try {
    const invoiceDetails = await fetchInvoiceDetails(jobNo, departmentId, { token });

    const stats = {
      totalInvoices: invoiceDetails.length,
      totalAmount: invoiceDetails.reduce((sum, inv) => sum + (inv.TotalInvoiceAmount || 0), 0),
      totalProfit: invoiceDetails.reduce((sum, inv) => sum + (inv.InvoiceProfit || 0), 0),
      totalTax: invoiceDetails.reduce((sum, inv) => sum + (inv.TaxAmount || 0), 0),
      statusBreakdown: {
        draft: invoiceDetails.filter(inv => inv.InvoiceStatus === 'Draft').length,
        sent: invoiceDetails.filter(inv => inv.InvoiceStatus === 'Sent').length,
        paid: invoiceDetails.filter(inv => inv.InvoiceStatus === 'Paid').length,
        overdue: invoiceDetails.filter(inv =>
          inv.DueDate && new Date(inv.DueDate) < new Date() && inv.PaymentStatus !== 'Completed'
        ).length
      },
      paymentBreakdown: {
        pending: invoiceDetails.filter(inv => inv.PaymentStatus === 'Pending').length,
        completed: invoiceDetails.filter(inv => inv.PaymentStatus === 'Completed').length,
        partial: invoiceDetails.filter(inv => inv.PaymentStatus === 'Partial').length,
        notSent: invoiceDetails.filter(inv => inv.PaymentStatus === 'Not Sent').length
      }
    };

    console.log(`📊 Invoice Statistics for Job #${jobNo}:`, stats);

    return stats;
  } catch (error) {
    console.error('❌ Error calculating invoice statistics:', error);
    return null;
  }
}

/**
 * Example 5: Sample data for testing
 */
export function getSampleInvoiceDetailsData(jobNo = 12345, departmentId = 16): IInvoiceDetailComplete[] {
  return [
    {
      _id: `${jobNo}-inv-001`,
      JobNo: jobNo,
      DepartmentId: departmentId,
      InvoiceNo: `INV-${jobNo}-001`,
      InvoiceDate: new Date('2024-01-15'),
      DueDate: new Date('2024-02-15'),
      TotalInvoiceAmount: 15000.00,
      InvoiceProfit: 3000.00,
      InvoiceStatus: 'Sent',
      PaymentStatus: 'Pending',
      ClientName: 'ABC Corporation',
      Description: 'Freight charges for sea export - Container handling and documentation',
      Currency: 'USD',
      TaxAmount: 1500.00,
      NetAmount: 13500.00,
      CreatedBy: 'admin@xolog.com',
      CreatedAt: new Date('2024-01-15'),
      UpdatedAt: new Date('2024-01-15')
    },
    {
      _id: `${jobNo}-inv-002`,
      JobNo: jobNo,
      DepartmentId: departmentId,
      InvoiceNo: `INV-${jobNo}-002`,
      InvoiceDate: new Date('2024-01-20'),
      DueDate: new Date('2024-02-20'),
      TotalInvoiceAmount: 8500.00,
      InvoiceProfit: 1700.00,
      InvoiceStatus: 'Paid',
      PaymentStatus: 'Completed',
      ClientName: 'XYZ Limited',
      Description: 'Customs clearance charges and duty payments',
      Currency: 'USD',
      TaxAmount: 850.00,
      NetAmount: 7650.00,
      CreatedBy: 'admin@xolog.com',
      CreatedAt: new Date('2024-01-20'),
      UpdatedAt: new Date('2024-01-25')
    },
    {
      _id: `${jobNo}-inv-003`,
      JobNo: jobNo,
      DepartmentId: departmentId,
      InvoiceNo: `INV-${jobNo}-003`,
      InvoiceDate: new Date('2024-01-25'),
      DueDate: new Date('2024-02-25'),
      TotalInvoiceAmount: 12000.00,
      InvoiceProfit: 2400.00,
      InvoiceStatus: 'Draft',
      PaymentStatus: 'Not Sent',
      ClientName: 'Global Shipping Inc.',
      Description: 'Additional handling charges for oversized cargo',
      Currency: 'USD',
      TaxAmount: 1200.00,
      NetAmount: 10800.00,
      CreatedBy: 'admin@xolog.com',
      CreatedAt: new Date('2024-01-25'),
      UpdatedAt: new Date('2024-01-25')
    },
    {
      _id: `${jobNo}-inv-004`,
      JobNo: jobNo,
      DepartmentId: departmentId,
      InvoiceNo: `INV-${jobNo}-004`,
      InvoiceDate: new Date('2024-02-01'),
      DueDate: new Date('2024-01-20'), // Overdue
      TotalInvoiceAmount: 5500.00,
      InvoiceProfit: 1100.00,
      InvoiceStatus: 'Sent',
      PaymentStatus: 'Pending',
      ClientName: 'Maritime Solutions Ltd.',
      Description: 'Port charges and terminal fees',
      Currency: 'USD',
      TaxAmount: 550.00,
      NetAmount: 4950.00,
      CreatedBy: 'admin@xolog.com',
      CreatedAt: new Date('2024-02-01'),
      UpdatedAt: new Date('2024-02-01')
    }
  ];
}

// Export the usage examples for easy testing
export const InvoiceDetailsAPIExamples = {
  queryInvoiceDetailsExample,
  queryJobsWithInvoiceDetailsExample,
  filterInvoiceDetailsByStatus,
  getInvoiceDetailsStatistics,
  getSampleInvoiceDetailsData
};
