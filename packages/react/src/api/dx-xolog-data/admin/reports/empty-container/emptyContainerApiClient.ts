/* eslint-disable no-undef */
import { signIn } from '../../../../auth';

const baseUrl = 'http://192.168.88.14:5055/api/v1/admin/reports';

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
    console.log('Fetched data:', data);
    return data;

  } catch (error) { /* empty */ }

};

// Client-side function to fetch Empty Containers (for React components)
export async function fetchEmptyContainers(params: {
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

    console.log('Fetching from:', `${baseUrl}/empty-containers${queryString ? `?${queryString}` : ''}`);

    // Use the getData function to fetch all Empty Containers from MongoDB
    const signInResult = await signIn('admin@xolog.com', 'Admin@Xolog#16');
    let token: string | undefined = undefined;
    if (signInResult && signInResult.isOk && signInResult.data && signInResult.data.token) {
      token = signInResult.data.token;
    }

    params.token = token;

    const data = await getData(queryString, params.token);

    console.log('API Response:', data);

    // Return the data directly - assuming the API returns the expected format
    return data?.data || data || [];

  } catch (error: unknown) {
    console.error('Error fetching Empty Containers:', error);

    throw error;
  }
}

// Alternative function with different parameters format
export async function getEmptyContainersData(options: {
  page?: number;
  limit?: number;
  status?: string;
  token?: string;
} = {}) {
  const defaultOptions = {
    page: 1,
    limit: 50,
    ...options
  };

  return fetchEmptyContainers({
    page: defaultOptions.page,
    limit: defaultOptions.limit,
    status: defaultOptions.status,
    token: defaultOptions.token
  });
}
