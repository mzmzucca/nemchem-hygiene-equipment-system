"use client"

import { useState } from "react"
import {
  FileText, FileCheck2, FileX2, FileClock, Plus, Search, Pencil, Trash2,
  ArrowLeft, Boxes, CalendarDays, CalendarClock, ClipboardCheck,
  Hash, RefreshCw, Eye, AlertCircle, ClipboardList, BatteryCharging,
  Package, TrendingUp, Wallet, Wrench, Pause, Play, RotateCw, ShieldCheck,
  Layers, History, NotebookPen, PlayCircle, BadgeCheck, MapPin, Building2,
  X, CheckCircle2, AlertTriangle, User as UserIcon,
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDate, fmtDateTime, fmtMoney,
} from "@/components/shared"
import type {
  Contract, Customer, Equipment, Visit, User, BatteryReplacement,
  ConsumptionRecord, Product,
} from "@/lib/types"
import {
  CONTRACT_TYPES, CONTRACT_STATUS, VISIT_FREQUENCY, VISIT_STATUS, VISIT_TYPE,
  OPERATIONAL_STATUS, INSTALLATION_STATUS, BATTERY_LEVEL,
  batteryLevelColor, batteryLevelPercent,
} from "@/lib/labels"
import { useNav } from "@/lib/nav-store"
import { useApi, useCreate, useUpdate, useDelete } from "@/hooks/use-api"
import { cn } from "@/lib/utils"

// Detail endpoint returns additional relations not on the base Contract type
type ContractDetail = Contract & {
  batteries?: (BatteryReplacement & { equipment?: Equipment; technician?: User })[]
  consumption?: (ConsumptionRecord & { product?: Product; equipment?: Equipment })[]
}

// ---------- Empty form state ----------
const EMPTY_FORM = {
  contractNumber: "",
  customerId: "",
  type: "RENTAL",
  startDate: "",
  endDate: "",
  status: "ACTIVE",
  visitFrequency: "MONTHLY",
  technicianId: "",
  monthlyFee: 0,
  notes: "",
}

// ============================================================
// Main module
// ============================================================
export function ContractsModule() {
  const { selectedContractId, selectContract } = useNav()

  if (!selectedContractId) return <ContractsListView />
  return (
    <ContractDetailView
      contractId={selectedContractId}
      onBack={() => selectContract(null)}
    />
  )
}

// ============================================================
// List View
// ============================================================
function ContractsListView() {
  const { selectContract } = useNav()
  const [q, setQ] = useState("")
  const [type, setType] = useState<string>("ALL")
  const [status, setStatus] = useState<string>("ALL")
  const [customerId, setCustomerId] = useState<string>("ALL")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Contract | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null)

  const listKey = ["contracts", q, type, status, customerId]
  const url = `/api/contracts?q=${encodeURIComponent(q)}&type=${type === "ALL" ? "" : type}&status=${status === "ALL" ? "" : status}&customerId=${customerId === "ALL" ? "" : customerId}`
  const { data, isLoading, refetch, isFetching } = useApi<Contract[]>(listKey, url)

  // customers dropdown data
  const { data: customers } = useApi<Customer[]>(["customers-options"], "/api/customers")

  const createMut = useCreate<Contract>("/api/contracts", [["contracts"], ["dashboard"]])
  const updateMut = useUpdate<Contract>("/api/contracts", [["contracts"], ["dashboard"]])
  const deleteMut = useDelete("/api/contracts", [["contracts"], ["dashboard"]])

  const contracts = data ?? []

  // KPI computations
  const activeCount = contracts.filter((c) => c.status === "ACTIVE").length
  const rentalCount = contracts.filter((c) => c.type === "RENTAL").length
  const folCount = contracts.filter((c) => c.type === "FOL").length
  const expiredCount = contracts.filter((c) => c.status === "EXPIRED").length
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const expiringSoon = contracts.filter(
    (c) => c.status === "ACTIVE" && new Date(c.endDate) >= now && new Date(c.endDate) <= in30,
  ).length

  const handleSubmit = (formData: typeof EMPTY_FORM) => {
    const payload = {
      ...formData,
      monthlyFee: Number(formData.monthlyFee) || 0,
    }
    if (editTarget) {
      updateMut.mutate(
        { id: editTarget.id, data: payload },
        { onSuccess: () => { setDialogOpen(false); setEditTarget(null) } },
      )
    } else {
      createMut.mutate(
        { ...payload },
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
        title="Contracts"
        description="Manage Rental & FOL contracts, visit schedules and equipment assignments"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => { setEditTarget(null); setDialogOpen(true) }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Contract
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard title="Active Contracts" value={activeCount} icon={FileCheck2} accent="emerald" />
        <KpiCard title="Rental" value={rentalCount} icon={FileText} accent="teal" />
        <KpiCard title="FOL" value={folCount} icon={FileText} accent="violet" />
        <KpiCard title="Expired" value={expiredCount} icon={FileX2} accent="rose" />
        <KpiCard title="Expiring Soon" value={expiringSoon} icon={FileClock} accent="amber" hint="Next 30 days" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contract number…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {Object.entries(CONTRACT_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {Object.entries(CONTRACT_STATUS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="All customers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All customers</SelectItem>
                {(customers ?? []).map((c) => (
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
          ) : contracts.length === 0 ? (
            <EmptyState
              title="No contracts found"
              description="Try adjusting filters or add a new contract."
              icon={FileText}
            />
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Contract Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-center">Machines</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead>Next Visit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => selectContract(c.id)}
                    >
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          {c.contractNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium truncate max-w-[160px]">{c.customer?.name ?? "—"}</div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.type} label={CONTRACT_TYPES[c.type] ?? c.type} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} label={CONTRACT_STATUS[c.status] ?? c.status} />
                      </TableCell>
                      <TableCell className="text-sm">{fmtDate(c.startDate)}</TableCell>
                      <TableCell className="text-sm">{fmtDate(c.endDate)}</TableCell>
                      <TableCell className="text-center font-semibold">{c.installedMachines ?? c._count?.equipment ?? 0}</TableCell>
                      <TableCell className="text-sm">{c.lastCompletedVisit ? fmtDate(c.lastCompletedVisit.scheduledDate) : "—"}</TableCell>
                      <TableCell className="text-sm">{c.nextScheduledVisit ? fmtDate(c.nextScheduledVisit.scheduledDate) : "—"}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="sm" className="h-8 w-8 p-0"
                            onClick={() => selectContract(c.id)}
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
      <ContractFormDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditTarget(null) }}
        editTarget={editTarget}
        customers={customers ?? []}
        onSubmit={handleSubmit}
        loading={createMut.isPending || updateMut.isPending}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete contract <strong>{deleteTarget?.contractNumber}</strong>.
              Equipment will be unlinked from this contract. This action cannot be undone.
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
// Contract Add/Edit Form Dialog
// ============================================================
function ContractFormDialog({
  open, onOpenChange, editTarget, customers, onSubmit, loading,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editTarget: Contract | null
  customers: Customer[]
  onSubmit: (data: typeof EMPTY_FORM) => void
  loading: boolean
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<{
    contractNumber?: string; customerId?: string; type?: string
    startDate?: string; endDate?: string
  }>({})

  // technicians dropdown
  const { data: technicians } = useApi<User[]>(["technicians-options"], "/api/technicians")

  // Sync form when dialog opens
  const lastEditId = editTarget?.id ?? null
  const [syncedId, setSyncedId] = useState<string | null | undefined>(undefined)
  if (open && syncedId !== lastEditId) {
    setForm(editTarget
      ? {
          contractNumber: editTarget.contractNumber ?? "",
          customerId: editTarget.customerId ?? "",
          type: editTarget.type ?? "RENTAL",
          startDate: editTarget.startDate ? new Date(editTarget.startDate).toISOString().slice(0, 10) : "",
          endDate: editTarget.endDate ? new Date(editTarget.endDate).toISOString().slice(0, 10) : "",
          status: editTarget.status ?? "ACTIVE",
          visitFrequency: editTarget.visitFrequency ?? "MONTHLY",
          technicianId: editTarget.technicianId ?? "",
          monthlyFee: editTarget.monthlyFee ?? 0,
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
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const handleSave = () => {
    const newErr: typeof errors = {}
    if (!form.contractNumber.trim()) newErr.contractNumber = "Contract number is required"
    if (!form.customerId) newErr.customerId = "Customer is required"
    if (!form.type) newErr.type = "Type is required"
    if (!form.startDate) newErr.startDate = "Start date is required"
    if (!form.endDate) newErr.endDate = "End date is required"
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      newErr.endDate = "End date must be on or after start date"
    }
    if (Object.keys(newErr).length) { setErrors(newErr); return }
    onSubmit({
      ...form,
      contractNumber: form.contractNumber.trim(),
      technicianId: form.technicianId || "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTarget ? "Edit Contract" : "Add Contract"}</DialogTitle>
          <DialogDescription>
            {editTarget ? "Update contract details below." : "Fill in the details to create a new contract."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ct-num">Contract Number <span className="text-rose-500">*</span></Label>
              <Input
                id="ct-num" value={form.contractNumber}
                onChange={(e) => set("contractNumber", e.target.value)}
                placeholder="RC-2025-001"
              />
              {errors.contractNumber && <p className="text-xs text-rose-500">{errors.contractNumber}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Customer <span className="text-rose-500">*</span></Label>
              <Select value={form.customerId} onValueChange={(v) => set("customerId", v)}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && <p className="text-xs text-rose-500">{errors.customerId}</p>}
            </div>
          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Contract Type <span className="text-rose-500">*</span></Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRACT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-rose-500">{errors.type}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRACT_STATUS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ct-start">Start Date <span className="text-rose-500">*</span></Label>
              <Input
                id="ct-start" type="date" value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
              {errors.startDate && <p className="text-xs text-rose-500">{errors.startDate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-end">End Date <span className="text-rose-500">*</span></Label>
              <Input
                id="ct-end" type="date" value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
              {errors.endDate && <p className="text-xs text-rose-500">{errors.endDate}</p>}
            </div>
          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Visit Frequency</Label>
              <Select value={form.visitFrequency} onValueChange={(v) => set("visitFrequency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VISIT_FREQUENCY).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Technician</Label>
              <Select value={form.technicianId || "NONE"} onValueChange={(v) => set("technicianId", v === "NONE" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Unassigned</SelectItem>
                  {(technicians ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-fee">Monthly Fee (ZAR)</Label>
              <Input
                id="ct-fee" type="number" min={0} step="0.01"
                value={form.monthlyFee}
                onChange={(e) => set("monthlyFee", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ct-notes">Notes</Label>
            <Textarea
              id="ct-notes" value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Contract terms, special conditions, etc."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : editTarget ? "Save Changes" : "Create Contract"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Contract Detail View
// ============================================================
function ContractDetailView({ contractId, onBack }: { contractId: string; onBack: () => void }) {
  const { goToCustomer, goToEquipment, goToVisit, goToInspect } = useNav()
  const { data, isLoading, refetch, isFetching } = useApi<ContractDetail>(
    ["contracts", contractId],
    `/api/contracts/${contractId}`
  )
  const updateMut = useUpdate<Contract>("/api/contracts", [
    ["contracts", contractId],
    ["contracts"],
    ["dashboard"],
  ])
  const deleteMut = useDelete("/api/contracts", [["contracts"], ["dashboard"]])

  const [editOpen, setEditOpen] = useState(false)
  const [tab, setTab] = useState("overview")
  const [statusAction, setStatusAction] = useState<
    | { kind: "renew" }
    | { kind: "terminate" }
    | { kind: "suspend" }
    | { kind: "reactivate" }
    | null
  >(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
        <Card><CardContent className="p-6 h-40 animate-pulse bg-muted/40 rounded-md" /></Card>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
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
        <EmptyState title="Contract not found" description="The contract may have been deleted." icon={AlertCircle} />
      </div>
    )
  }

  const c: ContractDetail = data
  const now = new Date()
  const isExpiringSoon = c.status === "ACTIVE" && new Date(c.endDate) >= now
    && new Date(c.endDate) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const isExpired = c.status === "EXPIRED" || (c.status === "ACTIVE" && new Date(c.endDate) < now)

  // Compute renew end date — extend 12 months from current end date or today, whichever is later
  const computeRenewDate = () => {
    const currentEnd = new Date(c.endDate)
    const base = currentEnd > now ? currentEnd : now
    const renewed = new Date(base.getTime())
    renewed.setFullYear(renewed.getFullYear() + 1)
    return renewed
  }

  const handleStatusAction = () => {
    if (!statusAction) return
    if (statusAction.kind === "renew") {
      const renewed = computeRenewDate()
      updateMut.mutate(
        { id: c.id, data: { status: "ACTIVE", endDate: renewed.toISOString() } },
        { onSuccess: () => setStatusAction(null) },
      )
    } else if (statusAction.kind === "terminate") {
      updateMut.mutate(
        { id: c.id, data: { status: "TERMINATED" } },
        { onSuccess: () => setStatusAction(null) },
      )
    } else if (statusAction.kind === "suspend") {
      updateMut.mutate(
        { id: c.id, data: { status: "SUSPENDED" } },
        { onSuccess: () => setStatusAction(null) },
      )
    } else if (statusAction.kind === "reactivate") {
      updateMut.mutate(
        { id: c.id, data: { status: "ACTIVE" } },
        { onSuccess: () => setStatusAction(null) },
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to contracts
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Wrench className="h-4 w-4 mr-2" />Status Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Manage Contract</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusAction({ kind: "renew" })} disabled={c.status === "TERMINATED"}>
                <RotateCw className="h-4 w-4 mr-2 text-teal-600" />Renew (+12 months)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusAction({ kind: "reactivate" })} disabled={c.status === "ACTIVE"}>
                <Play className="h-4 w-4 mr-2 text-emerald-600" />Reactivate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusAction({ kind: "suspend" })} disabled={c.status === "SUSPENDED" || c.status === "TERMINATED"}>
                <Pause className="h-4 w-4 mr-2 text-amber-600" />Suspend
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusAction({ kind: "terminate" })} disabled={c.status === "TERMINATED"}>
                <X className="h-4 w-4 mr-2 text-rose-600" />Terminate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-rose-600 focus:text-rose-700">
                <Trash2 className="h-4 w-4 mr-2" />Delete Contract
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Header card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-lg",
                  c.type === "RENTAL"
                    ? "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300"
                    : "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300",
                )}>
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2 flex-wrap">
                    {c.contractNumber}
                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      <Hash className="h-3 w-3 mr-1" />{c.contractNumber}
                    </span>
                  </h2>
                  <button
                    onClick={() => c.customer && goToCustomer(c.customer.id)}
                    className="text-sm text-teal-600 hover:text-teal-700 hover:underline dark:text-teal-300 flex items-center gap-1 mt-1"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    {c.customer?.name ?? "—"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={c.type} label={CONTRACT_TYPES[c.type] ?? c.type} />
                <StatusBadge status={c.status} label={CONTRACT_STATUS[c.status] ?? c.status} />
                {isExpiringSoon && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    <AlertTriangle className="h-3 w-3" />Expiring Soon
                  </span>
                )}
                {isExpired && c.status !== "TERMINATED" && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                    <AlertTriangle className="h-3 w-3" />Past End Date
                  </span>
                )}
              </div>

              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span className="text-foreground">{fmtDate(c.startDate)} → {fmtDate(c.endDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="h-4 w-4 shrink-0" />
                  <span className="text-foreground">{VISIT_FREQUENCY[c.visitFrequency] ?? c.visitFrequency}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="h-4 w-4 shrink-0" />
                  <span className="text-foreground">{c.technician?.name ?? "Unassigned"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wallet className="h-4 w-4 shrink-0" />
                  <span className="text-foreground font-semibold">{fmtMoney(c.monthlyFee || 0)}/mo</span>
                </div>
                {c.customer?.city && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="text-foreground">{c.customer.city}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Highlighted business info bar */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <Card className={cn(
          "border-l-4",
          c.type === "RENTAL" ? "border-l-teal-500" : "border-l-violet-500",
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Layers className="h-4 w-4" />Contract Type
            </div>
            <p className="mt-1 text-lg font-bold">
              <StatusBadge status={c.type} label={CONTRACT_TYPES[c.type] ?? c.type} />
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Boxes className="h-4 w-4" />Installed Machines
            </div>
            <p className="mt-1 text-2xl font-bold">{c.installedMachines ?? c.equipment?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ClipboardCheck className="h-4 w-4" />Last Completed Visit
            </div>
            <p className="mt-1 text-sm font-bold">
              {c.lastCompletedVisit ? fmtDate(c.lastCompletedVisit.scheduledDate) : "No visits yet"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarClock className="h-4 w-4" />Next Scheduled Visit
            </div>
            <p className="mt-1 text-sm font-bold">
              {c.nextScheduledVisit ? fmtDate(c.nextScheduledVisit.scheduledDate) : "Not scheduled"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />Contract Status
            </div>
            <p className="mt-1">
              <StatusBadge status={c.status} label={CONTRACT_STATUS[c.status] ?? c.status} />
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visit stats KPI */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard title="Total Completed Visits" value={c.totalCompletedVisits ?? 0} icon={ClipboardCheck} accent="emerald" />
        <KpiCard title="Overdue Visits" value={c.overdueVisits ?? 0} icon={AlertTriangle} accent="rose" />
        <KpiCard title="Total Equipment" value={c.installedMachines ?? c.equipment?.length ?? 0} icon={Boxes} accent="teal" />
        <KpiCard title="Monthly Fee" value={fmtMoney(c.monthlyFee || 0)} icon={Wallet} accent="violet" />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="overview"><Layers className="h-4 w-4 mr-1.5" />Overview</TabsTrigger>
            <TabsTrigger value="equipment"><Boxes className="h-4 w-4 mr-1.5" />Equipment</TabsTrigger>
            <TabsTrigger value="visits"><CalendarDays className="h-4 w-4 mr-1.5" />Visits</TabsTrigger>
            <TabsTrigger value="batteries"><BatteryCharging className="h-4 w-4 mr-1.5" />Battery History</TabsTrigger>
            <TabsTrigger value="consumption"><Package className="h-4 w-4 mr-1.5" />Consumption</TabsTrigger>
            <TabsTrigger value="history"><History className="h-4 w-4 mr-1.5" />History & Notes</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab contract={c} />
        </TabsContent>

        <TabsContent value="equipment" className="mt-4">
          <EquipmentTab equipment={c.equipment ?? []} onOpen={(id) => goToEquipment(id)} />
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          <VisitsTab
            visits={c.visits ?? []}
            lastCompletedId={c.lastCompletedVisit?.id}
            nextScheduledId={c.nextScheduledVisit?.id}
            onOpen={(id) => goToVisit(id)}
            onInspect={(id) => goToInspect(id)}
          />
        </TabsContent>

        <TabsContent value="batteries" className="mt-4">
          <BatteryHistoryTab records={c.batteries ?? []} />
        </TabsContent>

        <TabsContent value="consumption" className="mt-4">
          <ConsumptionTab records={c.consumption ?? []} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryNotesTab contract={c} />
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <ContractFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editTarget={c}
        customers={c.customer ? [c.customer] : []}
        onSubmit={(formData) => {
          updateMut.mutate(
            { id: c.id, data: { ...formData, monthlyFee: Number(formData.monthlyFee) || 0 } },
            { onSuccess: () => setEditOpen(false) },
          )
        }}
        loading={updateMut.isPending}
      />

      {/* Status action confirmation dialogs */}
      <AlertDialog open={!!statusAction} onOpenChange={(o) => !o && setStatusAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusAction?.kind === "renew" && "Renew contract?"}
              {statusAction?.kind === "terminate" && "Terminate contract?"}
              {statusAction?.kind === "suspend" && "Suspend contract?"}
              {statusAction?.kind === "reactivate" && "Reactivate contract?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusAction?.kind === "renew" && (
                <>
                  This will extend the end date to <strong>{fmtDate(computeRenewDate())}</strong> (12 months from current end)
                  and set the contract status to <strong>Active</strong>.
                </>
              )}
              {statusAction?.kind === "terminate" && (
                <>This will permanently mark contract <strong>{c.contractNumber}</strong> as Terminated. Visits may need to be cancelled.</>
              )}
              {statusAction?.kind === "suspend" && (
                <>This will temporarily suspend contract <strong>{c.contractNumber}</strong>. You can reactivate it later.</>
              )}
              {statusAction?.kind === "reactivate" && (
                <>This will set the contract <strong>{c.contractNumber}</strong> back to Active status.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusAction}
              disabled={updateMut.isPending}
              className={cn(
                statusAction?.kind === "terminate" && "bg-rose-600 hover:bg-rose-700 text-white",
                statusAction?.kind === "suspend" && "bg-amber-600 hover:bg-amber-700 text-white",
                statusAction?.kind === "renew" && "bg-teal-600 hover:bg-teal-700 text-white",
                statusAction?.kind === "reactivate" && "bg-emerald-600 hover:bg-emerald-700 text-white",
              )}
            >
              {updateMut.isPending ? "Working…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contract?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete contract <strong>{c.contractNumber}</strong> and unlink all its equipment.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMut.mutate(c.id, { onSuccess: () => onBack() })
              }}
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
// Tab: Overview
// ============================================================
function OverviewTab({ contract }: { contract: ContractDetail }) {
  const infoItems: { label: string; value?: string | number; icon: typeof FileText }[] = [
    { label: "Contract Number", value: contract.contractNumber, icon: Hash },
    { label: "Contract Type", value: CONTRACT_TYPES[contract.type] ?? contract.type, icon: Layers },
    { label: "Status", value: CONTRACT_STATUS[contract.status] ?? contract.status, icon: ShieldCheck },
    { label: "Start Date", value: fmtDate(contract.startDate), icon: CalendarDays },
    { label: "End Date", value: fmtDate(contract.endDate), icon: CalendarClock },
    { label: "Visit Frequency", value: VISIT_FREQUENCY[contract.visitFrequency] ?? contract.visitFrequency, icon: CalendarClock },
    { label: "Assigned Technician", value: contract.technician?.name ?? "Unassigned", icon: UserIcon },
    { label: "Monthly Fee", value: fmtMoney(contract.monthlyFee || 0), icon: Wallet },
    { label: "Installed Machines", value: contract.installedMachines ?? contract.equipment?.length ?? 0, icon: Boxes },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />Contract Details
          </CardTitle>
          <CardDescription>Core contract information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {infoItems.map((it) => (
              <div key={it.label} className="flex items-start gap-3 rounded-lg border p-3">
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
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />Visit Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 grid-cols-2">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />Completed
                </div>
                <p className="mt-1 text-xl font-bold">{contract.totalCompletedVisits ?? 0}</p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />Overdue
                </div>
                <p className="mt-1 text-xl font-bold text-rose-600">{contract.overdueVisits ?? 0}</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-emerald-600" />Last Completed
                </span>
                <span className="font-medium">
                  {contract.lastCompletedVisit ? fmtDate(contract.lastCompletedVisit.scheduledDate) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-sky-600" />Next Scheduled
                </span>
                <span className="font-medium">
                  {contract.nextScheduledVisit ? fmtDate(contract.nextScheduledVisit.scheduledDate) : "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />Financial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Monthly Fee</span>
              <span className="font-bold text-lg">{fmtMoney(contract.monthlyFee || 0)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Annual Value</span>
              <span className="font-semibold">{fmtMoney((contract.monthlyFee || 0) * 12)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// Tab: Equipment
// ============================================================
function EquipmentTab({ equipment, onOpen }: { equipment: Equipment[]; onOpen: (id: string) => void }) {
  if (equipment.length === 0) {
    return (
      <Card><CardContent className="p-0">
        <EmptyState title="No equipment" icon={Boxes} description="No equipment assigned to this contract yet." />
      </CardContent></Card>
    )
  }
  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{equipment.length} equipment item(s) on this contract</p>
        </div>
        <div className="max-h-96 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Operational</TableHead>
                <TableHead>Installation</TableHead>
                <TableHead>Battery</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.map((eq) => {
                const pct = batteryLevelPercent(eq.currentBatteryLevel)
                return (
                  <TableRow key={eq.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onOpen(eq.id)}>
                    <TableCell>
                      <div className="font-medium">{eq.name}</div>
                      {eq.brand && <div className="text-xs text-muted-foreground">{eq.brand} {eq.model}</div>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{eq.serialNumber}</TableCell>
                    <TableCell className="text-sm">{eq.category?.name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={eq.operationalStatus} label={OPERATIONAL_STATUS[eq.operationalStatus] ?? eq.operationalStatus} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={eq.installationStatus} label={INSTALLATION_STATUS[eq.installationStatus] ?? eq.installationStatus} />
                    </TableCell>
                    <TableCell>
                      {eq.currentBatteryLevel && eq.currentBatteryLevel !== "NA" ? (
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
                    <TableCell className="text-sm">{eq.location?.name ?? "—"}</TableCell>
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
// Tab: Visits
// ============================================================
function VisitsTab({
  visits, lastCompletedId, nextScheduledId, onOpen, onInspect,
}: {
  visits: Visit[]
  lastCompletedId?: string
  nextScheduledId?: string
  onOpen: (id: string) => void
  onInspect: (visitId: string) => void
}) {
  const lastCompleted = visits.find((v) => v.id === lastCompletedId) ?? visits.find((v) => v.status === "COMPLETED")
  const nextScheduled = visits.find((v) => v.id === nextScheduledId) ?? visits.find((v) => v.status === "SCHEDULED" || v.status === "PENDING")

  if (visits.length === 0) {
    return (
      <Card><CardContent className="p-0">
        <EmptyState title="No visits" icon={CalendarDays} description="No visits scheduled for this contract yet." />
      </CardContent></Card>
    )
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
              <CalendarClock className="h-4 w-4 text-sky-600" />Next Scheduled Visit
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
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Showing {visits.length} visit(s)</p>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead className="text-center">Inspections</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.map((v) => {
                  const isLast = v.id === lastCompleted?.id
                  const isNext = v.id === nextScheduled?.id
                  const canInspect = v.status === "SCHEDULED" || v.status === "PENDING" || v.status === "IN_PROGRESS"
                  return (
                    <TableRow
                      key={v.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        isLast && "bg-emerald-50/50 dark:bg-emerald-900/10",
                        isNext && "bg-sky-50/50 dark:bg-sky-900/10",
                      )}
                      onClick={() => onOpen(v.id)}
                    >
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          {fmtDateTime(v.scheduledDate)}
                          {isLast && <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />}
                          {isNext && <CalendarClock className="h-3.5 w-3.5 text-sky-600" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={v.visitType} label={VISIT_TYPE[v.visitType] ?? v.visitType} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={v.status} label={VISIT_STATUS[v.status] ?? v.status} />
                      </TableCell>
                      <TableCell className="text-sm">{v.technician?.name ?? "—"}</TableCell>
                      <TableCell className="text-center">{v._count?.inspections ?? 0}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {canInspect ? (
                          <Button
                            variant="outline" size="sm" className="h-7"
                            onClick={() => onInspect(v.id)}
                            title="Start Inspection"
                          >
                            <PlayCircle className="h-3.5 w-3.5 mr-1.5" />Inspect
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Tab: Battery History
// ============================================================
function BatteryHistoryTab({
  records,
}: {
  records: (BatteryReplacement & { equipment?: Equipment; technician?: User })[]
}) {
  if (records.length === 0) {
    return (
      <Card><CardContent className="p-0">
        <EmptyState title="No battery replacements" icon={BatteryCharging} description="Battery replacements for this contract's equipment will appear here." />
      </CardContent></Card>
    )
  }
  const totalQty = records.reduce((s, r) => s + (r.quantityUsed || 0), 0)
  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {records.length} replacement(s)</p>
          <p className="text-sm font-semibold">Total used: {totalQty} units</p>
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
// Tab: Consumption
// ============================================================
function ConsumptionTab({
  records,
}: {
  records: (ConsumptionRecord & { product?: Product; equipment?: Equipment })[]
}) {
  if (records.length === 0) {
    return (
      <Card><CardContent className="p-0">
        <EmptyState title="No consumption records" icon={Package} description="Consumables used during this contract's visits will appear here." />
      </CardContent></Card>
    )
  }
  const totalQty = records.reduce((s, r) => s + (r.quantity || 0), 0)
  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Showing {records.length} record(s)</p>
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
// Tab: History & Notes
// ============================================================
function HistoryNotesTab({ contract }: { contract: ContractDetail }) {
  const daysActive = Math.max(
    0,
    Math.floor((Date.now() - new Date(contract.startDate).getTime()) / (1000 * 60 * 60 * 24)),
  )
  const totalDuration = Math.max(
    0,
    Math.floor((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / (1000 * 60 * 60 * 24)),
  )

  const milestones: { label: string; value: string; icon: typeof CalendarDays; accent: string }[] = [
    { label: "Start Date", value: fmtDate(contract.startDate), icon: CalendarDays, accent: "text-emerald-600" },
    { label: "End Date", value: fmtDate(contract.endDate), icon: CalendarClock, accent: "text-rose-600" },
    { label: "Days Active", value: `${daysActive} days`, icon: TrendingUp, accent: "text-teal-600" },
    { label: "Total Duration", value: `${totalDuration} days`, icon: History, accent: "text-violet-600" },
    { label: "Current Status", value: CONTRACT_STATUS[contract.status] ?? contract.status, icon: ShieldCheck, accent: "text-amber-600" },
    { label: "Visit Frequency", value: VISIT_FREQUENCY[contract.visitFrequency] ?? contract.visitFrequency, icon: RefreshCw, accent: "text-sky-600" },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />Contract Timeline
          </CardTitle>
          <CardDescription>Key milestones and current state</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {milestones.map((m) => (
              <div key={m.label} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <m.icon className={cn("h-4 w-4", m.accent)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-sm font-medium">{m.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <NotebookPen className="h-4 w-4" />Contract Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contract.notes ? (
            <p className="text-sm whitespace-pre-wrap">{contract.notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No notes recorded for this contract.</p>
          )}
          <Separator className="my-4" />
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Contract Number</span>
              <span className="font-mono">{contract.contractNumber}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">{contract.customer?.name ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Assigned Technician</span>
              <span className="font-medium">{contract.technician?.name ?? "Unassigned"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
