"use client"

import { AlertTriangle } from "lucide-react"
import React from "react";
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Clock, MessageSquare, ShoppingCart, Users, Zap, TrendingUp, RotateCcw, LayoutDashboard, AlertCircle, BarChart3, Filter, LogOut
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Period } from "@/lib/types"
import type { DashboardData, Customer } from "@/lib/types"
import {
  getReturningCustomers,
  getNewCustomers,
  getNewAppointments,
  getAgentAvgResponseTime,
  getAppointmentAvgCompletionTime,
  getCustomerAvgResponseTime,
  getAvgAutomationRate,
  getAllCustomers,
} from "@/lib/api"
import CustomerList from "@/components/customer-list"
import { cn } from "@/lib/utils"
import { logout, getCurrentUser, isAuthenticated } from "@/lib/auth"
import { useRouter } from "next/navigation"

type TimeFormat = "hour" | "day" | "month" | "year"

interface MetricDisplayProps {
  title: string
  value: string | number
  unit: string
  icon: React.ReactElement<{ className?: string }>
  loading: boolean
  tooltipText?: string
  colorClass?: string
  trend?: "up" | "down" | "neutral"
}

// === Metric Card Component ===
const MetricCard: React.FC<MetricDisplayProps> = ({ title, value, unit, icon, loading, tooltipText, colorClass = "bg-card", trend = "neutral" }) => {
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "";
  const trendColor = trend === "up" ? "text-green-600 dark:text-green-400" : trend === "down" ? "text-red-600 dark:text-red-400" : "text-muted-foreground";

  const cardContent = (
    <Card className={cn("shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out border-l-4", colorClass, {
      "border-indigo-500": colorClass?.includes("indigo"),
      "border-orange-500": colorClass?.includes("orange"),
      "border-blue-500": colorClass?.includes("blue"),
      "border-green-500": colorClass?.includes("green"),
      "border-purple-500": colorClass?.includes("purple"),
      "border-pink-500": colorClass?.includes("pink"),
      "border-cyan-500": colorClass?.includes("cyan"),
      "border-border": !colorClass || colorClass === "bg-card"
    })}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className={cn("p-1.5 rounded-full", colorClass)}>
           {React.isValidElement(icon) ? React.cloneElement(icon, { className: "h-5 w-5 text-current opacity-80" }) : icon}
        </span>
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-3/4 mb-2 animate-pulse" />
            <Skeleton className="h-4 w-1/4 animate-pulse" />
          </>
        ) : (
          <>
            <div className="text-3xl font-bold text-foreground flex items-baseline gap-2">
              {value}
              <span className="text-xs font-medium text-muted-foreground">{unit}</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  if (tooltipText) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
          <TooltipContent side="top" align="center">
            <p className="text-xs max-w-[200px]">{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
};


interface DashboardState extends DashboardData {
  customers: Customer[]
  customersLoading: boolean
  customersError: string | null
  // Individual loading states for each metric
  loadingStates: {
    automationRate: boolean
    customerResponseTime: boolean
    agentResponseTime: boolean
    orderCompletionTime: boolean
    newOrders: boolean
    returningCustomers: boolean
    newCustomers: boolean
  }
}

// === Main Dashboard Component ===
export default function Dashboard() {
  const router = useRouter()
  const [sessionExpired, setSessionExpired] = useState(false)
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("day")
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<DashboardState>({
    automationRate: 0, 
    customerResponseTime: 0,
    agentResponseTime: 0, 
    orderCompletionTime: 0,
    newOrders: 0, 
    returningCustomers: 0, 
    newCustomers: 0,
    loading: true, 
    error: null, 
    customers: [], 
    customersLoading: true, 
    customersError: null,
    loadingStates: {
      automationRate: true,
      customerResponseTime: true,
      agentResponseTime: true,
      orderCompletionTime: true,
      newOrders: true,
      returningCustomers: true,
      newCustomers: true,
    }
  })

  // Check authentication - only on initial mount
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    const currentUser = getCurrentUser()
    setUser(currentUser)
  }, [router])

  // Prevent redirect when session expires during use
  useEffect(() => {
    if (sessionExpired) {
      // Don't auto-redirect, show the warning screen
      return
    }
  }, [sessionExpired])

  // Helper function to check for 401 errors
  const handleApiError = (error: any, errorType: string) => {
    console.error(`Failed to fetch ${errorType}:`, error)
    
    // Check for 401 status code in various error formats
    const is401 = error?.response?.status === 401 || 
                  error?.status === 401 || 
                  error?.statusCode === 401 ||
                  (error?.message && error.message.includes('401'))
    
    if (is401) {
      // Set session expired but DON'T call logout() to prevent immediate redirect
      setSessionExpired(true)
    }
    
    return error instanceof Error ? error.message : `Failed to load ${errorType}`
  }

  // --- Data Fetching Effect ---
  useEffect(() => {
    if (sessionExpired) return;

    // Reset loading states
    setData((prev) => ({
      ...prev, 
      loading: true, 
      error: null,
      customersLoading: true, 
      customersError: null,
      loadingStates: {
        automationRate: true,
        customerResponseTime: true,
        agentResponseTime: true,
        orderCompletionTime: true,
        newOrders: true,
        returningCustomers: true,
        newCustomers: true,
      }
    }));

    // Fetch metrics - each promise updates state independently
    const fetchMetrics = async () => {
      const metrics = [
        { fn: getAvgAutomationRate(timeFormat as Period), key: 'automationRate' as const },
        { fn: getCustomerAvgResponseTime(timeFormat as Period), key: 'customerResponseTime' as const },
        { fn: getAgentAvgResponseTime(timeFormat as Period), key: 'agentResponseTime' as const },
        { fn: getAppointmentAvgCompletionTime(timeFormat as Period), key: 'orderCompletionTime' as const },
        { fn: getNewAppointments(timeFormat as Period), key: 'newOrders' as const },
        { fn: getReturningCustomers(timeFormat as Period), key: 'returningCustomers' as const },
        { fn: getNewCustomers(timeFormat as Period), key: 'newCustomers' as const },
      ];

      let completedCount = 0;
      let hasError = false;

      // Execute all metrics requests in parallel
      await Promise.all(
        metrics.map(async ({ fn, key }) => {
          try {
            const value = await fn;
            setData(prev => ({ 
              ...prev, 
              [key]: value,
              loadingStates: {
                ...prev.loadingStates,
                [key]: false
              }
            }));
          } catch (error: any) {
            if (!hasError) {
              hasError = true;
              const errorMessage = handleApiError(error, "dashboard metrics");
              setData(prev => ({ ...prev, error: errorMessage }));
            }
            // Mark this metric as loaded even on error
            setData(prev => ({
              ...prev,
              loadingStates: {
                ...prev.loadingStates,
                [key]: false
              }
            }));
          } finally {
            completedCount++;
            if (completedCount === metrics.length) {
              setData(prev => ({ ...prev, loading: false }));
            }
          }
        })
      );
    };

    // Fetch customers independently
    const fetchCustomers = async () => {
      try {
        const customers = await getAllCustomers();
        setData(prev => ({ 
          ...prev, 
          customers, 
          customersLoading: false, 
          customersError: null 
        }));
      } catch (error: any) {
        const errorMessage = handleApiError(error, "customers");
        setData(prev => ({
          ...prev, 
          customers: [],
          customersLoading: false,
          customersError: errorMessage
        }));
      }
    };

    // Execute both fetching functions in parallel
    fetchMetrics();
    fetchCustomers();
  }, [timeFormat, sessionExpired]);

  // --- Helper Functions ---
  const formatTimeUnit = (unit: number): string => {
    if (typeof unit !== 'number' || isNaN(unit)) return "-";
    return unit.toFixed(1);
  }
  const formatPercentage = (rate: number): string => {
    if (typeof rate !== 'number' || isNaN(rate)) return "-";
    return rate.toFixed(1);
  }
  const formatCount = (count: number): number | string => {
    if (typeof count !== 'number' || isNaN(count)) return "-";
    return count;
  }
  const getTimeUnitLabel = (): string => ({
    hour: "giờ qua", day: "hôm nay", month: "tháng này", year: "năm nay",
  }[timeFormat]);

  // Handle logout
  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Handle re-login from session expired screen
  const handleReLogin = () => {
    setSessionExpired(false)
    router.push('/login')
  }

  // --- Metrics Configuration ---
  const metricsConfig: MetricDisplayProps[] = [
    { 
      title: `Tỉ lệ tự động (${getTimeUnitLabel()})`, 
      value: formatPercentage(data.automationRate), 
      unit: "%", 
      icon: <RotateCcw />, 
      tooltipText: "Tỉ lệ phần trăm các phản hồi được xử lý tự động bởi bot.", 
      colorClass: "bg-indigo-50 dark:bg-indigo-950/50", 
      loading: data.loadingStates.automationRate 
    },
    { 
      title: `Đơn đặt lịch mới (${getTimeUnitLabel()})`, 
      value: formatCount(data.newOrders), 
      unit: "đơn", 
      icon: <ShoppingCart />, 
      tooltipText: "Tổng số đơn hàng mới được tạo trong khoảng thời gian đã chọn.", 
      colorClass: "bg-orange-50 dark:bg-orange-950/50", 
      loading: data.loadingStates.newOrders 
    },
    { 
      title: `TG TB Khách P.Hồi (${getTimeUnitLabel()})`, 
      value: formatTimeUnit(data.customerResponseTime), 
      unit: "giây", 
      icon: <MessageSquare />, 
      tooltipText: "Thời gian trung bình khách hàng phản hồi lại tin nhắn.", 
      colorClass: "bg-blue-50 dark:bg-blue-950/50", 
      loading: data.loadingStates.customerResponseTime 
    },
    { 
      title: `TG TB Agent P.Hồi (${getTimeUnitLabel()})`, 
      value: formatTimeUnit(data.agentResponseTime), 
      unit: "giây", 
      icon: <Zap />, 
      tooltipText: "Thời gian trung bình agent tham gia hoặc phản hồi trong cuộc trò chuyện.", 
      colorClass: "bg-green-50 dark:bg-green-950/50", 
      loading: data.loadingStates.agentResponseTime 
    },
    { 
      title: `TG TB Hoàn thành đơn (${getTimeUnitLabel()})`, 
      value: formatTimeUnit(data.orderCompletionTime), 
      unit: "giây", 
      icon: <Clock />, 
      tooltipText: "Thời gian trung bình từ khi bắt đầu phiên chat đến khi đơn hàng được tạo.", 
      colorClass: "bg-purple-50 dark:bg-purple-950/50", 
      loading: data.loadingStates.orderCompletionTime 
    },
    { 
      title: `Khách quay lại (${getTimeUnitLabel()})`, 
      value: formatCount(data.returningCustomers), 
      unit: "khách", 
      icon: <TrendingUp />, 
      tooltipText: "Số lượng khách hàng đã tương tác trước đây quay lại trong kỳ.", 
      colorClass: "bg-pink-50 dark:bg-pink-950/50", 
      loading: data.loadingStates.returningCustomers 
    },
    { 
      title: `Khách hàng mới (${getTimeUnitLabel()})`, 
      value: formatCount(data.newCustomers), 
      unit: "khách", 
      icon: <Users />, 
      tooltipText: "Số lượng khách hàng tương tác lần đầu trong kỳ.", 
      colorClass: "bg-cyan-50 dark:bg-cyan-950/50", 
      loading: data.loadingStates.newCustomers 
    },
    { 
      title: `Trống (${getTimeUnitLabel()})`, 
      value: "-", 
      unit: "%", 
      icon: <BarChart3 />, 
      tooltipText: "Tỷ lệ khách hàng tạo đơn hàng trên tổng số khách tương tác (dữ liệu ví dụ).", 
      colorClass: "bg-teal-50 dark:bg-teal-950/50", 
      loading: false 
    },
  ];

  // Session Expired Screen
  if (sessionExpired) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-950 p-4">
        <Card className="p-8 max-w-md w-full text-center shadow-lg border-2 border-red-200 dark:border-red-800">
          <div className="mb-6 flex justify-center">
            <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full">
              <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
          </div>
          
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">Phiên đăng nhập đã hết hạn</AlertTitle>
            <AlertDescription className="mt-2">
              Phiên làm việc của bạn đã hết hạn hoặc không còn hợp lệ. 
              Vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <Button 
              onClick={handleReLogin} 
              variant="default" 
              className="w-full"
              size="lg"
            >
              Đăng nhập lại
            </Button>
            
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Nếu vấn đề vẫn tiếp diễn, vui lòng liên hệ quản trị viên.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  // --- Render JSX ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-screen-xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-primary/10 p-2 rounded-lg">
                 <LayoutDashboard className="h-6 w-6 text-primary" />
              </span>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-gray-100">
                Dashboard Chatbot Bán Hàng
              </h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Tổng quan hiệu suất hệ thống AnVie Spa ({getTimeUnitLabel()}).
            </p>
          </div>
          
          {/* Right side: Time Filter + User Info + Logout */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* User Info */}
            {user && (
              <div className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                Xin chào, <span className="font-semibold">{user.username}</span>
              </div>
            )}
            
            {/* Time Filter Buttons */}
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
               <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400 ml-1" />
               {(["hour", "day", "month", "year"] as TimeFormat[]).map((format) => (
                <Button
                  key={format}
                  variant={timeFormat === format ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTimeFormat(format)}
                  className={cn("capitalize min-w-[55px] transition-all duration-200", {
                    "text-primary font-semibold": timeFormat === format
                  })}
                  disabled={data.loading || data.customersLoading}
                >
                  {format === "hour" && "Giờ"}
                  {format === "day" && "Ngày"}
                  {format === "month" && "Tháng"}
                  {format === "year" && "Năm"}
                </Button>
              ))}
            </div>

            {/* Logout Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </header>

         {/* --- Error Alert --- */}
         {(data.error || data.customersError) && (
             <Alert variant="destructive" className="animate-fade-in">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Đã xảy ra lỗi</AlertTitle>
               <AlertDescription>
                 {data.error && <p>- Không thể tải dữ liệu thống kê. {data.error}</p>}
                 {data.customersError && <p>- Không thể tải danh sách khách hàng. {data.customersError}</p>}
                 <p className="mt-2 text-xs">Vui lòng kiểm tra kết nối backend, console (F12) và thử lại.</p>
               </AlertDescription>
             </Alert>
          )}

        {/* Metrics Grid */}
        <section aria-labelledby="metrics-title">
           <h2 id="metrics-title" className="sr-only">Chỉ số hiệu suất</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
             {metricsConfig.map((metric) => (
               <MetricCard key={metric.title + metric.unit} {...metric} />
             ))}
           </div>
        </section>

        {/* Customer List Section */}
         <section aria-labelledby="customer-list-title">
            <h2 id="customer-list-title" className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              Danh sách Khách hàng
            </h2>
            <CustomerList
               customers={data.customers}
               loading={data.customersLoading}
               error={null}
            />
         </section>
      </div>
    </div>
  )
}