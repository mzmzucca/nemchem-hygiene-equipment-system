"use client"

import { useState } from "react"
import {
  BatteryCharging, BatteryFull, BatteryLow, BatteryWarning,
  Plus, RefreshCw, Settings2, Search, Eye, AlertCircle,
  History, ClipboardList, User as UserIcon, Hash, ArrowRight,
  Boxes, CheckCircle2, Zap, Info, Save,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"

import {
  KpiCard, SectionTitle, EmptyState, fmtDate,
} from "@/components/shared"
import type {
  BatteryReplacement, Equipment, User,
} from "@/lib/types"
import {
  BATTERY_LEVEL, batteryLevelColor, batteryLevelPercent,
} from "@/lib/labels"
import { useNav } from "@/lib/nav-store"
import { useApi, useCreate, apiPut } from "@/hooks/use-api"
import { cn } from "@/lib/utils"

// ============================================================
// Helpers
// ============================================================

const BATTERY_LEVEL_OPTIONS = ["FULL", "SEVENTY_FIVE", "FIFTY", "TWENTY_FIVE", "EMPTY", "UNKNOWN"]

/** Sort key for battery level — critical first, UNKNOWN/NA pushed to end. */
function levelRank(level: string): number {
  if (level === "UNKNOWN" || level === "NA") return 999
  return batteryLevelPercent(level)
}

/** Row tint for low-battery equipment. */
function rowTint(level: string): string {
  switch (level) {
    case "EMPTY": return "bg-rose-50/70 dark:bg-rose-950/20"
    case "TWENTY_FIVE": return "bg-orange-50/70 dark:bg-orange-950/20"
    case "FIFTY": return "bg-amber-50/60 dark:bg-amber-950/15"
    default: return ""
  }
}

function todayISO() {
  return new Date().toISOString().split("T")[0]
}

function isThisMonth(d: string | Date): boolean {
  const date = typeof d === "string" ? new Date(d) : d
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

/** Compact colored progress bar (color-coded by battery level). */
function BatteryBar({ level, className }: { level: string; className?: string }) {
  const pct = batteryLevelPercent(level)
  return (
    <div className={cn("h-2 w-full rounded-full bg-muted overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all", batteryLevelColor(level))}
        style={{ width: `${Math.max(pct, level === "EMPTY" ? 6 : pct)}%` }}
      />
    </div>
  )
}

/** Inline battery level badge (uses batteryLevelColor for tinting). */
function BatteryLevelBadge({ level }: { level: string }) {
  const color = batteryLevelColor(level)
  // map to a soft tinted class for readability on badges
  const tintMap: Record<string, string> = {
    "bg-emerald-500": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "bg-emerald-400": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "bg-amber-500": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "bg-orange-500": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    "bg-rose-500": "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    "bg-zinc-400": "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
    "bg-zinc-300": "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
  }
  return (
    <span className={cn(
      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
      tintMap[color] ?? tintMap["bg-zinc-400"],
    )}>
      {BATTERY_LEVEL[level] ?? level}
    </span>
  )
}

// ============================================================
// Empty form state for Record Replacement dialog
// ============================================================
type ReplaceForm = {
  equipmentId: string
  previousLevel: string
  customerId: string
  contractId: string
  batteryType: string
  newLevel: string
  quantityUsed: number
  replacementDate: string
  technicianId: string
  notes: string
}

const EMPTY_FORM: ReplaceForm = {
  equipmentId: "",
  previousLevel: "UNKNOWN",
  customerId: "",
  contractId: "",
  batteryType: "",
  newLevel: "FULL",
  quantityUsed: 0,
  replacementDate: todayISO(),
  technicianId: "",
  notes: "",
}

// ============================================================
// Main module
// ============================================================
export function BatteriesModule() {
  const { goToEquipment, goToCustomer } = useNav()
  const qc = useQueryClient()

  const [tab, setTab] = useState<string>("equipment")
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [replaceTarget, setReplaceTarget] = useState<Equipment | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // ---- Data ----
  // Equipment (all) — we filter client-side for categories that use batteries.
  const { data: allEquipment, isLoading: eqLoading, refetch: refetchEq, isFetching: eqFetching } =
    useApi<Equipment[]>(["equipment"], "/api/equipment")

  // Battery replacements (history) — full list, filtered client-side for date/customer.
  const { data: replacements, isLoading: repLoading, refetch: refetchRep, isFetching: repFetching } =
    useApi<BatteryReplacement[]>(["batteries"], "/api/batteries")

  // Technicians (for dropdown)
  const { data: technicians } = useApi<User[]>(["technicians"], "/api/technicians")

  // Customers (for history filter dropdown)
  const { data: customers } = useApi<{ id: string; name: string }[]>(
    ["customers-mini"], "/api/customers",
  )

  // System settings (thresholds)
  const { data: settings, isLoading: settingsLoading } = useApi<Record<string, string>>(
    ["settings"], "/api/settings",
  )

  // Battery-powered equipment (filter out decommissioned)
  const batteryEquipment = (allEquipment ?? [])
    .filter((e) => e.category?.usesBatteries)
    .filter((e) => e.operationalStatus !== "DECOMMISSIONED")
    // sort: lowest battery level first (critical on top)
    .sort((a, b) => levelRank(a.currentBatteryLevel) - levelRank(b.currentBatteryLevel))

  // ---- KPIs ----
  const healthyCount = batteryEquipment.filter(
    (e) => e.currentBatteryLevel === "FULL" || e.currentBatteryLevel === "SEVENTY_FIVE",
  ).length
  const lowCount = batteryEquipment.filter(
    (e) => e.currentBatteryLevel === "FIFTY" || e.currentBatteryLevel === "TWENTY_FIVE",
  ).length
  const needReplacementCount = batteryEquipment.filter(
    (e) => e.currentBatteryLevel === "EMPTY",
  ).length
  const replacementsThisMonth = (replacements ?? []).filter((r) => isThisMonth(r.replacementDate)).length

  // ---- Alert buckets ----
  const criticalAlerts = batteryEquipment.filter((e) => e.currentBatteryLevel === "EMPTY")
  const lowAlerts = batteryEquipment.filter((e) => e.currentBatteryLevel === "TWENTY_FIVE")
  const warningAlerts = batteryEquipment.filter((e) => e.currentBatteryLevel === "FIFTY")

  const createMut = useCreate<BatteryReplacement>(
    "/api/batteries",
    [["batteries"], ["equipment"], ["dashboard"]],
  )

  // ---- Handlers ----
  const openReplace = (eq: Equipment | null) => {
    setReplaceTarget(eq)
    setReplaceOpen(true)
  }

  const handleReplace = (form: ReplaceForm) => {
    createMut.mutate(
      {
        equipmentId: form.equipmentId,
        customerId: form.customerId || undefined,
        contractId: form.contractId || undefined,
        previousLevel: form.previousLevel || "UNKNOWN",
        newLevel: form.newLevel,
        batteryType: form.batteryType || undefined,
        quantityUsed: Number(form.quantityUsed) || 0,
        replacementDate: form.replacementDate,
        technicianId: form.technicianId || undefined,
        notes: form.notes || undefined,
      },
      { onSuccess: () => { setReplaceOpen(false); setReplaceTarget(null) } },
    )
  }

  const handleSaveSettings = async (vals: {
    BATTERY_WARNING_LEVEL: string
    BATTERY_CRITICAL_LEVEL: string
    BATTERY_REPLACEMENT_LEVEL: string
  }) => {
    try {
      await apiPut("/api/settings", vals)
      await qc.invalidateQueries({ queryKey: ["settings"] })
      toast.success("Threshold settings saved")
      setSettingsOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save settings")
    }
  }

  const refreshAll = () => {
    refetchEq()
    refetchRep()
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Battery Management"
        description="Track battery levels, record replacements and configure alert thresholds"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={eqFetching || repFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", (eqFetching || repFetching) && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button size="sm" onClick={() => openReplace(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Replacement
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard title="Battery Equipment" value={batteryEquipment.length} icon={Boxes} accent="teal" />
        <KpiCard title="Healthy" value={healthyCount} icon={BatteryFull} accent="emerald" hint="FULL / 75%" />
        <KpiCard title="Low" value={lowCount} icon={BatteryLow} accent="amber" hint="50% / 25%" />
        <KpiCard title="Need Replacement" value={needReplacementCount} icon={BatteryWarning} accent="rose" hint="0%" />
        <KpiCard title="Replacements (Month)" value={replacementsThisMonth} icon={Zap} accent="violet" />
      </div>

      {/* Battery alerts */}
      <div className="grid gap-4 md:grid-cols-3">
        <AlertCard
          title="Critical — Replacement Required"
          tone="rose"
          icon={AlertCircle}
          count={criticalAlerts.length}
          equipment={criticalAlerts}
          emptyText="No critical batteries"
          onReplace={openReplace}
          onView={(id) => goToEquipment(id)}
          onCustomer={(id) => goToCustomer(id)}
          levelLabel="EMPTY"
        />
        <AlertCard
          title="Low Battery"
          tone="orange"
          icon={BatteryWarning}
          count={lowAlerts.length}
          equipment={lowAlerts}
          emptyText="No low batteries"
          onReplace={openReplace}
          onView={(id) => goToEquipment(id)}
          onCustomer={(id) => goToCustomer(id)}
          levelLabel="25%"
        />
        <AlertCard
          title="Warning"
          tone="amber"
          icon={BatteryLow}
          count={warningAlerts.length}
          equipment={warningAlerts}
          emptyText="No warnings"
          onReplace={openReplace}
          onView={(id) => goToEquipment(id)}
          onCustomer={(id) => goToCustomer(id)}
          levelLabel="50%"
        />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            <TabsTrigger value="equipment">
              <Boxes className="h-4 w-4 mr-1.5" />Equipment Batteries
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-1.5" />Replacement History
            </TabsTrigger>
            <TabsTrigger value="thresholds">
              <Settings2 className="h-4 w-4 mr-1.5" />Alerts &amp; Thresholds
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="equipment" className="mt-4">
          <EquipmentBatteriesTab
            equipment={batteryEquipment}
            isLoading={eqLoading}
            onReplace={openReplace}
            onView={(id) => goToEquipment(id)}
            onCustomer={(id) => goToCustomer(id)}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <ReplacementHistoryTab
            replacements={replacements ?? []}
            isLoading={repLoading}
            customers={customers ?? []}
          />
        </TabsContent>

        <TabsContent value="thresholds" className="mt-4">
          <ThresholdsTab
            settings={settings ?? {}}
            loading={settingsLoading}
            onEdit={() => setSettingsOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* Record Replacement Dialog */}
      <RecordReplacementDialog
        open={replaceOpen}
        onOpenChange={(o) => { setReplaceOpen(o); if (!o) setReplaceTarget(null) }}
        batteryEquipment={allEquipment?.filter((e) => e.category?.usesBatteries) ?? []}
        technicians={technicians ?? []}
        target={replaceTarget}
        onSubmit={handleReplace}
        loading={createMut.isPending}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings ?? {}}
        loading={settingsLoading}
        onSave={handleSaveSettings}
      />
    </div>
  )
}

// ============================================================
// Alert Card (Critical / Low / Warning)
// ============================================================
function AlertCard({
  title, tone, icon: Icon, count, equipment, emptyText,
  onReplace, onView, onCustomer, levelLabel,
}: {
  title: string
  tone: "rose" | "orange" | "amber"
  icon: typeof AlertCircle
  count: number
  equipment: Equipment[]
  emptyText: string
  onReplace: (eq: Equipment) => void
  onView: (id: string) => void
  onCustomer: (id: string) => void
  levelLabel: string
}) {
  const toneMap: Record<string, { ring: string; chip: string; count: string; bar: string }> = {
    rose: {
      ring: "border-rose-200 dark:border-rose-900/60",
      chip: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
      count: "text-rose-600 dark:text-rose-300",
      bar: "bg-rose-500",
    },
    orange: {
      ring: "border-orange-200 dark:border-orange-900/60",
      chip: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
      count: "text-orange-600 dark:text-orange-300",
      bar: "bg-orange-500",
    },
    amber: {
      ring: "border-amber-200 dark:border-amber-900/60",
      chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      count: "text-amber-600 dark:text-amber-300",
      bar: "bg-amber-500",
    },
  }
  const t = toneMap[tone]
  return (
    <Card className={cn("overflow-hidden", t.ring)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", t.chip)}>
              <Icon className="h-5 w-5" />
            </div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          </div>
          <span className={cn("text-3xl font-bold tracking-tight", t.count)}>{count}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {equipment.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {emptyText}
          </div>
        ) : (
          <div className="max-h-56 overflow-y-auto rounded-md border -mx-1">
            <ul className="divide-y">
              {equipment.map((eq) => (
                <li key={eq.id} className="px-3 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <button
                      className="block text-left font-medium text-sm truncate hover:underline"
                      onClick={() => onView(eq.id)}
                      title={eq.name}
                    >
                      {eq.name}
                    </button>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Hash className="h-3 w-3" />
                      <span className="truncate">{eq.serialNumber}</span>
                      {eq.customer && (
                        <>
                          <span className="text-muted-foreground/40">•</span>
                          <button
                            className="truncate hover:underline"
                            onClick={() => eq.customerId && onCustomer(eq.customerId)}
                            title={eq.customer.name}
                          >
                            {eq.customer.name}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", t.chip)}>
                      {levelLabel}
                    </span>
                    <Button
                      size="sm" variant="outline" className="h-7 px-2 text-xs"
                      onClick={() => onReplace(eq)}
                    >
                      <BatteryCharging className="h-3.5 w-3.5 mr-1" />Replace
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Tab 1: Equipment Batteries
// ============================================================
function EquipmentBatteriesTab({
  equipment, isLoading, onReplace, onView, onCustomer,
}: {
  equipment: Equipment[]
  isLoading: boolean
  onReplace: (eq: Equipment) => void
  onView: (id: string) => void
  onCustomer: (id: string) => void
}) {
  const [q, setQ] = useState("")
  const [levelFilter, setLevelFilter] = useState<string>("ALL")

  const filtered = equipment.filter((e) => {
    const matchQ = !q
      || e.name.toLowerCase().includes(q.toLowerCase())
      || e.serialNumber.toLowerCase().includes(q.toLowerCase())
      || (e.brand ?? "").toLowerCase().includes(q.toLowerCase())
    if (!matchQ) return false
    if (levelFilter === "ALL") return true
    if (levelFilter === "HEALTHY") return e.currentBatteryLevel === "FULL" || e.currentBatteryLevel === "SEVENTY_FIVE"
    if (levelFilter === "LOW") return e.currentBatteryLevel === "FIFTY" || e.currentBatteryLevel === "TWENTY_FIVE"
    if (levelFilter === "CRITICAL") return e.currentBatteryLevel === "EMPTY"
    if (levelFilter === "UNKNOWN") return e.currentBatteryLevel === "UNKNOWN" || e.currentBatteryLevel === "NA"
    return true
  })

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Filters */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, serial, brand…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger><SelectValue placeholder="All levels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All levels</SelectItem>
              <SelectItem value="CRITICAL">Critical (0%)</SelectItem>
              <SelectItem value="LOW">Low (25% / 50%)</SelectItem>
              <SelectItem value="HEALTHY">Healthy (75% / 100%)</SelectItem>
              <SelectItem value="UNKNOWN">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No battery-powered equipment found"
            description="Try adjusting filters or add equipment with a battery-powered category."
            icon={BatteryCharging}
          />
        ) : (
          <div className="max-h-[60vh] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Battery Type</TableHead>
                  <TableHead className="w-44">Current Level</TableHead>
                  <TableHead>Last Replacement</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((eq) => {
                  const pct = batteryLevelPercent(eq.currentBatteryLevel)
                  const tint = rowTint(eq.currentBatteryLevel)
                  return (
                    <TableRow key={eq.id} className={cn("hover:bg-muted/40", tint)}>
                      <TableCell>
                        <button
                          className="text-left font-medium hover:underline"
                          onClick={() => onView(eq.id)}
                        >
                          {eq.name}
                        </button>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Hash className="h-3 w-3" />{eq.serialNumber}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {eq.category?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {eq.customer ? (
                          <button
                            className="hover:underline"
                            onClick={() => eq.customerId && onCustomer(eq.customerId)}
                          >
                            {eq.customer.name}
                          </button>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {eq.batteryType ? (
                          <span className="inline-flex items-center gap-1">
                            <BatteryCharging className="h-3.5 w-3.5 text-orange-500" />
                            {eq.batteryType}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <BatteryBar level={eq.currentBatteryLevel} className="w-24" />
                            <span className="text-xs font-medium tabular-nums">{pct}%</span>
                          </div>
                          <BatteryLevelBadge level={eq.currentBatteryLevel} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {eq.lastBatteryReplacement ? fmtDate(eq.lastBatteryReplacement) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm" variant="outline" className="h-8"
                            onClick={() => onReplace(eq)}
                            title="Record battery replacement"
                          >
                            <BatteryCharging className="h-3.5 w-3.5 mr-1.5" />
                            Replace
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="h-8 w-8 p-0"
                            onClick={() => onView(eq.id)}
                            title="View equipment"
                          >
                            <Eye className="h-4 w-4" />
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
  )
}

// ============================================================
// Tab 2: Replacement History
// ============================================================
function ReplacementHistoryTab({
  replacements, isLoading, customers,
}: {
  replacements: BatteryReplacement[]
  isLoading: boolean
  customers: { id: string; name: string }[]
}) {
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [customerId, setCustomerId] = useState<string>("ALL")

  const filtered = replacements.filter((r) => {
    if (customerId !== "ALL" && r.customerId !== customerId) return false
    const date = new Date(r.replacementDate)
    if (fromDate && date < new Date(fromDate)) return false
    if (toDate) {
      const end = new Date(toDate)
      end.setHours(23, 59, 59, 999)
      if (date > end) return false
    }
    return true
  })

  const clearFilters = () => {
    setFromDate(""); setToDate(""); setCustomerId("ALL")
  }

  const hasFilters = fromDate !== "" || toDate !== "" || customerId !== "ALL"

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Filters */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="All customers" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                Clear filters
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground pb-2 flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                {replacements.length} total record(s)
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-12 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No replacement records"
            description={hasFilters ? "Try adjusting filters." : "Record your first battery replacement to populate history."}
            icon={History}
          />
        ) : (
          <div className="max-h-[60vh] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Level Change</TableHead>
                  <TableHead>Battery Type</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="font-medium text-sm">{r.equipment?.name ?? "—"}</div>
                      {r.equipment?.serialNumber && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Hash className="h-3 w-3" />{r.equipment.serialNumber}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.customer?.name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <BatteryLevelBadge level={r.previousLevel} />
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <BatteryLevelBadge level={r.newLevel} />
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.batteryType ? (
                        <span className="inline-flex items-center gap-1">
                          <BatteryCharging className="h-3.5 w-3.5 text-orange-500" />
                          {r.batteryType}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums">{r.quantityUsed || "—"}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{fmtDate(r.replacementDate)}</TableCell>
                    <TableCell className="text-sm">
                      {r.technician ? (
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {r.technician.name}
                        </div>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate" title={r.notes ?? ""}>
                      {r.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Tab 3: Alerts & Thresholds
// ============================================================
function ThresholdsTab({
  settings, loading, onEdit,
}: {
  settings: Record<string, string>
  loading: boolean
  onEdit: () => void
}) {
  const warning = settings.BATTERY_WARNING_LEVEL || "FIFTY"
  const critical = settings.BATTERY_CRITICAL_LEVEL || "TWENTY_FIVE"
  const replacement = settings.BATTERY_REPLACEMENT_LEVEL || "EMPTY"

  const cards = [
    {
      key: "BATTERY_WARNING_LEVEL",
      title: "Warning Level",
      description: "Equipment at or below this level trigger a warning alert.",
      value: warning,
      tone: "amber" as const,
      icon: BatteryLow,
    },
    {
      key: "BATTERY_CRITICAL_LEVEL",
      title: "Critical Level",
      description: "Equipment at or below this level are flagged as critical.",
      value: critical,
      tone: "orange" as const,
      icon: BatteryWarning,
    },
    {
      key: "BATTERY_REPLACEMENT_LEVEL",
      title: "Replacement Level",
      description: "Equipment at this level require an immediate replacement.",
      value: replacement,
      tone: "rose" as const,
      icon: AlertCircle,
    },
  ]

  const toneMap: Record<"amber" | "orange" | "rose", string> = {
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded bg-muted animate-pulse" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300">
              <Info className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Battery alert thresholds</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                These thresholds determine which equipment appears in the alert banners at the top of this module.
                Update them to tune the sensitivity of low / critical / replacement alerts.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Settings2 className="h-4 w-4 mr-2" />Edit Thresholds
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon
          const pct = batteryLevelPercent(c.value)
          return (
            <Card key={c.key} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", toneMap[c.tone])}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-md", toneMap[c.tone])}>
                    {BATTERY_LEVEL[c.value] ?? c.value}
                  </span>
                </div>
                <CardTitle className="text-sm mt-2">{c.title}</CardTitle>
                <CardDescription className="text-xs">{c.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1.5">
                  <BatteryBar level={c.value} />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span className="font-medium tabular-nums">{pct}% threshold</span>
                    <span>100%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Record Replacement Dialog
// ============================================================
function RecordReplacementDialog({
  open, onOpenChange, batteryEquipment, technicians, target, onSubmit, loading,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  batteryEquipment: Equipment[]
  technicians: User[]
  target: Equipment | null
  onSubmit: (form: ReplaceForm) => void
  loading: boolean
}) {
  const [form, setForm] = useState<ReplaceForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<{ equipmentId?: string; newLevel?: string }>({})

  // Sync form when dialog opens or target changes
  const lastTargetId = target?.id ?? null
  const [syncedId, setSyncedId] = useState<string | null | undefined>(undefined)
  if (open && syncedId !== lastTargetId) {
    if (target) {
      setForm({
        equipmentId: target.id,
        previousLevel: target.currentBatteryLevel || "UNKNOWN",
        customerId: target.customerId ?? "",
        contractId: target.contractId ?? "",
        batteryType: target.batteryType ?? "",
        newLevel: "FULL",
        quantityUsed: 0,
        replacementDate: todayISO(),
        technicianId: "",
        notes: "",
      })
    } else {
      setForm({ ...EMPTY_FORM, replacementDate: todayISO() })
    }
    setErrors({})
    setSyncedId(lastTargetId)
  }
  if (!open && syncedId !== undefined) {
    setSyncedId(undefined)
  }

  const set = <K extends keyof ReplaceForm>(k: K, v: ReplaceForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (k === "equipmentId" || k === "newLevel") {
      setErrors((e) => ({ ...e, [k]: undefined }))
    }
  }

  const onEquipmentChange = (id: string) => {
    const eq = batteryEquipment.find((e) => e.id === id)
    if (eq) {
      setForm((f) => ({
        ...f,
        equipmentId: id,
        previousLevel: eq.currentBatteryLevel || "UNKNOWN",
        customerId: eq.customerId ?? "",
        contractId: eq.contractId ?? "",
        batteryType: eq.batteryType ?? f.batteryType,
      }))
      setErrors((e) => ({ ...e, equipmentId: undefined }))
    } else {
      set("equipmentId", id)
    }
  }

  const handleSave = () => {
    const newErr: { equipmentId?: string; newLevel?: string } = {}
    if (!form.equipmentId) newErr.equipmentId = "Select equipment"
    if (!form.newLevel) newErr.newLevel = "Select new battery level"
    if (Object.keys(newErr).length) { setErrors(newErr); return }
    onSubmit({ ...form, quantityUsed: Number(form.quantityUsed) || 0 })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Battery Replacement</DialogTitle>
          <DialogDescription>
            Log a battery replacement. The equipment&rsquo;s current battery level, history, and
            stock will be updated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Equipment */}
          <div className="space-y-1.5">
            <Label>Equipment <span className="text-rose-500">*</span></Label>
            <Select value={form.equipmentId} onValueChange={onEquipmentChange}>
              <SelectTrigger><SelectValue placeholder="Select battery-powered equipment" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {batteryEquipment.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No battery-powered equipment available</div>
                ) : batteryEquipment.map((eq) => (
                  <SelectItem key={eq.id} value={eq.id}>
                    <span className="truncate">{eq.name}</span>
                    <span className="text-xs text-muted-foreground ml-1">({eq.serialNumber})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.equipmentId && <p className="text-xs text-rose-500">{errors.equipmentId}</p>}
          </div>

          {/* Previous level (read-only) + New level */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Previous Level</Label>
              <div className="flex items-center gap-2 h-9 rounded-md border bg-muted/40 px-3">
                <BatteryLevelBadge level={form.previousLevel} />
                <span className="text-xs text-muted-foreground ml-auto">auto-detected</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>New Level <span className="text-rose-500">*</span></Label>
              <Select value={form.newLevel} onValueChange={(v) => set("newLevel", v)}>
                <SelectTrigger><SelectValue placeholder="Select new level" /></SelectTrigger>
                <SelectContent>
                  {BATTERY_LEVEL_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>{BATTERY_LEVEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.newLevel && <p className="text-xs text-rose-500">{errors.newLevel}</p>}
            </div>
          </div>

          {/* Battery type + Quantity */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="b-type">Battery Type</Label>
              <div className="relative">
                <BatteryCharging className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500" />
                <Input
                  id="b-type"
                  value={form.batteryType}
                  onChange={(e) => set("batteryType", e.target.value)}
                  placeholder="e.g. AA, C, D"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-qty">Quantity Used</Label>
              <Input
                id="b-qty"
                type="number"
                min={0}
                value={form.quantityUsed || ""}
                onChange={(e) => set("quantityUsed", Number(e.target.value))}
                placeholder="e.g. 4 for AA, 2 for C/D"
              />
            </div>
          </div>

          {/* Date + Technician */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="b-date">Replacement Date</Label>
              <Input
                id="b-date"
                type="date"
                value={form.replacementDate}
                onChange={(e) => set("replacementDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Technician</Label>
              <Select
                value={form.technicianId}
                onValueChange={(v) => set("technicianId", v)}
              >
                <SelectTrigger><SelectValue placeholder="Assign technician" /></SelectTrigger>
                <SelectContent>
                  {technicians.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No active technicians</div>
                  ) : technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="b-notes">Notes</Label>
            <Textarea
              id="b-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Optional notes (e.g. reason for replacement, observation)"
              rows={3}
            />
          </div>

          {form.equipmentId && (form.customerId || form.contractId) && (
            <>
              <Separator />
              <div className="grid gap-2 grid-cols-1 text-xs">
                {form.customerId && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserIcon className="h-3.5 w-3.5" />
                    <span className="text-foreground font-medium">
                      {batteryEquipment.find((e) => e.id === form.equipmentId)?.customer?.name ?? "—"}
                    </span>
                    <span>will be linked</span>
                  </div>
                )}
                {form.contractId && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ClipboardList className="h-3.5 w-3.5" />
                    <span>Contract will be linked</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Record Replacement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Settings Dialog (thresholds)
// ============================================================
function SettingsDialog({
  open, onOpenChange, settings, loading, onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  settings: Record<string, string>
  loading: boolean
  onSave: (vals: {
    BATTERY_WARNING_LEVEL: string
    BATTERY_CRITICAL_LEVEL: string
    BATTERY_REPLACEMENT_LEVEL: string
  }) => void
}) {
  const [warning, setWarning] = useState<string>("FIFTY")
  const [critical, setCritical] = useState<string>("TWENTY_FIVE")
  const [replacement, setReplacement] = useState<string>("EMPTY")
  const [saving, setSaving] = useState(false)
  const [synced, setSynced] = useState(false)

  // Sync from settings whenever dialog opens
  if (open && !synced && !loading) {
    setWarning(settings.BATTERY_WARNING_LEVEL || "FIFTY")
    setCritical(settings.BATTERY_CRITICAL_LEVEL || "TWENTY_FIVE")
    setReplacement(settings.BATTERY_REPLACEMENT_LEVEL || "EMPTY")
    setSynced(true)
  }
  if (!open && synced) {
    setSynced(false)
  }

  const handleSave = () => {
    setSaving(true)
    Promise.resolve(onSave({
      BATTERY_WARNING_LEVEL: warning,
      BATTERY_CRITICAL_LEVEL: critical,
      BATTERY_REPLACEMENT_LEVEL: replacement,
    }))
      .finally(() => setSaving(false))
  }

  const thresholdFields: {
    label: string
    description: string
    value: string
    set: (v: string) => void
    tone: "amber" | "orange" | "rose"
    icon: typeof BatteryLow
  }[] = [
    {
      label: "Warning Level",
      description: "Triggers the warning alert banner.",
      value: warning, set: setWarning, tone: "amber", icon: BatteryLow,
    },
    {
      label: "Critical Level",
      description: "Triggers the critical alert banner.",
      value: critical, set: setCritical, tone: "orange", icon: BatteryWarning,
    },
    {
      label: "Replacement Level",
      description: "Equipment at this level must be replaced immediately.",
      value: replacement, set: setReplacement, tone: "rose", icon: AlertCircle,
    },
  ]

  const toneMap: Record<"amber" | "orange" | "rose", string> = {
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Battery Alert Thresholds
          </DialogTitle>
          <DialogDescription>
            Configure when equipment should appear in the critical, low, and warning alert banners.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            {thresholdFields.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <span className={cn("flex h-6 w-6 items-center justify-center rounded", toneMap[f.tone])}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      {f.label}
                    </Label>
                    <BatteryLevelBadge level={f.value} />
                  </div>
                  <p className="text-xs text-muted-foreground -mt-1">{f.description}</p>
                  <Select value={f.value} onValueChange={f.set}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BATTERY_LEVEL_OPTIONS.map((k) => (
                        <SelectItem key={k} value={k}>{BATTERY_LEVEL[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}

            <div className="rounded-md border border-teal-200 bg-teal-50/60 dark:border-teal-900/60 dark:bg-teal-950/20 p-3 text-xs text-teal-800 dark:text-teal-200 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                Recommended order: <strong>Warning</strong> &gt; <strong>Critical</strong> &gt; <strong>Replacement</strong>.
                E.g. 50% → 25% → 0%.
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving…" : "Save Thresholds"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
