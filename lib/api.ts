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
  ProductListResponse, 
  UploadResponse
} from "./types"
import { getToken } from '@/lib/auth'
import { Product } from "@/lib/types"

// Set your API base URL here
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"
const DASHBOARD_API_ENDPOINT = `${API_BASE_URL}/main-dashboard`
const CUSTOMER_API_ENDPOINT = `${API_BASE_URL}/customer`
const SESSION_API_ENDPOINT = `${API_BASE_URL}/session`
const API_PRODUCT_BASE_URL = process.env.NEXT_PUBLIC_API_PRODUCT_BASE_URL || "http://localhost:3030"
const PRODUCT_API_ENDPOINT = `${API_PRODUCT_BASE_URL}/api/products`
const UPLOAD_API_ENDPOINT = `${API_PRODUCT_BASE_URL}/api/upload`

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

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(UPLOAD_API_ENDPOINT, {
    method: 'POST',
    headers: getAuthHeaders(true), // True để không set Content-Type json
    body: formData,
  });

  if (!response.ok) throw new Error('Upload failed');
  
  const data: UploadResponse = await response.json();
  return data.url;
}

export async function getProducts(page = 1, limit = 10, q = ""): Promise<ProductListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    q: q
  });

  const response = await fetch(`${PRODUCT_API_ENDPOINT}?${params}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Fetch products failed');
  return response.json();
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
  const data = await fetchAPI<CountResponse>("dashboard", "/new-appointments", period)
  return data.count
}

export async function getAgentAvgResponseTime(period: Period): Promise<number> {
  const data = await fetchAPI<TimeResponse>("dashboard", "/agent-avg-response-time", period)
  return data.avg_response_time || 0
}

export async function getAppointmentAvgCompletionTime(period: Period): Promise<number> {
  const data = await fetchAPI<TimeResponse>("dashboard", "/appointment-avg-completion-time", period)
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
  const endpoint = `/${customerId}/appointment-completions/count`;
  const data = await fetchAPI<CustomerAppointmentCountResponse>("customer", endpoint);
  return data.appointment_completions;
}

export async function getCustomerAvgCompletionTime(customerId: number, period: Period): Promise<number> {
  const endpoint = `/${customerId}/appointment-completion-avg-time`;
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



export async function getProductById(id: number | string): Promise<Product> {
  const response = await fetch(`${PRODUCT_API_ENDPOINT}/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error('Fetch product detail failed');
  return response.json();
}


export async function createProduct(product: Product): Promise<Product> {
  const response = await fetch(PRODUCT_API_ENDPOINT, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Create product failed');
  }
  return response.json();
}

// 5. Cập nhật sản phẩm
export async function updateProduct(id: number | string, product: Product): Promise<Product> {
  const response = await fetch(`${PRODUCT_API_ENDPOINT}/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(product),
  });

  if (!response.ok) throw new Error('Update product failed');
  return response.json();
}

// 6. Xóa sản phẩm
export async function deleteProduct(id: number | string): Promise<boolean> {
  const response = await fetch(`${PRODUCT_API_ENDPOINT}/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  return response.ok;
}