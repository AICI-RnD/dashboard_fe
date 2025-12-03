"use client" // <--- Quan trọng: Chuyển thành Client Component

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getProductDetail } from "@/lib/api"
import ProductForm from "@/components/product/product-form"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ProductDetailResponse } from "@/lib/types"

export default function EditProductPage() {
  // Trong Client Component, dùng hooks để lấy params
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [productData, setProductData] = useState<ProductDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true)
      try {
        // Gọi API từ client -> Sẽ lấy được token từ localStorage
        const data = await getProductDetail(id)
        setProductData(data)
      } catch (err: any) {
        console.error("Error fetching product:", err)
        setError(err.message || "Không thể tải thông tin sản phẩm")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  // --- Render States ---

  if (loading) {
    return (
      <div className="p-6 space-y-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
            <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <Skeleton className="h-[300px] w-full" />
                <Skeleton className="h-[200px] w-full" />
            </div>
            <div className="space-y-6">
                <Skeleton className="h-[200px] w-full" />
            </div>
        </div>
      </div>
    )
  }

  if (error || !productData) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>
            {error || "Không tìm thấy sản phẩm này."}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => router.push("/dashboard/products")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại danh sách
        </Button>
      </div>
    )
  }

  // Render Form khi có dữ liệu
  return (
    <div className="p-6">
      <ProductForm initialData={productData} />
    </div>
  )
}