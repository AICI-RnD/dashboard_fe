"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, ChevronRight, Search, X, AlertCircle } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar" // Import Avatar
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input" // Import Input
import { Skeleton } from "@/components/ui/skeleton" // Import Skeleton
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty" // Import Empty
import type { Customer } from "@/lib/types"
import CustomerDetail from "./customer-detail"
import { cn } from "@/lib/utils"

interface CustomerListProps {
  customers: Customer[]
  loading: boolean
  error: string | null // Giữ lại error prop để có thể hiển thị nếu cần
}

// === Customer Row Component ===
interface CustomerRowProps {
  customer: Customer;
  onClick: () => void;
}

const CustomerRow: React.FC<CustomerRowProps> = ({ customer, onClick }) => {
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

  return (
    <tr
      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150 cursor-pointer group"
      onClick={onClick}
    >
      <td className="py-3 px-4 text-muted-foreground truncate hidden sm:table-cell">
        {customer.id || "-"}
      </td>

      <td className="py-3 px-4 flex items-center gap-3">
        <Avatar className="h-8 w-8 text-xs border">
          {/* <AvatarImage src="/placeholder-user.jpg" alt={customer.name} /> */}
          <AvatarFallback className="bg-muted text-muted-foreground">
            {getInitials(customer.name)}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-foreground truncate">{customer.name}</span>
      </td>
      <td className="py-3 px-4 text-muted-foreground truncate hidden sm:table-cell">{customer.email || "-"}</td>
      <td className="py-3 px-4 text-muted-foreground truncate hidden md:table-cell">{customer.phone || "-"}</td>
      <td className="py-3 px-4">
        <span
          className={cn(
            "px-2 py-0.5 rounded text-xs font-semibold w-fit",
            customer.control_mode === "BOT"
              ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700"
              : "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700"
          )}
        >
          {customer.control_mode}
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 inline group-hover:translate-x-1 transition-transform duration-150" />
      </td>
    </tr>
  );
};

// === Loading Skeleton for Customer List ===
const CustomerListSkeleton: React.FC = () => (
   <Card className="shadow-sm">
      <CardHeader>
         <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
         <div className="space-y-1">
            {/* Skeleton Header */}
            <Skeleton className="h-10 w-full rounded-t-lg" />
            {/* Skeleton Rows */}
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full border-b" />)}
         </div>
      </CardContent>
   </Card>
);


// === Main Customer List Component ===
export default function CustomerList({ customers, loading, error }: CustomerListProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchTerm, setSearchTerm] = useState("");

  if (selectedCustomer) {
    return <CustomerDetail customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} />
  }

  const filteredCustomers = customers.filter(customer => {
    const term = searchTerm.toLowerCase(); // Chuyển searchTerm thành chữ thường một lần

    // Kiểm tra customer.name trước khi gọi toLowerCase()
    const nameMatch = customer.name && typeof customer.name === 'string'
      ? customer.name.toLowerCase().includes(term)
      : true;

    // Kiểm tra customer.email trước khi gọi toLowerCase()
    const emailMatch = customer.email && typeof customer.email === 'string'
      ? customer.email.toLowerCase().includes(term)
      : true;

    // Kiểm tra customer.phone (không cần toLowerCase)
    const phoneMatch = customer.phone && typeof customer.phone === 'string'
      ? customer.phone.includes(searchTerm) // searchTerm gốc vì SĐT không phân biệt hoa thường
      : true;

    return nameMatch || emailMatch || phoneMatch;
  });

  if (loading) {
    return <CustomerListSkeleton />;
  }

  // Error state handled outside this component now, but keep check for safety
  if (error) {
     return (
       <Card className="shadow-sm">
         <CardContent className="py-12 text-center">
            <Empty>
              <EmptyMedia variant="icon"><AlertCircle className="text-destructive"/></EmptyMedia>
              <EmptyTitle>Không thể tải danh sách</EmptyTitle>
              <EmptyDescription>Đã xảy ra lỗi khi tải khách hàng. Vui lòng thử lại.</EmptyDescription>
              <pre className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded max-w-full overflow-auto">{error}</pre>
            </Empty>
         </CardContent>
       </Card>
     );
  }

  if (customers.length === 0) {
    return (
      <Card className="shadow-sm">
         <CardContent className="py-12 text-center">
            <Empty>
              <EmptyMedia variant="icon"><Users/></EmptyMedia>
              <EmptyTitle>Chưa có khách hàng nào</EmptyTitle>
              <EmptyDescription>Hiện tại chưa có dữ liệu khách hàng để hiển thị.</EmptyDescription>
            </Empty>
         </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
         {/* Hiển thị số lượng kết quả lọc */}
         <CardTitle className="text-base font-semibold">
            {searchTerm ? `Tìm thấy ${filteredCustomers.length}` : `Tổng cộng ${customers.length}`} khách hàng
         </CardTitle>
         {/* Search Input */}
         <div className="relative w-full max-w-xs">
            <Input
               type="text"
               placeholder="Tìm kiếm tên, email, SĐT..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-8 h-9 text-sm" // Add padding for icon
            />
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             {searchTerm && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6" onClick={() => setSearchTerm("")}>
                    <X className="h-3 w-3" />
                    <span className="sr-only">Xóa tìm kiếm</span>
                </Button>
            )}
         </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          {filteredCustomers.length === 0 && searchTerm ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Không tìm thấy khách hàng nào khớp với "{searchTerm}".</p>
          ) : (
             <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">ID khách hàng</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tên khách hàng</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider hidden md:table-cell">Điện thoại</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Chế độ</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredCustomers.map((customer) => (
                  <CustomerRow key={customer.id} customer={customer} onClick={() => setSelectedCustomer(customer)} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  )
}