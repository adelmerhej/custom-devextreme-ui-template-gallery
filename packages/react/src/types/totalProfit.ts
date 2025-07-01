export interface TotalProfit {
  _id: string;
  JobDate: string; // ISO date string
  TotalProfit: number;
  StatusType: string;
  // Add other fields as needed
}

export interface TotalProfitResponse {
  success: boolean;
  data: TotalProfit[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number | null;
    grandTotalProfit: number;
  };
  error?: string;
}
