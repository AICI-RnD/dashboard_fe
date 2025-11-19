"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Edit, Trash, Eye, Plus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { getProducts, deleteProduct } from "@/lib/api"
import { Product } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

export default function ProductListPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteId, setDeleteId] = useState<string | number | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const ITEMS_PER_PAGE = 50 // Số lượng sản phẩm mỗi trang

  // Fetch Data
  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        // Gọi API với tham số page và limit
        const response = await getProducts(currentPage, ITEMS_PER_PAGE, searchTerm)
        
        if (response && Array.isArray(response.data)) {
            setProducts(response.data)
            
            // Tính toán tổng số trang dựa trên total items trả về từ API
            // Giả sử response.pagination.total là tổng số item
            const totalItems = response.pagination?.total || 0
            setTotalPages(Math.ceil(totalItems / ITEMS_PER_PAGE) || 1)
        } else {
            setProducts([])
            setTotalPages(1)
        }
      } catch (error) {
        console.error("Failed to fetch products:", error)
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    // Debounce simple
    const timer = setTimeout(() => {
        fetch()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, currentPage]) // Chạy lại khi search hoặc đổi trang

  // Reset về trang 1 khi tìm kiếm thay đổi
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
        await deleteProduct(deleteId)
        // Refresh lại list sau khi xóa
        const response = await getProducts(currentPage, ITEMS_PER_PAGE, searchTerm)
        if (response && Array.isArray(response.data)) {
            setProducts(response.data)
        }
        toast({ title: "Đã xóa sản phẩm" })
    } catch (error) {
        toast({ title: "Xóa thất bại", variant: "destructive" })
    } finally {
        setDeleteId(null)
    }
  }

  // Helper function để tạo danh sách trang hiển thị (VD: 1, 2, 3 ... 10)
  const renderPaginationItems = () => {
    const items = []
    const maxVisiblePages = 5 // Số lượng nút trang tối đa hiển thị

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            href="#" 
            isActive={i === currentPage}
            onClick={(e) => {
              e.preventDefault()
              setCurrentPage(i)
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      )
    }
    
    // Thêm dấu ... nếu cần
    if (startPage > 1) {
        items.unshift(
            <PaginationItem key="ellipsis-start">
                <PaginationEllipsis />
            </PaginationItem>
        )
    }
    if (endPage < totalPages) {
        items.push(
            <PaginationItem key="ellipsis-end">
                <PaginationEllipsis />
            </PaginationItem>
        )
    }

    return items
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Sản phẩm</h1>
        <Link href="/dashboard/products/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Thêm sản phẩm
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="pb-3">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Tìm kiếm sản phẩm..." 
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="space-y-2">
                 {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
             </div>
          ) : (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Tên sản phẩm</TableHead>
                    <TableHead>Thương hiệu</TableHead>
                    <TableHead>Giá cơ bản</TableHead>
                    <TableHead>Biến thể</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {products.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8">Không tìm thấy sản phẩm</TableCell></TableRow>}
                {products.map((product) => (
                    <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.id}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.brand || "-"}</TableCell>
                    <TableCell>
                        {product.has_variants 
                            ? `${product.variants?.length ?? 0} biến thể` 
                            : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.base_price || 0)}
                    </TableCell>
                    <TableCell>
                        {product.has_variants ? (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {product.variants?.length ?? 0} variants
                            </span>
                        ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                Đơn thể
                            </span>
                        )}
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/products/${product.id}`)}>
                                <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(product.id ?? null)}>
                                <Trash className="w-4 h-4" />
                            </Button>
                        </div>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Sản phẩm sẽ bị xóa vĩnh viễn khỏi hệ thống.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}