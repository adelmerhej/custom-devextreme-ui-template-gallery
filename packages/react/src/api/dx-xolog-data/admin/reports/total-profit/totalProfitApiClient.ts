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

    const response = await fetch(
      `${baseUrl}/total-profits${queryString ? `?${queryString}` : ''}`,
      {
        method: 'GET',
        headers: headers,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch total profits');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    /* empty */
  }
};

// Client-side function to fetch total profits (for React components)
export async function fetchTotalProfits(
  params: {
    page?: number;
    limit?: number;
    status?: string;
    statusType?: string;
    token?: string;
  } = {}
) {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.status) queryParams.set('status', params.status);
    if (params.statusType) queryParams.set('statusType', params.statusType);

    // Get the query string
    const queryString = queryParams.toString();

    // Use the getData function to fetch all total profits from MongoDB
    const signInResult = await signIn('admin@xolog.com', 'Admin@Xolog#16');
    let token: string | undefined = undefined;
    if (
      signInResult &&
      signInResult.isOk &&
      signInResult.data &&
      signInResult.data.token
    ) {
      token = signInResult.data.token;
    }

    params.token = token;

    const data = await getData(queryString, params.token);

    // Return the data directly - assuming the API returns the expected format
    return data?.data || data || [];
  } catch (error: unknown) {
    console.error('Error fetching total profits:', error);

    throw error;
  }
}

export async function syncTotalProfitData() {
  try {
    // Use the getData function to fetch all Client Invoices from MongoDB
    const signInResult = await signIn('admin@xolog.com', 'Admin@Xolog#16');
    let token: string | undefined = undefined;
    if (
      signInResult &&
      signInResult.isOk &&
      signInResult.data &&
      signInResult.data.token
    ) {
      token = signInResult.data.token;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if token is provided
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/api/v1/sync/sync-total-profit`,
      {
        method: 'POST',
        headers: headers,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to sync sync Total Profit');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error syncing Total Profit:', error);
    throw error;
  }
}
