"use client"

import { useMemo, useState } from "react"
import {
  CalendarDays, CalendarClock, ClipboardCheck, Plus, RefreshCw,
  ChevronLeft, ChevronRight, Pencil, Trash2, ArrowLeft, Eye,
  AlertCircle, Clock, CheckCircle2, AlertTriangle, PlayCircle,
  FileText, Boxes, Package, BatteryCharging, ClipboardList,
  Wrench, MapPin, User as UserIcon, Hash, Calendar as CalendarIcon,
  LayoutGrid, List as ListIcon, Building2, NotebookPen,
} from "lucide-react"
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, startOfWeek, endOfWeek, isSameMonth, isToday, parseISO,
} from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDate, fmtDateTime,
} from "@/components/shared"
import type {
  Visit, Customer, Contract, User, Inspection, ConsumptionRecord,
  BatteryReplacement, Equipment,
} from "@/lib/types"
import {
  VISIT_STATUS, VISIT_TYPE, VISIT_FREQUENCY,
  OPERATIONAL_STATUS, INSTALLATION_STATUS, BATTERY_LEVEL,
} from "@/lib/labels"
import { statusColor } from "@/lib/labels"
import { useNav } from "@/lib/nav-store"
import { useApi, useCreate, useUpdate, useDelete } from "@/hooks/use-api"
import { cn } from "@/lib/utils"

// Detail endpoint returns additional relations not on the base Visit type
type VisitDetail = Visit & {
  inspections?: (Inspection & { equipment?: Equipment; technician?: User })[]
  consumption?: (ConsumptionRecord & { product?: { name: string; unitOfMeasurement?: string }; equipment?: Equipment })[]
  batteries?: (BatteryReplacement & { equipment?: Equipment })[]
  customer?: Customer & { locations?: { id: string; name: string; floor?: string }[] }
  contract?: Contract & { equipment?: (Equipment & { category?: { name: string }; location?: { name: string } })[] }
}

// ---------- Empty form state ----------
const EMPTY_FORM = {
  customerId: "",
  contractId: "",
  scheduledDate: "",
  scheduledTime: "09:00",
  technicianId: "",
  visitType: "INSPECTION",
  notes: "",
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// Status -> dot color (tailwind bg classes, no indigo/blue)
const STATUS_DOT: Record<string, string> = {
  SCHEDULED: "bg-sky-500",
  IN_PROGRESS: "bg-violet-500",
  COMPLETED: "bg-emerald-500",
  PENDING: "bg-amber-500",
  CANCELLED: "bg-zinc-400",
  OVERDUE: "bg-rose-500",
}

// ============================================================
// Main module
// ============================================================
export function VisitsModule() {
  const { selectedVisitId, selectVisit } = useNav()

  if (!selectedVisitId) return <VisitsListView />
  return (
    <VisitDetailView
      visitId={selectedVisitId}
      onBack={() => selectVisit(null)}
    />
  )
}

// ============================================================
// List / Calendar View
// ============================================================
function VisitsListView() {
  const { selectVisit } = useNav()
  const [view, setView] = useState<"calendar" | "list">("calendar")
  const [customerId, setCustomerId] = useState<string>("ALL")
  const [technicianId, setTechnicianId] = useState<string>("ALL")
  const [contractId, setContractId] = useState<string>("ALL")
  const [status, setStatus] = useState<string>("ALL")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Visit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Visit | null>(null)

  // Build the list URL with all filters
  const params = new URLSearchParams()
  if (customerId !== "ALL") params.set("customerId", customerId)
  if (technicianId !== "ALL") params.set("technicianId", technicianId)
  if (contractId !== "ALL") params.set("contractId", contractId)
  if (status !== "ALL") params.set("status", status)
  const listUrl = `/api/visits${params.toString() ? `?${params.toString()}` : ""}`
  const listKey = ["visits", customerId, technicianId, contractId, status]

  const { data, isLoading, refetch, isFetching } = useApi<Visit[]>(listKey, listUrl)

  // Dropdown data
  const { data: customers } = useApi<Customer[]>(["customers-options"], "/api/customers")
  const { data: technicians } = useApi<User[]>(["technicians-options"], "/api/technicians")
  // Contracts filtered by selected customer (when set) for the form dropdown
  const contractsUrl = customerId !== "ALL"
    ? `/api/contracts?customerId=${customerId}`
    : `/api/contracts`
  const { data: contracts } = useApi<Contract[]>(["contracts-options", customerId], contractsUrl)

  const createMut = useCreate<Visit>("/api/visits", [["visits"], ["dashboard"]])
  const updateMut = useUpdate<Visit>("/api/visits", [["visits"], ["dashboard"]])
  const deleteMut = useDelete("/api/visits", [["visits"], ["dashboard"]])

  const visits = data ?? []

  // KPI computations (this month)
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  const thisMonthVisits = visits.filter((v) => {
    const d = parseISO(v.scheduledDate)
    return d >= monthStart && d <= monthEnd
  })
  const completedCount = thisMonthVisits.filter((v) => v.status === "COMPLETED").length
  const scheduledCount = thisMonthVisits.filter((v) => v.status === "SCHEDULED").length
  const pendingCount = thisMonthVisits.filter((v) => v.status === "PENDING").length
  const overdueCount = thisMonthVisits.filter((v) => v.status === "OVERDUE").length
  const upcomingCount = visits.filter(
    (v) => (v.status === "SCHEDULED" || v.status === "PENDING") && parseISO(v.scheduledDate) >= now,
  ).length

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
        title="Visits & Schedule"
        description="Plan, track and complete service visits across all contracts"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => { setEditTarget(null); setDialogOpen(true) }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule Visit
            </Button>
          </div>
        }
      />

      {/* View toggle + Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
              <button
                onClick={() => setView("calendar")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                  view === "calendar" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />Calendar
              </button>
              <button
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors",
                  view === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ListIcon className="h-3.5 w-3.5" />List
              </button>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {visits.length} visit{visits.length === 1 ? "" : "s"} matching filters
            </span>
          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="All customers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All customers</SelectItem>
                {(customers ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger><SelectValue placeholder="All technicians" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All technicians</SelectItem>
                {(technicians ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={contractId} onValueChange={setContractId}>
              <SelectTrigger><SelectValue placeholder="All contracts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All contracts</SelectItem>
                {(contracts ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.contractNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {Object.entries(VISIT_STATUS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted animate-pulse" />
            ))}
          </CardContent>
        </Card>
      ) : visits.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="No visits found"
              description="Try adjusting filters or schedule a new visit."
              icon={CalendarDays}
            />
          </CardContent>
        </Card>
      ) : view === "calendar" ? (
        <CalendarView visits={visits} onOpen={(id) => selectVisit(id)} />
      ) : (
        <>
          {/* KPI row */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard title="This Month" value={thisMonthVisits.length} icon={CalendarDays} accent="teal" />
            <KpiCard title="Completed" value={completedCount} icon={CheckCircle2} accent="emerald" />
            <KpiCard title="Scheduled" value={scheduledCount} icon={CalendarClock} accent="sky" />
            <KpiCard title="Pending" value={pendingCount} icon={Clock} accent="amber" />
            <KpiCard title="Overdue" value={overdueCount} icon={AlertTriangle} accent="rose" />
            <KpiCard title="Upcoming" value={upcomingCount} icon={CalendarClock} accent="violet" />
          </div>

          {/* Visits table */}
          <Card>
            <CardContent className="p-0">
              <div className="max-h-[60vh] overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contract</TableHead>
                      <TableHead>Technician</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Inspections</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.map((v) => (
                      <TableRow
                        key={v.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => selectVisit(v.id)}
                      >
                        <TableCell className="text-sm whitespace-nowrap">
                          {fmtDateTime(v.scheduledDate)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium truncate max-w-[160px]">{v.customer?.name ?? "—"}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {v.contract?.contractNumber ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">{v.technician?.name ?? "—"}</TableCell>
                        <TableCell>
                          <StatusBadge status={v.visitType} label={VISIT_TYPE[v.visitType] ?? v.visitType} />
                        </TableCell>
                        <TableCell><StatusBadge status={v.status} label={VISIT_STATUS[v.status] ?? v.status} /></TableCell>
                        <TableCell className="text-center font-semibold">{v._count?.inspections ?? 0}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost" size="sm" className="h-8 w-8 p-0"
                              onClick={() => selectVisit(v.id)}
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-8 w-8 p-0"
                              onClick={() => { setEditTarget(v); setDialogOpen(true) }}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700"
                              onClick={() => setDeleteTarget(v)}
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
            </CardContent>
          </Card>
        </>
      )}

      {/* Add/Edit Dialog */}
      <VisitFormDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditTarget(null) }}
        editTarget={editTarget}
        customers={customers ?? []}
        contracts={contracts ?? []}
        technicians={technicians ?? []}
        onSubmit={handleSubmit}
        loading={createMut.isPending || updateMut.isPending}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this visit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the visit scheduled for{" "}
              <strong>{deleteTarget ? fmtDateTime(deleteTarget.scheduledDate) : ""}</strong>
              {deleteTarget?.customer?.name ? <> for <strong>{deleteTarget.customer.name}</strong></> : null}.
              Related inspections and consumption records may be affected.
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
// Calendar View (monthly)
// ============================================================
function CalendarView({ visits, onOpen }: { visits: Visit[]; onOpen: (id: string) => void }) {
  const [month, setMonth] = useState<Date>(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())

  // Compute grid bounds + group visits by day for the visible grid
  const { days, visitsByDay } = useMemo(() => {
    const monthStart = startOfMonth(month)
    const monthEnd = endOfMonth(month)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd })

    const map = new Map<string, Visit[]>()
    for (const v of visits) {
      const d = parseISO(v.scheduledDate)
      // Only include visits within the grid range
      if (d >= gridStart && d <= gridEnd) {
        const key = format(d, "yyyy-MM-dd")
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(v)
      }
    }
    // Sort each day's visits by time
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        const ta = a.scheduledTime || ""
        const tb = b.scheduledTime || ""
        return ta.localeCompare(tb)
      })
    }
    return { days: allDays, visitsByDay: map }
  }, [visits, month])

  const selectedDayVisits = selectedDay ? visitsByDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [] : []

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Calendar grid */}
      <Card className="lg:col-span-2">
        <CardContent className="p-4">
          {/* Month nav */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-semibold tracking-tight">{format(month, "MMMM yyyy")}</h3>
              <p className="text-xs text-muted-foreground">
                {visitsByDay.size} day{visitsByDay.size === 1 ? "" : "s"} with visits
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => { setMonth(addMonths(month, -1)); setSelectedDay(null) }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => { setMonth(new Date()); setSelectedDay(new Date()) }}
              >
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setMonth(addMonths(month, 1)); setSelectedDay(null) }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd")
              const dayVisits = visitsByDay.get(key) ?? []
              const inMonth = isSameMonth(day, month)
              const isTodayCell = isToday(day)
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "min-h-[84px] sm:min-h-[96px] rounded-md border p-1.5 text-left transition-colors flex flex-col gap-1",
                    "hover:border-teal-400 hover:bg-teal-50/40 dark:hover:bg-teal-950/20",
                    !inMonth && "opacity-40",
                    isSelected
                      ? "border-teal-500 bg-teal-50/60 dark:bg-teal-950/30 ring-1 ring-teal-500"
                      : "border-border bg-card",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                        isTodayCell
                          ? "bg-teal-600 text-white"
                          : "text-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {dayVisits.length > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-bold text-muted-foreground">
                        {dayVisits.length}
                      </span>
                    )}
                  </div>
                  {/* Visit dots/chips */}
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {dayVisits.slice(0, 3).map((v) => (
                      <div
                        key={v.id}
                        className={cn(
                          "flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight truncate",
                          statusColor(v.status),
                        )}
                        title={`${v.customer?.name ?? ""} ${v.scheduledTime ?? ""}`}
                      >
                        <span className="font-semibold">{v.scheduledTime ?? ""}</span>
                        <span className="truncate hidden sm:inline">{v.customer?.name ?? ""}</span>
                        <span className="truncate sm:hidden">{(v.customer?.name ?? "").slice(0, 8)}</span>
                      </div>
                    ))}
                    {dayVisits.length > 3 && (
                      <span className="text-[10px] text-muted-foreground px-1">
                        +{dayVisits.length - 3} more
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3">
            <span className="text-xs text-muted-foreground">Legend:</span>
            {Object.entries(VISIT_STATUS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", STATUS_DOT[key] ?? "bg-zinc-400")} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Day detail panel */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-teal-600" />
            {selectedDay ? format(selectedDay, "EEEE, MMM d") : "Select a day"}
          </CardTitle>
          <CardDescription>
            {selectedDayVisits.length} visit{selectedDayVisits.length === 1 ? "" : "s"} scheduled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[520px] overflow-y-auto">
          {selectedDayVisits.length === 0 ? (
            <EmptyState
              title="No visits on this day"
              description="Pick another day or schedule a new visit."
              icon={CalendarDays}
            />
          ) : (
            selectedDayVisits.map((v) => (
              <button
                key={v.id}
                onClick={() => onOpen(v.id)}
                className="w-full text-left rounded-lg border p-3 hover:border-teal-400 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-semibold">{v.scheduledTime ?? "—"}</span>
                      <StatusBadge status={v.status} label={VISIT_STATUS[v.status] ?? v.status} />
                    </div>
                    <p className="mt-1 text-sm font-medium truncate">{v.customer?.name ?? "—"}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span className="font-mono">{v.contract?.contractNumber ?? "No contract"}</span>
                      <span>•</span>
                      <span className="truncate">{v.technician?.name ?? "Unassigned"}</span>
                    </div>
                    <div className="mt-1.5">
                      <StatusBadge status={v.visitType} label={VISIT_TYPE[v.visitType] ?? v.visitType} />
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Schedule Visit Form Dialog
// ============================================================
function VisitFormDialog({
  open, onOpenChange, editTarget, customers, contracts, technicians,
  onSubmit, loading,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  editTarget: Visit | null
  customers: Customer[]
  contracts: Contract[]
  technicians: User[]
  onSubmit: (data: typeof EMPTY_FORM) => void
  loading: boolean
}) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<{ customerId?: string; scheduledDate?: string }>({})

  // Sync form when dialog opens
  const lastEditId = editTarget?.id ?? null
  const [syncedId, setSyncedId] = useState<string | null | undefined>(undefined)
  if (open && syncedId !== lastEditId) {
    setForm(editTarget
      ? {
          customerId: editTarget.customerId ?? "",
          contractId: editTarget.contractId ?? "",
          scheduledDate: editTarget.scheduledDate ? format(parseISO(editTarget.scheduledDate), "yyyy-MM-dd") : "",
          scheduledTime: editTarget.scheduledTime ?? "09:00",
          technicianId: editTarget.technicianId ?? "",
          visitType: editTarget.visitType ?? "INSPECTION",
          notes: editTarget.notes ?? "",
        }
      : EMPTY_FORM)
    setErrors({})
    setSyncedId(lastEditId)
  }
  if (!open && syncedId !== undefined) {
    setSyncedId(undefined)
  }

  // Filter contracts by selected customer
  const availableContracts = form.customerId
    ? contracts.filter((c) => c.customerId === form.customerId)
    : contracts

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (k === "customerId" || k === "scheduledDate") {
      setErrors((e) => ({ ...e, [k]: undefined }))
    }
    // If customer changes, clear the contract selection if it no longer belongs
    if (k === "customerId") {
      setForm((f) => {
        if (f.contractId && contracts.find((c) => c.id === f.contractId)?.customerId !== v) {
          return { ...f, contractId: "" }
        }
        return f
      })
    }
  }

  const handleSave = () => {
    const newErr: { customerId?: string; scheduledDate?: string } = {}
    if (!form.customerId) newErr.customerId = "Customer is required"
    if (!form.scheduledDate) newErr.scheduledDate = "Scheduled date is required"
    if (Object.keys(newErr).length) { setErrors(newErr); return }
    onSubmit({ ...form })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTarget ? "Edit Visit" : "Schedule Visit"}</DialogTitle>
          <DialogDescription>
            {editTarget
              ? "Update the visit details below."
              : "Schedule a new service visit. The next visit will be auto-scheduled on completion."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
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
            <div className="space-y-1.5">
              <Label>Contract</Label>
              <Select value={form.contractId} onValueChange={(v) => set("contractId", v)}>
                <SelectTrigger><SelectValue placeholder="Optional — link to contract" /></SelectTrigger>
                <SelectContent>
                  {availableContracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.contractNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Linking a contract enables auto-scheduling of the next visit.
              </p>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="v-date">Scheduled Date <span className="text-rose-500">*</span></Label>
              <Input
                id="v-date" type="date"
                value={form.scheduledDate}
                onChange={(e) => set("scheduledDate", e.target.value)}
              />
              {errors.scheduledDate && <p className="text-xs text-rose-500">{errors.scheduledDate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-time">Scheduled Time</Label>
              <Input
                id="v-time" type="time"
                value={form.scheduledTime}
                onChange={(e) => set("scheduledTime", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Visit Type</Label>
              <Select value={form.visitType} onValueChange={(v) => set("visitType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VISIT_TYPE).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Technician</Label>
            <Select value={form.technicianId} onValueChange={(v) => set("technicianId", v)}>
              <SelectTrigger><SelectValue placeholder="Assign a technician" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="v-notes">Notes</Label>
            <Textarea
              id="v-notes" rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Visit instructions, access notes, special requests…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : editTarget ? "Save Changes" : "Schedule Visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Visit Detail View
// ============================================================
function VisitDetailView({ visitId, onBack }: { visitId: string; onBack: () => void }) {
  const { goToCustomer, goToContract, goToInspect } = useNav()
  const { data, isLoading, refetch, isFetching } = useApi<VisitDetail>(
    ["visits", visitId],
    `/api/visits/${visitId}`
  )
  const updateMut = useUpdate<Visit>("/api/visits", [["visits"], ["visits", visitId], ["dashboard"]])
  const deleteMut = useDelete("/api/visits", [["visits"], ["dashboard"]])

  const [editOpen, setEditOpen] = useState(false)
  const [tab, setTab] = useState("overview")
  const [completeOpen, setCompleteOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Dropdown data for the edit dialog
  const { data: customers } = useApi<Customer[]>(["customers-options"], "/api/customers")
  const { data: technicians } = useApi<User[]>(["technicians-options"], "/api/technicians")
  const contractsUrl = data?.customerId ? `/api/contracts?customerId=${data.customerId}` : `/api/contracts`
  const { data: contracts } = useApi<Contract[]>(["contracts-options", data?.customerId ?? ""], contractsUrl, !!data?.customerId)

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
        <EmptyState title="Visit not found" description="The visit may have been deleted." icon={AlertCircle} />
      </div>
    )
  }

  const v: VisitDetail = data
  const inspections = v.inspections ?? []
  const consumption = v.consumption ?? []
  const batteries = v.batteries ?? []
  const equipment = v.contract?.equipment ?? []

  const canActOn = ["SCHEDULED", "PENDING", "OVERDUE"].includes(v.status)

  const handleComplete = () => {
    updateMut.mutate(
      { id: v.id, data: { status: "COMPLETED" } },
      { onSuccess: () => setCompleteOpen(false) },
    )
  }

  const handleDelete = () => {
    deleteMut.mutate(v.id, {
      onSuccess: () => { setDeleteOpen(false); onBack() },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back to visits
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
            <div className="space-y-3 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300">
                  <CalendarDays className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
                    Visit {format(parseISO(v.scheduledDate), "EEE, MMM d, yyyy")}
                    {v.scheduledTime && (
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />{v.scheduledTime}
                      </span>
                    )}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <StatusBadge status={v.visitType} label={VISIT_TYPE[v.visitType] ?? v.visitType} />
                    <StatusBadge status={v.status} label={VISIT_STATUS[v.status] ?? v.status} />
                  </div>
                </div>
              </div>

              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                {v.customer && (
                  <button
                    onClick={() => goToCustomer(v.customer!.id)}
                    className="flex items-center gap-2 text-muted-foreground text-left hover:text-teal-600 transition-colors group"
                  >
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="text-foreground group-hover:text-teal-600 truncate">{v.customer.name}</span>
                  </button>
                )}
                {v.contract && (
                  <button
                    onClick={() => goToContract(v.contract!.id)}
                    className="flex items-center gap-2 text-muted-foreground text-left hover:text-teal-600 transition-colors group"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="text-foreground group-hover:text-teal-600 font-mono text-xs">{v.contract.contractNumber}</span>
                  </button>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserIcon className="h-4 w-4 shrink-0" />
                  <span className="text-foreground">{v.technician?.name ?? "Unassigned"}</span>
                </div>
                {v.contract && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 shrink-0" />
                    <span className="text-foreground">
                      {VISIT_FREQUENCY[v.contract.visitFrequency] ?? v.contract.visitFrequency}
                    </span>
                  </div>
                )}
                {v.completedAt && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-foreground">Completed {fmtDateTime(v.completedAt)}</span>
                  </div>
                )}
              </div>

              {v.notes && (
                <div className="rounded-md bg-muted/50 p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    <NotebookPen className="h-3 w-3" />Notes
                  </p>
                  <p className="whitespace-pre-wrap">{v.notes}</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {canActOn && (
                <Button
                  size="sm"
                  onClick={() => goToInspect(v.id)}
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Inspection
                </Button>
              )}
              {canActOn && (
                <Button
                  size="sm"
                  onClick={() => setCompleteOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Visit
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />Edit
              </Button>
              <Button
                variant="outline" size="sm"
                onClick={() => setDeleteOpen(true)}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visit stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard title="Inspections" value={inspections.length} icon={ClipboardList} accent="violet"
          hint={`${inspections.filter((i) => i.result === "PASSED").length} passed`} />
        <KpiCard title="Consumption Items" value={consumption.length} icon={Package} accent="amber"
          hint={`${consumption.reduce((s, r) => s + (r.quantity || 0), 0)} units used`} />
        <KpiCard title="Battery Replacements" value={batteries.length} icon={BatteryCharging} accent="teal" />
        <KpiCard title="Equipment to Inspect" value={equipment.length} icon={Boxes} accent="sky"
          hint={v.contract ? "From linked contract" : "No contract"} />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="overview"><LayoutGrid className="h-4 w-4 mr-1.5" />Overview</TabsTrigger>
            <TabsTrigger value="inspections">
              <ClipboardList className="h-4 w-4 mr-1.5" />Inspections
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{inspections.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="consumption">
              <Package className="h-4 w-4 mr-1.5" />Consumption
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{consumption.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="batteries">
              <BatteryCharging className="h-4 w-4 mr-1.5" />Batteries
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">{batteries.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab visit={v} onStartInspection={() => goToInspect(v.id)} />
        </TabsContent>
        <TabsContent value="inspections" className="mt-4">
          <InspectionsTab inspections={inspections} onStartInspection={() => goToInspect(v.id)} canActOn={canActOn} />
        </TabsContent>
        <TabsContent value="consumption" className="mt-4">
          <ConsumptionTab records={consumption} />
        </TabsContent>
        <TabsContent value="batteries" className="mt-4">
          <BatteriesTab records={batteries} />
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <VisitFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editTarget={v}
        customers={customers ?? []}
        contracts={contracts ?? []}
        technicians={technicians ?? []}
        onSubmit={(formData) => {
          updateMut.mutate(
            { id: v.id, data: { ...formData } },
            { onSuccess: () => setEditOpen(false) },
          )
        }}
        loading={updateMut.isPending}
      />

      {/* Complete confirmation */}
      <AlertDialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete this visit?</AlertDialogTitle>
            <AlertDialogDescription>
              Marking this visit as completed will record the completion timestamp.
              {v.contract && (
                <> A follow-up visit will be <strong>automatically scheduled</strong> based on the contract&apos;s{" "}
                <strong>{VISIT_FREQUENCY[v.contract.visitFrequency] ?? v.contract.visitFrequency.toLowerCase()}</strong> frequency.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleComplete}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={updateMut.isPending}
            >
              {updateMut.isPending ? "Completing…" : "Complete Visit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this visit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the visit on{" "}
              <strong>{fmtDateTime(v.scheduledDate)}</strong>
              {v.customer?.name ? <> for <strong>{v.customer.name}</strong></> : null}.
              Related inspections and consumption records may be affected.
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
// Tab: Overview (visit details + equipment to inspect)
// ============================================================
function OverviewTab({
  visit, onStartInspection,
}: {
  visit: VisitDetail
  onStartInspection: () => void
}) {
  const equipment = visit.contract?.equipment ?? []
  const locations = visit.customer?.locations ?? []

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Visit summary */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Visit Summary</CardTitle>
          <CardDescription>Scheduling & assignment details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-medium">{fmtDate(visit.scheduledDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="font-medium">{visit.scheduledTime ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <div className="mt-0.5">
                <StatusBadge status={visit.visitType} label={VISIT_TYPE[visit.visitType] ?? visit.visitType} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-0.5">
                <StatusBadge status={visit.status} label={VISIT_STATUS[visit.status] ?? visit.status} />
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Technician</p>
              <p className="font-medium">{visit.technician?.name ?? "Unassigned"}</p>
            </div>
            {visit.completedAt && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Completed At</p>
                <p className="font-medium">{fmtDateTime(visit.completedAt)}</p>
              </div>
            )}
          </div>

          {visit.contract && (
            <>
              <Separator />
              <div className="space-y-1.5 text-sm">
                <p className="text-xs text-muted-foreground">Linked Contract</p>
                <div className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-mono text-xs">{visit.contract.contractNumber}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">Visit Frequency</p>
                <p className="font-medium">
                  {VISIT_FREQUENCY[visit.contract.visitFrequency] ?? visit.contract.visitFrequency}
                  {visit.contract.customDays ? ` (${visit.contract.customDays} days)` : ""}
                </p>
              </div>
            </>
          )}

          {locations.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />Customer Locations
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {locations.map((l) => (
                    <Badge key={l.id} variant="outline" className="text-xs">
                      {l.name}{l.floor ? ` • ${l.floor}` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Equipment to inspect */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Boxes className="h-4 w-4" />Equipment to Inspect
            </CardTitle>
            <CardDescription>
              {visit.contract
                ? "Equipment from the linked contract"
                : "No contract linked — no equipment listed"}
            </CardDescription>
          </div>
          <Button size="sm" onClick={onStartInspection} className="bg-teal-600 hover:bg-teal-700">
            <PlayCircle className="h-4 w-4 mr-1.5" />Start Inspection
          </Button>
        </CardHeader>
        <CardContent>
          {equipment.length === 0 ? (
            <EmptyState
              title="No equipment to inspect"
              description={
                visit.contract
                  ? "The linked contract has no equipment assigned."
                  : "Link a contract to this visit to load its equipment."
              }
              icon={Boxes}
            />
          ) : (
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Serial</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Operational</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {equipment.map((eq) => (
                    <TableRow key={eq.id}>
                      <TableCell>
                        <div className="font-medium">{eq.name}</div>
                        {eq.brand && (
                          <div className="text-xs text-muted-foreground">{eq.brand} {eq.model}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{eq.serialNumber}</TableCell>
                      <TableCell className="text-sm">{eq.category?.name ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={eq.operationalStatus}
                          label={OPERATIONAL_STATUS[eq.operationalStatus] ?? eq.operationalStatus}
                        />
                      </TableCell>
                      <TableCell className="text-sm">{eq.location?.name ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Tab: Inspections recorded for this visit
// ============================================================
function InspectionsTab({
  inspections, onStartInspection, canActOn,
}: {
  inspections: (Inspection & { equipment?: Equipment; technician?: User })[]
  onStartInspection: () => void
  canActOn: boolean
}) {
  if (inspections.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No inspections recorded"
            description={
              canActOn
                ? "Start the inspection process to record equipment checks."
                : "No inspections were recorded during this visit."
            }
            icon={ClipboardList}
          />
          {canActOn && (
            <div className="flex justify-center pb-6">
              <Button onClick={onStartInspection} className="bg-teal-600 hover:bg-teal-700">
                <PlayCircle className="h-4 w-4 mr-2" />Start Inspection
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {inspections.length} inspection{inspections.length === 1 ? "" : "s"} recorded
          </p>
          {canActOn && (
            <Button size="sm" variant="outline" onClick={onStartInspection}>
              <PlayCircle className="h-4 w-4 mr-1.5" />Continue Inspection
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead>Key Findings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.map((i) => {
                const findings: string[] = []
                if (i.equipmentDamaged) findings.push("Damaged")
                if (i.maintenanceRequired) findings.push("Maintenance")
                if (i.batteryReplacementRequired) findings.push("Battery needed")
                if (i.equipmentClean === false) findings.push("Not clean")
                if (i.workingProperly === false) findings.push("Not working")
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="font-medium">{i.equipment?.name ?? "—"}</div>
                      {i.equipment?.serialNumber && (
                        <div className="text-xs text-muted-foreground font-mono">{i.equipment.serialNumber}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={i.result} />
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{fmtDateTime(i.inspectedAt)}</TableCell>
                    <TableCell className="text-sm">{i.technician?.name ?? "—"}</TableCell>
                    <TableCell>
                      {findings.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No issues</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {findings.map((f) => (
                            <Badge key={f} variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300">
                              {f}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {i.comments && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{i.comments}</p>
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
  )
}

// ============================================================
// Tab: Consumption recorded during this visit
// ============================================================
function ConsumptionTab({
  records,
}: {
  records: (ConsumptionRecord & {
    product?: { name: string; unitOfMeasurement?: string }
    equipment?: Equipment
  })[]
}) {
  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No consumables used"
            description="Consumables recorded during this visit will appear here."
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
          <p className="text-sm text-muted-foreground">{records.length} consumable record(s)</p>
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
                  <TableCell className="text-sm whitespace-nowrap">{fmtDate(r.date)}</TableCell>
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
// Tab: Battery replacements during this visit
// ============================================================
function BatteriesTab({
  records,
}: {
  records: (BatteryReplacement & { equipment?: Equipment })[]
}) {
  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState
            title="No battery replacements"
            description="Battery replacements performed during this visit will appear here."
            icon={BatteryCharging}
          />
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b">
          <p className="text-sm text-muted-foreground">{records.length} replacement(s)</p>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm whitespace-nowrap">{fmtDate(r.replacementDate)}</TableCell>
                  <TableCell className="font-medium">{r.equipment?.name ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status="INACTIVE" label={BATTERY_LEVEL[r.previousLevel] ?? r.previousLevel} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status="ACTIVE" label={BATTERY_LEVEL[r.newLevel] ?? r.newLevel} />
                  </TableCell>
                  <TableCell className="text-center font-semibold">{r.quantityUsed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
