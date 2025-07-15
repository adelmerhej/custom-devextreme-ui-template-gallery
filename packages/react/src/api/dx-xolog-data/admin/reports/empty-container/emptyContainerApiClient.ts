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

    const response = await fetch(`${baseUrl}/empty-containers${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Empty Containers');
    }

    const data = await response.json();
    return data;

  } catch (error) { /* empty */ }

};

// Client-side function to fetch Empty Containers (for React components)
export async function fetchEmptyContainers(params: {
  page?: number;
  limit?: number;
  status?: string;
  token?: string;
  fullPaid?: string;
  departmentId?: number;
  jobType?: number;
  SortBy?: string;
  SortOrder?: string;
} = {}) {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.status) queryParams.set('status', params.status);
    if (params.departmentId) queryParams.set('departmentId', params.departmentId.toString());
    if (params.fullPaid) queryParams.set('fullPaid', params.fullPaid.toString());
    if (params.jobType) queryParams.set('jobType', params.jobType.toString());
    if (params.SortBy) queryParams.set('sortBy', params.SortBy);
    if (params.SortOrder) queryParams.set('sortOrder', params.SortOrder);

    // Get the query string
    const queryString = queryParams.toString();

    // Use the getData function to fetch all Empty Containers from MongoDB
    const signInResult = await signIn('admin@xolog.com', 'Admin@Xolog#16');
    let token: string | undefined = undefined;
    if (signInResult && signInResult.isOk && signInResult.data && signInResult.data.token) {
      token = signInResult.data.token;
    }

    params.token = token;

    const data = await getData(queryString, params.token);

    // Return the full response with totalProfit for the component to use
    return data?.data || data || [];

  } catch (error: unknown) {
    console.error('Error fetching Empty Containers:', error);

    throw error;
  }
}

export async function syncEmptyContainersData() {
  try {

    // Use the getData function to fetch all Client Invoices from MongoDB
    const signInResult = await signIn('admin@xolog.com', 'Admin@Xolog#16');
    let token: string | undefined = undefined;
    if (signInResult && signInResult.isOk && signInResult.data && signInResult.data.token) {
      token = signInResult.data.token;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if token is provided
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/sync/sync-empty-containers`, {
      method: 'POST',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error('Failed to sync sync Empty Containers');
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error syncing Empty Containers:', error);
    throw error;
  }
}
