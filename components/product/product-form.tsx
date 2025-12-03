"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Trash2, Upload, X, GripVertical, ChevronDown, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { 
  ActionType, 
  ProcessProductPayload, 
  ProductDetailResponse, 
  ProductImage,
  ProductPrice, 
  ProductVariance,
  WithAction
} from "@/lib/types";
import {   processProduct } from "@/lib/api"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// --- Schema ---
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

// UI Variant Interface
interface UIVariant {
  id?: number
  tempId: string
  name: string
  sku: string
  price: number
  priceId?: number
  stock: number
  attributes: Record<string, string>
}

interface ProductFormProps {
  initialData?: ProductDetailResponse
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export default function ProductForm({ initialData }: ProductFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false) // State cho nút xóa

  // --- 1. STATE & INIT ---
  
  // Images
  const [images, setImages] = useState<Partial<ProductImage>[]>(
    initialData?.product_images || []
  )
  const [uploading, setUploading] = useState(false)

  // Attributes from Brief Description
  const initAttributes = useMemo(() => {
    if (!initialData?.product?.brief_des) return [];
    try {
      const des = initialData.product.brief_des as Record<string, any>;
      return Object.entries(des).map(([key, value], index) => ({
        id: index.toString(),
        name: key,
        value: String(value)
      }));
    } catch { return [] }
  }, [initialData]);

  const [attributes, setAttributes] = useState(initAttributes);

  // Variants Reconstruction
  const { initVariantOptions, initVariants } = useMemo(() => {
    if (!initialData?.product_variances_1 || initialData.product_variances_1.length === 0) {
      return { initVariantOptions: [], initVariants: [] };
    }

    const firstVar = initialData.product_variances_1[0];
    const groupNames = firstVar.var_name ? firstVar.var_name.split(" - ") : ["Mặc định"];
    
    const optionsMap = new Map<string, Set<string>>();
    groupNames.forEach(name => optionsMap.set(name, new Set()));

    const uiVariants: UIVariant[] = initialData.product_variances_1.map(v => {
      const values = v.value ? v.value.split(" - ") : [];
      const attrs: Record<string, string> = {};
      
      groupNames.forEach((name, idx) => {
        const val = values[idx] || "Default";
        optionsMap.get(name)?.add(val);
        attrs[name] = val;
      });

      const priceInfo = v.prices?.[0]; 

      return {
        id: v.id,
        tempId: Math.random().toString(36).substr(2, 9),
        name: v.value,
        sku: v.sku || "",
        price: priceInfo?.price || 0,
        priceId: priceInfo?.id,
        stock: priceInfo?.quantity || 0,
        attributes: attrs
      };
    });

    const variantOptions = Array.from(optionsMap.entries()).map(([name, valuesSet], idx) => ({
      id: idx.toString(),
      name,
      values: Array.from(valuesSet)
    }));

    return { initVariantOptions: variantOptions, initVariants: uiVariants };
  }, [initialData]);

  const [variantOptions, setVariantOptions] = useState(initVariantOptions);
  const [variants, setVariants] = useState<UIVariant[]>(initVariants);

  // Form
  const form = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.product?.name || "",
      brand: initialData?.product?.brand || "",
      description: initialData?.product?.des || "",
      base_sku: initialData?.product?.sku || "",
      has_variants: (initialData?.product_variances_1?.length || 0) > 1, // Logic tạm: >1 coi là có biến thể
      base_price: initialData?.product_variances_1?.[0]?.prices?.[0]?.price || 0,
      base_stock: initialData?.product_variances_1?.[0]?.prices?.[0]?.quantity || 0,
    }
  })

  const hasVariants = form.watch("has_variants");

  // --- 2. HANDLERS (Attributes, Variants, Bulk, Images) ---
  // (Giữ nguyên các hàm helper xử lý UI state như addAttribute, generateVariants, handleImageUpload...)
  const addAttribute = () => setAttributes([...attributes, { id: Date.now().toString(), name: "", value: "" }])
  const removeAttribute = (index: number) => setAttributes(attributes.filter((_, i) => i !== index))
  const updateAttribute = (index: number, field: 'name' | 'value', val: string) => {
    const newAttrs = [...attributes]; newAttrs[index][field] = val; setAttributes(newAttrs)
  }

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
    const newOptions = [...variantOptions]; newOptions[index].name = name; setVariantOptions(newOptions)
  }
  const handleValueInput = (e: React.KeyboardEvent<HTMLInputElement>, optIndex: number) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = e.currentTarget.value.trim();
    if (!val) return;
    const newOpts = [...variantOptions];
    if (!newOpts[optIndex].values.includes(val)) {
      newOpts[optIndex].values.push(val);
      setVariantOptions(newOpts);
      generateVariants(newOpts);
      e.currentTarget.value = "";
    }
  }
  const removeValueFromOption = (optIndex: number, valIndex: number) => {
    const newOpts = [...variantOptions];
    newOpts[optIndex].values = newOpts[optIndex].values.filter((_, i) => i !== valIndex);
    setVariantOptions(newOpts);
    generateVariants(newOpts);
  }

  const generateVariants = (options: typeof variantOptions) => {
    const validOptions = options.filter(o => o.name && o.values.length > 0)
    if (validOptions.length === 0) { setVariants([]); return }
    const cartesian = (args: string[][]): string[][] => {
      const r: string[][] = [], max = args.length - 1;
      function helper(arr: string[], i: number) {
        for (let j = 0, l = args[i].length; j < l; j++) {
          const a = arr.slice(0); a.push(args[i][j]);
          if (i === max) r.push(a); else helper(a, i + 1);
        }
      }
      helper([], 0); return r;
    }
    const combinations = cartesian(validOptions.map(o => o.values));
    const newVars = combinations.map(combo => {
      const name = combo.join(" - ");
      const existing = variants.find(v => v.name === name);
      const attrs: Record<string, string> = {};
      validOptions.forEach((opt, idx) => attrs[opt.name] = combo[idx]);
      return {
        id: existing?.id, tempId: existing?.tempId || Math.random().toString(36).substr(2,9),
        name, sku: existing?.sku || "", price: existing?.price || 0, priceId: existing?.priceId,
        stock: existing?.stock || 0, attributes: attrs
      }
    });
    setVariants(newVars);
  }

  // --- Bulk Edit Handlers ---
  const [bulkPrice, setBulkPrice] = useState(""); const [bulkStock, setBulkStock] = useState(""); const [bulkSku, setBulkSku] = useState("");
  const applyBulkEdit = () => {
    const newVars = variants.map((v, i) => ({
      ...v,
      price: bulkPrice ? Number(bulkPrice) : v.price,
      stock: bulkStock ? Number(bulkStock) : v.stock,
      sku: bulkSku ? `${bulkSku}-${i+1}` : v.sku
    }));
    setVariants(newVars); toast({title: "Đã áp dụng"});
  }

  // --- Image Handlers ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    try {
      const files = Array.from(e.target.files);
      // Chuyển tất cả file sang Base64 song song
      const base64List = await Promise.all(files.map(f => fileToBase64(f)));
      
      // Thêm vào state (chưa có ID -> coi là ảnh mới)
      const newImages = base64List.map(base64 => ({ url: base64 }));
      setImages(prev => [...prev, ...newImages]);
      
      toast({ title: "Đã chọn ảnh", description: "Ảnh sẽ được lưu khi bấm Lưu lại" });
    } catch (error) {
      console.error(error);
      toast({ title: "Lỗi xử lý ảnh", variant: "destructive" });
    } finally { 
      setUploading(false); 
      e.target.value = ''; 
    }
  }

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  // --- 3. PAYLOAD TRANSFORMER (QUAN TRỌNG) ---
  const transformToPayload = (formData: FormData, isDeleteRequest = false): ProcessProductPayload => {
    const isCreateMode = !initialData?.product?.id;
    // Action cho Product Core: Nếu đang xóa -> 'delete', tạo mới -> 'create', sửa -> 'update'
    const coreAction: ActionType = isDeleteRequest ? 'delete' : (isCreateMode ? 'create' : 'update');

    // 1. Core
    const briefDes = attributes.reduce((acc, curr) => { if(curr.name) acc[curr.name] = curr.value; return acc }, {} as any);
    const productPayload = {
      id: initialData?.product?.id || 0,
      sku: formData.base_sku || null,
      name: formData.name,
      brand: formData.brand,
      brief_des: briefDes,
      des: formData.description,
      created_at: initialData?.product?.created_at,
      url: initialData?.product?.url,
      action: coreAction
    };

    // 2. Images
    const initImgIds = new Set((initialData?.product_images || []).map(i => i.id));
    const currImgIds = new Set(images.map(i => i.id).filter(Boolean));
    const imgPayload: WithAction<ProductImage>[] = [];

    if (isDeleteRequest) {
      (initialData?.product_images || []).forEach(img => imgPayload.push({ ...img, action: 'delete' }));
    } else {
      images.forEach(img => {
        if (img.id) {
          // Ảnh cũ còn giữ lại -> keep
          imgPayload.push({ 
            id: img.id, url: img.url!, product_id: initialData?.product?.id,
            action: 'keep' 
          });
        } else {
          // Ảnh mới (Base64) -> create
          imgPayload.push({ 
            url: img.url!, // Đây là chuỗi Base64
            action: 'create' 
          });
        }
      });
      // Tìm ảnh đã bị xóa (có ID cũ nhưng không còn trong state)
      (initialData?.product_images || []).forEach(img => {
        if (!currImgIds.has(img.id)) imgPayload.push({ ...img, action: 'delete' });
      });
    }

    // 3. Variances & Prices
    const initVarIds = new Set((initialData?.product_variances_1 || []).map(v => v.id));
    const currVarIds = new Set(variants.map(v => v.id).filter(Boolean));
    const varPayload: WithAction<ProductVariance>[] = [];

    const makePrice = (v: UIVariant, act: ActionType): WithAction<ProductPrice>[] => [{
      id: v.priceId, price: v.price, discount: 0, quantity: v.stock, price_after_discount: v.price,
      product_id: v.id, action: act
    }];

    if (isDeleteRequest) {
      // Nếu xóa SP, xóa hết biến thể
      (initialData?.product_variances_1 || []).forEach(v => {
        varPayload.push({ 
          ...v, action: 'delete', 
          prices: (v.prices || []).map(p => ({ ...p, action: 'delete' as ActionType })) 
        });
      });
    } else {
      // Logic Create/Update
      const listToProcess = hasVariants ? variants : [{
        ...variants[0], // Dùng variant ảo hoặc tạo mới nếu chưa có
        id: initialData?.product_variances_1?.[0]?.id, // Map ID cũ nếu chuyển mode
        priceId: initialData?.product_variances_1?.[0]?.prices?.[0]?.id,
        name: "Default", sku: formData.base_sku || null, 
        price: Number(formData.base_price), stock: Number(formData.base_stock)
      } as UIVariant];

      listToProcess.forEach(v => {
        const action = v.id ? 'update' : 'create';
        const priceAction = v.priceId ? 'update' : 'create';
        varPayload.push({
          id: v.id, sku: v.sku, var_name: hasVariants ? variantOptions.map(o=>o.name).join(" - ") : "Default",
          value: v.name, product_id: initialData?.product?.id,
          prices: makePrice(v, priceAction),
          action: action
        });
      });

      // Tìm biến thể đã xóa
      (initialData?.product_variances_1 || []).forEach(v => {
        // Nếu mode chuyển sang 'No variant' -> xóa hết trừ cái đầu tiên (được map làm default)
        // Nếu mode 'Has variant' -> xóa cái nào không còn trong list
        const shouldDelete = hasVariants 
          ? !currVarIds.has(v.id) 
          : v.id !== initialData?.product_variances_1?.[0]?.id; // Giữ lại 1 cái làm default

        if (shouldDelete) {
          varPayload.push({ ...v, prices: [], action: 'delete' });
        }
      });
    }

    return { product: productPayload, product_images: imgPayload, product_variances_1: varPayload };
  }

  // --- ACTIONS ---
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const payload = transformToPayload(data, false);
      console.log("Update Payload:", JSON.stringify(payload, null, 2));
      await processProduct(payload);
      toast({ title: "Thành công", description: "Đã lưu thông tin sản phẩm", className: "bg-green-600 text-white" });
      router.push("/dashboard/products");
    } catch (e: any) {
      toast({ title: "Lỗi", description: e.message, variant: "destructive" });
    } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Lấy data hiện tại từ form để construct payload xóa
      const payload = transformToPayload(form.getValues(), true);
      console.log("Delete Payload:", JSON.stringify(payload, null, 2));
      await processProduct(payload);
      toast({ title: "Thành công", description: "Đã xóa sản phẩm", className: "bg-green-600 text-white" });
      router.push("/dashboard/products");
    } catch (e: any) {
      toast({ title: "Lỗi xóa", description: e.message, variant: "destructive" });
    } finally { setIsDeleting(false) }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold">{initialData ? "Chi tiết sản phẩm" : "Thêm mới"}</h1>
            <p className="text-sm text-muted-foreground">{initialData ? `ID: ${initialData.product.id} - SKU: ${initialData.product.sku || "N/A"}` : "Tạo sản phẩm mới"}</p>
        </div>
        <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>Hủy</Button>
            {initialData && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" disabled={loading || isDeleting}>
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4 mr-2"/>} Xóa
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Xóa sản phẩm này?</AlertDialogTitle>
                            <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive">Xóa ngay</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            <Button type="submit" disabled={loading || isDeleting}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="w-4 h-4 mr-2" /> Lưu lại
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader><CardTitle>Thông tin chung</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Tên sản phẩm *</Label>
                <Input {...form.register("name")} placeholder="Nhập tên..." />
                {form.formState.errors.name && <span className="text-red-500 text-xs">{form.formState.errors.name.message}</span>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Thương hiệu</Label>
                    <Input {...form.register("brand")} placeholder="Brand..." />
                </div>
                <div className="grid gap-2">
                    <Label>Mã SKU</Label>
                    <Input {...form.register("base_sku")} placeholder="SKU-..." />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Mô tả chi tiết</Label>
                <Textarea {...form.register("description")} className="min-h-[150px]" />
              </div>
            </CardContent>
          </Card>

          {/* Variants Section */}
          <Card>
             <CardHeader><CardTitle>Cấu hình sản phẩm</CardTitle></CardHeader>
             <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded bg-muted/20">
                    <Label>Sản phẩm có nhiều biến thể?</Label>
                    <Controller control={form.control} name="has_variants" render={({field}) => <Switch checked={field.value} onCheckedChange={field.onChange}/>} />
                </div>

                {!hasVariants ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Giá bán (VNĐ)</Label>
                            <Input type="number" {...form.register("base_price")} placeholder="0" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Tồn kho</Label>
                            <Input type="number" {...form.register("base_stock")} placeholder="0" />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Variant Groups Definitions */}
                        {variantOptions.map((opt, idx) => (
                            <div key={opt.id} className="p-4 border rounded relative">
                                <div className="flex justify-between mb-2">
                                    <Input value={opt.name} onChange={e => updateVariantOptionName(idx, e.target.value)} className="w-1/2 font-bold" placeholder="Tên nhóm (VD: Màu)" />
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeVariantOption(idx)}><X className="w-4 h-4"/></Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {opt.values.map((val, vIdx) => (
                                        <span key={vIdx} className="bg-secondary px-2 py-1 rounded text-sm flex items-center gap-1">
                                            {val} <X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => removeValueFromOption(idx, vIdx)} />
                                        </span>
                                    ))}
                                    <Input 
                                        className="w-32 h-8 text-sm" 
                                        placeholder="Thêm giá trị..." 
                                        onKeyDown={e => handleValueInput(e, idx)} 
                                    />
                                </div>
                            </div>
                        ))}
                        {variantOptions.length < 3 && <Button type="button" variant="outline" size="sm" onClick={addVariantOption}><Plus className="w-3 h-3 mr-1"/> Thêm nhóm biến thể</Button>}
                        
                        {/* Variants Table */}
                        {variants.length > 0 && (
                            <div className="border rounded overflow-hidden mt-4">
                                <div className="bg-muted p-2 flex justify-between items-center">
                                    <span className="text-sm font-medium">Danh sách phân loại ({variants.length})</span>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="secondary" size="sm">Sửa hàng loạt <ChevronDown className="ml-1 w-3 h-3"/></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-64 p-3">
                                            <div className="space-y-2">
                                                <Input placeholder="Giá..." type="number" onChange={e => setBulkPrice(e.target.value)} />
                                                <Input placeholder="Kho..." type="number" onChange={e => setBulkStock(e.target.value)} />
                                                <Input placeholder="SKU prefix..." onChange={e => setBulkSku(e.target.value)} />
                                                <Button size="sm" className="w-full" onClick={applyBulkEdit}>Áp dụng</Button>
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Biến thể</TableHead>
                                            <TableHead>Giá</TableHead>
                                            <TableHead>Kho</TableHead>
                                            <TableHead>SKU</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {variants.map((v, i) => (
                                            <TableRow key={v.tempId}>
                                                <TableCell className="font-medium">{v.name}</TableCell>
                                                <TableCell><Input className="h-8 w-24" type="number" value={v.price} onChange={e => {const n = [...variants]; n[i].price = Number(e.target.value); setVariants(n)}} /></TableCell>
                                                <TableCell><Input className="h-8 w-20" type="number" value={v.stock} onChange={e => {const n = [...variants]; n[i].stock = Number(e.target.value); setVariants(n)}} /></TableCell>
                                                <TableCell><Input className="h-8 w-24" value={v.sku} onChange={e => {const n = [...variants]; n[i].sku = e.target.value; setVariants(n)}} /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                )}
             </CardContent>
          </Card>

          {/* Attributes */}
          <Card>
            <CardHeader className="flex flex-row justify-between pb-2">
                <CardTitle className="text-base">Thuộc tính bổ sung</CardTitle>
                <Button type="button" variant="ghost" size="sm" onClick={addAttribute}><Plus className="w-4 h-4"/></Button>
            </CardHeader>
            <CardContent className="space-y-2">
                {attributes.map((attr, i) => (
                    <div key={attr.id} className="flex gap-2">
                        <Input placeholder="Tên (VD: Chất liệu)" value={attr.name} onChange={e => updateAttribute(i, 'name', e.target.value)} />
                        <Input placeholder="Giá trị" value={attr.value} onChange={e => updateAttribute(i, 'value', e.target.value)} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAttribute(i)}><Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-500"/></Button>
                    </div>
                ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Images & Status */}
        <div className="space-y-8">
            <Card className="border-none shadow-sm ring-1 ring-gray-200 dark:ring-gray-800">
            <CardHeader>
                <CardTitle className="text-lg">Hình ảnh</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Image List */}
                {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        {images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-md border overflow-hidden group bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img.url} alt="Product" className="object-cover w-full h-full" />
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
                
                {/* Upload Input */}
                <label className={`border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:bg-primary/5 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group h-48 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="bg-primary/10 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                        {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-6 h-6 text-primary" />}
                    </div>
                    <p className="text-sm font-medium text-foreground">
                        {uploading ? "Đang xử lý ảnh..." : "Thêm hình ảnh"}
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
        </div>
      </div>
    </form>
  )
}