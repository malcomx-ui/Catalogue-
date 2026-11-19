import { MortgageService } from './mortgageService';

export interface CentenaryPageFilters {
  search?: string;
  month?: string;
  branch?: string;
  status?: string;
}

/**
 * Fetches a paginated slice of Centenary Bank mortgage cases with only lightweight summary columns.
 * Uses the application's shared Supabase client and automatically targets the active Centenary table.
 */
export async function fetchCentenaryMortgagesPage(
  page: number = 1,
  pageSize: number = 25,
  filters?: CentenaryPageFilters
): Promise<{ data: any[]; count: number }> {
  const result = await MortgageService.fetchCentenaryMortgagesPage(page, pageSize, filters);
  return { data: result.data, count: result.count };
}

export async function fetchCentenaryMortgageById(id: string): Promise<any | null> {
  return MortgageService.fetchMortgageById(id, 'Centenary Bank');
}

export { MortgageService };
