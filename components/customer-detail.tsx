"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock, MessageSquare, Zap, ShoppingCart, RotateCcw, Bot, User, ChevronDown, Loader2, AlertCircle } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion" // Import Accordion
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert" // Import Alert
import { Skeleton } from "@/components/ui/skeleton" // Import Skeleton
import type { Customer, Session, Period, ChatMessage } from "@/lib/types"
import {
  getCustomerSessions,
  getCustomerAppointmentCompletionsCount,
  getCustomerAvgCompletionTime,
  getCustomerAgentAvgResponseTime,
  getCustomerAvgResponseTimeInCustomer,
  getCustomerAvgAutomationRate,
  getCustomerChatHistory // Import hàm mới
} from "@/lib/api"
import { cn } from "@/lib/utils"

interface CustomerDetailProps {
  customer: Customer
  onBack: () => void
}

// === Session Row Component ===
interface SessionRowProps {
  session: Session;
  onToggle: (sessionId: number) => void;
  isOpen: boolean;
  chatHistory: ChatMessage[] | null;
  isLoadingHistory: boolean;
  errorHistory: string | null;
}

const SessionRow: React.FC<SessionRowProps> = ({ session, onToggle, isOpen, chatHistory, isLoadingHistory, errorHistory }) => {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleString("vi-VN", {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return "-"
    }
  };

  return (
    <AccordionItem value={`session-${session.id}`} className="border-b border-gray-200 dark:border-gray-700">
      <AccordionTrigger
        onClick={() => onToggle(session.id)}
        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 text-sm font-medium w-full text-left [&[data-state=open]>svg]:rotate-180"
      >
        <div className="grid grid-cols-4 gap-4 items-center w-full">
          <span className="truncate">{session.id}</span>
          <span className="text-xs text-muted-foreground">{formatDate(session.started_at)}</span>
          <span className="text-xs text-muted-foreground">{formatDate(session.last_active_at)}</span>
          <span className="text-xs text-muted-foreground">{formatDate(session.ended_at)}</span>
        </div>
         {/* ChevronDown được AccordionTrigger tự xử lý */}
      </AccordionTrigger>
      <AccordionContent className="bg-gray-50 dark:bg-gray-800/30 px-4 py-4 border-t border-gray-200 dark:border-gray-700">
        {isLoadingHistory && (
          <div className="flex items-center justify-center space-x-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang tải lịch sử chat...</span>
          </div>
        )}
        {errorHistory && (
          <Alert variant="destructive" className="my-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lỗi tải lịch sử chat</AlertTitle>
            <AlertDescription>{errorHistory}</AlertDescription>
          </Alert>
        )}
        {chatHistory && chatHistory.length === 0 && (
          <p className="text-center text-muted-foreground py-4 text-sm">Không có tin nhắn trong phiên này.</p>
        )}
        {chatHistory && chatHistory.length > 0 && (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={cn("flex items-start gap-3", {
                  "justify-end": msg.type === "human",
                })}
              >
                {msg.type !== "human" && (
                  <span className="flex-shrink-0 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 p-1.5 rounded-full">
                    <Bot size={16} />
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                    msg.type === "human"
                      ? "bg-primary text-primary-foreground"
                      : "bg-gray-200 dark:bg-gray-700 text-foreground"
                  )}
                >
                  {msg.content}
                </div>
                 {msg.type === "human" && (
                  <span className="flex-shrink-0 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-1.5 rounded-full">
                    <User size={16} />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};


// === Customer Detail Component ===
export default function CustomerDetail({ customer, onBack }: CustomerDetailProps) {
  const [period, setPeriod] = useState<Period>("day")
  const [sessions, setSessions] = useState<Session[]>([])

  const [appointmentCount, setAppointmentCount] = useState<number | string>("-")
  const [avgCompletionTime, setAvgCompletionTime] = useState<string>("-")
  const [avgAgentResponseTime, setAvgAgentResponseTime] = useState<string>("-")
  const [avgCustomerResponseTime, setAvgCustomerResponseTime] = useState<string>("-")
  const [avgAutomationRate, setAvgAutomationRate] = useState<string>("-")

  const [loadingStates, setLoadingStates] = useState({
    sessions: true, metrics: true, // Gộp loading metrics
  })
  const [errors, setErrors] = useState<Record<string, string | null>>({
     sessions: null, metrics: null, chatHistory: null
  })

  // State cho session đang mở và lịch sử chat
  const [openSessionId, setOpenSessionId] = useState<number | null>(null);
  const [chatHistory, setChatHistory] = useState<Record<number, ChatMessage[] | null>>({});
  const [loadingChatHistory, setLoadingChatHistory] = useState<number | null>(null);

  // --- Data Fetching Effect ---
  useEffect(() => {
     setLoadingStates({ sessions: true, metrics: true });
     setErrors({ sessions: null, metrics: null, chatHistory: null });
     // Reset chat history khi customer thay đổi
     setOpenSessionId(null);
     setChatHistory({});
     setLoadingChatHistory(null);

    const fetchAllDetails = async () => {
      // Fetch sessions
      const fetchSessions = getCustomerSessions(customer.id)
        .then(data => setSessions(data))
        .catch(err => setErrors(prev => ({ ...prev, sessions: err.message || "Failed to load sessions" })))
        .finally(() => setLoadingStates(prev => ({ ...prev, sessions: false })));

      // Fetch metrics
      const fetchMetrics = Promise.all([
        getCustomerAppointmentCompletionsCount(customer.id),
        getCustomerAvgCompletionTime(customer.id, period),
        getCustomerAgentAvgResponseTime(customer.id, period),
        getCustomerAvgResponseTimeInCustomer(customer.id, period),
        getCustomerAvgAutomationRate(customer.id, period),
      ]).then(([count, completionTime, agentTime, customerTime, automationRate]) => {
          setAppointmentCount(count);
          setAvgCompletionTime((completionTime).toFixed(1));
          setAvgAgentResponseTime((agentTime).toFixed(1));
          setAvgCustomerResponseTime((customerTime).toFixed(1));
          setAvgAutomationRate(automationRate.toFixed(1));
      }).catch(err => {
         console.error("Failed to fetch customer metrics:", err);
         setErrors(prev => ({ ...prev, metrics: err.message || "Failed to load metrics" }));
         // Set default error values for metrics display
         setAppointmentCount("-");
         setAvgCompletionTime("-");
         setAvgAgentResponseTime("-");
         setAvgCustomerResponseTime("-");
         setAvgAutomationRate("-");
      }).finally(() => setLoadingStates(prev => ({ ...prev, metrics: false })));

      await Promise.all([fetchSessions, fetchMetrics]);
    }

    fetchAllDetails();
  }, [customer.id, period]); // Fetch lại khi customer hoặc period thay đổi

   // --- Function to handle session toggle and fetch history ---
  const handleToggleSession = async (sessionId: number) => {
    const isOpening = openSessionId !== sessionId;
    setOpenSessionId(isOpening ? sessionId : null);

    if (isOpening && !chatHistory[sessionId]) {
      setLoadingChatHistory(sessionId);
      setErrors(prev => ({ ...prev, chatHistory: null })); // Clear previous chat error
      try {
        const history = await getCustomerChatHistory(sessionId);
        setChatHistory(prev => ({ ...prev, [sessionId]: history }));
      } catch (err) {
        console.error(`Failed to fetch chat history for session ${sessionId}:`, err);
        setErrors(prev => ({ ...prev, chatHistory: err instanceof Error ? err.message : "Failed to load chat history" }));
        setChatHistory(prev => ({ ...prev, [sessionId]: [] })); // Set empty array on error to stop loading
      } finally {
        setLoadingChatHistory(null);
      }
    }
  };

  // --- Helper to get initials ---
  const getInitials = (name: string | null | undefined): string => {
    // Nếu name không hợp lệ hoặc bằng "none" (không phân biệt hoa thường) → dùng "None"
    const normalized = !name || name.trim().toLowerCase() === "none"
      ? "None"
      : name.trim();
  
    const initials = normalized
      .split(" ")
      .map(n => n.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  
    return initials || "?";
  };

  // --- Render JSX ---
  return (
     <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
           <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={onBack} className="flex-shrink-0">
                 <ArrowLeft className="w-4 h-4" />
                 <span className="sr-only">Quay lại</span>
              </Button>
              <div className="flex items-center gap-3">
                 {/* Avatar */}
                 <div className="flex-shrink-0 h-12 w-12 rounded-full bg-muted flex items-center justify-center border">
                    <span className="text-lg font-medium text-muted-foreground">{getInitials(customer.name)}</span>
                 </div>
                 <div>
                    <h2 className="text-xl font-semibold text-foreground">{customer.name}</h2>
                    <p className="text-sm text-muted-foreground">{customer.email || "Không có email"}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone || "Không có SĐT"}</p>
                 </div>
              </div>
           </div>
            {/* Period Filter */}
           <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border dark:border-gray-700 shadow-sm self-end sm:self-center">
              {(["hour", "day", "month", "year"] as Period[]).map((p) => (
              <Button
                 key={p}
                 variant={period === p ? "secondary" : "ghost"}
                 size="sm"
                 onClick={() => setPeriod(p)}
                 className={cn("capitalize min-w-[55px] transition-all duration-200", {
                  "text-primary font-semibold": period === p
                })}
                 disabled={loadingStates.metrics} // Disable khi đang tải metrics
              >
                 {p === "hour" && "Giờ"}
                 {p === "day" && "Ngày"}
                 {p === "month" && "Tháng"}
                 {p === "year" && "Năm"}
              </Button>
              ))}
           </div>
        </div>

         {/* Customer Info Card - Improved Layout */}
        <Card className="shadow-sm">
           <CardHeader>
              <CardTitle className="text-base font-semibold">Thông tin chi tiết</CardTitle>
           </CardHeader>
           <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                 <p className="text-muted-foreground mb-1">Điện thoại</p>
                 <p className="font-medium">{customer.phone || "-"}</p>
              </div>
              <div>
                 <p className="text-muted-foreground mb-1">Email</p>
                 <p className="font-medium">{customer.email || "-"}</p>
              </div>
              <div>
                 <p className="text-muted-foreground mb-1">Chế độ</p>
                 <span className={`px-2 py-0.5 rounded text-xs font-medium w-fit ${
                    customer.control_mode === "BOT"
                       ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
                       : "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700"
                 }`}>
                 {customer.control_mode}
                 </span>
              </div>
           </CardContent>
        </Card>

         {/* Metrics Error Alert */}
        {errors.metrics && !loadingStates.metrics && (
             <Alert variant="destructive">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Lỗi tải thống kê</AlertTitle>
               <AlertDescription>{errors.metrics}</AlertDescription>
             </Alert>
        )}

         {/* Metrics Grid - Use Skeleton for loading */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
           {/* Card chỉ số */}
           {[
               { title: "Số đơn hoàn thành", value: appointmentCount, unit: "đơn", icon: ShoppingCart, color: "orange", loading: loadingStates.metrics },
               { title: "TG hoàn thành đơn", value: avgCompletionTime, unit: "giây", icon: Clock, color: "purple", loading: loadingStates.metrics },
               { title: "TG Agent P.Hồi", value: avgAgentResponseTime, unit: "giây", icon: Zap, color: "green", loading: loadingStates.metrics },
               { title: "TG Khách P.Hồi", value: avgCustomerResponseTime, unit: "giây", icon: MessageSquare, color: "blue", loading: loadingStates.metrics },
               { title: "Tỉ lệ tự động", value: avgAutomationRate, unit: "%", icon: RotateCcw, color: "indigo", loading: loadingStates.metrics },
           ].map((metric) => (
             <Card key={metric.title} className={`shadow-sm border-l-4 border-${metric.color}-500 bg-${metric.color}-50 dark:bg-${metric.color}-950/50`}>
                 <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
                    <metric.icon className={`w-4 h-4 text-${metric.color}-500`} />
                 </CardHeader>
                 <CardContent>
                    {metric.loading ? (
                         <>
                            <Skeleton className="h-7 w-1/2 mb-1" />
                            <Skeleton className="h-4 w-1/4" />
                         </>
                    ) : (
                         <>
                            <div className="text-2xl font-bold">{metric.value}</div>
                            <p className="text-xs text-muted-foreground">{metric.unit}</p>
                         </>
                    )}
                 </CardContent>
              </Card>
           ))}
        </div>

        {/* Sessions Section */}
        <Card className="shadow-sm">
           <CardHeader>
              <CardTitle className="text-base font-semibold">Lịch sử Phiên chat</CardTitle>
           </CardHeader>
           <CardContent className="p-0"> {/* Remove padding here */}
              {errors.sessions && (
                 <div className="p-4">
                    <Alert variant="destructive">
                       <AlertCircle className="h-4 w-4" />
                       <AlertTitle>Lỗi tải danh sách phiên</AlertTitle>
                       <AlertDescription>{errors.sessions}</AlertDescription>
                    </Alert>
                 </div>
              )}
              {loadingStates.sessions ? (
                 <div className="space-y-2 p-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                 </div>
              ) : sessions.length === 0 ? (
                 <p className="text-center text-muted-foreground py-8 text-sm">Không có phiên chat nào.</p>
              ) : (
                 <Accordion type="single" collapsible value={openSessionId ? `session-${openSessionId}` : undefined} className="w-full">
                    {/* Table Header outside Accordion */}
                     <div className="grid grid-cols-4 gap-4 px-4 py-2 border-b bg-gray-50 dark:bg-gray-800 text-xs font-medium text-muted-foreground sticky top-0 z-10">
                       <span>ID Phiên</span>
                       <span>Bắt đầu</span>
                       <span>Hoạt động cuối</span>
                       <span>Kết thúc</span>
                     </div>
                    {sessions.map((session) => (
                       <SessionRow
                          key={session.id}
                          session={session}
                          onToggle={handleToggleSession}
                          isOpen={openSessionId === session.id}
                          chatHistory={chatHistory[session.id] || null}
                          isLoadingHistory={loadingChatHistory === session.id}
                          errorHistory={openSessionId === session.id ? errors.chatHistory : null} // Chỉ hiển thị lỗi cho session đang mở
                       />
                    ))}
                 </Accordion>
              )}
           </CardContent>
           {sessions.length > 0 && !loadingStates.sessions && (
               <CardFooter className="text-xs text-muted-foreground pt-4 border-t">
                  Nhấp vào một phiên để xem lịch sử chat.
               </CardFooter>
            )}
        </Card>
     </div>
  );
}