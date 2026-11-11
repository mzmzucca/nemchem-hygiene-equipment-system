"use client"

import { useState } from "react"
import {
  Boxes, Plus, Search, Pencil, Trash2, ArrowLeft, Eye, RefreshCw,
  CheckCircle2, AlertTriangle, Wrench, PackageX, QrCode, Tag, Hash,
  Building2, FileText, MapPin, CalendarDays, BatteryCharging,
  ClipboardList, ClipboardCheck, History, Image as ImageIcon,
  Layers, Settings2, XCircle, Activity, Package, Power, Info,
  AlertCircle, FolderTree, User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Badge } from "@/components/ui/badge"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDate, fmtDateTime,
} from "@/components/shared"
import type {
  Equipment, EquipmentCategory, Customer, Contract, CustomerLocation,
  EquipmentHistory, Inspection, BatteryReplacement, ConsumptionRecord,
} from "@/lib/types"
import {
  OPERATIONAL_STATUS, INSTALLATION_STATUS, BATTERY_LEVEL, EVENT_TYPE,
  batteryLevelColor, batteryLevelPercent,
} from "@/lib/labels"
import { useNav } from "@/lib/nav-store"
import { useApi, useCreate, useUpdate, useDelete } from "@/hooks/use-api"
import { cn } from "@/lib/utils"

// Detail payload includes extra relations not on the base Equipment type
type EquipmentDetail = Equipment & {
  history?: EquipmentHistory[]
  inspections?: (Inspection & { technician?: { name: string }; visit?: { scheduledDate: string; status: string } })[]
  batteries?: (BatteryReplacement & { technician?: { name: string }; visit?: { scheduledDate: string } })[]
  consumption?: (ConsumptionRecord & { product?: { name: string; unitOfMeasurement?: string }; visit?: { scheduledDate: string } })[]
}

// Empty form state for add/edit
const EMPTY_FORM = {
  name: "",
  serialNumber: "",
  categoryId: "",
  brand: "",
  model: "",
  purchaseDate: "",
  installationDate: "",
  customerId: "",
  contractId: "",
  locationId: "",
  batteryType: "",
  operationalStatus: "OPERATIONAL",
  installationStatus: "INSTALLATION_PENDING",
  currentBatteryLevel: "UNKNOWN",
  notes: "",
  qrCode: "",
}

const EMPTY_CATEGORY = { name: "", description: "", usesBatteries: false }

// Event type icon + colour mapping (no indigo/blue)
const EVENT_META: Record<string, { icon: typeof History; color: string }> = {
  REGISTRATION: { icon: Tag, color: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300" },
  INSTALLATION: { icon: Settings2, color: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300" },
  CUSTOMER_ASSIGNMENT: { icon: Building2, color: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300" },
  CONTRACT_ASSIGNMENT: { icon: FileText, color: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300" },
  INSPECTION: { icon: ClipboardCheck, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300" },
  MAINTENANCE: { icon: Wrench, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300" },
  BATTERY_REPLACEMENT: { icon: BatteryCharging, color: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300" },
  CONSUMABLE_USAGE: { icon: Package, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300" },
  RELOCATION: { icon: MapPin, color: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300" },
  REPLACEMENT: { icon: RefreshCw, color: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300" },
  DECOMMISSIONING: { icon: Power, color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-300" },
}

// ============================================================
// Main module
// ============================================================
export function EquipmentModule() {
  const { selectedEquipmentId, selectEquipment } = useNav()

  if (!selectedEquipmentId) return <EquipmentListView />
  return (
    <EquipmentDetailView
      equipmentId={selectedEquipmentId}
      onBack={() => selectEquipment(null)}
    />
  )
}

// ============================================================
// List View
// ============================================================
function EquipmentListView() {
  const { selectEquipment } = useNav()
  const [q, setQ] = useState("")
  const [categoryId, setCategoryId] = useState<string>("ALL")
  const [operationalStatus, setOperationalStatus] = useState<string>("ALL")
  const [installationStatus, setInstallationStatus] = useState<string>("ALL")
  const [customerId, setCustomerId] = useState<string>("ALL")

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Equipment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)

  // Categories + customers for dropdowns
  const { data: categories } = useApi<EquipmentCategory[]>(["equipment-categories"], "/api/equipment-categories")
  const { data: customers } = useApi<Customer[]>(["customers-mini"], "/api/customers")

  // Filtered equipment list
  const listKey = ["equipment", q, categoryId, operationalStatus, installationStatus, customerId]
  const params = new URLSearchParams({
    q,
    categoryId: categoryId === "ALL" ? "" : categoryId,
    operationalStatus: operationalStatus === "ALL" ? "" : operationalStatus,
    installationStatus: installationStatus === "ALL" ? "" : installationStatus,
    customerId: customerId === "ALL" ? "" : customerId,
  })
  const { data, isLoading, refetch, isFetching } = useApi<Equipment[]>(listKey, `/api/equipment?${params.toString()}`)

  const createMut = useCreate<Equipment>("/api/equipment", [["equipment"], ["dashboard"]])
  const updateMut = useUpdate<Equipment>("/api/equipment", [["equipment"], ["dashboard"]])
  const deleteMut = useDelete("/api/equipment", [["equipment"], ["dashboard"]])

  const equipment = data ?? []

  // KPI computations
  const operationalCount = equipment.filter((e) => e.operationalStatus === "OPERATIONAL").length
  const maintenanceCount = equipment.filter((e) => e.operationalStatus === "UNDER_MAINTENANCE").length
  const damagedCount = equipment.filter((e) => e.operationalStatus === "DAMAGED").length
  const needsReplacementCount = equipment.filter((e) => e.operationalStatus === "NEEDS_REPLACEMENT").length

  // category lookup for battery uses
  const categoryMap = new Map<string, EquipmentCategory>()
  categories?.forEach((c) => categoryMap.set(c.id, c))

  const handleSubmit = (formData: typeof EMPTY_FORM) => {
    const payload = {
      ...formData,
      customerId: formData.customerId || undefined,
      contractId: formData.contractId || undefined,
      locationId: formData.locationId || undefined,
      purchaseDate: formData.purchaseDate || undefined,
      installationDate: formData.installationDate || undefined,
      qrCode: formData.qrCode || `QR-${formData.serialNumber}`,
    }
    if (editTarget) {
      updateMut.mutate(
        { id: editTarget.id, data: payload },
        { onSuccess: () => { setDialogOpen(false); setEditTarget(null) } },
      )
    } else {
      createMut.mutate(payload, { onSuccess: () => { setDialogOpen(false) } })
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Equipment"
        description="Track hygiene equipment across customers, contracts and locations"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCategoryDialogOpen(true)}>
              <Layers className="h-4 w-4 mr-2" />
              Categories
            </Button>
            <Button size="sm" onClick={() => { setEditTarget(null); setDialogOpen(true) }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Equipment
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard title="Total Equipment" value={equipment.length} icon={Boxes} accent="default" />
        <KpiCard title="Operational" value={operationalCount} icon={CheckCircle2} accent="emerald" />
        <KpiCard title="Under Maintenance" value={maintenanceCount} icon={Wrench} accent="amber" />
        <KpiCard title="Damaged" value={damagedCount} icon={AlertTriangle} accent="rose" />
        <KpiCard title="Needs Replacement" value={needsReplacementCount} icon={PackageX} accent="orange" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, serial, brand…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={operationalStatus} onValueChange={setOperationalStatus}>
              <SelectTrigger><SelectValue placeholder="Operational status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All operational</SelectItem>
                {Object.entries(OPERATIONAL_STATUS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={installationStatus} onValueChange={setInstallationStatus}>
              <SelectTrigger><SelectValue placeholder="Installation status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All installation</SelectItem>
                {Object.entries(INSTALLATION_STATUS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="All customers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All customers</SelectItem>
                {customers?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
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
          ) : equipment.length === 0 ? (
            <EmptyState
              title="No equipment found"
              description="Try adjusting filters or add new equipment."
              icon={Boxes}
            />
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Brand / Model</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Operational</TableHead>
                    <TableHead>Installation</TableHead>
                    <TableHead>Battery</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.map((eq) => {
                    const cat = eq.category ?? categoryMap.get(eq.categoryId)
                    const usesBatteries = !!cat?.usesBatteries
                    const pct = batteryLevelPercent(eq.currentBatteryLevel)
                    return (
                      <TableRow
                        key={eq.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => selectEquipment(eq.id)}
                      >
                        <TableCell>
                          <div className="font-medium">{eq.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Hash className="h-3 w-3" />{eq.serialNumber}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {eq.brand || eq.model ? (
                            <div>
                              <div className="font-medium">{eq.brand ?? "—"}</div>
                              {eq.model && <div className="text-xs text-muted-foreground">{eq.model}</div>}
                            </div>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{eq.category?.name ?? "—"}</span>
                            {usesBatteries && (
                              <BatteryCharging className="h-3.5 w-3.5 text-orange-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{eq.customer?.name ?? "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={eq.operationalStatus} label={OPERATIONAL_STATUS[eq.operationalStatus] ?? eq.operationalStatus} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={eq.installationStatus} label={INSTALLATION_STATUS[eq.installationStatus] ?? eq.installationStatus} />
                        </TableCell>
                        <TableCell>
                          {usesBatteries && eq.currentBatteryLevel && eq.currentBatteryLevel !== "NA" ? (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-12 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full", batteryLevelColor(eq.currentBatteryLevel))}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{BATTERY_LEVEL[eq.currentBatteryLevel] ?? eq.currentBatteryLevel}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost" size="sm" className="h-8 w-8 p-0"
                              onClick={() => selectEquipment(eq.id)}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-8 w-8 p-0"
                              onClick={() => { setEditTarget(eq); setDialogOpen(true) }}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700"
                              onClick={() => setDeleteTarget(eq)}
                              title="Decommission / Delete"
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
      <EquipmentFormDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditTarget(null) }}
        editTarget={editTarget}
        categories={categories ?? []}
        customers={customers ?? []}
        onSubmit={handleSubmit}
        loading={createMut.isPending || updateMut.isPending}
      />

      {/* Categories Management Dialog */}
      <CategoriesDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} />

      {/* Delete / Decommission confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decommission equipment?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.serialNumber}) will be marked as
              <span className="font-medium"> Decommmissioned</span> and unassigned from its customer,
              contract and location. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Decommissioning…" : "Decommission"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// Equipment Add/Edit Form Dialog
// ============================================================
function EquipmentFormDialog({
  open, onOpenChange, editTarget, categories, customers, onSubmit, loading,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editTarget: Equipment | null
  categories: EquipmentCategory[]
  customers: Customer[]
  onSubmit: (data: typeof EMPTY_FORM) => void
  loading: boolean
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<{ name?: string; serialNumber?: string; categoryId?: string }>({})

  // Sync form when dialog opens (id-based memo to avoid clobbering user input while typing)
  const lastEditId = editTarget?.id ?? null
  const [syncedId, setSyncedId] = useState<string | null | undefined>(undefined)
  if (open && syncedId !== lastEditId) {
    setForm(editTarget
      ? {
          name: editTarget.name ?? "",
          serialNumber: editTarget.serialNumber ?? "",
          categoryId: editTarget.categoryId ?? "",
          brand: editTarget.brand ?? "",
          model: editTarget.model ?? "",
          purchaseDate: editTarget.purchaseDate ? editTarget.purchaseDate.split("T")[0] : "",
          installationDate: editTarget.installationDate ? editTarget.installationDate.split("T")[0] : "",
          customerId: editTarget.customerId ?? "",
          contractId: editTarget.contractId ?? "",
          locationId: editTarget.locationId ?? "",
          batteryType: editTarget.batteryType ?? "",
          operationalStatus: editTarget.operationalStatus ?? "OPERATIONAL",
          installationStatus: editTarget.installationStatus ?? "INSTALLATION_PENDING",
          currentBatteryLevel: editTarget.currentBatteryLevel ?? "UNKNOWN",
          notes: editTarget.notes ?? "",
          qrCode: editTarget.qrCode ?? "",
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
    if (k === "name" || k === "serialNumber" || k === "categoryId") {
      setErrors((e) => ({ ...e, [k]: undefined }))
    }
  }

  // When customer changes, reset dependent fields
  const onCustomerChange = (cid: string) => {
    setForm((f) => ({ ...f, customerId: cid, contractId: "", locationId: "" }))
  }

  // Load contracts and locations for the selected customer
  const { data: customerDetail } = useApi<Customer>(
    ["customers", form.customerId],
    `/api/customers/${form.customerId}`,
    !!form.customerId,
  )
  const contractsForCustomer = customerDetail?.contracts ?? []
  const locationsForCustomer = customerDetail?.locations ?? []

  // Determine whether the selected category uses batteries
  const selectedCategory = categories.find((c) => c.id === form.categoryId)
  const usesBatteries = !!selectedCategory?.usesBatteries

  const handleSave = () => {
    const newErr: { name?: string; serialNumber?: string; categoryId?: string } = {}
    if (!form.name.trim()) newErr.name = "Name is required"
    if (!form.serialNumber.trim()) newErr.serialNumber = "Serial number is required"
    if (!form.categoryId) newErr.categoryId = "Category is required"
    if (Object.keys(newErr).length) { setErrors(newErr); return }
    onSubmit({
      ...form,
      name: form.name.trim(),
      serialNumber: form.serialNumber.trim(),
      // If category doesn't use batteries, force level to NA
      currentBatteryLevel: usesBatteries ? form.currentBatteryLevel : "NA",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTarget ? "Edit Equipment" : "Add Equipment"}</DialogTitle>
          <DialogDescription>
            {editTarget
              ? "Update equipment details below. History events are recorded automatically."
              : "Register a new piece of equipment in the system."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Identification */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="eq-name">Name <span className="text-rose-500">*</span></Label>
              <Input
                id="eq-name" value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="AutoSanitizer Pro 2000"
              />
              {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eq-serial">Serial Number <span className="text-rose-500">*</span></Label>
              <Input
                id="eq-serial" value={form.serialNumber}
                onChange={(e) => set("serialNumber", e.target.value.toUpperCase())}
                placeholder="ASP-2024-001"
              />
              {errors.serialNumber && <p className="text-xs text-rose-500">{errors.serialNumber}</p>}
            </div>
          </div>

          {/* Category + Battery type */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category <span className="text-rose-500">*</span></Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <SelectItem value="_none" disabled>No categories defined</SelectItem>
                  ) : (
                    categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.usesBatteries ? " (battery)" : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.categoryId && <p className="text-xs text-rose-500">{errors.categoryId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eq-battery-type">Battery Type</Label>
              <Input
                id="eq-battery-type" value={form.batteryType}
                onChange={(e) => set("batteryType", e.target.value)}
                placeholder={usesBatteries ? "e.g. D-Cell Alkaline x4" : "Category does not use batteries"}
                disabled={!usesBatteries}
              />
            </div>
          </div>

          {/* Brand + Model */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="eq-brand">Brand</Label>
              <Input
                id="eq-brand" value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="HygieneCo"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eq-model">Model</Label>
              <Input
                id="eq-model" value={form.model}
                onChange={(e) => set("model", e.target.value)}
                placeholder="ASP-2K"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="eq-purchase">Purchase Date</Label>
              <Input
                id="eq-purchase" type="date" value={form.purchaseDate}
                onChange={(e) => set("purchaseDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eq-install">Installation Date</Label>
              <Input
                id="eq-install" type="date" value={form.installationDate}
                onChange={(e) => set("installationDate", e.target.value)}
              />
            </div>
          </div>

          {/* Assignment */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={form.customerId || "NONE"} onValueChange={(v) => onCustomerChange(v === "NONE" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Unassigned</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Contract</Label>
              <Select
                value={form.contractId || "NONE"}
                onValueChange={(v) => set("contractId", v === "NONE" ? "" : v)}
                disabled={!form.customerId}
              >
                <SelectTrigger><SelectValue placeholder={form.customerId ? "Select contract" : "Select customer first"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No contract</SelectItem>
                  {contractsForCustomer.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>{ct.contractNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select
                value={form.locationId || "NONE"}
                onValueChange={(v) => set("locationId", v === "NONE" ? "" : v)}
                disabled={!form.customerId}
              >
                <SelectTrigger><SelectValue placeholder={form.customerId ? "Select location" : "Select customer first"} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No location</SelectItem>
                  {locationsForCustomer.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}{loc.floor ? ` — ${loc.floor}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Operational Status</Label>
              <Select value={form.operationalStatus} onValueChange={(v) => set("operationalStatus", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(OPERATIONAL_STATUS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Installation Status</Label>
              <Select value={form.installationStatus} onValueChange={(v) => set("installationStatus", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INSTALLATION_STATUS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Current Battery Level</Label>
              <Select
                value={usesBatteries ? form.currentBatteryLevel : "NA"}
                onValueChange={(v) => set("currentBatteryLevel", v)}
                disabled={!usesBatteries}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BATTERY_LEVEL).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!usesBatteries && (
                <p className="text-xs text-muted-foreground">Selected category does not use batteries.</p>
              )}
            </div>
          </div>

          {/* QR + Notes */}
          <div className="grid gap-3 grid-cols-1">
            <div className="space-y-1.5">
              <Label htmlFor="eq-qr">QR Code</Label>
              <Input
                id="eq-qr" value={form.qrCode}
                onChange={(e) => set("qrCode", e.target.value)}
                placeholder="Auto-generated from serial number if left empty"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eq-notes">Notes</Label>
              <Textarea
                id="eq-notes" value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Additional notes about this equipment…"
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : editTarget ? "Save Changes" : "Create Equipment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Categories Management Dialog
// ============================================================
function CategoriesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data: categories, refetch } = useApi<EquipmentCategory[]>(
    ["equipment-categories"],
    "/api/equipment-categories",
  )
  const createMut = useCreate<EquipmentCategory>("/api/equipment-categories", [["equipment-categories"]])
  const [form, setForm] = useState(EMPTY_CATEGORY)
  const [err, setErr] = useState<string | null>(null)

  const handleAdd = () => {
    if (!form.name.trim()) { setErr("Name is required"); return }
    setErr(null)
    createMut.mutate(
      {
        name: form.name.trim(),
        description: form.description || undefined,
        usesBatteries: form.usesBatteries,
      },
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />Equipment Categories
          </DialogTitle>
          <DialogDescription>
            Manage the categories used to classify equipment. Categories marked as &quot;uses batteries&quot;
            enable battery tracking fields.
          </DialogDescription>
        </DialogHeader>

        {/* Existing list */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">Existing categories</div>
          <div className="rounded-md border max-h-72 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Equipment</TableHead>
                  <TableHead className="text-center">Batteries</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(categories ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No categories yet
                    </TableCell>
                  </TableRow>
                ) : (
                  (categories ?? []).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.description ?? "—"}
                      </TableCell>
                      <TableCell className="text-center">{c._count?.equipment ?? 0}</TableCell>
                      <TableCell className="text-center">
                        {c.usesBatteries ? (
                          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 hover:bg-orange-100">
                            <BatteryCharging className="h-3 w-3 mr-1" />Yes
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Separator />

        {/* Add new */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">Add new category</div>
          <div className="grid gap-3 grid-cols-1">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name <span className="text-rose-500">*</span></Label>
              <Input
                id="cat-name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Soap Dispenser"
              />
              {err && <p className="text-xs text-rose-500">{err}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Input
                id="cat-desc" value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of this category"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Checkbox
                id="cat-batteries"
                checked={form.usesBatteries}
                onCheckedChange={(v) => setForm((f) => ({ ...f, usesBatteries: v === true }))}
              />
              <Label htmlFor="cat-batteries" className="cursor-pointer font-normal">
                <span className="font-medium">Uses batteries</span>
                <span className="block text-xs text-muted-foreground">
                  Enable battery level tracking and replacement history for equipment in this category.
                </span>
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleAdd} disabled={createMut.isPending}>
            {createMut.isPending ? "Adding…" : "Add Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Equipment Detail View
// ============================================================
function EquipmentDetailView({ equipmentId, onBack }: { equipmentId: string; onBack: () => void }) {
  const { goToCustomer, goToContract, goToVisit } = useNav()
  const { data, isLoading, refetch, isFetching } = useApi<EquipmentDetail>(
    ["equipment", equipmentId],
    `/api/equipment/${equipmentId}`,
  )
  const updateMut = useUpdate<Equipment>("/api/equipment", [["equipment", equipmentId], ["equipment"], ["dashboard"]])
  const deleteMut = useDelete("/api/equipment", [["equipment"], ["dashboard"]])

  const [editOpen, setEditOpen] = useState(false)
  const [tab, setTab] = useState("overview")
  const [decommissionOpen, setDecommissionOpen] = useState(false)

  // Categories + customers for the edit dialog
  const { data: categories } = useApi<EquipmentCategory[]>(
    ["equipment-categories"], "/api/equipment-categories",
  )
  const { data: customers } = useApi<Customer[]>(["customers-mini"], "/api/customers")

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Card><CardContent className="p-6 h-40 animate-pulse bg-muted/40 rounded-md" /></Card>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 h-24 animate-pulse bg-muted/40 rounded-md" /></Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <EmptyState title="Equipment not found" description="The equipment may have been deleted." icon={AlertCircle} />
      </div>
    )
  }

  const eq: EquipmentDetail = data
  const usesBatteries = !!eq.category?.usesBatteries
  const batteryPct = batteryLevelPercent(eq.currentBatteryLevel)

  const inspections = eq.inspections ?? []
  const batteries = eq.batteries ?? []
  const consumption = eq.consumption ?? []
  const history = eq.history ?? []

  const lastInspection = inspections[0]
  const lastBatteryReplacement = batteries[0]

  const handleDecommission = () => {
    deleteMut.mutate(equipmentId, {
      onSuccess: () => {
        setDecommissionOpen(false)
        onBack()
      },
    })
  }

  const isDecommissioned = eq.operationalStatus === "DECOMMISSIONED"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to equipment
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} disabled={isDecommissioned}>
            <Pencil className="h-4 w-4 mr-2" />Edit
          </Button>
          {!isDecommissioned && (
            <Button
              variant="outline"
              size="sm"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              onClick={() => setDecommissionOpen(true)}
            >
              <Power className="h-4 w-4 mr-2" />Decommission
            </Button>
          )}
        </div>
      </div>

      {/* Header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300">
                  <Boxes className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight flex flex-wrap items-center gap-2">
                    {eq.name}
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      <Hash className="h-3 w-3 mr-1" />{eq.serialNumber}
                    </span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <StatusBadge status={eq.operationalStatus} label={OPERATIONAL_STATUS[eq.operationalStatus] ?? eq.operationalStatus} />
                    <StatusBadge status={eq.installationStatus} label={INSTALLATION_STATUS[eq.installationStatus] ?? eq.installationStatus} />
                    {usesBatteries && (
                      <Badge variant="outline" className="border-orange-200 text-orange-700 dark:border-orange-900/50 dark:text-orange-300">
                        <BatteryCharging className="h-3 w-3 mr-1" />Battery-powered
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-4 w-4 shrink-0" />
                  <span className="text-foreground">{eq.category?.name ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0" />
                  <span className="text-foreground">{[eq.brand, eq.model].filter(Boolean).join(" · ") || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <QrCode className="h-4 w-4 shrink-0" />
                  <span className="font-mono text-xs text-foreground">{eq.qrCode ?? "—"}</span>
                </div>
                {eq.customer && (
                  <button
                    className="flex items-center gap-2 text-muted-foreground text-left hover:text-teal-600 dark:hover:text-teal-300 transition-colors"
                    onClick={() => goToCustomer(eq.customer!.id)}
                    title="View customer"
                  >
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="text-foreground underline-offset-2 hover:underline">{eq.customer.name}</span>
                  </button>
                )}
                {eq.contract && (
                  <button
                    className="flex items-center gap-2 text-muted-foreground text-left hover:text-teal-600 dark:hover:text-teal-300 transition-colors"
                    onClick={() => goToContract(eq.contract!.id)}
                    title="View contract"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="text-foreground underline-offset-2 hover:underline">{eq.contract.contractNumber}</span>
                  </button>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="text-foreground">
                    {eq.location?.name ?? "—"}
                    {eq.location?.floor ? ` · ${eq.location.floor}` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Battery gauge */}
            {usesBatteries && (
              <div className="w-full sm:w-64 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <BatteryCharging className="h-4 w-4 text-orange-500" />
                    Battery Level
                  </div>
                  <span className="text-sm font-semibold">{BATTERY_LEVEL[eq.currentBatteryLevel] ?? eq.currentBatteryLevel}</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", batteryLevelColor(eq.currentBatteryLevel))}
                    style={{ width: `${batteryPct}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Last replacement: {eq.lastBatteryReplacement ? fmtDate(eq.lastBatteryReplacement) : "—"}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI summary */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <KpiCard title="Total Inspections" value={inspections.length} icon={ClipboardList} accent="violet" />
        <KpiCard title="Battery Replacements" value={batteries.length} icon={BatteryCharging} accent="orange" />
        <KpiCard
          title="Last Inspection"
          value={lastInspection ? fmtDate(lastInspection.inspectedAt) : "—"}
          icon={ClipboardCheck}
          accent="emerald"
          hint={lastInspection ? lastInspection.technician?.name ?? "Unassigned" : "No inspections yet"}
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="overview"><Info className="h-4 w-4 mr-1.5" />Overview</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-1.5" />History</TabsTrigger>
            <TabsTrigger value="inspections"><ClipboardCheck className="h-4 w-4 mr-1.5" />Inspections</TabsTrigger>
            <TabsTrigger value="batteries"><BatteryCharging className="h-4 w-4 mr-1.5" />Batteries</TabsTrigger>
            <TabsTrigger value="consumption"><Package className="h-4 w-4 mr-1.5" />Consumption</TabsTrigger>
            <TabsTrigger value="photos"><ImageIcon className="h-4 w-4 mr-1.5" />Photos</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab equipment={eq} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryTab history={history} />
        </TabsContent>
        <TabsContent value="inspections" className="mt-4">
          <InspectionsTab inspections={inspections} onOpenVisit={(id) => goToVisit(id)} />
        </TabsContent>
        <TabsContent value="batteries" className="mt-4">
          <BatteriesTab batteries={batteries} onOpenVisit={(id) => goToVisit(id)} />
        </TabsContent>
        <TabsContent value="consumption" className="mt-4">
          <ConsumptionTab records={consumption} onOpenVisit={(id) => goToVisit(id)} />
        </TabsContent>
        <TabsContent value="photos" className="mt-4">
          <PhotosTab inspections={inspections} />
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <EquipmentFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editTarget={eq}
        categories={categories ?? []}
        customers={customers ?? []}
        onSubmit={(formData) => {
          updateMut.mutate(
            {
              id: eq.id,
              data: {
                ...formData,
                customerId: formData.customerId || null,
                contractId: formData.contractId || null,
                locationId: formData.locationId || null,
                purchaseDate: formData.purchaseDate || null,
                installationDate: formData.installationDate || null,
              } as Partial<Equipment>,
            },
            { onSuccess: () => setEditOpen(false) },
          )
        }}
        loading={updateMut.isPending}
      />

      {/* Decommission confirmation */}
      <AlertDialog open={decommissionOpen} onOpenChange={setDecommissionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decommission this equipment?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{eq.name}</strong> ({eq.serialNumber}) will be marked as
              <span className="font-medium"> Decommissioned</span> and unassigned from its customer,
              contract and location. A decommissioning event will be recorded in history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecommission}
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Decommissioning…" : "Decommission"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// Tab: Overview
// ============================================================
function OverviewTab({ equipment }: { equipment: EquipmentDetail }) {
  const infoItems: { label: string; value?: string; icon: typeof Tag }[] = [
    { label: "Brand", value: equipment.brand, icon: Tag },
    { label: "Model", value: equipment.model, icon: Info },
    { label: "Category", value: equipment.category?.name, icon: Layers },
    { label: "Battery Type", value: equipment.batteryType, icon: BatteryCharging },
    { label: "Purchase Date", value: equipment.purchaseDate ? fmtDate(equipment.purchaseDate) : undefined, icon: CalendarDays },
    { label: "Installation Date", value: equipment.installationDate ? fmtDate(equipment.installationDate) : undefined, icon: Settings2 },
    { label: "QR Code", value: equipment.qrCode, icon: QrCode },
    { label: "Created At", value: fmtDate(equipment.createdAt), icon: Activity },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Status / battery summary */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Operational Status</p>
            <StatusBadge status={equipment.operationalStatus} label={OPERATIONAL_STATUS[equipment.operationalStatus] ?? equipment.operationalStatus} />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Installation Status</p>
            <StatusBadge status={equipment.installationStatus} label={INSTALLATION_STATUS[equipment.installationStatus] ?? equipment.installationStatus} />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Battery Level</p>
            {equipment.category?.usesBatteries ? (
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-20 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", batteryLevelColor(equipment.currentBatteryLevel))}
                    style={{ width: `${batteryLevelPercent(equipment.currentBatteryLevel)}%` }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {BATTERY_LEVEL[equipment.currentBatteryLevel] ?? equipment.currentBatteryLevel}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">N/A — category does not use batteries</span>
            )}
          </div>
          {equipment.lastBatteryReplacement && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Last Battery Replacement</p>
                <p className="text-sm font-medium">{fmtDate(equipment.lastBatteryReplacement)}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Assignment */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderTree className="h-4 w-4" />Assignment & Equipment Info
          </CardTitle>
          <CardDescription>Equipment identification and current assignment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
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
          </div>

          {equipment.notes && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{equipment.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Tab: History (vertical timeline)
// ============================================================
function HistoryTab({ history }: { history: EquipmentHistory[] }) {
  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No history events"
            description="Lifecycle events will appear here as the equipment is inspected, maintained and reassigned."
            icon={History}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" />Lifecycle Timeline
        </CardTitle>
        <CardDescription>Complete history of this equipment, newest first</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <ol className="relative border-l border-muted ml-3 space-y-5">
            {history.map((h) => {
              const meta = EVENT_META[h.eventType] ?? { icon: Activity, color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900/40 dark:text-zinc-300" }
              const Icon = meta.icon
              return (
                <li key={h.id} className="ml-6">
                  <span
                    className={cn(
                      "absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-background",
                      meta.color,
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline" className={cn("font-medium", meta.color)}>
                      {EVENT_TYPE[h.eventType] ?? h.eventType.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{fmtDateTime(h.date)}</span>
                  </div>
                  <p className="text-sm">{h.description}</p>
                  {h.performedBy && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <User className="h-3 w-3" />{h.performedBy}
                    </p>
                  )}
                  {h.notes && <p className="text-xs text-muted-foreground mt-1 italic">{h.notes}</p>}
                </li>
              )
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Tab: Inspections
// ============================================================
function InspectionsTab({
  inspections,
  onOpenVisit,
}: {
  inspections: NonNullable<EquipmentDetail["inspections"]>
  onOpenVisit: (id: string) => void
}) {
  if (inspections.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No inspections recorded"
            description="Inspection results from visits will appear here."
            icon={ClipboardCheck}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b">
          <p className="text-sm text-muted-foreground">Showing {inspections.length} inspection(s)</p>
        </div>
        <div className="max-h-96 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Key Findings</TableHead>
                <TableHead>Visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.map((ins) => {
                const findings: { ok: boolean; label: string }[] = [
                  { ok: ins.equipmentPresent, label: "Present" },
                  { ok: ins.correctlyInstalled, label: "Installed" },
                  { ok: ins.correctlyPositioned, label: "Positioned" },
                  { ok: ins.workingProperly, label: "Working" },
                  { ok: !ins.equipmentDamaged, label: "No damage" },
                ]
                return (
                  <TableRow key={ins.id}>
                    <TableCell className="text-sm align-top">{fmtDate(ins.inspectedAt)}</TableCell>
                    <TableCell className="align-top">
                      <StatusBadge status={ins.result} />
                    </TableCell>
                    <TableCell className="text-sm align-top">{ins.technician?.name ?? "—"}</TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {findings.map((f) => (
                          <span
                            key={f.label}
                            className={cn(
                              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
                              f.ok
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
                            )}
                            title={f.label}
                          >
                            {f.ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {f.label}
                          </span>
                        ))}
                      </div>
                      {ins.comments && (
                        <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-2">{ins.comments}</p>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {ins.visitId ? (
                        <Button
                          variant="ghost" size="sm" className="h-7 px-2 text-xs"
                          onClick={() => onOpenVisit(ins.visitId)}
                        >
                          <CalendarDays className="h-3 w-3 mr-1" />{ins.visit ? fmtDate(ins.visit.scheduledDate) : "View"}
                        </Button>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Tab: Battery Replacements
// ============================================================
function BatteriesTab({
  batteries,
  onOpenVisit,
}: {
  batteries: NonNullable<EquipmentDetail["batteries"]>
  onOpenVisit: (id: string) => void
}) {
  if (batteries.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No battery replacements"
            description="Battery replacements recorded during visits will appear here."
            icon={BatteryCharging}
          />
        </CardContent>
      </Card>
    )
  }

  const totalQty = batteries.reduce((s, b) => s + (b.quantityUsed || 0), 0)

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {batteries.length} replacement(s)</p>
          <p className="text-sm font-semibold">Total used: {totalQty}</p>
        </div>
        <div className="max-h-96 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Previous</TableHead>
                <TableHead>New</TableHead>
                <TableHead>Battery Type</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batteries.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="text-sm">{fmtDate(b.replacementDate)}</TableCell>
                  <TableCell>
                    <StatusBadge status="INACTIVE" label={BATTERY_LEVEL[b.previousLevel] ?? b.previousLevel} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status="ACTIVE" label={BATTERY_LEVEL[b.newLevel] ?? b.newLevel} />
                  </TableCell>
                  <TableCell className="text-sm">{b.batteryType ?? "—"}</TableCell>
                  <TableCell className="text-center font-semibold">{b.quantityUsed}</TableCell>
                  <TableCell className="text-sm">{b.technician?.name ?? "—"}</TableCell>
                  <TableCell>
                    {b.visitId ? (
                      <Button
                        variant="ghost" size="sm" className="h-7 px-2 text-xs"
                        onClick={() => onOpenVisit(b.visitId!)}
                      >
                        <CalendarDays className="h-3 w-3 mr-1" />{b.visit ? fmtDate(b.visit.scheduledDate) : "View"}
                      </Button>
                    ) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Tab: Consumption Records
// ============================================================
function ConsumptionTab({
  records,
  onOpenVisit,
}: {
  records: NonNullable<EquipmentDetail["consumption"]>
  onOpenVisit: (id: string) => void
}) {
  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No consumption records"
            description="Consumables used during visits for this equipment will appear here."
            icon={Package}
          />
        </CardContent>
      </Card>
    )
  }

  const totalQty = records.reduce((s, r) => s + (r.quantity || 0), 0)

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {records.length} record(s)</p>
          <p className="text-sm font-semibold">Total used: {totalQty} units</p>
        </div>
        <div className="max-h-96 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead>Visit</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{fmtDate(r.date)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{r.product?.name ?? "—"}</div>
                    {r.product?.unitOfMeasurement && (
                      <div className="text-xs text-muted-foreground">per {r.product.unitOfMeasurement}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-semibold">{r.quantity}</TableCell>
                  <TableCell>
                    {r.visitId ? (
                      <Button
                        variant="ghost" size="sm" className="h-7 px-2 text-xs"
                        onClick={() => onOpenVisit(r.visitId!)}
                      >
                        <CalendarDays className="h-3 w-3 mr-1" />{r.visit ? fmtDate(r.visit.scheduledDate) : "View"}
                      </Button>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs">
                    {r.notes ? <span className="line-clamp-2">{r.notes}</span> : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Tab: Photos (placeholder — photos live on inspections)
// ============================================================
function PhotosTab({ inspections }: { inspections: NonNullable<EquipmentDetail["inspections"]> }) {
  // Flatten all photos across inspections
  const photos = inspections.flatMap((ins) =>
    (ins.photos ?? []).map((p) => ({
      id: p.id,
      imageUrl: p.imageUrl,
      caption: p.caption,
      type: p.type,
      date: ins.inspectedAt,
      inspectionId: ins.id,
    })),
  )

  if (photos.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No photos"
            description="Photos captured during inspections will appear here. Currently no inspection has photos attached."
            icon={ImageIcon}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />Inspection Photos
        </CardTitle>
        <CardDescription>{photos.length} photo(s) across {inspections.length} inspection(s)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <div key={p.id} className="rounded-lg border overflow-hidden">
              <img
                src={p.imageUrl}
                alt={p.caption ?? p.type}
                className="aspect-square w-full object-cover"
              />
              <div className="p-2">
                <p className="text-xs font-medium capitalize">{p.type.replace(/_/g, " ").toLowerCase()}</p>
                {p.caption && <p className="text-xs text-muted-foreground line-clamp-2">{p.caption}</p>}
                <p className="text-xs text-muted-foreground mt-1">{fmtDate(p.date)}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
