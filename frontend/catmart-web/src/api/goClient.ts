const API_BASE_URL = import.meta.env.VITE_GO_API_URL || 'http://localhost:8080';

export interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  image: string;
  description: string;
  stock_quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  items: OrderItem[];
  created_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: Product;
}

export interface CreateOrderRequest {
  items: {
    productId: string;
    qty: number;
  }[];
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    created_at: string;
  };
}

class GoApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api`;
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
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  private getAuthHeaders(token: string) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  // Auth endpoints
  async register(email: string, password: string): Promise<{ user: AuthResponse['user'] }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Product endpoints
  async getProducts(query?: string, category?: string): Promise<Product[]> {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (category) params.append('category', category);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/products?${queryString}` : '/products';
    
    return this.request(endpoint);
  }

  async getProduct(id: string): Promise<Product> {
    return this.request(`/products/${id}`);
  }

  // Order endpoints (require authentication)
  async createOrder(orderData: CreateOrderRequest, token: string): Promise<{ orderId: string; total: number }> {
    return this.request('/orders', {
      method: 'POST',
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(orderData),
    });
  }

  async getMyOrders(token: string): Promise<Order[]> {
    return this.request('/orders/my', {
      headers: this.getAuthHeaders(token),
    });
  }
}

export const goApiClient = new GoApiClient();
