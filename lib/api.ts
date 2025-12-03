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
const DASHBOARD_API_ENDPOINT = `${API_BASE_URL}/api/v1/dashboard_test/api/v1/main-dashboard`
const CUSTOMER_API_ENDPOINT = `${API_BASE_URL}/api/v1/dashboard_test/api/v1/customer`
const SESSION_API_ENDPOINT = `${API_BASE_URL}/api/v1/dashboard_test/api/v1/session`
const API_PRODUCT_BASE_URL = `${API_BASE_URL}/api/v1/crud_test/api/v1/products` // http://localhost:3030/api/v1/products

function getAuthHeaders(isMultipart = false): HeadersInit {
  const token = getToken();
  const headers: any = {}; // Dùng any để linh hoạt gán key
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Nếu không phải upload file (multipart), thì thêm Content-Type json
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
}

export async function getCustomerChatHistory(sessionId: string | number): Promise<ChatMessage[]> {
  // Đảm bảo URL đúng dựa trên router backend
  const url = `${SESSION_API_ENDPOINT}/${sessionId}/chat-histories`
  try {
    console.log(`[v0] Fetching chat history for session ${sessionId}: ${url}`)
    const response = await fetch(url, {
        headers: {
          ...getAuthHeaders(),
          "ngrok-skip-browser-warning": "true",
          "Accept": "application/json"
        }
      }
    );

    if (!response.ok) {
        const contentType = response.headers.get("content-type");
        const errorBody = await response.text();
        let errorMessage = `❌ API Error: ${response.status} ${response.statusText}\nURL: ${url}\nResponse: ${errorBody.substring(0, 300)}`;
        console.error("[v0]", errorMessage);
        throw new Error(`Failed to fetch chat history: ${response.statusText}`);
    }

    console.log(response.body);

    const data: ChatHistoryResponse = await response.json();
    console.log(`[v0] Chat history received for session ${sessionId}:`, data);
    return data.chat_histories || [];

  } catch (error) {
     if (error instanceof SyntaxError) {
      const msg = `Failed to parse chat history response as JSON.`;
      console.error("[v0] JSON Parse Error for chat history:", msg, error);
      throw new Error(msg);
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[v0] Fetch failed for chat history:", sessionId, ":", errorMsg);
    throw new Error(`Could not fetch chat history: ${errorMsg}`);
  }
}

async function fetchAPI<T>(
  type_url: string,
  endpoint: string, 
  period: Period = "None"
): Promise<T> {
  let url: URL;

  if (type_url === "dashboard") {
    url = new URL(`${DASHBOARD_API_ENDPOINT}${endpoint}`);
  } else if (type_url === "customer") {
    url = new URL(`${CUSTOMER_API_ENDPOINT}${endpoint}`);
  } else {
    url = new URL(`${SESSION_API_ENDPOINT}${endpoint}`);
  }

  if (period !== "None") {
    url.searchParams.append("period", period);
  }

  try {
    console.log("[v0] Fetching API:", url.toString(), "with period type:", typeof period, "value:", period);
    const response = await fetch(url.toString(), {
      headers: {
        ...getAuthHeaders(),
        "ngrok-skip-browser-warning": "true",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      const errorBody = await response.text();

      let errorMessage = `❌ API Error: ${response.status} ${response.statusText}\n\n`;
      errorMessage += `📍 URL: ${url.toString()}\n`;
      errorMessage += `📝 Content-Type: ${contentType}\n\n`;

      if (contentType?.includes("text/html")) {
        errorMessage += `⚠️ Backend returned HTML (likely 404 or 500 error or ngrok warning page)\n`;
      } else {
        errorMessage += `Response: ${errorBody.substring(0, 300)}\n`;
      }

      errorMessage += `\n🔧 Troubleshooting Steps:\n`;
      errorMessage += `1️⃣ Is backend server running at: ${API_BASE_URL}?\n`;
      errorMessage += `2️⃣ Does API endpoint exist: ${endpoint}?\n`;
      errorMessage += `3️⃣ Check NEXT_PUBLIC_API_BASE_URL in Vars section\n`;
      errorMessage += `4️⃣ Open F12 Console to see full error details\n`;

      console.error("[v0]", errorMessage);
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      console.error(`[v0] Non-JSON response from ${url.toString()}:\n`, text.slice(0, 500));
      throw new Error("Expected JSON, got non-JSON response.");
    }
    
    const data = await response.json();
    console.log("[v0] API response received:", endpoint, "data:", data);
    return data;

  } catch (error) {
    if (error instanceof SyntaxError) {
      const msg = `Failed to parse API response as JSON. Backend may be returning HTML error page.`;
      console.error("[v0] JSON Parse Error for", endpoint, ":", msg);
      throw new Error(msg);
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[v0] Fetch failed for", endpoint, ":", errorMsg);
    throw error;
  }
}

// Fetch dashboard APIs

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
  // Convert 0-1 to percentage
  return data.avg_automation_rate * 100
}

// Fetch customer APIs

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
  // Convert 0-1 to percentage
  return (data.avg_automation_rate || 0) * 100;
}

// 1. Get List Products
export async function getAllProducts(searchQuery = ""): Promise<ProductListResponse> {
  const LIMIT_PER_REQUEST = 100; // Giới hạn tối đa của Backend

  // Bước 1: Lấy trang đầu tiên để biết tổng số lượng (total)
  const params = new URLSearchParams({
    page: "1",
    limit: LIMIT_PER_REQUEST.toString(),
    search_query: searchQuery
  });

  const res = await fetch(`${API_PRODUCT_BASE_URL}/get-products?${params}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error("Failed to fetch initial products");
  
  const firstPageData: ProductListResponse = await res.json();
  const totalItems = firstPageData.pagination.total;
  const totalPages = Math.ceil(totalItems / LIMIT_PER_REQUEST);

  // Nếu chỉ có 1 trang thì trả về luôn
  if (totalPages <= 1) {
    return firstPageData;
  }

  // Bước 2: Tạo mảng Promise để gọi song song các trang còn lại
  const remainingRequests = [];
  for (let page = 2; page <= totalPages; page++) {
    const p = new URLSearchParams({
      page: page.toString(),
      limit: LIMIT_PER_REQUEST.toString(),
      search_query: searchQuery
    });
    
    // Push promise vào mảng (chưa await ngay để chạy song song)
    remainingRequests.push(
      fetch(`${API_PRODUCT_BASE_URL}/get-products?${p}`, { 
        headers: getAuthHeaders() 
      }).then(r => {
        if (!r.ok) throw new Error(`Failed to fetch page ${page}`);
        return r.json();
      })
    );
  }

  // Bước 3: Chờ tất cả các trang tải xong
  const remainingResponses = await Promise.all(remainingRequests) as ProductListResponse[];

  // Bước 4: Gộp dữ liệu (Merge Data)
  const allData = [
    ...firstPageData.data,
    ...remainingResponses.flatMap(res => res.data)
  ];

  // Trả về cấu trúc đúng chuẩn ProductListResponse nhưng với full data
  return {
    data: allData,
    pagination: {
      total: totalItems,
      page: 1,
      limit: totalItems // Limit lúc này bằng tổng số lượng (vì đã lấy hết)
    }
  };
}

// 2. Get Product Detail
export async function getProductDetail(id: number | string): Promise<ProductDetailResponse> {
  const res = await fetch(`${API_PRODUCT_BASE_URL}/get-product-detail/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error("Failed to fetch product detail");
  return res.json();
}

// 3. Process Product (Create/Update/Delete/Keep)
export async function processProduct(payload: ProcessProductPayload) {
  const res = await fetch(`${API_PRODUCT_BASE_URL}/process-product`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Failed to process product");
  }
  
  return res.json();
}