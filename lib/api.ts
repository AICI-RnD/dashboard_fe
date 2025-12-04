import type {
  Period,
  CountResponse,
  TimeResponse,
  AutomationRateResponse,
  Customer,
  AllCustomersResponse,
  CustomerSessionsResponse,
  CustomerAppointmentCountResponse,
  CustomerTimeResponse,
  CustomerAutomationRateResponse,
  ChatHistoryResponse,
  ChatMessage,
  Session, 
} from "./types"
import { getToken } from '@/lib/auth'
import { 
  ProcessProductPayload, 
  ProductListResponse, 
  ProductDetailResponse 
} from "./types";

// Set your API base URL here
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
// Các endpoint cũ
const DASHBOARD_API_ENDPOINT = `${API_BASE_URL}/api/v1/dashboard_be/api/v1/main-dashboard`
const CUSTOMER_API_ENDPOINT = `${API_BASE_URL}/api/v1/dashboard_be/api/v1/customer`
const SESSION_API_ENDPOINT = `${API_BASE_URL}/api/v1/dashboard_be/api/v1/session`

// Endpoint sản phẩm (CRUD)
const API_PRODUCT_BASE_URL = process.env.NEXT_PUBLIC_API_PRODUCT_BASE_URL;

function getAuthHeaders(isMultipart = false): HeadersInit {
  const token = getToken();
  const headers: any = {
    "ngrok-skip-browser-warning": "true",
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
}

// --- Helper an toàn để gọi Fetch ---
async function safeFetch(url: string, options: RequestInit) {
  console.log(`[API Call] ${options.method || 'GET'} ${url}`);
  
  const res = await fetch(url, options);
  
  // Kiểm tra Content-Type xem có phải JSON không
  const contentType = res.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");

  if (!res.ok) {
    // Nếu lỗi và là JSON -> parse để lấy message
    if (isJson) {
      const errorData = await res.json();
      throw new Error(errorData.detail || errorData.message || `API Error: ${res.status}`);
    } 
    // Nếu lỗi mà trả về HTML (VD: 404 Nginx, 500 Server Error) -> Đọc text để debug
    else {
      const errorText = await res.text();
      console.error(`[API Error] Non-JSON response (${res.status}):`, errorText.slice(0, 500)); // Log 500 ký tự đầu
      throw new Error(`API trả về lỗi ${res.status} (HTML/Text). Kiểm tra URL hoặc Server.`);
    }
  }

  // Nếu thành công (200) nhưng không phải JSON (VD: trả về trang chủ do sai URL)
  if (!isJson) {
    const text = await res.text();
    console.error(`[API Error] Expected JSON but got HTML/Text:`, text.slice(0, 500));
    throw new Error("Dữ liệu trả về không phải JSON (có thể sai URL API).");
  }

  return res.json();
}

// --- PRODUCT APIs (Đã cập nhật dùng safeFetch) ---

// 1. Get List Products
export async function getProducts(page = 1, limit = 10, searchQuery = ""): Promise<ProductListResponse> {
  if (!API_PRODUCT_BASE_URL) throw new Error("Chưa cấu hình biến môi trường NEXT_PUBLIC_API_PRODUCT_BASE_URL");

  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    search_query: searchQuery
  });

  return safeFetch(`${API_PRODUCT_BASE_URL}/get-products?${params}`, {
    headers: getAuthHeaders(),
  });
}

// Hàm lấy tất cả sản phẩm (cho Client-side pagination)
export async function getAllProducts(searchQuery = ""): Promise<ProductListResponse> {
  if (!API_PRODUCT_BASE_URL) throw new Error("Chưa cấu hình biến môi trường NEXT_PUBLIC_API_PRODUCT_BASE_URL");

  const LIMIT_PER_REQUEST = 100;
  
  // Lấy trang 1
  const firstPage = await getProducts(1, LIMIT_PER_REQUEST, searchQuery);
  const totalItems = firstPage.pagination.total;
  const totalPages = Math.ceil(totalItems / LIMIT_PER_REQUEST);

  if (totalPages <= 1) return firstPage;

  // Lấy các trang còn lại song song
  const remainingReqs = [];
  for (let p = 2; p <= totalPages; p++) {
    remainingReqs.push(getProducts(p, LIMIT_PER_REQUEST, searchQuery));
  }
  
  const remainingRes = await Promise.all(remainingReqs);
  
  const allData = [
    ...firstPage.data,
    ...remainingRes.flatMap(r => r.data)
  ];

  return {
    data: allData,
    pagination: { total: totalItems, page: 1, limit: totalItems }
  };
}

// 2. Get Product Detail
export async function getProductDetail(id: number | string): Promise<ProductDetailResponse> {
  if (!API_PRODUCT_BASE_URL) throw new Error("Chưa cấu hình biến môi trường NEXT_PUBLIC_API_PRODUCT_BASE_URL");

  return safeFetch(`${API_PRODUCT_BASE_URL}/get-product-detail/${id}`, {
    headers: getAuthHeaders(),
  });
}

// 3. Process Product
export async function processProduct(payload: ProcessProductPayload) {
  if (!API_PRODUCT_BASE_URL) throw new Error("Chưa cấu hình biến môi trường NEXT_PUBLIC_API_PRODUCT_BASE_URL");

  return safeFetch(`${API_PRODUCT_BASE_URL}/process-product`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
}

// --- CÁC HÀM CŨ (Giữ nguyên logic cũ hoặc chuyển sang dùng safeFetch nếu cần) ---

async function fetchAPI<T>(type_url: string, endpoint: string, period: Period = "None"): Promise<T> {
  let url: URL;
  if (type_url === "dashboard") url = new URL(`${DASHBOARD_API_ENDPOINT}${endpoint}`);
  else if (type_url === "customer") url = new URL(`${CUSTOMER_API_ENDPOINT}${endpoint}`);
  else url = new URL(`${SESSION_API_ENDPOINT}${endpoint}`);

  if (period !== "None") url.searchParams.append("period", period);

  return safeFetch(url.toString(), {
    headers: { ...getAuthHeaders(), "ngrok-skip-browser-warning": "true", "Accept": "application/json" }
  });
}

export async function getCustomerChatHistory(sessionId: string | number): Promise<ChatMessage[]> {
  const url = `${SESSION_API_ENDPOINT}/${sessionId}/chat-histories`
  try {
    const data: ChatHistoryResponse = await safeFetch(url, {
        headers: { ...getAuthHeaders(), "ngrok-skip-browser-warning": "true", "Accept": "application/json" }
    });
    return data.chat_histories || [];
  } catch (error) {
    throw error;
  }
}

// Dashboard Exports
export async function getReturningCustomers(period: Period): Promise<number> {
  const data = await fetchAPI<CountResponse>("dashboard", "/returning-customers", period)
  return data.count
}
export async function getNewCustomers(period: Period): Promise<number> {
  const data = await fetchAPI<CountResponse>("dashboard", "/new-customers", period)
  return data.count
}
export async function getNewAppointments(period: Period): Promise<number> {
  const data = await fetchAPI<CountResponse>("dashboard", "/new-orders", period)
  return data.count
}
export async function getAgentAvgResponseTime(period: Period): Promise<number> {
  const data = await fetchAPI<TimeResponse>("dashboard", "/agent-avg-response-time", period)
  return data.avg_response_time || 0
}
export async function getAppointmentAvgCompletionTime(period: Period): Promise<number> {
  const data = await fetchAPI<TimeResponse>("dashboard", "/order-avg-completion-time", period)
  return data.avg_completion_time || 0
}
export async function getCustomerAvgResponseTime(period: Period): Promise<number> {
  const data = await fetchAPI<TimeResponse>("dashboard", "/customer-avg-response-time", period)
  return data.avg_customer_response_time || 0
}
export async function getAvgAutomationRate(period: Period): Promise<number> {
  const data = await fetchAPI<AutomationRateResponse>("dashboard", "/avg-automation-rate", period)
  return data.avg_automation_rate * 100
}
export async function getAllCustomers(): Promise<Customer[]> {
  const data = await fetchAPI<AllCustomersResponse>("customer", "/all")
  return data.customers
}
export async function getCustomerSessions(customerId: number): Promise<Session[]> {
  const endpoint = `/${customerId}/sessions`;
  const data = await fetchAPI<CustomerSessionsResponse>("customer", endpoint);
  return data.sessions;
}
export async function getCustomerAppointmentCompletionsCount(customerId: number): Promise<number> {
  const endpoint = `/${customerId}/order-completions/count`;
  const data = await fetchAPI<CustomerAppointmentCountResponse>("customer", endpoint);
  return data.appointment_completions;
}
export async function getCustomerAvgCompletionTime(customerId: number, period: Period): Promise<number> {
  const endpoint = `/${customerId}/order-completion-avg-time`;
  const data = await fetchAPI<CustomerTimeResponse>("customer", endpoint, period);
  return data.avg_completion_time || 0;
}
export async function getCustomerAvgResponseTimeInCustomer(customerId: number, period: Period): Promise<number> {
  const endpoint = `/${customerId}/customer-avg-response-time`;
  const data = await fetchAPI<TimeResponse>("customer", endpoint, period)
  return data.avg_customer_response_time || 0
}
export async function getCustomerAgentAvgResponseTime(customerId: number, period: Period): Promise<number> {
  const endpoint = `/${customerId}/agent-avg-response-time`;
  const data = await fetchAPI<CustomerTimeResponse>("customer", endpoint, period);
  return data.avg_agent_response_time || 0;
}
export async function getCustomerAvgAutomationRate(customerId: number, period: Period): Promise<number> {
  const endpoint = `/${customerId}/avg-automation-rate`;
  const data = await fetchAPI<CustomerAutomationRateResponse>("customer", endpoint, period);
  return (data.avg_automation_rate || 0) * 100;
}