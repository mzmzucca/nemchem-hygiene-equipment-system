"use client"

import { useMemo, useState } from "react"
import {
  Package, PackageX, AlertTriangle, TrendingUp, TrendingDown, Plus, Search,
  Pencil, Trash2, ArrowLeft, Eye, RefreshCw, Hash, Layers, Boxes,
  Settings2, User as UserIcon, Building2, DollarSign, PackageCheck,
  ArrowRightLeft, FolderTree, AlertCircle, BarChart3, Tag, CalendarDays,
  Wrench, ClipboardList, ClipboardCheck, History, ArrowUpCircle,
  ArrowDownCircle, ArrowUpDown,
} from "lucide-react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDate, fmtDateTime, fmtMoney,
} from "@/components/shared"
import { ExportButton } from "@/components/export-button"
import type {
  Product, ConsumableCategory, StockMovement, ConsumptionRecord, User, Customer,
  Equipment,
} from "@/lib/types"
import { MOVEMENT_TYPE } from "@/lib/labels"
import { useNav } from "@/lib/nav-store"
import { useApi, useCreate, useUpdate, useDelete } from "@/hooks/use-api"
import { cn } from "@/lib/utils"

// Detail endpoint returns additional relations not on the base Product type.
// Omit the base relation fields so we can re-declare them with richer element types
// (TechnicianStock elements include id/updatedAt; movements include user; etc.)
type ProductDetail = Omit<Product, "movements" | "consumption" | "technicianStock"> & {
  createdAt?: string
  updatedAt?: string
  movements?: (StockMovement & { user?: User })[]
  consumption?: (ConsumptionRecord & {
    customer?: Customer
    equipment?: Equipment
    visit?: { scheduledDate: string }
    technician?: User
  })[]
  technicianStock?: { id?: string; technician: User; quantity: number; updatedAt?: string }[]
  consumptionRates?: { id?: string; averageConsumptionPerMonth: number; category?: { name: string } }[]
}

// Movement type → direction sign for stock display
const MOVEMENT_SIGN: Record<string, number> = {
  ENTRY: 1,
  EXIT: -1,
  ADJUSTMENT: 0,
  TRANSFER: 0,
  ALLOCATION: -1,
  RETURN: 1,
}

// Movement type → badge color classes (no indigo/blue)
const MOVEMENT_BADGE: Record<string, string> = {
  ENTRY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  EXIT: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  ADJUSTMENT: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  TRANSFER: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  ALLOCATION: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  RETURN: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
}

// ---------- Empty form states ----------
const EMPTY_FORM = {
  name: "",
  sku: "",
  categoryId: "",
  unitOfMeasurement: "unit",
  currentStock: "0",
  minimumStock: "0",
  maximumStock: "0",
  unitCost: "0",
  supplier: "",
  status: "ACTIVE",
  notes: "",
}

const EMPTY_MOVEMENT = {
  movementType: "ENTRY",
  quantity: "1",
  technicianId: "",
  reference: "",
  notes: "",
}

const EMPTY_CONSUMPTION = {
  quantity: "1",
  customerId: "",
  equipmentId: "",
  technicianId: "",
  notes: "",
}

const EMPTY_CATEGORY = { name: "", description: "" }

// ============================================================
// Main module
// ============================================================
export function ConsumablesModule() {
  const { selectedProductId, selectProduct } = useNav()

  if (!selectedProductId) return <ConsumablesListView />
  return (
    <ProductDetailView
      productId={selectedProductId}
      onBack={() => selectProduct(null)}
    />
  )
}

// ============================================================
// List View
// ============================================================
function ConsumablesListView() {
  const { selectProduct } = useNav()
  const [q, setQ] = useState("")
  const [categoryId, setCategoryId] = useState<string>("ALL")
  const [status, setStatus] = useState<string>("ALL")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  const { data: categories } = useApi<ConsumableCategory[]>(
    ["consumable-categories"],
    "/api/consumable-categories",
  )

  const listKey = ["products", q, categoryId, status]
  const url = `/api/products?q=${encodeURIComponent(q)}&categoryId=${categoryId === "ALL" ? "" : categoryId}&status=${status === "ALL" ? "" : status}`
  const { data, isLoading, refetch, isFetching } = useApi<Product[]>(listKey, url)

  const createMut = useCreate<Product>("/api/products", [["products"]])
  const updateMut = useUpdate<Product>("/api/products", [["products"]])
  const deleteMut = useDelete("/api/products", [["products"]])

  const products = data ?? []
  const totalStock = products.reduce((s, p) => s + (p.currentStock || 0), 0)
  const lowStock = products.filter((p) => p.currentStock > 0 && p.currentStock <= p.minimumStock)
  const outOfStock = products.filter((p) => p.currentStock === 0)
  const stockValue = products.reduce((s, p) => s + (p.currentStock || 0) * (p.unitCost || 0), 0)

  // Reorder suggestions — derived from already-loaded products, no extra API call.
  const reorderSuggestions = products
    .filter((p) => p.currentStock <= p.minimumStock)
    .map((p) => ({
      ...p,
      reorderQuantity: p.maximumStock - p.currentStock,
      daysUntilStockout: p.currentStock > 0
        ? Math.floor((p.currentStock / Math.max(1, p.minimumStock)) * 30) // rough estimate
        : 0,
      priority: p.currentStock === 0 ? "critical" : "high",
    }))
    .sort((a, b) => a.currentStock - b.currentStock)

  const handleSubmit = (formData: typeof EMPTY_FORM) => {
    const base = {
      name: formData.name,
      sku: formData.sku,
      categoryId: formData.categoryId,
      unitOfMeasurement: formData.unitOfMeasurement,
      minimumStock: Number(formData.minimumStock) || 0,
      maximumStock: Number(formData.maximumStock) || 0,
      unitCost: Number(formData.unitCost) || 0,
      supplier: formData.supplier,
      status: formData.status,
      notes: formData.notes,
    }
    if (editTarget) {
      updateMut.mutate(
        { id: editTarget.id, data: base },
        { onSuccess: () => { setDialogOpen(false); setEditTarget(null) } },
      )
    } else {
      createMut.mutate(
        { ...base, currentStock: Number(formData.currentStock) || 0 },
        { onSuccess: () => { setDialogOpen(false) } },
      )
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMut.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Consumables & Stock"
        description="Manage inventory, stock movements, consumption and technician allocations"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCategoriesOpen(true)}>
              <FolderTree className="h-4 w-4 mr-2" />Categories
            </Button>
            <ExportButton type="products" label="Export CSV" />
            <Button size="sm" onClick={() => { setEditTarget(null); setDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />Add Product
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard title="Total Products" value={products.length} icon={Package} accent="teal" />
        <KpiCard title="Total Stock Units" value={totalStock} icon={Boxes} accent="default" />
        <KpiCard title="Low Stock" value={lowStock.length} icon={AlertTriangle} accent="amber" />
        <KpiCard title="Out of Stock" value={outOfStock.length} icon={PackageX} accent="rose" />
        <KpiCard title="Stock Value" value={fmtMoney(stockValue)} icon={DollarSign} accent="emerald" />
      </div>

      {/* Stock alerts */}
      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Stock Alerts
              <span className="text-xs font-normal text-muted-foreground">
                ({lowStock.length + outOfStock.length} product{lowStock.length + outOfStock.length !== 1 ? "s" : ""} need attention)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {outOfStock.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-3 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  onClick={() => selectProduct(p.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <PackageX className="h-4 w-4 text-rose-600 shrink-0" />
                        <p className="font-medium text-sm truncate">{p.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">{p.sku}</p>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                      Out of stock
                    </span>
                  </div>
                  <p className="text-xs mt-2 text-rose-700 dark:text-rose-300">
                    Current: 0 {p.unitOfMeasurement} · Min: {p.minimumStock}
                  </p>
                </div>
              ))}
              {lowStock.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                  onClick={() => selectProduct(p.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <p className="font-medium text-sm truncate">{p.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">{p.sku}</p>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                      Low stock
                    </span>
                  </div>
                  <p className="text-xs mt-2 text-amber-700 dark:text-amber-300">
                    Current: {p.currentStock} {p.unitOfMeasurement} · Min: {p.minimumStock}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reorder Suggestions */}
      <Card
        className={cn(
          reorderSuggestions.length > 0
            ? "border-rose-200 dark:border-rose-900/50"
            : "border-emerald-200 dark:border-emerald-900/50",
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {reorderSuggestions.length > 0 ? (
              <Package className="h-4 w-4 text-rose-600" />
            ) : (
              <PackageCheck className="h-4 w-4 text-emerald-600" />
            )}
            Reorder Suggestions
            <span className="text-xs font-normal text-muted-foreground">
              ({reorderSuggestions.length} item{reorderSuggestions.length !== 1 ? "s" : ""} need{reorderSuggestions.length === 1 ? "s" : ""} reorder)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {reorderSuggestions.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-sm text-emerald-700 dark:text-emerald-300">
              <PackageCheck className="h-4 w-4" />
              All stock levels are above minimum
            </div>
          ) : (
            <div className="rounded-md border max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Min Stock</TableHead>
                    <TableHead>Suggested Reorder Qty</TableHead>
                    <TableHead>Est. Days to Stockout</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Supplier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reorderSuggestions.map((p) => {
                    const stockColor =
                      p.currentStock === 0 ? "text-rose-600"
                        : p.currentStock <= p.minimumStock ? "text-amber-600"
                          : "text-emerald-600"
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => selectProduct(p.id)}
                      >
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{p.sku}</TableCell>
                        <TableCell>
                          <div className={cn("font-semibold", stockColor)}>
                            {p.currentStock} {p.unitOfMeasurement}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.minimumStock}</TableCell>
                        <TableCell className="text-sm font-medium">{p.reorderQuantity}</TableCell>
                        <TableCell className="text-sm">
                          {p.daysUntilStockout === 0 ? (
                            <span className="text-rose-600 font-medium">Today</span>
                          ) : (
                            <span>~{p.daysUntilStockout} day{p.daysUntilStockout !== 1 ? "s" : ""}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.priority === "critical" ? (
                            <StatusBadge status="OVERDUE" label="Critical" />
                          ) : (
                            <StatusBadge status="PENDING" label="High" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.supplier || "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or SKU…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              title="No products found"
              description="Try adjusting filters or add a new product."
              icon={Package}
            />
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Stock Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const stockColor =
                      p.currentStock === 0 ? "text-rose-600"
                        : p.currentStock <= p.minimumStock ? "text-amber-600"
                          : "text-emerald-600"
                    const value = p.currentStock * p.unitCost
                    return (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => selectProduct(p.id)}
                      >
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Hash className="h-3 w-3" />{p.sku}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{p.category?.name ?? "—"}</TableCell>
                        <TableCell>
                          <div className={cn("font-semibold", stockColor)}>{p.currentStock}</div>
                          <div className="text-xs text-muted-foreground">
                            min {p.minimumStock} / max {p.maximumStock}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.unitOfMeasurement}</TableCell>
                        <TableCell className="text-sm">{fmtMoney(p.unitCost)}</TableCell>
                        <TableCell className="text-sm font-medium">{fmtMoney(value)}</TableCell>
                        <TableCell><StatusBadge status={p.status} /></TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost" size="sm" className="h-8 w-8 p-0"
                              onClick={() => selectProduct(p.id)}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-8 w-8 p-0"
                              onClick={() => { setEditTarget(p); setDialogOpen(true) }}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700"
                              onClick={() => setDeleteTarget(p)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
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
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditTarget(null) }}
        editTarget={editTarget}
        onSubmit={handleSubmit}
        loading={createMut.isPending || updateMut.isPending}
      />

      {/* Categories management */}
      <CategoriesDialog open={categoriesOpen} onOpenChange={setCategoriesOpen} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.sku}).
              This action cannot be undone and may fail if the product has dependent records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// Product Add/Edit Form Dialog
// ============================================================
function ProductFormDialog({
  open, onOpenChange, editTarget, onSubmit, loading,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editTarget: Product | null
  onSubmit: (data: typeof EMPTY_FORM) => void
  loading: boolean
}) {
  const { data: categoriesData } = useApi<ConsumableCategory[]>(
    ["consumable-categories"],
    "/api/consumable-categories",
  )
  const categories = categoriesData ?? []

  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<{ name?: string; sku?: string; categoryId?: string }>({})

  // Sync form when dialog opens
  const lastEditId = editTarget?.id ?? null
  const [syncedId, setSyncedId] = useState<string | null | undefined>(undefined)
  if (open && syncedId !== lastEditId) {
    setForm(editTarget
      ? {
          name: editTarget.name ?? "",
          sku: editTarget.sku ?? "",
          categoryId: editTarget.categoryId ?? "",
          unitOfMeasurement: editTarget.unitOfMeasurement ?? "unit",
          currentStock: String(editTarget.currentStock ?? 0),
          minimumStock: String(editTarget.minimumStock ?? 0),
          maximumStock: String(editTarget.maximumStock ?? 0),
          unitCost: String(editTarget.unitCost ?? 0),
          supplier: editTarget.supplier ?? "",
          status: editTarget.status ?? "ACTIVE",
          notes: "",
        }
      : EMPTY_FORM)
    setErrors({})
    setSyncedId(lastEditId)
  }
  if (!open && syncedId !== undefined) {
    setSyncedId(undefined)
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (k === "name" || k === "sku" || k === "categoryId") {
      setErrors((e) => ({ ...e, [k]: undefined }))
    }
  }

  const handleSave = () => {
    const newErr: typeof errors = {}
    if (!form.name.trim()) newErr.name = "Name is required"
    if (!form.sku.trim()) newErr.sku = "SKU is required"
    if (!form.categoryId) newErr.categoryId = "Category is required"
    if (Object.keys(newErr).length) { setErrors(newErr); return }
    onSubmit({ ...form, name: form.name.trim(), sku: form.sku.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTarget ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>
            {editTarget
              ? "Update product details. Stock levels are managed via movements."
              : "Fill in the details to create a new consumable product."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name <span className="text-rose-500">*</span></Label>
              <Input
                id="p-name" value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Hand Sanitizer 5L"
              />
              {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-sku">SKU <span className="text-rose-500">*</span></Label>
              <Input
                id="p-sku" value={form.sku}
                onChange={(e) => set("sku", e.target.value.toUpperCase())}
                placeholder="HS-5L-001"
              />
              {errors.sku && <p className="text-xs text-rose-500">{errors.sku}</p>}
            </div>
          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category <span className="text-rose-500">*</span></Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-rose-500">{errors.categoryId}</p>}
              {categories.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No categories yet — create one via the &ldquo;Categories&rdquo; button.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-unit">Unit of Measurement</Label>
              <Input
                id="p-unit" value={form.unitOfMeasurement}
                onChange={(e) => set("unitOfMeasurement", e.target.value)}
                placeholder="unit, box, liter, kg, pack"
              />
            </div>
          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-min">Minimum Stock</Label>
              <Input
                id="p-min" type="number" min="0"
                value={form.minimumStock}
                onChange={(e) => set("minimumStock", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-max">Maximum Stock</Label>
              <Input
                id="p-max" type="number" min="0"
                value={form.maximumStock}
                onChange={(e) => set("maximumStock", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cost">Unit Cost (R)</Label>
              <Input
                id="p-cost" type="number" min="0" step="0.01"
                value={form.unitCost}
                onChange={(e) => set("unitCost", e.target.value)}
              />
            </div>
          </div>

          {!editTarget && (
            <div className="space-y-1.5">
              <Label htmlFor="p-current">Initial Stock</Label>
              <Input
                id="p-current" type="number" min="0"
                value={form.currentStock}
                onChange={(e) => set("currentStock", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                An initial &ldquo;Stock Entry&rdquo; movement will be recorded automatically.
              </p>
            </div>
          )}

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-supplier">Supplier</Label>
              <Input
                id="p-supplier" value={form.supplier}
                onChange={(e) => set("supplier", e.target.value)}
                placeholder="ABC Supplies Ltd"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-notes">Notes</Label>
            <Textarea
              id="p-notes" value={form.notes} rows={3}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Additional notes…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : editTarget ? "Save Changes" : "Create Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Categories Management Dialog
// ============================================================
function CategoriesDialog({
  open, onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { data, refetch, isFetching } = useApi<ConsumableCategory[]>(
    ["consumable-categories"],
    "/api/consumable-categories",
  )
  const createMut = useCreate<ConsumableCategory>("/api/consumable-categories", [["consumable-categories"]])
  const [form, setForm] = useState(EMPTY_CATEGORY)

  const categories = data ?? []

  const handleAdd = () => {
    if (!form.name.trim()) return
    createMut.mutate(
      { name: form.name.trim(), description: form.description || undefined },
      {
        onSuccess: () => {
          setForm(EMPTY_CATEGORY)
          refetch()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Consumable Categories</DialogTitle>
          <DialogDescription>
            Manage product categories for organizing inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name <span className="text-rose-500">*</span></Label>
              <Input
                id="cat-name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Chemicals"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Input
                id="cat-desc" value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={createMut.isPending || !form.name.trim()}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {createMut.isPending ? "Adding…" : "Add Category"}
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Existing Categories</p>
            <Button
              variant="ghost" size="sm" className="h-7 w-7 p-0"
              onClick={() => refetch()} disabled={isFetching}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            </Button>
          </div>
          {categories.length === 0 ? (
            <EmptyState title="No categories yet" icon={FolderTree} />
          ) : (
            <div className="max-h-60 overflow-y-auto rounded-md border">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 border-b last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    {c.description && (
                      <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                    )}
                  </div>
                  <span className="inline-flex items-center rounded-md bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                    {c._count?.products ?? 0} product{(c._count?.products ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Product Detail View
// ============================================================
function ProductDetailView({
  productId, onBack,
}: {
  productId: string
  onBack: () => void
}) {
  const { goToCustomer } = useNav()
  const { data, isLoading, refetch, isFetching } = useApi<ProductDetail>(
    ["products", productId],
    `/api/products/${productId}`,
  )
  const updateMut = useUpdate<Product>("/api/products", [["products", productId], ["products"]])

  const [editOpen, setEditOpen] = useState(false)
  const [tab, setTab] = useState("overview")

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <Card><CardContent className="p-6 h-40 animate-pulse bg-muted/40 rounded-md" /></Card>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 h-24 animate-pulse bg-muted/40 rounded-md" /></Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <EmptyState
          title="Product not found"
          description="The product may have been deleted."
          icon={AlertCircle}
        />
      </div>
    )
  }

  const p: ProductDetail = data
  const stockValue = p.currentStock * p.unitCost
  const totalConsumed = (p.consumption ?? []).reduce((s, r) => s + (r.quantity || 0), 0)
  const stockPercent = p.maximumStock > 0
    ? Math.min(100, Math.round((p.currentStock / p.maximumStock) * 100))
    : 0

  const stockColor: "rose" | "amber" | "emerald" =
    p.currentStock === 0 ? "rose"
      : p.currentStock <= p.minimumStock ? "amber"
        : "emerald"

  const stockIconBg =
    stockColor === "rose" ? "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300"
      : stockColor === "amber" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300"
        : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"

  const stockBarBg =
    stockColor === "rose" ? "bg-rose-500"
      : stockColor === "amber" ? "bg-amber-500"
        : "bg-emerald-500"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to consumables
        </Button>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", stockIconBg)}>
                  <Package className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold tracking-tight flex flex-wrap items-center gap-2">
                    {p.name}
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      <Hash className="h-3 w-3 mr-1" />{p.sku}
                    </span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {p.category && (
                      <span className="inline-flex items-center rounded-md bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 px-2 py-0.5 text-xs font-medium">
                        <Tag className="h-3 w-3 mr-1" />{p.category.name}
                      </span>
                    )}
                    <StatusBadge status={p.status} />
                    {p.supplier && (
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" />{p.supplier}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />Edit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI summary */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard
          title="Current Stock"
          value={`${p.currentStock} ${p.unitOfMeasurement}`}
          icon={Package} accent={stockColor}
          hint={`Min: ${p.minimumStock}`}
        />
        <KpiCard
          title="Minimum Stock"
          value={`${p.minimumStock} ${p.unitOfMeasurement}`}
          icon={AlertTriangle} accent="amber"
          hint={`Max: ${p.maximumStock}`}
        />
        <KpiCard
          title="Stock Value"
          value={fmtMoney(stockValue)}
          icon={DollarSign} accent="emerald"
          hint={`${fmtMoney(p.unitCost)} / unit`}
        />
        <KpiCard
          title="Total Consumed"
          value={`${totalConsumed} ${p.unitOfMeasurement}`}
          icon={TrendingDown} accent="violet"
          hint={`${p.consumption?.length ?? 0} records`}
        />
      </div>

      {/* Stock level indicator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Stock Level</span>
            </div>
            <span className={cn("text-sm font-semibold",
              stockColor === "rose" ? "text-rose-600"
                : stockColor === "amber" ? "text-amber-600"
                  : "text-emerald-600",
            )}>
              {p.currentStock} / {p.maximumStock} {p.unitOfMeasurement} ({stockPercent}%)
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full transition-all", stockBarBg)}
              style={{ width: `${stockPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Min: {p.minimumStock}</span>
            <span>Current: {p.currentStock}</span>
            <span>Max: {p.maximumStock}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="overview"><Layers className="h-4 w-4 mr-1.5" />Overview</TabsTrigger>
            <TabsTrigger value="movements"><ArrowRightLeft className="h-4 w-4 mr-1.5" />Stock Movements</TabsTrigger>
            <TabsTrigger value="consumption"><TrendingDown className="h-4 w-4 mr-1.5" />Consumption</TabsTrigger>
            <TabsTrigger value="technicians"><UserIcon className="h-4 w-4 mr-1.5" />Technician Stock</TabsTrigger>
            <TabsTrigger value="monthly"><BarChart3 className="h-4 w-4 mr-1.5" />Monthly Consumption</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab product={p} />
        </TabsContent>
        <TabsContent value="movements" className="mt-4">
          <MovementsTab product={p} />
        </TabsContent>
        <TabsContent value="consumption" className="mt-4">
          <ConsumptionTab product={p} onOpenCustomer={goToCustomer} />
        </TabsContent>
        <TabsContent value="technicians" className="mt-4">
          <TechnicianStockTab product={p} />
        </TabsContent>
        <TabsContent value="monthly" className="mt-4">
          <MonthlyConsumptionTab product={p} />
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <ProductFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editTarget={p}
        onSubmit={(formData) => {
          const base = {
            name: formData.name,
            sku: formData.sku,
            categoryId: formData.categoryId,
            unitOfMeasurement: formData.unitOfMeasurement,
            minimumStock: Number(formData.minimumStock) || 0,
            maximumStock: Number(formData.maximumStock) || 0,
            unitCost: Number(formData.unitCost) || 0,
            supplier: formData.supplier,
            status: formData.status,
            notes: formData.notes,
          }
          updateMut.mutate(
            { id: p.id, data: base },
            { onSuccess: () => setEditOpen(false) },
          )
        }}
        loading={updateMut.isPending}
      />
    </div>
  )
}

// ============================================================
// Tab: Overview
// ============================================================
function OverviewTab({ product }: { product: ProductDetail }) {
  const rates = product.consumptionRates ?? []
  const totalEstimatedMonthly = rates.reduce(
    (s, r) => s + (r.averageConsumptionPerMonth || 0), 0,
  )

  const infoItems: { label: string; value?: string; icon: typeof Tag }[] = [
    { label: "Category", value: product.category?.name, icon: Tag },
    { label: "Unit of Measurement", value: product.unitOfMeasurement, icon: Package },
    { label: "Supplier", value: product.supplier, icon: Building2 },
    { label: "Unit Cost", value: fmtMoney(product.unitCost), icon: DollarSign },
    {
      label: "Status",
      value: product.status === "ACTIVE" ? "Active" : "Inactive",
      icon: PackageCheck,
    },
    { label: "Created", value: fmtDate(product.createdAt), icon: CalendarDays },
  ]

  const stockItems = [
    { label: "Current Stock", value: `${product.currentStock} ${product.unitOfMeasurement}`, accent: "default" as const },
    { label: "Minimum Stock", value: `${product.minimumStock} ${product.unitOfMeasurement}`, accent: "amber" as const },
    { label: "Maximum Stock", value: `${product.maximumStock} ${product.unitOfMeasurement}`, accent: "sky" as const },
    {
      label: "Stock Value",
      value: fmtMoney(product.currentStock * product.unitCost),
      accent: "emerald" as const,
    },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Product Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {infoItems.map((it) => (
            <div key={it.label} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <it.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{it.label}</p>
                <p className="text-sm font-medium break-words">{it.value || "—"}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2">
            {stockItems.map((s) => (
              <div key={s.label} className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-lg font-bold">{s.value}</p>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Consumption Records</span>
              <span className="font-semibold">{product._count?.consumption ?? product.consumption?.length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Movements</span>
              <span className="font-semibold">{product.movements?.length ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Technicians Holding Stock</span>
              <span className="font-semibold">{product.technicianStock?.length ?? 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />Consumption Rates
          </CardTitle>
          <CardDescription>Estimated monthly consumption per equipment category</CardDescription>
        </CardHeader>
        <CardContent>
          {rates.length === 0 ? (
            <EmptyState
              title="No consumption rates defined"
              description="Estimated consumption rates per equipment category will appear here."
              icon={TrendingUp}
            />
          ) : (
            <div className="space-y-3">
              {rates.map((r, i) => (
                <div key={r.id ?? i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.category?.name ?? "Uncategorized"}</p>
                      <p className="text-xs text-muted-foreground">per month</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">
                    {r.averageConsumptionPerMonth} {product.unitOfMeasurement}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Estimated / Month</span>
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                  {totalEstimatedMonthly} {product.unitOfMeasurement}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Tab: Stock Movements
// ============================================================
function MovementsTab({ product }: { product: ProductDetail }) {
  const [open, setOpen] = useState(false)
  const movements = product.movements ?? []
  const createMut = useCreate<StockMovement>("/api/stock-movements", [
    ["products", product.id],
    ["products"],
    ["stock-movements"],
  ])

  const totalIn = movements
    .filter((m) => MOVEMENT_SIGN[m.movementType] > 0)
    .reduce((s, m) => s + m.quantity, 0)
  const totalOut = movements
    .filter((m) => MOVEMENT_SIGN[m.movementType] < 0)
    .reduce((s, m) => s + m.quantity, 0)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />Stock Movement History
          </CardTitle>
          <CardDescription>
            Showing latest {movements.length} movement{movements.length !== 1 ? "s" : ""}
            {totalIn > 0 && ` · ${totalIn} in`}
            {totalOut > 0 && ` · ${totalOut} out`}
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />Add Movement
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {movements.length === 0 ? (
          <EmptyState
            title="No stock movements"
            description="Record stock entries, exits, adjustments and allocations."
            icon={ArrowRightLeft}
          />
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => {
                  const sign = MOVEMENT_SIGN[m.movementType] ?? 0
                  const isPositive = sign > 0
                  const isNegative = sign < 0
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm whitespace-nowrap">{fmtDateTime(m.date)}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                          MOVEMENT_BADGE[m.movementType] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
                        )}>
                          {MOVEMENT_TYPE[m.movementType] ?? m.movementType}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-semibold tabular-nums inline-flex items-center gap-1",
                          isPositive ? "text-emerald-600"
                            : isNegative ? "text-rose-600"
                              : "text-foreground",
                        )}>
                        {isPositive && <ArrowUpCircle className="h-3.5 w-3.5" />}
                          {isNegative && <ArrowDownCircle className="h-3.5 w-3.5" />}
                          {!isPositive && !isNegative && <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />}
                          {isPositive ? "+" : isNegative ? "−" : "="}{m.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{m.reference || "—"}</TableCell>
                      <TableCell className="text-sm">{m.user?.name ?? "System"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {m.notes || "—"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <MovementFormDialog
        open={open}
        onOpenChange={setOpen}
        productId={product.id}
        unit={product.unitOfMeasurement}
        onSubmit={(payload) => {
          createMut.mutate(payload, { onSuccess: () => setOpen(false) })
        }}
        loading={createMut.isPending}
      />
    </Card>
  )
}

// ============================================================
// Tab: Consumption
// ============================================================
function ConsumptionTab({
  product, onOpenCustomer,
}: {
  product: ProductDetail
  onOpenCustomer: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const records = product.consumption ?? []
  const createMut = useCreate<ConsumptionRecord>("/api/consumption", [
    ["products", product.id],
    ["products"],
    ["consumption"],
  ])

  const totalQty = records.reduce((s, r) => s + (r.quantity || 0), 0)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />Consumption Records
          </CardTitle>
          <CardDescription>
            Showing latest {records.length} record{records.length !== 1 ? "s" : ""}
            {records.length > 0 && ` · ${totalQty} ${product.unitOfMeasurement} consumed`}
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />Record Consumption
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {records.length === 0 ? (
          <EmptyState
            title="No consumption records"
            description="Record consumables used during visits or by technicians."
            icon={TrendingDown}
          />
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Visit</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm whitespace-nowrap">{fmtDate(r.date)}</TableCell>
                    <TableCell className="text-sm">
                      {r.customer ? (
                        <button
                          className="font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 hover:underline text-left"
                          onClick={() => onOpenCustomer(r.customer!.id)}
                        >
                          {r.customer.name}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.equipment?.name ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-rose-600">−{r.quantity}</span>
                    </TableCell>
                    <TableCell className="text-sm">{r.technician?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {r.visit ? fmtDate(r.visit.scheduledDate) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {r.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <ConsumptionFormDialog
        open={open}
        onOpenChange={setOpen}
        productId={product.id}
        unit={product.unitOfMeasurement}
        onSubmit={(payload) => {
          createMut.mutate(payload, { onSuccess: () => setOpen(false) })
        }}
        loading={createMut.isPending}
      />
    </Card>
  )
}

// ============================================================
// Tab: Technician Stock
// ============================================================
function TechnicianStockTab({ product }: { product: ProductDetail }) {
  const stock = product.technicianStock ?? []
  const totalAllocated = stock.reduce((s, t) => s + (t.quantity || 0), 0)

  if (stock.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No technician stock"
            description="Allocate stock to technicians via the Stock Movements tab (Technician Allocation)."
            icon={UserIcon}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserIcon className="h-4 w-4" />Technician Stock Allocations
        </CardTitle>
        <CardDescription>
          {stock.length} technician{stock.length !== 1 ? "s" : ""} holding stock
          {totalAllocated > 0 && ` · ${totalAllocated} ${product.unitOfMeasurement} total allocated`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {stock.map((t, i) => (
            <div key={t.id ?? i} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.technician.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.technician.email}</p>
                  </div>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Quantity Allocated</span>
                <span className="text-lg font-bold text-violet-600 dark:text-violet-400">
                  {t.quantity} {product.unitOfMeasurement}
                </span>
              </div>
              {t.updatedAt && (
                <p className="text-xs text-muted-foreground mt-1">Updated {fmtDate(t.updatedAt)}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Tab: Monthly Consumption (Chart)
// ============================================================
function MonthlyConsumptionTab({ product }: { product: ProductDetail }) {
  const { data, isLoading } = useApi<ConsumptionRecord[]>(
    ["product-consumption-monthly", product.id],
    `/api/consumption?productId=${product.id}`,
  )
  const records = data ?? []

  const chartData = useMemo(() => {
    const now = new Date()
    const months: { key: string; label: string; actual: number; estimated: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const label = d.toLocaleDateString("en-GB", { month: "short" })
      months.push({ key, label, actual: 0, estimated: 0 })
    }
    const map = new Map(months.map((m) => [m.key, m]))
    records.forEach((r) => {
      const d = new Date(r.date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const m = map.get(key)
      if (m) m.actual += r.quantity || 0
    })
    const totalEstimated = (product.consumptionRates ?? []).reduce(
      (s, r) => s + (r.averageConsumptionPerMonth || 0), 0,
    )
    months.forEach((m) => { m.estimated = Math.round(totalEstimated) })
    return months
  }, [records, product.consumptionRates])

  const totalActual = chartData.reduce((s, m) => s + m.actual, 0)
  const avgActual = chartData.length > 0 ? Math.round(totalActual / chartData.length) : 0
  const totalEstimated = (product.consumptionRates ?? []).reduce(
    (s, r) => s + (r.averageConsumptionPerMonth || 0), 0,
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard title="Total Consumed (6mo)" value={`${totalActual} ${product.unitOfMeasurement}`} icon={TrendingDown} accent="violet" />
        <KpiCard title="Avg / Month" value={`${avgActual} ${product.unitOfMeasurement}`} icon={BarChart3} accent="teal" />
        <KpiCard title="Estimated / Month" value={`${totalEstimated} ${product.unitOfMeasurement}`} icon={TrendingUp} accent="sky" />
        <KpiCard
          title="Variance"
          value={totalEstimated > 0 ? `${Math.round(((avgActual - totalEstimated) / totalEstimated) * 100)}%` : "—"}
          icon={ArrowUpDown}
          accent={avgActual > totalEstimated ? "rose" : "emerald"}
          hint={totalEstimated > 0 ? `Actual vs Estimated` : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />Monthly Consumption (Last 6 Months)
          </CardTitle>
          <CardDescription>
            Actual consumption vs estimated monthly consumption
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-72 rounded-md bg-muted/40 animate-pulse" />
          ) : records.length === 0 ? (
            <EmptyState
              title="No consumption data"
              description="Consumption records will appear here once recorded."
              icon={BarChart3}
            />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8 }}
                  formatter={(value: number, name: string) => [`${value} ${product.unitOfMeasurement}`, name]}
                />
                <Legend />
                <Bar dataKey="estimated" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Estimated" />
                <Bar dataKey="actual" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Actual" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Stock Movement Form Dialog
// ============================================================
function MovementFormDialog({
  open, onOpenChange, productId, unit, onSubmit, loading,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  productId: string
  unit: string
  onSubmit: (data: {
    productId: string
    quantity: number
    movementType: string
    technicianId?: string
    reference?: string
    notes?: string
  }) => void
  loading: boolean
}) {
  const [form, setForm] = useState(EMPTY_MOVEMENT)
  const [errors, setErrors] = useState<{ quantity?: string; technicianId?: string }>({})
  const { data: technicians } = useApi<User[]>(["technicians"], "/api/technicians")

  const needsTech = form.movementType === "ALLOCATION" || form.movementType === "RETURN"

  // Reset form when dialog opens
  const [synced, setSynced] = useState(false)
  if (open && !synced) {
    setForm(EMPTY_MOVEMENT)
    setErrors({})
    setSynced(true)
  }
  if (!open && synced) {
    setSynced(false)
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (k === "quantity" || k === "technicianId") {
      setErrors((e) => ({ ...e, [k]: undefined }))
    }
  }

  const handleSave = () => {
    const newErr: typeof errors = {}
    const qty = Number(form.quantity)
    if (!form.quantity || isNaN(qty) || qty <= 0) {
      newErr.quantity = "Quantity must be a positive number"
    }
    if (needsTech && !form.technicianId) {
      newErr.technicianId = "Technician is required for this movement type"
    }
    if (Object.keys(newErr).length) { setErrors(newErr); return }
    onSubmit({
      productId,
      quantity: qty,
      movementType: form.movementType,
      technicianId: needsTech ? form.technicianId : undefined,
      reference: form.reference || undefined,
      notes: form.notes || undefined,
    })
  }

  const helperText: Record<string, string> = {
    ENTRY: "Adds quantity to stock.",
    EXIT: "Removes quantity from stock.",
    ADJUSTMENT: "Sets stock to the specified quantity (absolute value).",
    TRANSFER: "Records a stock transfer between locations.",
    ALLOCATION: "Allocates stock to a technician (removes from main stock).",
    RETURN: "Returns stock from a technician (adds to main stock).",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stock Movement</DialogTitle>
          <DialogDescription>
            Record a stock entry, exit, adjustment, allocation or return.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Movement Type <span className="text-rose-500">*</span></Label>
            <Select value={form.movementType} onValueChange={(v) => set("movementType", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MOVEMENT_TYPE).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{helperText[form.movementType]}</p>
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-qty">
                Quantity <span className="text-rose-500">*</span>
                <span className="ml-1 text-xs font-normal text-muted-foreground">({unit})</span>
              </Label>
              <Input
                id="m-qty" type="number" min="1"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
              {errors.quantity && <p className="text-xs text-rose-500">{errors.quantity}</p>}
            </div>
            {needsTech && (
              <div className="space-y-1.5">
                <Label>Technician <span className="text-rose-500">*</span></Label>
                <Select value={form.technicianId} onValueChange={(v) => set("technicianId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
                  <SelectContent>
                    {(technicians ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.technicianId && <p className="text-xs text-rose-500">{errors.technicianId}</p>}
                {(technicians ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">No active technicians found.</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-ref">Reference</Label>
            <Input
              id="m-ref" value={form.reference}
              onChange={(e) => set("reference", e.target.value)}
              placeholder="PO number, invoice, etc."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-notes">Notes</Label>
            <Textarea
              id="m-notes" value={form.notes} rows={3}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional notes…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Add Movement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Consumption Form Dialog
// ============================================================
function ConsumptionFormDialog({
  open, onOpenChange, productId, unit, onSubmit, loading,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  productId: string
  unit: string
  onSubmit: (data: {
    productId: string
    quantity: number
    customerId?: string
    equipmentId?: string
    technicianId?: string
    notes?: string
  }) => void
  loading: boolean
}) {
  const [form, setForm] = useState(EMPTY_CONSUMPTION)
  const [errors, setErrors] = useState<{ quantity?: string }>({})
  const { data: technicians } = useApi<User[]>(["technicians"], "/api/technicians")
  const { data: customers } = useApi<Customer[]>(["customers-list"], "/api/customers")
  const { data: customerEquipment } = useApi<Equipment[]>(
    ["equipment-by-customer", form.customerId],
    `/api/equipment?customerId=${form.customerId}`,
    !!form.customerId,
  )

  // Reset form when dialog opens
  const [synced, setSynced] = useState(false)
  if (open && !synced) {
    setForm(EMPTY_CONSUMPTION)
    setErrors({})
    setSynced(true)
  }
  if (!open && synced) {
    setSynced(false)
  }

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    // Clear equipment when customer changes
    if (k === "customerId") {
      setForm((f) => ({ ...f, equipmentId: "" }))
    }
    if (k === "quantity") {
      setErrors((e) => ({ ...e, quantity: undefined }))
    }
  }

  const handleSave = () => {
    const qty = Number(form.quantity)
    if (!form.quantity || isNaN(qty) || qty <= 0) {
      setErrors({ quantity: "Quantity must be a positive number" })
      return
    }
    onSubmit({
      productId,
      quantity: qty,
      customerId: form.customerId || undefined,
      equipmentId: form.equipmentId || undefined,
      technicianId: form.technicianId || undefined,
      notes: form.notes || undefined,
    })
  }

  const equipmentOptions = form.customerId ? (customerEquipment ?? []) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Consumption</DialogTitle>
          <DialogDescription>
            Record consumable usage against a customer, equipment or technician.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-qty">
              Quantity <span className="text-rose-500">*</span>
              <span className="ml-1 text-xs font-normal text-muted-foreground">({unit})</span>
            </Label>
            <Input
              id="c-qty" type="number" min="1"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
            />
            {errors.quantity && <p className="text-xs text-rose-500">{errors.quantity}</p>}
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={form.customerId} onValueChange={(v) => set("customerId", v === "NONE" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None —</SelectItem>
                  {(customers ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Equipment</Label>
              <Select
                value={form.equipmentId}
                onValueChange={(v) => set("equipmentId", v === "NONE" ? "" : v)}
                disabled={!form.customerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.customerId ? "Optional" : "Select customer first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None —</SelectItem>
                  {equipmentOptions.map((eq) => (
                    <SelectItem key={eq.id} value={eq.id}>
                      {eq.name}{eq.serialNumber ? ` (${eq.serialNumber})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.customerId && equipmentOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">No equipment found for this customer.</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Technician</Label>
            <Select value={form.technicianId} onValueChange={(v) => set("technicianId", v === "NONE" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">— None —</SelectItem>
                {(technicians ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              If a technician is selected, the quantity will be deducted from their allocated stock.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea
              id="c-notes" value={form.notes} rows={3}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional notes…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Record Consumption"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
