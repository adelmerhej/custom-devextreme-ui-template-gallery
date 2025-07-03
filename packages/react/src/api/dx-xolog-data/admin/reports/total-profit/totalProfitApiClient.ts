/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-unused-vars */
//import axios, { AxiosError } from 'axios';

import { signIn } from '@/api/auth';

// Base URL for API requests
// eslint-disable-next-line no-undef
const baseUrl = process.env.REACT_APP_API_URL || 'http://192.168.88.14:5055/api/v1/admin/reports';

// Generic getData function following the pattern you specified
const getData = async(queryString?: string, token?: string) => {
//   const url = `${baseUrl}/api/v1/admin/reports/total-profits${queryString ? `?${queryString}` : ''}`;
//   return (await axios.get(url)).data;

  try {
    const token = await signIn('admin@xolog.com', 'Admin@Xolog#16');
    console.log('Using token:', token);

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
    console.log('Fetched data:', data);
    return data;

  } catch (error) { /* empty */ }

};

// Client-side function to fetch total profits (for React components)
export async function fetchTotalProfits(params: {
  page?: number;
  limit?: number;
  status?: string;
  TotalProfit?: number;
  token?: string;
} = {}) {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.status) queryParams.set('status', params.status);
    if (params.TotalProfit) queryParams.set('TotalProfit', params.TotalProfit.toString());

    // Get the query string
    const queryString = queryParams.toString();

    console.log('Fetching from:', `${baseUrl}/api/v1/admin/reports/total-profits${queryString ? `?${queryString}` : ''}`);

    // Use the getData function to fetch all total profits from MongoDB
    const data = await getData(queryString, params.token);

    console.log('API Response:', data);

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
    TotalProfit: defaultOptions.minProfit,
    token: defaultOptions.token
  });
}
