import { getProductById } from "@/lib/api"
import ProductForm from "@/components/product/product-form"
import { notFound } from "next/navigation"

interface Props {
    params: { id: string }
}

export default async function EditProductPage({ params }: Props) {
  // Trong thực tế nên dùng useQuery hoặc fetch trong client component nếu muốn dynamic hoàn toàn
  // Ở đây demo fetch server-side
  const product = await getProductById(params.id)

  if (!product) {
    return notFound() // Sẽ hiển thị trang 404 mặc định của Next.js
  }

  return (
    <div className="p-6">
        {/* Tái sử dụng ProductForm với dữ liệu ban đầu */}
      <ProductForm initialData={product} />
    </div>
  )
}