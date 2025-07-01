/* eslint-disable @typescript-eslint/no-explicit-any */
// services/totalProfitsService.ts
// Assuming you have a type definition for TotalProfit
import type { TotalProfitModel } from '@/models/admin/reports/TotalProfit';

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  grandTotalProfit: number;
}

export interface TotalProfitsApiResponse {
  success: boolean;
  data: typeof TotalProfitModel[];
  pagination: Pagination;
  error?: string;
}

/**
 * Fetches total profits from the API.
 * @param params - Optional parameters for filtering and pagination.
 * @param params.status - Filter by status.
 * @param params.page - Current page number.
 * @param params.limit - Number of items per page.
 * @returns A promise that resolves to TotalProfitsApiResponse.
 */
export const fetchTotalProfits = async(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<TotalProfitsApiResponse> => {
  const { status, page, limit } = params || {};
  const queryParams = new URLSearchParams();

  if (status) {
    queryParams.append('status', status);
  }
  if (page) {
    queryParams.append('page', page.toString());
  }
  if (limit) {
    queryParams.append('limit', limit.toString());
  }

  const queryString = queryParams.toString();
  const url = `/api/total-profits${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Something went wrong');
    }
    const data: TotalProfitsApiResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error fetching total profits:', error);
    return {
      success: false,
      data: [],
      pagination: {
        page: params?.page || 1,
        limit: params?.limit || 0,
        total: 0,
        totalPages: 0,
        grandTotalProfit: 0,
      },
      error: error.message || 'Failed to fetch total profits',
    };
  }
};
