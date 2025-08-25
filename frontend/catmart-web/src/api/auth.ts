import { goApiClient } from './goClient';
import { pyApiClient } from './pyClient';

// Re-export clients and types for easy access
export { goApiClient, pyApiClient };
export type { Product, Order, AuthResponse } from './goClient';
export type { RecommendationResponse, SalesReportResponse } from './pyClient';
