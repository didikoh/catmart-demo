const API_BASE_URL = import.meta.env.VITE_PY_API_URL || 'http://localhost:8090';

export interface RecommendationResponse {
  userId: string;
  items: string[];
  algorithm: string;
  message?: string;
  error?: string;
}

export interface SalesReportResponse {
  range: string;
  csvUrl: string;
  pngUrl: string;
  generatedAt: string;
  totalSales: number;
  totalOrders: number;
}

class PyApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/ml`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // ML endpoints
  async getRecommendations(userId: string): Promise<RecommendationResponse> {
    return this.request(`/recommendations?userId=${encodeURIComponent(userId)}`);
  }

  async generateSalesReport(range: '7d' | '30d'): Promise<SalesReportResponse> {
    return this.request(`/reports/sales?range=${range}`);
  }

  // Helper method to get full URL for static assets
  getStaticUrl(path: string): string {
    return `${API_BASE_URL}${path}`;
  }
}

export const pyApiClient = new PyApiClient();
