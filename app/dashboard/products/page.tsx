"use client" // <--- QUAN TRỌNG: Đánh dấu Client Component

import React, { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Edit, Trash, Plus, Search, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { getAllProducts, processProduct } from "@/lib/api" // Đảm bảo import getAllProducts
import { ProductListResponse, ProcessProductPayload, ActionType, ProductCore, ProductImage, ProductVariance } from "@/lib/types"
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

// Định nghĩa kiểu dữ liệu cho Item trong bảng (Flattened Structure)
interface ProductItem {
  product: ProductCore;
  product_images: ProductImage[];
  product_variances_1: ProductVariance[];
}

export default function ProductListPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // State
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]) // Lưu toàn bộ SP
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [deleteId, setDeleteId] = useState<number | null>(null)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10 

  // 1. FETCH DATA (Client Side)
  // Chạy 1 lần khi mount -> Sẽ thấy request trong Network Tab
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Dùng getAllProducts để lấy hết data (vượt qua giới hạn 100 của BE)
        // Hàm này đã handle logic gọi song song các trang
        const response = await getAllProducts("") 
        
        if (response && Array.isArray(response.data)) {
            // Mapping lại dữ liệu cho khớp kiểu ProductItem nếu cần
            setAllProducts(response.data as unknown as ProductItem[])
        } else {
            setAllProducts([])
        }
      } catch (error: any) {
        console.error("Failed to fetch products:", error)
        toast({ 
            title: "Lỗi tải dữ liệu", 
            description: error.message || "Không thể kết nối đến server", 
            variant: "destructive" 
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast]) // Dependency array rỗng để chạy 1 lần lúc đầu

  // 2. FILTER & PAGINATION LOGIC (Client Side)
  // Tính toán lại danh sách hiển thị mỗi khi search hoặc page thay đổi
  const filteredData = useMemo(() => {
    if (!searchTerm) return allProducts;
    
    const lowerTerm = searchTerm.toLowerCase();
    return allProducts.filter(item => 
        item.product.name.toLowerCase().includes(lowerTerm) ||
        item.product.sku?.toLowerCase().includes(lowerTerm) ||
        item.product.brand?.toLowerCase().includes(lowerTerm) ||
        item.product.id?.toString().includes(lowerTerm)
    );
  }, [allProducts, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
  
  const currentData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  // Reset về trang 1 khi search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);


  // 3. DELETE LOGIC (Strict Compliance with BE)
  const handleDelete = async () => {
    if (!deleteId) return
    
    const itemToDelete = allProducts.find(item => item.product.id === deleteId);
    
    if (!itemToDelete) {
        toast({ title: "Lỗi", description: "Không tìm thấy dữ liệu sản phẩm", variant: "destructive" })
        return;
    }

    try {
        // Construct Payload với action='delete' cho TẤT CẢ thành phần
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

        // Gọi API
        await processProduct(payload);
        
        // Cập nhật UI ngay lập tức (Optimistic Update)
        setAllProducts(prev => prev.filter(p => p.product.id !== deleteId));
        
        toast({ title: "Thành công", description: "Đã xóa sản phẩm", className: "bg-green-600 text-white" })

    } catch (error: any) {
        console.error(error);
        toast({ title: "Xóa thất bại", description: error.message, variant: "destructive" })
    } finally {
        setDeleteId(null)
    }
  }

  // Helper điều hướng
  const navigateToDetail = (id: number | undefined) => {
    if (id) router.push(`/dashboard/products/${id}`);
  }

  // Render Pagination UI
  const renderPaginationItems = () => {
    const items = []
    const maxVisible = 5 
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)

    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)

    if (currentPage > 1) {
        items.push(<PaginationItem key="prev"><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => p - 1) }} /></PaginationItem>)
    }

    for (let i = start; i <= end; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink href="#" isActive={i === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(i) }}>{i}</PaginationLink>
        </PaginationItem>
      )
    }
    
    if (end < totalPages) items.push(<PaginationItem key="ell"><PaginationEllipsis /></PaginationItem>)

    if (currentPage < totalPages) {
        items.push(<PaginationItem key="next"><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(p => p + 1) }} /></PaginationItem>)
    }
    return items
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
                        <TableHead className="w-[80px]">Ảnh</TableHead>
                        <TableHead className="w-[120px]">SKU</TableHead>
                        <TableHead>Tên sản phẩm</TableHead>
                        <TableHead className="w-[150px]">Thương hiệu</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {currentData.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8">Không tìm thấy dữ liệu</TableCell></TableRow>}
                    
                    {currentData.map((item) => {
                        const { product, product_images } = item;
                        const mainImage = product_images && product_images.length > 0 ? product_images[0].url : null;

                        return (
                            <TableRow 
                                key={product.id} 
                                className="group cursor-pointer hover:bg-muted/50 transition-colors"
                                onDoubleClick={() => navigateToDetail(product.id)}
                            >
                                <TableCell className="font-medium text-muted-foreground">{product.id}</TableCell>
                                <TableCell>
                                    <div className="relative w-10 h-10 rounded-md overflow-hidden border bg-muted">
                                        {mainImage ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={mainImage} alt={product.name} className="object-cover w-full h-full" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">Img</div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono text-sm">{product.sku || "---"}</TableCell>
                                <TableCell className="font-medium">
                                    <div className="line-clamp-2" title={product.name}>{product.name}</div>
                                </TableCell>
                                <TableCell>{product.brand || "---"}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="icon" title="Chi tiết" onClick={() => navigateToDetail(product.id)}>
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(product.id ?? null)}>
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
          
          {/* Pagination UI */}
          {!loading && filteredData.length > 0 && (
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn sản phẩm ID {deleteId}.
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