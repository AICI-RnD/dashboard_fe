"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Edit, Trash, Plus, Search, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { getAllProducts, processProduct } from "@/lib/api"
import { ProductListResponse, ProcessProductPayload, ActionType } from "@/lib/types"
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
  
  // State lưu danh sách sản phẩm (cấu trúc nested từ BE)
  const [products, setProducts] = useState<ProductListResponse['data']>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const ITEMS_PER_PAGE = 10 

  // Fetch Data
  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await getAllProducts(searchTerm);
      
      if (response && Array.isArray(response.data)) {
          setProducts(response.data)
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

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchData()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, currentPage]) 

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // --- LOGIC XÓA ---
  const handleDelete = async () => {
    if (!deleteId) return
    
    const itemToDelete = products.find(item => item.product.id === deleteId);
    
    if (!itemToDelete) {
        toast({ title: "Lỗi", description: "Không tìm thấy dữ liệu sản phẩm", variant: "destructive" })
        return;
    }

    try {
        const payload: ProcessProductPayload = {
            product: { 
                ...itemToDelete.product, 
                action: 'delete' 
            },
            product_images: itemToDelete.product_images.map(img => ({
                ...img,
                action: 'delete' as ActionType
            })),
            product_variances_1: itemToDelete.product_variances_1.map(v => ({
                ...v,
                action: 'delete' as ActionType,
                prices: (v.prices || []).map(p => ({ ...p, action: 'delete' as ActionType }))
            }))
        };

        await processProduct(payload);
        
        toast({ title: "Thành công", description: "Đã xóa sản phẩm", className: "bg-green-600 text-white" })
        fetchData(); 

    } catch (error: any) {
        console.error(error);
        toast({ title: "Xóa thất bại", description: error.message, variant: "destructive" })
    } finally {
        setDeleteId(null)
    }
  }

  // Helper Pagination
  const renderPaginationItems = () => {
    const items = []
    const maxVisiblePages = 5 
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    if (currentPage > 1) {
        items.push(
            <PaginationItem key="prev">
                <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => p - 1) }} />
            </PaginationItem>
        )
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink href="#" isActive={i === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(i) }}>{i}</PaginationLink>
        </PaginationItem>
      )
    }
    
    if (endPage < totalPages) {
        items.push(<PaginationItem key="ellipsis"><PaginationEllipsis /></PaginationItem>)
    }

    if (currentPage < totalPages) {
        items.push(
            <PaginationItem key="next">
                <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => p + 1) }} />
            </PaginationItem>
        )
    }
    return items
  }

  // Helper điều hướng chi tiết
  const navigateToDetail = (id: number | undefined) => {
    if (id) router.push(`/dashboard/products/${id}`);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Danh sách sản phẩm</h1>
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
                    placeholder="Tìm theo tên, SKU, brand..." 
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="space-y-2">
                 {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
             </div>
          ) : (
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead className="w-[100px]">Ảnh</TableHead>
                        <TableHead className="w-[150px]">SKU</TableHead>
                        <TableHead>Tên sản phẩm</TableHead>
                        <TableHead className="w-[150px]">Thương hiệu</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {products.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8">Không tìm thấy dữ liệu</TableCell></TableRow>}
                    
                    {products.map((item) => {
                        const { product, product_images } = item;
                        const mainImage = product_images && product_images.length > 0 ? product_images[0].url : null;

                        return (
                            <TableRow 
                                key={product.id} 
                                className="group cursor-pointer hover:bg-muted/50 transition-colors"
                                // Double click vào hàng để xem chi tiết
                                onDoubleClick={() => navigateToDetail(product.id)}
                            >
                                <TableCell className="font-medium text-muted-foreground">{product.id}</TableCell>
                                <TableCell>
                                    <div className="relative w-12 h-12 rounded-md overflow-hidden border bg-muted">
                                        {mainImage ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={mainImage} alt={product.name} className="object-cover w-full h-full" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">No img</div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-sm">{product.sku || "---"}</TableCell>
                                <TableCell className="font-medium">
                                    <div className="line-clamp-2" title={product.name}>{product.name}</div>
                                </TableCell>
                                <TableCell>{product.brand || "---"}</TableCell>
                                <TableCell className="text-right">
                                    {/* Ngăn chặn sự kiện click lan ra ngoài (stopPropagation) để nút bấm hoạt động riêng biệt với onDoubleClick của hàng */}
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            title="Xem chi tiết"
                                            onClick={() => navigateToDetail(product.id)}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                                            onClick={() => setDeleteId(product.id ?? null)}
                                            title="Xóa"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                    </TableBody>
                </Table>
            </div>
          )}
          
          {/* Pagination */}
          {!loading && products.length > 0 && (
             <div className="mt-4">
                <Pagination>
                    <PaginationContent>
                        {renderPaginationItems()}
                    </PaginationContent>
                </Pagination>
             </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa sản phẩm?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn sản phẩm (ID: {deleteId}) và toàn bộ hình ảnh, biến thể liên quan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Xóa vĩnh viễn</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}