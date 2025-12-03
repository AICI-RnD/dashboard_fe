export type Period = "hour" | "day" | "month" | "year" | "None"

export interface CountResponse {
  period: Period
  start_date: string
  end_date: string
  count: number
}

export interface TimeResponse {
  period: Period
  start_date: string
  end_date: string
  avg_response_time?: number
  avg_completion_time?: number
  avg_customer_response_time?: number
}

export interface AutomationRateResponse {
  period: Period
  start_date: string
  end_date: string
  avg_automation_rate: number
}

export interface DashboardData {
  automationRate: number
  customerResponseTime: number
  agentResponseTime: number
  orderCompletionTime: number
  newOrders: number
  returningCustomers: number
  newCustomers: number
  loading: boolean
  error: string | null
}

export interface Customer {
  id: number
  name: string
  phone: string
  email: string
  control_mode: "BOT" | "ADMIN"
}

export interface Session {
  id: number
  started_at: string
  last_active_at: string
  ended_at: string
}

export interface CustomerSessionsResponse {
  customer_id: number
  sessions: Session[]
}

export interface CustomerAppointmentCountResponse {
  customer_id: number
  appointment_completions: number
}

export interface CustomerTimeResponse {
  customer_id: number
  period: Period
  start_date: string
  end_date: string
  avg_completion_time?: number
  avg_agent_response_time?: number
  avg_customer_response_time?: number
}

export interface CustomerAutomationRateResponse {
  customer_id: number
  period: Period
  start_date: string
  end_date: string
  avg_automation_rate: number
}

export interface AllCustomersResponse {
  customers: Customer[]
}

export interface CustomerDetailData {
  customer: Customer
  appointmentCount: number
  avgCompletionTime: number
  avgAgentResponseTime: number
  avgCustomerResponseTime: number
  avgAutomationRate: number
  sessions: Session[]
  loading: boolean
  error: string | null
}

export interface ChatMessage {
  type: string; 
  content: string;
}

export interface ChatHistoryResponse {
  session_id: string; 
  chat_histories: ChatMessage[];
}

export type ActionType = 'create' | 'update' | 'delete' | 'keep';

// Helper type để thêm trường action vào entity
export type WithAction<T> = T & { action: ActionType };

export interface ProductPrice {
  id?: number; // Optional vì khi tạo mới chưa có ID
  price: number;
  discount: number;
  quantity: number;
  price_after_discount?: number; // Backend tự tính hoặc FE gửi
  product_id?: number;
}

export interface ProductVariance {
  id?: number;
  sku: string | null;
  var_name: string; // Tên biến thể (VD: Màu sắc)
  value: string;    // Giá trị (VD: Đỏ)
  product_id?: number;
  // Quan trọng: Backend lồng prices vào trong variance
  prices: WithAction<ProductPrice>[]; 
}

export interface ProductImage {
  id?: number;
  url: string;
  product_id?: number;
}

export interface ProductCore {
  id?: number;
  sku: string | null;
  name: string;
  brand?: string;
  brief_des?: any; // JSON object
  des?: string;
  created_at?: string;
  url?: string | null;
}

// Cấu trúc Payload gửi lên cho endpoint /process-product
export interface ProcessProductPayload {
  product: WithAction<ProductCore>;
  product_images: WithAction<ProductImage>[];
  product_variances_1: WithAction<ProductVariance>[];
}

// Cấu trúc Response cho endpoint /get-products (List)
export interface ProductListResponse {
  data: {
    product: ProductCore;
    product_images: ProductImage[];
    product_variances_1: ProductVariance[];
  }[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// Cấu trúc Response cho endpoint /get-product-detail/{id}
export interface ProductDetailResponse {
  product: ProductCore;
  product_images: ProductImage[];
  product_variances_1: ProductVariance[];
}
