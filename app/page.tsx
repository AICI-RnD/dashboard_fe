"use client"

import React from "react";
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Clock, MessageSquare, ShoppingCart, Users, Zap, TrendingUp, RotateCcw, LayoutDashboard, AlertCircle, BarChart3, Filter
} from "lucide-react" // Thêm icon BarChart3, Filter
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip" // Thêm Tooltip
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
import { cn } from "@/lib/utils" // Import cn utility

type TimeFormat = "hour" | "day" | "month" | "year"

interface MetricDisplayProps {
  title: string
  value: string | number
  unit: string
  icon: React.ReactElement<{ className?: string }>
  loading: boolean
  tooltipText?: string // Thêm tooltip giải thích
  colorClass?: string
  trend?: "up" | "down" | "neutral" // Thêm thông tin xu hướng (ví dụ)
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
      "border-border": !colorClass || colorClass === "bg-card" // Default border
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
            {/* <p className={`text-xs ${trendColor} flex items-center gap-1 mt-1`}>
              {trendIcon && <span>{trendIcon}</span>}
              {trend !== "neutral" && <span>5.2%</span>} {}
              <span className="text-muted-foreground">{trend !== "neutral" ? "so với kỳ trước" : ""}</span>
            </p> */}
          </>
        )}
      </CardContent>
    </Card>
  );

  // Chỉ thêm Tooltip nếu có tooltipText
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
}

// === Main Dashboard Component ===
export default function Dashboard() {
  const [timeFormat, setTimeFormat] = useState<TimeFormat>("day")
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
  })

  // --- Data Fetching Effect ---
  useEffect(() => {
    const fetchAllData = async () => {
      setData((prev) => ({
        ...prev, loading: true, error: null,
        customers: [], customersLoading: true, customersError: null
      }));

      const metricsPromises = [
        getAvgAutomationRate(timeFormat as Period), 
        getCustomerAvgResponseTime(timeFormat as Period),
        getAgentAvgResponseTime(timeFormat as Period), 
        getAppointmentAvgCompletionTime(timeFormat as Period),
        getNewAppointments(timeFormat as Period), 
        getReturningCustomers(timeFormat as Period),
        getNewCustomers(timeFormat as Period),
      ];
      const customersPromise = getAllCustomers();

      try {
        const [
          automationRate, 
          customerResponseTime, 
          agentResponseTime, 
          orderCompletionTime,
          newOrders, 
          returningCustomers, 
          newCustomers,
        ] = await Promise.all(metricsPromises);

        setData(prev => ({
          ...prev, 
          automationRate, 
          customerResponseTime, 
          agentResponseTime, 
          orderCompletionTime,
          newOrders, 
          returningCustomers, 
          newCustomers, 
          loading: false, 
          error: null, 
        }));
        
      } catch (metricsError) {
        console.error("Failed to fetch dashboard metrics:", metricsError)
        setData(prev => ({
          ...prev, 
          loading: false,
          error: metricsError instanceof Error ? metricsError.message : "Failed to load dashboard metrics",
        }));
      }

      try {
        const customers = await customersPromise;
        setData(prev => ({ 
          ...prev, 
          customers, 
          customersLoading: false, 
          customersError: null 
      }));

      } catch (customerError) {
        console.error("Failed to fetch customers:", customerError);
        setData(prev => ({
          ...prev, customersLoading: false,
          customersError: customerError instanceof Error ? customerError.message : "Failed to load customers"
        }));
      }
    }
    fetchAllData()
  }, [timeFormat])

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

  // --- Metrics Configuration ---
  const metricsConfig: MetricDisplayProps[] = [
    { title: `Tỉ lệ tự động (${getTimeUnitLabel()})`, value: formatPercentage(data.automationRate), unit: "%", icon: <RotateCcw />, tooltipText: "Tỉ lệ phần trăm các phản hồi được xử lý tự động bởi bot.", colorClass: "bg-indigo-50 dark:bg-indigo-950/50", loading: data.loading },
    { title: `Đơn đặt lịch mới (${getTimeUnitLabel()})`, value: formatCount(data.newOrders), unit: "đơn", icon: <ShoppingCart />, tooltipText: "Tổng số đơn hàng mới được tạo trong khoảng thời gian đã chọn.", colorClass: "bg-orange-50 dark:bg-orange-950/50", loading: data.loading },
    { title: `TG TB Khách P.Hồi (${getTimeUnitLabel()})`, value: formatTimeUnit(data.customerResponseTime), unit: "giây", icon: <MessageSquare />, tooltipText: "Thời gian trung bình khách hàng phản hồi lại tin nhắn.", colorClass: "bg-blue-50 dark:bg-blue-950/50", loading: data.loading },
    { title: `TG TB Agent P.Hồi (${getTimeUnitLabel()})`, value: formatTimeUnit(data.agentResponseTime), unit: "giây", icon: <Zap />, tooltipText: "Thời gian trung bình agent tham gia hoặc phản hồi trong cuộc trò chuyện.", colorClass: "bg-green-50 dark:bg-green-950/50", loading: data.loading },
    { title: `TG TB Hoàn thành đơn (${getTimeUnitLabel()})`, value: formatTimeUnit(data.orderCompletionTime), unit: "giây", icon: <Clock />, tooltipText: "Thời gian trung bình từ khi bắt đầu phiên chat đến khi đơn hàng được tạo.", colorClass: "bg-purple-50 dark:bg-purple-950/50", loading: data.loading },
    { title: `Khách quay lại (${getTimeUnitLabel()})`, value: formatCount(data.returningCustomers), unit: "khách", icon: <TrendingUp />, tooltipText: "Số lượng khách hàng đã tương tác trước đây quay lại trong kỳ.", colorClass: "bg-pink-50 dark:bg-pink-950/50", loading: data.loading },
    { title: `Khách hàng mới (${getTimeUnitLabel()})`, value: formatCount(data.newCustomers), unit: "khách", icon: <Users />, tooltipText: "Số lượng khách hàng tương tác lần đầu trong kỳ.", colorClass: "bg-cyan-50 dark:bg-cyan-950/50", loading: data.loading },
    // Thêm một card trống nếu cần để đủ dòng (ví dụ khi có 7 metrics)
    // Hoặc bạn có thể thêm một chỉ số khác nếu có
     { title: `Trống (${getTimeUnitLabel()})`, value: "-", unit: "%", icon: <BarChart3 />, tooltipText: "Tỷ lệ khách hàng tạo đơn hàng trên tổng số khách tương tác (dữ liệu ví dụ).", colorClass: "bg-teal-50 dark:bg-teal-950/50", loading: data.loading },
  ];

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
          {/* Time Filter Buttons */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
             <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400 ml-1" />
             {(["hour", "day", "month", "year"] as TimeFormat[]).map((format) => (
              <Button
                key={format}
                variant={timeFormat === format ? "secondary" : "ghost"} // "secondary" cho nút được chọn
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
                // Key được đặt ở đây
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
               error={null} // Lỗi đã được xử lý ở Alert bên trên
            />
         </section>
      </div>
    </div>
  )
}