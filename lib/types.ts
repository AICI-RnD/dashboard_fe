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