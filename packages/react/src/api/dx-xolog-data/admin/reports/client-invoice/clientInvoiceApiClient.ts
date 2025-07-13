/* eslint-disable no-undef */
import { signIn } from '../../../../auth';

const baseUrl = `${process.env.REACT_APP_API_URL}/api/v1/admin/reports`;

const getData = async(queryString?: string, token?: string) => {

  try {

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if token is provided
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}/client-invoices${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Client Invoices');
    }

    const data = await response.json();
    return data;

  } catch (error) { /* empty */ }

};

// Client-side function to fetch Client Invoices (for React components)
export async function fetchClientInvoices(params: {
  page?: number;
  limit?: number;
  jobStatusType?: string;
  token?: string;
  fullPaid?: string;
  statusType?: string;
  departmentId?: number;
  jobType?: number;
} = {}) {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.jobStatusType) queryParams.set('jobStatusType', params.jobStatusType);
    if (params.statusType) queryParams.set('statusType', params.statusType);
    if (params.departmentId) queryParams.set('departmentId', params.departmentId.toString());
    if (params.fullPaid) queryParams.set('fullPaid', params.fullPaid.toString());
    if (params.jobType) queryParams.set('jobType', params.jobType.toString());

    // Get the query string
    const queryString = queryParams.toString();

    // Use the getData function to fetch all Client Invoices from MongoDB
    const signInResult = await signIn('admin@xolog.com', 'Admin@Xolog#16');
    let token: string | undefined = undefined;
    if (signInResult && signInResult.isOk && signInResult.data && signInResult.data.token) {
      token = signInResult.data.token;
    }

    params.token = token;

    const data = await getData(queryString, params.token);

    // Return the data directly - assuming the API returns the expected format
    return data?.data || data || [];

  } catch (error: unknown) {
    console.error('Error fetching Client Invoices:', error);

    throw error;
  }
}

// Alternative function with different parameters format
export async function getClientInvoicesData(options: {
  page?: number;
  limit?: number;
  jobStatusType?: string;
  token?: string;
} = {}) {
  const defaultOptions = {
    page: 1,
    limit: 50,
    ...options
  };

  return fetchClientInvoices({
    page: defaultOptions.page,
    limit: defaultOptions.limit,
    jobStatusType: defaultOptions.jobStatusType,
    token: defaultOptions.token
  });
}

// Function to fetch invoice details for a specific job
export async function fetchInvoiceDetails(jobNo: number, departmentId: number, params: {
  token?: string;
} = {}) {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if token is provided
    if (params.token) {
      headers.Authorization = `Bearer ${params.token}`;
    }

    const response = await fetch(`${baseUrl}/invoice-details/${jobNo}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Invoice Details');
    }

    const data = await response.json();
    return data?.data || data || [];

  } catch (error) {
    console.error('Error fetching Invoice Details:', error);

    // Return sample data if API fails (for demonstration)
    return getSampleInvoiceDetails(jobNo);
  }
}

// Sample data for invoice details (for demonstration purposes)
export function getSampleInvoiceDetails(jobNo: number) {
  return [
    {
      _id: `${jobNo}-inv-001`,
      JobNo: jobNo,
      InvoiceNo: `INV-${jobNo}-001`,
      InvoiceDate: new Date('2024-01-15'),
      DueDate: new Date('2024-02-15'),
      TotalInvoiceAmount: 15000.00,
      InvoiceProfit: 3000.00,
      InvoiceStatus: 'Sent',
      PaymentStatus: 'Pending',
      ClientName: 'ABC Corporation',
      Description: 'Freight charges for sea export',
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
      InvoiceNo: `INV-${jobNo}-002`,
      InvoiceDate: new Date('2024-01-20'),
      DueDate: new Date('2024-02-20'),
      TotalInvoiceAmount: 8500.00,
      InvoiceProfit: 1700.00,
      InvoiceStatus: 'Paid',
      PaymentStatus: 'Completed',
      ClientName: 'XYZ Limited',
      Description: 'Customs clearance charges',
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
      InvoiceNo: `INV-${jobNo}-003`,
      InvoiceDate: new Date('2024-01-25'),
      DueDate: new Date('2024-02-25'),
      TotalInvoiceAmount: 12000.00,
      InvoiceProfit: 2400.00,
      InvoiceStatus: 'Draft',
      PaymentStatus: 'Not Sent',
      ClientName: 'Global Shipping Inc.',
      Description: 'Additional handling charges',
      Currency: 'USD',
      TaxAmount: 1200.00,
      NetAmount: 10800.00,
      CreatedBy: 'admin@xolog.com',
      CreatedAt: new Date('2024-01-25'),
      UpdatedAt: new Date('2024-01-25')
    }
  ];
}

// Function to fetch all jobs with their invoice details
export async function fetchJobsWithInvoiceDetails(params: {
  page?: number;
  limit?: number;
  jobStatusType?: string;
  token?: string;
  fullPaid?: string;
  statusType?: string;
  departmentId?: number;
  jobType?: number;
  includeInvoiceDetails?: boolean;
} = {}) {
  try {
    // First get the main jobs data
    const jobs = await fetchClientInvoices(params);

    // If includeInvoiceDetails is true, fetch invoice details for each job
    if (params.includeInvoiceDetails) {
      const jobsWithDetails = await Promise.all(
        jobs.map(async(job: Record<string, unknown>) => {
          const invoiceDetails = await fetchInvoiceDetails(
            job.JobNo as number,
            job.departmentId as number,
            { token: params.token }
          );
          return {
            ...job,
            invoiceDetails
          };
        })
      );
      return jobsWithDetails;
    }

    return jobs;
  } catch (error) {
    console.error('Error fetching Jobs with Invoice Details:', error);
    throw error;
  }
}
