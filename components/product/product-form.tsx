"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Trash2, Upload, X, GripVertical, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Product, ProductVariant } from "@/lib/types" // Đảm bảo file này đã cập nhật type mới
import { uploadImage, createProduct, updateProduct } from "@/lib/api" // Import API thật
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// --- Zod Schema ---
const productSchema = z.object({
  name: z.string().min(1, "Tên sản phẩm là bắt buộc"),
  brand: z.string().optional(),
  short_description: z.string().optional(),
  description: z.string().optional(),
  has_variants: z.boolean().default(false),
  base_price: z.coerce.number().optional(),
  base_stock: z.coerce.number().optional(),
  base_sku: z.string().optional(),
})

type FormData = z.infer<typeof productSchema>

interface ProductFormProps {
  initialData?: Product
}

export default function ProductForm({ initialData }: ProductFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // --- State Quản lý hình ảnh ---
  const [imageUrls, setImageUrls] = useState<string[]>(initialData?.images || [])
  const [uploading, setUploading] = useState(false)

  // Form Setup
  const form = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: initialData || {
      has_variants: false,
      name: "",
      base_price: 0,
      base_stock: 0,
    }
  })

  // --- State Management Attributes & Variants ---
  const [attributes, setAttributes] = useState<{id: string, name: string, value: string}[]>(
    // Map lại dữ liệu cũ nếu có (để có ID cho key React)
    initialData?.general_attributes?.map((a, i) => ({ ...a, id: i.toString() })) || []
  )

  const [variantOptions, setVariantOptions] = useState<{id: string, name: string, values: string[]}[]>(
    initialData?.variant_options?.map((o, i) => ({ ...o, id: i.toString() })) || []
  )

  const [variants, setVariants] = useState<ProductVariant[]>(
    initialData?.variants || []
  )

  // --- Handlers: Attributes ---
  const addAttribute = () => {
    setAttributes([...attributes, { id: Date.now().toString(), name: "", value: "" }])
  }
  const removeAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index))
  }
  const updateAttribute = (index: number, field: 'name' | 'value', val: string) => {
    const newAttrs = [...attributes]
    newAttrs[index][field] = val
    setAttributes(newAttrs)
  }

  // --- Handlers: Variant Configuration ---
  const addVariantOption = () => {
    if (variantOptions.length >= 3) return;
    setVariantOptions([...variantOptions, { id: Date.now().toString(), name: "", values: [] }])
  }

  const removeVariantOption = (index: number) => {
    const newOptions = variantOptions.filter((_, i) => i !== index)
    setVariantOptions(newOptions)
    generateVariants(newOptions)
  }

  const updateVariantOptionName = (index: number, name: string) => {
    const newOptions = [...variantOptions]
    newOptions[index].name = name
    setVariantOptions(newOptions)
  }

  const handleValueInput = (e: React.KeyboardEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>, optIndex: number) => {
    const input = e.currentTarget
    const value = input.value.trim()
    
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    if (e.type === 'keydown') e.preventDefault(); 

    if (!value) return

    const newOptions = [...variantOptions]
    if (!newOptions[optIndex].values.includes(value)) {
      newOptions[optIndex].values.push(value)
      setVariantOptions(newOptions)
      generateVariants(newOptions)
      input.value = "" 
    }
  }

  const removeValueFromOption = (optIndex: number, valIndex: number) => {
    const newOptions = [...variantOptions]
    newOptions[optIndex].values = newOptions[optIndex].values.filter((_, i) => i !== valIndex)
    setVariantOptions(newOptions)
    generateVariants(newOptions)
  }

  // --- Thuật toán sinh biến thể (Cartesian Product) ---
  const generateVariants = (options: typeof variantOptions) => {
    const validOptions = options.filter(o => o.name && o.values.length > 0)
    if (validOptions.length === 0) {
      setVariants([])
      return
    }

    const cartesian = (args: string[][]): string[][] => {
      const r: string[][] = []
      const max = args.length - 1
      function helper(arr: string[], i: number) {
        for (let j = 0, l = args[i].length; j < l; j++) {
          const a = arr.slice(0)
          a.push(args[i][j])
          if (i === max) r.push(a)
          else helper(a, i + 1)
        }
      }
      helper([], 0)
      return r
    }

    const combinations = cartesian(validOptions.map(o => o.values))

    const newVariants: ProductVariant[] = combinations.map(combo => {
      const variantName = combo.join(" - ")
      const variantAttributes: Record<string, string> = {}
      
      validOptions.forEach((opt, idx) => {
        variantAttributes[opt.name] = combo[idx]
      })

      // Tìm xem biến thể này đã có trong list cũ chưa (để giữ lại ID thật, giá, kho...)
      const existing = variants.find(v => v.name === variantName)

      return {
        // Nếu có ID số (từ DB) thì giữ lại, nếu không tạo ID chuỗi giả cho React key
        id: existing?.id || Math.random().toString(36).substr(2, 9) as any, 
        name: variantName,
        sku: existing?.sku || "",
        price: existing?.price || 0,
        sale_price: existing?.sale_price || 0,
        stock: existing?.stock || 0,
        attributes: variantAttributes
      }
    })

    setVariants(newVariants)
  }

  // --- Bulk Edit ---
  const [bulkPrice, setBulkPrice] = useState<string>("")
  const [bulkStock, setBulkStock] = useState<string>("")
  const [bulkSkuPrefix, setBulkSkuPrefix] = useState<string>("")

  const applyBulkEdit = () => {
    const newVariants = variants.map((v, idx) => ({
      ...v,
      price: bulkPrice ? Number(bulkPrice) : v.price,
      stock: bulkStock ? Number(bulkStock) : v.stock,
      sku: bulkSkuPrefix ? `${bulkSkuPrefix}-${idx + 1}` : v.sku
    }))
    setVariants(newVariants)
    toast({ title: "Đã áp dụng chỉnh sửa hàng loạt" })
  }

  // --- Image Upload Logic ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    
    // Hỗ trợ upload nhiều file cùng lúc nếu input có multiple
    const files = Array.from(e.target.files);
    
    try {
        // Upload song song tất cả ảnh
        const uploadPromises = files.map(file => uploadImage(file));
        const urls = await Promise.all(uploadPromises);
        
        setImageUrls(prev => [...prev, ...urls]);
        toast({ title: "Upload thành công", className: "bg-green-600 text-white" });
    } catch (error) {
        console.error(error);
        toast({ title: "Lỗi upload ảnh", description: "Vui lòng kiểm tra lại file", variant: "destructive" });
    } finally {
        setUploading(false);
        e.target.value = ''; // Reset input
    }
  };

  const removeImage = (indexToRemove: number) => {
      setImageUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // --- MAIN SUBMIT FUNCTION ---
  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      // 1. Chuẩn bị payload theo đúng Spec Backend
      const finalProduct: Product = {
        ...data,
        // Chỉ gửi id nếu đang edit
        ...(initialData?.id ? { id: initialData.id } : {}),
        
        // Clean attributes (bỏ id giả)
        general_attributes: attributes
            .filter(a => a.name && a.value)
            .map(({ name, value }) => ({ name, value })),
            
        // Clean variant options (bỏ id giả)
        variant_options: variantOptions
            .filter(o => o.name && o.values.length > 0)
            .map(({ name, values }) => ({ name, values })),
        
        images: imageUrls,

        // Xử lý Variants: Quan trọng!
        // Backend yêu cầu: Biến thể cũ gửi kèm ID, biến thể mới KHÔNG gửi ID (hoặc null)
        variants: variants.map(v => {
            // Kiểm tra nếu id là số (ID thật từ DB) thì giữ, nếu là string (ID giả React) thì bỏ
            const realId = (v.id && typeof v.id === 'number') ? v.id : undefined;
            return {
                ...v,
                id: realId,
                // Đảm bảo các trường số không bị NaN
                price: Number(v.price) || 0,
                stock: Number(v.stock) || 0,
                sale_price: Number(v.sale_price) || 0,
            };
        })
      }

      // 2. Gọi API
      if (initialData?.id) {
        await updateProduct(initialData.id, finalProduct)
        toast({ title: "Cập nhật thành công", className: "bg-green-600 text-white" })
      } else {
        await createProduct(finalProduct)
        toast({ title: "Tạo mới thành công", className: "bg-green-600 text-white" })
      }
      
      // 3. Redirect
      router.push("/dashboard/products")
    } catch (error: any) {
      console.error("Submit Error:", error);
      toast({ 
          title: "Lỗi lưu sản phẩm", 
          description: error.message || "Có lỗi xảy ra khi kết nối server", 
          variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const hasVariants = form.watch("has_variants")

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-6xl mx-auto pb-24">
      
      {/* Header Actions */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {initialData ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
            </h1>
            <p className="text-sm text-muted-foreground">Điền thông tin chi tiết cho sản phẩm của bạn</p>
        </div>
        <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>Hủy bỏ</Button>
            <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? "Cập nhật" : "Đăng sản phẩm"}
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 1. Thông tin cơ bản */}
          <Card className="border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-2">
                <Label>Tên sản phẩm <span className="text-red-500">*</span></Label>
                <Input {...form.register("name")} className="h-10" placeholder="Nhập tên sản phẩm..." />
                {form.formState.errors.name && <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div className="grid gap-2">
                    <Label>Thương hiệu</Label>
                    <Input {...form.register("brand")} placeholder="Nhập thương hiệu..." />
                </div>
                 <div className="grid gap-2">
                    <Label>Mã sản phẩm (SKU gốc)</Label>
                    <Input {...form.register("base_sku")} placeholder="VD: SKU-001" />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Mô tả ngắn</Label>
                <Textarea {...form.register("short_description")} className="h-20" placeholder="Mô tả ngắn gọn..." />
              </div>
              
              <div className="grid gap-2">
                <Label>Mô tả chi tiết</Label>
                <Textarea {...form.register("description")} className="min-h-[200px]" placeholder="Viết mô tả chi tiết sản phẩm..." />
              </div>
            </CardContent>
          </Card>

          {/* 3. Thông tin bán hàng (Biến thể) */}
          <Card className="border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
             <CardHeader className="pb-4 border-b">
                <CardTitle className="text-lg">Thông tin bán hàng</CardTitle>
             </CardHeader>
             <CardContent className="pt-6 space-y-6">
                
                {/* Toggle Biến thể */}
                <div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-dashed">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base font-medium">Phân loại hàng (Biến thể)</Label>
                            <p className="text-xs text-muted-foreground">Thêm tối đa 3 nhóm biến thể (VD: Màu sắc, Size, Chất liệu)</p>
                        </div>
                        <Controller
                            control={form.control}
                            name="has_variants"
                            render={({ field }) => (
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            )}
                        />
                    </div>
                </div>

                {/* LOGIC: KHÔNG CÓ BIẾN THỂ */}
                {!hasVariants ? (
                    <div className="grid grid-cols-2 gap-6">
                        <div className="grid gap-2">
                            <Label>Giá bán lẻ (VNĐ)</Label>
                            <div className="relative">
                                <Input type="number" {...form.register("base_price")} className="pl-8" placeholder="0" />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₫</span>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Kho hàng</Label>
                            <Input type="number" {...form.register("base_stock")} placeholder="0" />
                        </div>
                    </div>
                ) : (
                    /* LOGIC: CÓ BIẾN THỂ */
                    <div className="space-y-6">
                        
                        {/* Danh sách các nhóm biến thể */}
                        <div className="space-y-4">
                            {variantOptions.map((option, optIndex) => (
                                <div key={option.id} className="bg-gray-50 dark:bg-gray-900/30 rounded-lg border p-4 relative group">
                                    {/* Header của nhóm */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="grid gap-1.5 flex-1 max-w-sm">
                                            <Label className="text-xs font-semibold text-muted-foreground uppercase">Tên nhóm biến thể {optIndex + 1}</Label>
                                            <Input 
                                                value={option.name} 
                                                onChange={(e) => updateVariantOptionName(optIndex, e.target.value)}
                                                placeholder="Ví dụ: Màu sắc, Size..." 
                                                className="bg-white dark:bg-black"
                                            />
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive -mr-2 -mt-2" onClick={() => removeVariantOption(optIndex)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Danh sách giá trị của nhóm */}
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-muted-foreground uppercase">Giá trị tùy chọn</Label>
                                        <div className="grid gap-2">
                                            {option.values.map((val, valIndex) => (
                                                <div key={valIndex} className="flex items-center gap-2 group/val">
                                                    <GripVertical className="w-4 h-4 text-gray-300 cursor-move" />
                                                    <div className="flex-1 relative">
                                                        <Input 
                                                            value={val} 
                                                            readOnly 
                                                            className="bg-white dark:bg-black pr-8 h-9" 
                                                        />
                                                    </div>
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => removeValueFromOption(optIndex, valIndex)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            
                                            {/* Input thêm giá trị mới */}
                                            <div className="flex items-center gap-2">
                                                <div className="w-4" /> {/* Spacer cho icon drag */}
                                                <Input 
                                                    placeholder="Thêm giá trị khác (Enter để thêm)" 
                                                    className="flex-1 border-dashed bg-transparent focus:bg-white dark:focus:bg-black transition-colors h-9"
                                                    onKeyDown={(e) => handleValueInput(e, optIndex)}
                                                    onBlur={(e) => handleValueInput(e, optIndex)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Nút thêm nhóm biến thể */}
                            {variantOptions.length < 3 && (
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="w-full border-dashed text-primary hover:bg-primary/5 h-12"
                                    onClick={addVariantOption}
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Thêm nhóm biến thể
                                </Button>
                            )}
                        </div>

                        {/* Bảng danh sách biến thể */}
                        {variants.length > 0 && (
                            <div className="pt-4 border-t">
                                <div className="flex items-center justify-between mb-4">
                                    <Label className="text-base font-medium">Danh sách phân loại hàng</Label>
                                    
                                    {/* Bulk Edit Dropdown */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="secondary" size="sm">
                                                Chỉnh sửa hàng loạt <ChevronDown className="w-4 h-4 ml-2" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-80 p-4">
                                            <div className="space-y-3">
                                                <h4 className="font-medium text-sm mb-2">Áp dụng cho tất cả</h4>
                                                <div className="grid grid-cols-3 gap-2 items-center">
                                                    <Label className="text-xs">Giá</Label>
                                                    <Input className="col-span-2 h-8" type="number" placeholder="Nhập giá" onChange={(e) => setBulkPrice(e.target.value)} />
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 items-center">
                                                    <Label className="text-xs">Kho</Label>
                                                    <Input className="col-span-2 h-8" type="number" placeholder="Nhập kho" onChange={(e) => setBulkStock(e.target.value)} />
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 items-center">
                                                    <Label className="text-xs">SKU</Label>
                                                    <Input className="col-span-2 h-8" placeholder="Tiền tố SKU" onChange={(e) => setBulkSkuPrefix(e.target.value)} />
                                                </div>
                                                <Button size="sm" className="w-full mt-2" onClick={applyBulkEdit}>Áp dụng ngay</Button>
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="border rounded-md overflow-hidden bg-white dark:bg-black">
                                    <Table>
                                        <TableHeader className="bg-gray-50 dark:bg-gray-900">
                                            <TableRow>
                                                {/* Dynamic Headers based on Options */}
                                                {variantOptions.filter(o => o.name).map(opt => (
                                                    <TableHead key={opt.id} className="font-semibold text-gray-700 dark:text-gray-300">{opt.name}</TableHead>
                                                ))}
                                                <TableHead className="w-[150px] font-semibold text-gray-700 dark:text-gray-300">Giá bán lẻ <span className="text-red-500">*</span></TableHead>
                                                <TableHead className="w-[120px] font-semibold text-gray-700 dark:text-gray-300">Kho hàng <span className="text-red-500">*</span></TableHead>
                                                <TableHead className="w-[150px] font-semibold text-gray-700 dark:text-gray-300">SKU phân loại</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {variants.map((variant, index) => (
                                                <TableRow key={variant.id}>
                                                    {/* Dynamic Cells */}
                                                    {variantOptions.filter(o => o.name).map(opt => (
                                                        <TableCell key={opt.id} className="font-medium text-sm">
                                                            {variant.attributes?.[opt.name]}
                                                        </TableCell>
                                                    ))}
                                                    
                                                    <TableCell>
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₫</span>
                                                            <Input 
                                                                className="h-9 pl-6" 
                                                                type="number" 
                                                                value={variant.price || ""} 
                                                                onChange={(e) => {
                                                                    const newV = [...variants];
                                                                    newV[index].price = Number(e.target.value);
                                                                    setVariants(newV);
                                                                }}
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            className="h-9" 
                                                            type="number" 
                                                            value={variant.stock || ""} 
                                                            onChange={(e) => {
                                                                const newV = [...variants];
                                                                newV[index].stock = Number(e.target.value);
                                                                setVariants(newV);
                                                            }}
                                                            placeholder="0"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            className="h-9" 
                                                            value={variant.sku} 
                                                            onChange={(e) => {
                                                                const newV = [...variants];
                                                                newV[index].sku = e.target.value;
                                                                setVariants(newV);
                                                            }}
                                                            placeholder="SKU..."
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
             </CardContent>
          </Card>
          
          {/* 1.1 Thuộc tính chung */}
          <Card className="border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base">Thuộc tính sản phẩm</CardTitle>
                    <CardDescription>Thông số kỹ thuật (VD: Thương hiệu, Chất liệu)</CardDescription>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={addAttribute}>
                    <Plus className="w-4 h-4 mr-1"/> Thêm thuộc tính
                </Button>
            </CardHeader>
            <CardContent>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
                    {attributes.length === 0 && <p className="text-sm text-muted-foreground text-center italic py-2">Chưa có thuộc tính nào.</p>}
                    {attributes.map((attr, index) => (
                        <div key={attr.id} className="flex gap-3 items-center group">
                            <div className="grid gap-1 flex-1">
                                <Label className="text-xs text-muted-foreground">Tên thuộc tính</Label>
                                <Input 
                                    className="bg-white dark:bg-black h-9"
                                    placeholder="VD: Chất liệu" 
                                    value={attr.name} 
                                    onChange={(e) => updateAttribute(index, 'name', e.target.value)}
                                />
                            </div>
                            <div className="grid gap-1 flex-1">
                                <Label className="text-xs text-muted-foreground">Giá trị</Label>
                                <Input 
                                    className="bg-white dark:bg-black h-9"
                                    placeholder="VD: 100% Cotton" 
                                    value={attr.value} 
                                    onChange={(e) => updateAttribute(index, 'value', e.target.value)}
                                />
                            </div>
                            <div className="pt-5">
                                <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-9 w-9" onClick={() => removeAttribute(index)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8">
          
          {/* 2. Upload Media */}
          <Card className="border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
            <CardHeader>
                <CardTitle className="text-lg">Hình ảnh sản phẩm</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Danh sách ảnh đã upload */}
                {imageUrls.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        {imageUrls.map((url, idx) => (
                            <div key={idx} className="relative aspect-square rounded-md border overflow-hidden group bg-gray-100">
                                <img src={url} alt="Product" className="object-cover w-full h-full" />
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Vùng upload */}
                <label className={`border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-primary/5 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group h-48 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="bg-primary/10 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-6 h-6 text-primary" />}
                    </div>
                    <p className="text-sm font-medium text-foreground">
                        {uploading ? "Đang tải lên..." : "Thêm hình ảnh"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Kéo thả hoặc click để tải lên</p>
                    <input 
                        type="file" 
                        className="hidden" 
                        multiple 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        disabled={uploading}
                    />
                </label>
            </CardContent>
          </Card>

          {/* 4. Trạng thái */}
          <Card className="border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
             <CardHeader>
                <CardTitle className="text-lg">Thiết lập khác</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Hiển thị</Label>
                        <p className="text-xs text-muted-foreground">Cho phép khách hàng thấy sản phẩm này</p>
                    </div>
                    <Switch defaultChecked />
                </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}