"use client"

import { useState } from "react"
import {
  Users, UserCheck, UserX, Plus, Search, Pencil, Trash2, ArrowLeft,
  FileText, Boxes, CalendarDays, MapPin, Phone, Mail, User, Building2,
  Briefcase, ClipboardList, BatteryCharging, Package, Eye, X, RefreshCw,
  Layers, Hash, FolderTree, AlertCircle, ClipboardCheck, TrendingUp,
} from "lucide-react"
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
  Customer, Contract, Equipment, Visit, CustomerLocation,
  ConsumptionRecord, BatteryReplacement,
} from "@/lib/types"
import {
  CUSTOMER_CATEGORIES, CONTRACT_TYPES, CONTRACT_STATUS,
  OPERATIONAL_STATUS, VISIT_STATUS, VISIT_TYPE, INSTALLATION_STATUS,
  BATTERY_LEVEL,
} from "@/lib/labels"
import { useNav } from "@/lib/nav-store"
import { useApi, useCreate, useUpdate, useDelete } from "@/hooks/use-api"
import { cn } from "@/lib/utils"

// Detail endpoint returns additional relations not on the base Customer type
type CustomerDetail = Customer & {
  consumption?: (ConsumptionRecord & { product?: { name: string; unitOfMeasurement?: string } })[]
  batteries?: (BatteryReplacement & { equipment?: Equipment })[]
}

// ---------- Empty form state ----------
const EMPTY_FORM = {
  name: "",
  code: "",
  category: "HOTEL",
  address: "",
  city: "",
  contactPerson: "",
  phone: "",
  email: "",
  status: "ACTIVE",
  notes: "",
}

const EMPTY_LOCATION = { name: "", floor: "", notes: "" }

// ============================================================
// Main module
// ============================================================
export function CustomersModule() {
  const { selectedCustomerId, selectCustomer } = useNav()

  if (!selectedCustomerId) return <CustomersListView />
  return (
    <CustomerProfileView
      customerId={selectedCustomerId}
      onBack={() => selectCustomer(null)}
    />
  )
}

// ============================================================
// List View
// ============================================================
function CustomersListView() {
  const { selectCustomer } = useNav()
  const [q, setQ] = useState("")
  const [category, setCategory] = useState<string>("ALL")
  const [status, setStatus] = useState<string>("ALL")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  const listKey = ["customers", q, category, status]
  const url = `/api/customers?q=${encodeURIComponent(q)}&category=${category === "ALL" ? "" : category}&status=${status === "ALL" ? "" : status}`
  const { data, isLoading, refetch, isFetching } = useApi<Customer[]>(listKey, url)

  const createMut = useCreate<Customer>("/api/customers", [["customers"]])
  const updateMut = useUpdate<Customer>("/api/customers", [["customers"]])
  const deleteMut = useDelete("/api/customers", [["customers"]])

  const customers = data ?? []
  const activeCount = customers.filter((c) => c.status === "ACTIVE").length
  const inactiveCount = customers.filter((c) => c.status === "INACTIVE").length
  const categoryCounts: Record<string, number> = {}
  customers.forEach((c) => {
    categoryCounts[c.category] = (categoryCounts[c.category] ?? 0) + 1
  })
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]

  const handleSubmit = (formData: typeof EMPTY_FORM) => {
    if (editTarget) {
      updateMut.mutate(
        { id: editTarget.id, data: { ...formData } },
        { onSuccess: () => { setDialogOpen(false); setEditTarget(null) } },
      )
    } else {
      createMut.mutate(
        { ...formData },
        { onSuccess: () => { setDialogOpen(false) } },
      )
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
        title="Customers"
        description="Manage customer accounts, contracts, equipment and visits"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <ExportButton type="customers" label="Export CSV" />
            <Button
              size="sm"
              onClick={() => { setEditTarget(null); setDialogOpen(true) }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <KpiCard title="Total Customers" value={customers.length} icon={Users} accent="teal" />
        <KpiCard title="Active" value={activeCount} icon={UserCheck} accent="emerald" />
        <KpiCard title="Inactive" value={inactiveCount} icon={UserX} accent="rose" />
        <KpiCard
          title="Top Category"
          value={topCategory ? CUSTOMER_CATEGORIES[topCategory[0]] ?? topCategory[0] : "—"}
          hint={topCategory ? `${topCategory[1]} customer(s)` : undefined}
          icon={Briefcase}
          accent="violet"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, code, contact…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {Object.entries(CUSTOMER_CATEGORIES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
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
          ) : customers.length === 0 ? (
            <EmptyState
              title="No customers found"
              description="Try adjusting filters or add a new customer."
              icon={Users}
            />
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Contracts</TableHead>
                    <TableHead className="text-center">Equipment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => selectCustomer(c.id)}
                    >
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Hash className="h-3 w-3" />{c.code}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.category} label={CUSTOMER_CATEGORIES[c.category] ?? c.category} />
                      </TableCell>
                      <TableCell>{c.city ?? "—"}</TableCell>
                      <TableCell>{c.contactPerson ?? "—"}</TableCell>
                      <TableCell className="text-sm">{c.phone ?? "—"}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="text-center">{c._count?.contracts ?? 0}</TableCell>
                      <TableCell className="text-center">{c._count?.equipment ?? 0}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="sm" className="h-8 w-8 p-0"
                            onClick={() => selectCustomer(c.id)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="h-8 w-8 p-0"
                            onClick={() => { setEditTarget(c); setDialogOpen(true) }}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700"
                            onClick={() => setDeleteTarget(c)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditTarget(null) }}
        editTarget={editTarget}
        onSubmit={handleSubmit}
        loading={createMut.isPending || updateMut.isPending}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code}).
              This action cannot be undone and may fail if the customer has dependent records.
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
// Customer Add/Edit Form Dialog
// ============================================================
function CustomerFormDialog({
  open, onOpenChange, editTarget, onSubmit, loading,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editTarget: Customer | null
  onSubmit: (data: typeof EMPTY_FORM) => void
  loading: boolean
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<{ name?: string; code?: string }>({})

  // Sync form when dialog opens
  const lastEditId = editTarget?.id ?? null
  const [syncedId, setSyncedId] = useState<string | null | undefined>(undefined)
  if (open && syncedId !== lastEditId) {
    setForm(editTarget
      ? {
          name: editTarget.name ?? "",
          code: editTarget.code ?? "",
          category: editTarget.category ?? "HOTEL",
          address: editTarget.address ?? "",
          city: editTarget.city ?? "",
          contactPerson: editTarget.contactPerson ?? "",
          phone: editTarget.phone ?? "",
          email: editTarget.email ?? "",
          status: editTarget.status ?? "ACTIVE",
          notes: editTarget.notes ?? "",
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
    if (k === "name" || k === "code") setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const handleSave = () => {
    const newErr: { name?: string; code?: string } = {}
    if (!form.name.trim()) newErr.name = "Name is required"
    if (!form.code.trim()) newErr.code = "Code is required"
    if (Object.keys(newErr).length) { setErrors(newErr); return }
    onSubmit({ ...form, name: form.name.trim(), code: form.code.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTarget ? "Edit Customer" : "Add Customer"}</DialogTitle>
          <DialogDescription>
            {editTarget ? "Update customer details below." : "Fill in the details to create a new customer."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name <span className="text-rose-500">*</span></Label>
              <Input
                id="c-name" value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Acme Hotel Group"
              />
              {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-code">Code <span className="text-rose-500">*</span></Label>
              <Input
                id="c-code" value={form.code}
                onChange={(e) => set("code", e.target.value.toUpperCase())}
                placeholder="AHG-001"
              />
              {errors.code && <p className="text-xs text-rose-500">{errors.code}</p>}
            </div>
          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CUSTOMER_CATEGORIES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Label htmlFor="c-address">Address</Label>
            <Input id="c-address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main Street" />
          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-city">City</Label>
              <Input id="c-city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Cape Town" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-contact">Contact Person</Label>
              <Input id="c-contact" value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Phone</Label>
              <Input id="c-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+258 21 555 0100" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email</Label>
            <Input id="c-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="contact@example.com" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea id="c-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Additional notes…" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : editTarget ? "Save Changes" : "Create Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Customer Profile / Detail View
// ============================================================
function CustomerProfileView({ customerId, onBack }: { customerId: string; onBack: () => void }) {
  const { goToContract, goToEquipment, goToVisit } = useNav()
  const { data, isLoading, refetch, isFetching } = useApi<CustomerDetail>(
    ["customers", customerId],
    `/api/customers/${customerId}`
  )
  const updateMut = useUpdate<Customer>("/api/customers", [["customers", customerId], ["customers"]])

  const [editOpen, setEditOpen] = useState(false)
  const [tab, setTab] = useState("general")

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
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
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <EmptyState title="Customer not found" description="The customer may have been deleted." icon={AlertCircle} />
      </div>
    )
  }

  const c: CustomerDetail = data
  const activeContracts = (c.contracts ?? []).filter((ct) => ct.status === "ACTIVE").length
  const totalEquipment = c.equipment?.length ?? 0
  const totalVisits = c.visits?.length ?? 0
  const visits = c.visits ?? []
  const lastCompleted = visits.find((v) => v.status === "COMPLETED")
  const nextScheduled = visits.find((v) => v.status === "SCHEDULED" || v.status === "PENDING")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to customers
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
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                    {c.name}
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      <Hash className="h-3 w-3 mr-1" />{c.code}
                    </span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <StatusBadge status={c.category} label={CUSTOMER_CATEGORIES[c.category] ?? c.category} />
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              </div>

              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                {c.contactPerson && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4 shrink-0" /><span className="text-foreground">{c.contactPerson}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" /><span className="text-foreground">{c.phone}</span>
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2 text-muted-foreground truncate">
                    <Mail className="h-4 w-4 shrink-0" /><span className="text-foreground truncate">{c.email}</span>
                  </div>
                )}
                {c.city && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" /><span className="text-foreground">{c.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4 shrink-0" /><span className="text-foreground">Since {fmtDate(c.createdAt)}</span>
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
        <KpiCard title="Active Contracts" value={activeContracts} icon={FileText} accent="violet"
          hint={`${c.contracts?.length ?? 0} total`} />
        <KpiCard title="Total Equipment" value={totalEquipment} icon={Boxes} accent="teal" />
        <KpiCard title="Total Visits" value={totalVisits} icon={CalendarDays} accent="sky" />
        <KpiCard title="Last Visit" value={lastCompleted ? fmtDate(lastCompleted.scheduledDate) : "—"}
          icon={ClipboardCheck} accent="emerald" hint={nextScheduled ? `Next: ${fmtDate(nextScheduled.scheduledDate)}` : undefined} />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="general"><Layers className="h-4 w-4 mr-1.5" />General</TabsTrigger>
            <TabsTrigger value="contracts"><FileText className="h-4 w-4 mr-1.5" />Contracts</TabsTrigger>
            <TabsTrigger value="equipment"><Boxes className="h-4 w-4 mr-1.5" />Equipment</TabsTrigger>
            <TabsTrigger value="visits"><CalendarDays className="h-4 w-4 mr-1.5" />Visits</TabsTrigger>
            <TabsTrigger value="consumption"><Package className="h-4 w-4 mr-1.5" />Consumption</TabsTrigger>
            <TabsTrigger value="batteries"><BatteryCharging className="h-4 w-4 mr-1.5" />Batteries</TabsTrigger>
            <TabsTrigger value="reports"><TrendingUp className="h-4 w-4 mr-1.5" />Reports</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="general" className="mt-4">
          <GeneralTab customer={c} />
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <ContractsTab contracts={c.contracts ?? []} onOpen={(id) => goToContract(id)} />
        </TabsContent>

        <TabsContent value="equipment" className="mt-4">
          <EquipmentTab equipment={c.equipment ?? []} onOpen={(id) => goToEquipment(id)} />
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          <VisitsTab visits={visits} onOpen={(id) => goToVisit(id)} />
        </TabsContent>

        <TabsContent value="consumption" className="mt-4">
          <ConsumptionTab records={c.consumption ?? []} />
        </TabsContent>

        <TabsContent value="batteries" className="mt-4">
          <BatteryTab records={c.batteries ?? []} />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <ReportsTab customer={c} />
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <CustomerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editTarget={c}
        onSubmit={(formData) => {
          updateMut.mutate(
            { id: c.id, data: { ...formData } },
            { onSuccess: () => setEditOpen(false) },
          )
        }}
        loading={updateMut.isPending}
      />
    </div>
  )
}

// ============================================================
// Tab: General Information (with Locations)
// ============================================================
function GeneralTab({ customer }: { customer: CustomerDetail }) {
  const [locOpen, setLocOpen] = useState(false)
  const [deleteLocId, setDeleteLocId] = useState<string | null>(null)

  const { refetch } = useApi<CustomerLocation[]>(
    ["customer-locations", customer.id],
    `/api/customer-locations?customerId=${customer.id}`
  )
  const createLocMut = useCreate<CustomerLocation>("/api/customer-locations", [
    ["customers", customer.id],
    ["customer-locations", customer.id],
  ])

  const [locForm, setLocForm] = useState(EMPTY_LOCATION)
  const [locErr, setLocErr] = useState<string | null>(null)

  const handleAddLoc = () => {
    if (!locForm.name.trim()) { setLocErr("Name is required"); return }
    setLocErr(null)
    createLocMut.mutate(
      { customerId: customer.id, name: locForm.name.trim(), floor: locForm.floor || undefined, notes: locForm.notes || undefined },
      {
        onSuccess: () => {
          setLocForm(EMPTY_LOCATION)
          setLocOpen(false)
          refetch()
        },
      },
    )
  }

  const handleDeleteLoc = async () => {
    if (!deleteLocId) return
    try {
      const res = await fetch(`/api/customer-locations?id=${deleteLocId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      refetch()
    } catch {
      // toast handled elsewhere; keep silent here
    }
    setDeleteLocId(null)
  }

  const locations = customer.locations ?? []

  const infoItems: { label: string; value?: string; icon: typeof MapPin }[] = [
    { label: "Address", value: customer.address, icon: MapPin },
    { label: "City", value: customer.city, icon: Building2 },
    { label: "Contact Person", value: customer.contactPerson, icon: User },
    { label: "Email", value: customer.email, icon: Mail },
    { label: "Phone", value: customer.phone, icon: Phone },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
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
          <Separator />
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Registration Date</p>
              <p className="text-sm font-medium">{fmtDate(customer.createdAt)}</p>
            </div>
          </div>
          {customer.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderTree className="h-4 w-4" />Locations
            </CardTitle>
            <CardDescription>Physical locations where equipment is installed</CardDescription>
          </div>
          <Button size="sm" onClick={() => setLocOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Add Location
          </Button>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <EmptyState title="No locations" description="Add a location to start tracking equipment." icon={MapPin} />
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {locations.map((loc) => (
                <div key={loc.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-teal-600 shrink-0" />
                        <p className="font-medium truncate">{loc.name}</p>
                      </div>
                      {loc.floor && (
                        <p className="text-xs text-muted-foreground mt-1">Floor: {loc.floor}</p>
                      )}
                      {loc.notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{loc.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost" size="sm" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 shrink-0"
                      onClick={() => setDeleteLocId(loc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Equipment installed</span>
                    <span className="font-semibold">{loc._count?.equipment ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add location dialog */}
      <Dialog open={locOpen} onOpenChange={setLocOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
            <DialogDescription>Create a new physical location for {customer.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="loc-name">Name <span className="text-rose-500">*</span></Label>
              <Input
                id="loc-name" value={locForm.name}
                onChange={(e) => setLocForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Main Kitchen"
              />
              {locErr && <p className="text-xs text-rose-500">{locErr}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-floor">Floor</Label>
              <Input
                id="loc-floor" value={locForm.floor}
                onChange={(e) => setLocForm((f) => ({ ...f, floor: e.target.value }))}
                placeholder="Ground Floor"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc-notes">Notes</Label>
              <Textarea
                id="loc-notes" value={locForm.notes} rows={3}
                onChange={(e) => setLocForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Access notes, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocOpen(false)}>Cancel</Button>
            <Button onClick={handleAddLoc} disabled={createLocMut.isPending}>
              {createLocMut.isPending ? "Adding…" : "Add Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteLocId} onOpenChange={(o) => !o && setDeleteLocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete location?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the location. Equipment assigned to it may need reassignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLoc}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================
// Tab: Contracts
// ============================================================
function ContractsTab({ contracts, onOpen }: { contracts: Contract[]; onOpen: (id: string) => void }) {
  if (contracts.length === 0) {
    return <Card><CardContent className="p-0"><EmptyState title="No contracts" icon={FileText} description="This customer has no contracts yet." /></CardContent></Card>
  }
  return (
    <Card>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead className="text-center">Machines</TableHead>
                <TableHead>Technician</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((ct) => (
                <TableRow key={ct.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onOpen(ct.id)}>
                  <TableCell className="font-mono text-xs">{ct.contractNumber}</TableCell>
                  <TableCell><StatusBadge status={ct.type} label={CONTRACT_TYPES[ct.type] ?? ct.type} /></TableCell>
                  <TableCell><StatusBadge status={ct.status} label={CONTRACT_STATUS[ct.status] ?? ct.status} /></TableCell>
                  <TableCell className="text-sm">{fmtDate(ct.startDate)}</TableCell>
                  <TableCell className="text-sm">{fmtDate(ct.endDate)}</TableCell>
                  <TableCell className="text-sm capitalize">{ct.visitFrequency?.toLowerCase()}</TableCell>
                  <TableCell className="text-center">{ct._count?.equipment ?? ct.installedMachines ?? 0}</TableCell>
                  <TableCell className="text-sm">{ct.technician?.name ?? "—"}</TableCell>
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
// Tab: Equipment
// ============================================================
function EquipmentTab({ equipment, onOpen }: { equipment: Equipment[]; onOpen: (id: string) => void }) {
  if (equipment.length === 0) {
    return <Card><CardContent className="p-0"><EmptyState title="No equipment" icon={Boxes} description="No equipment installed for this customer." /></CardContent></Card>
  }
  return (
    <Card>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Operational</TableHead>
                <TableHead>Installation</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((eq) => (
                <TableRow key={eq.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onOpen(eq.id)}>
                  <TableCell>
                    <div className="font-medium">{eq.name}</div>
                    {eq.brand && <div className="text-xs text-muted-foreground">{eq.brand} {eq.model}</div>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{eq.serialNumber}</TableCell>
                  <TableCell className="text-sm">{eq.category?.name ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={eq.operationalStatus} label={OPERATIONAL_STATUS[eq.operationalStatus] ?? eq.operationalStatus} /></TableCell>
                  <TableCell><StatusBadge status={eq.installationStatus} label={INSTALLATION_STATUS[eq.installationStatus] ?? eq.installationStatus} /></TableCell>
                  <TableCell className="text-sm">{eq.location?.name ?? "—"}</TableCell>
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
// Tab: Visits
// ============================================================
function VisitsTab({ visits, onOpen }: { visits: Visit[]; onOpen: (id: string) => void }) {
  const lastCompleted = visits.find((v) => v.status === "COMPLETED")
  const nextScheduled = visits.find((v) => v.status === "SCHEDULED" || v.status === "PENDING")

  if (visits.length === 0) {
    return <Card><CardContent className="p-0"><EmptyState title="No visits" icon={CalendarDays} description="No visits recorded for this customer." /></CardContent></Card>
  }

  return (
    <div className="space-y-4">
      {/* Highlighted summary */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
        <Card className={cn(lastCompleted && "border-emerald-200 dark:border-emerald-900/50")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" />Last Completed Visit
            </div>
            {lastCompleted ? (
              <>
                <p className="mt-1 text-sm font-semibold">{fmtDateTime(lastCompleted.scheduledDate)}</p>
                <p className="text-xs text-muted-foreground">
                  {VISIT_TYPE[lastCompleted.visitType] ?? lastCompleted.visitType} • {lastCompleted.technician?.name ?? "Unassigned"}
                </p>
              </>
            ) : <p className="mt-1 text-sm text-muted-foreground">No completed visits yet</p>}
          </CardContent>
        </Card>
        <Card className={cn(nextScheduled && "border-sky-200 dark:border-sky-900/50")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-4 w-4 text-sky-600" />Next Scheduled Visit
            </div>
            {nextScheduled ? (
              <>
                <p className="mt-1 text-sm font-semibold">{fmtDateTime(nextScheduled.scheduledDate)}</p>
                <p className="text-xs text-muted-foreground">
                  {VISIT_TYPE[nextScheduled.visitType] ?? nextScheduled.visitType} • {nextScheduled.technician?.name ?? "Unassigned"}
                </p>
              </>
            ) : <p className="mt-1 text-sm text-muted-foreground">No upcoming visits scheduled</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead className="text-center">Inspections</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((v) => (
                  <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onOpen(v.id)}>
                    <TableCell className="text-sm">{fmtDateTime(v.scheduledDate)}</TableCell>
                    <TableCell><StatusBadge status={v.visitType} label={VISIT_TYPE[v.visitType] ?? v.visitType} /></TableCell>
                    <TableCell><StatusBadge status={v.status} label={VISIT_STATUS[v.status] ?? v.status} /></TableCell>
                    <TableCell className="text-sm">{v.technician?.name ?? "—"}</TableCell>
                    <TableCell className="text-center">{v._count?.inspections ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Tab: Consumption
// ============================================================
function ConsumptionTab({ records }: { records: ConsumptionRecord[] }) {
  if (records.length === 0) {
    return <Card><CardContent className="p-0"><EmptyState title="No consumption records" icon={Package} description="Consumables used during visits will appear here." /></CardContent></Card>
  }
  const totalQty = records.reduce((sum, r) => sum + (r.quantity || 0), 0)
  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing latest {records.length} records</p>
          <p className="text-sm font-semibold">Total: {totalQty} units</p>
        </div>
        <div className="max-h-96 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Visit</TableHead>
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
                  <TableCell className="text-sm">{r.equipment?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.visit ? fmtDate(r.visit.scheduledDate) : "—"}</TableCell>
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
// Tab: Battery History
// ============================================================
function BatteryTab({ records }: { records: BatteryReplacement[] }) {
  if (records.length === 0) {
    return <Card><CardContent className="p-0"><EmptyState title="No battery replacements" icon={BatteryCharging} description="Battery replacements for this customer's equipment will appear here." /></CardContent></Card>
  }
  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b">
          <p className="text-sm text-muted-foreground">Showing latest {records.length} replacements</p>
        </div>
        <div className="max-h-96 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Previous</TableHead>
                <TableHead>New</TableHead>
                <TableHead className="text-center">Qty Used</TableHead>
                <TableHead>Technician</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm">{fmtDate(r.replacementDate)}</TableCell>
                  <TableCell className="font-medium">{r.equipment?.name ?? "—"}</TableCell>
                  <TableCell><StatusBadge status="INACTIVE" label={BATTERY_LEVEL[r.previousLevel] ?? r.previousLevel} /></TableCell>
                  <TableCell><StatusBadge status="ACTIVE" label={BATTERY_LEVEL[r.newLevel] ?? r.newLevel} /></TableCell>
                  <TableCell className="text-center font-semibold">{r.quantityUsed}</TableCell>
                  <TableCell className="text-sm">{r.technician?.name ?? "—"}</TableCell>
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
// Tab: Maintenance / Reports
// ============================================================
function ReportsTab({ customer }: { customer: CustomerDetail }) {
  const visits = customer.visits ?? []
  const consumption = customer.consumption ?? []
  const batteries = customer.batteries ?? []
  const contracts = customer.contracts ?? []
  const equipment = customer.equipment ?? []

  const totalInspections = visits.reduce((s, v) => s + (v._count?.inspections ?? 0), 0)
  const totalConsumption = consumption.reduce((s, r) => s + (r.quantity || 0), 0)
  const totalBatteryRepl = batteries.length
  const completedVisits = visits.filter((v) => v.status === "COMPLETED").length
  const overdueVisits = visits.filter((v) => v.status === "OVERDUE").length
  const scheduledVisits = visits.filter((v) => v.status === "SCHEDULED").length
  const operationalEquip = equipment.filter((e) => e.operationalStatus === "OPERATIONAL").length
  const damagedEquip = equipment.filter((e) => e.operationalStatus === "DAMAGED").length
  const activeContracts = contracts.filter((c) => c.status === "ACTIVE").length
  const totalMonthlyFees = contracts
    .filter((c) => c.status === "ACTIVE")
    .reduce((s, c) => s + (c.monthlyFee || 0), 0)

  const stats = [
    { label: "Total Inspections", value: totalInspections, icon: ClipboardList, accent: "violet" as const },
    { label: "Battery Replacements", value: totalBatteryRepl, icon: BatteryCharging, accent: "teal" as const },
    { label: "Consumables Used", value: `${totalConsumption} units`, icon: Package, accent: "amber" as const },
    { label: "Completed Visits", value: completedVisits, icon: ClipboardCheck, accent: "emerald" as const },
    { label: "Scheduled Visits", value: scheduledVisits, icon: CalendarDays, accent: "sky" as const },
    { label: "Overdue Visits", value: overdueVisits, icon: AlertCircle, accent: "rose" as const },
    { label: "Operational Equipment", value: operationalEquip, icon: Boxes, accent: "emerald" as const },
    { label: "Damaged Equipment", value: damagedEquip, icon: AlertCircle, accent: "orange" as const },
    { label: "Active Contracts", value: activeContracts, icon: FileText, accent: "violet" as const },
    { label: "Monthly Contract Fees", value: fmtMoney(totalMonthlyFees), icon: TrendingUp, accent: "teal" as const },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />Maintenance & Activity Summary
        </CardTitle>
        <CardDescription>Aggregated activity stats for {customer.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {stats.map((s) => (
            <KpiCard key={s.label} title={s.label} value={s.value} icon={s.icon} accent={s.accent} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
