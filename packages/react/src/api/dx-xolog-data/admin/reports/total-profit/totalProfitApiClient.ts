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

    const response = await fetch(`${baseUrl}/total-profits${queryString ? `?${queryString}` : ''}`, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error('Failed to fetch total profits');
    }

    const data = await response.json();
    return data;

  } catch (error) { /* empty */ }

};

// Client-side function to fetch total profits (for React components)
export async function fetchTotalProfits(params: {
  page?: number;
  limit?: number;
  status?: string;
  token?: string;
} = {}) {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.status) queryParams.set('status', params.status);

    // Get the query string
    const queryString = queryParams.toString();

    // Use the getData function to fetch all total profits from MongoDB
    const signInResult = await signIn('admin@xolog.com', 'Admin@Xolog#16');
    let token: string | undefined = undefined;
    if (signInResult && signInResult.isOk && signInResult.data && signInResult.data.token) {
      token = signInResult.data.token;
    }

    params.token = token;

    const data = await getData(queryString, params.token);

    console.log('Total Profit:', data.sumOfTotalProfit, 'items:', data);

    // Return the data directly - assuming the API returns the expected format
    return data?.data || data || [];

  } catch (error: unknown) {
    console.error('Error fetching total profits:', error);

    throw error;
  }
}

// Alternative function with different parameters format
export async function getTotalProfitsData(options: {
  page?: number;
  limit?: number;
  status?: string;
  minProfit?: number;
  token?: string;
} = {}) {
  const defaultOptions = {
    page: 1,
    limit: 50,
    ...options
  };

  return fetchTotalProfits({
    page: defaultOptions.page,
    limit: defaultOptions.limit,
    status: defaultOptions.status,
    token: defaultOptions.token
  });
}
