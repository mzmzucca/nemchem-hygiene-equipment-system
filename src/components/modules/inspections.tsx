"use client"

import { useMemo, useState } from "react"
import {
  ClipboardCheck, CheckCircle2, AlertTriangle, Wrench, RefreshCw,
  ArrowLeft, Eye, X, Camera, Battery, BatteryWarning,
  MapPin, User as UserIcon, Calendar, Building2, FileText, Hash,
  ChevronRight, Package, Loader2, ClipboardList, CircleCheckBig,
  CircleX, CircleAlert, Image as ImageIcon, Plus, Trash2,
  CheckCircle, CircleDashed, ListChecks,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDate, fmtDateTime,
} from "@/components/shared"
import type {
  Inspection, Visit, Equipment, EquipmentCategory, User,
  InspectionPhoto, CustomerLocation, Contract,
} from "@/lib/types"
import { INSPECTION_RESULT, BATTERY_LEVEL, OPERATIONAL_STATUS, INSTALLATION_STATUS, VISIT_STATUS, VISIT_TYPE } from "@/lib/labels"
import { useNav } from "@/lib/nav-store"
import { useApi, useCreate, apiPost, apiPut } from "@/hooks/use-api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ============================================================
// Types
// ============================================================

type VisitDetail = Visit & {
  contract?: Contract & {
    equipment?: (Equipment & {
      category?: EquipmentCategory
      location?: CustomerLocation
    })[]
  }
  inspections?: (Inspection & {
    equipment?: Equipment
    technician?: User
    photos?: InspectionPhoto[]
  })[]
}

type PhotoDraft = {
  imageUrl: string
  type: "BEFORE" | "AFTER" | "GENERAL"
  caption: string
}

type FormState = {
  equipmentPresent: string
  correctlyInstalled: string
  correctlyPositioned: string
  workingProperly: string
  equipmentClean: string
  batteryAvailable: string // YES | NO | N/A
  batteryLevel: string
  batteryReplacementRequired: boolean
  consumablesAvailable: string
  maintenanceRequired: boolean
  equipmentDamaged: boolean
  result: string
  comments: string
  technicianId: string
  photos: PhotoDraft[]
}

// ============================================================
// Main module
// ============================================================
export function InspectionsModule() {
  const { inspectVisitId } = useNav()
  if (inspectVisitId) return <InspectionWorkflow visitId={inspectVisitId} />
  return <InspectionsListView />
}

// ============================================================
// Inspection History List View
// ============================================================
function InspectionsListView() {
  const { setView } = useNav()
  const [resultFilter, setResultFilter] = useState<string>("ALL")
  const [fromDate, setFromDate] = useState<string>("")
  const [toDate, setToDate] = useState<string>("")
  const [detailTarget, setDetailTarget] = useState<Inspection | null>(null)

  const listKey = ["inspections", resultFilter, fromDate, toDate]
  const params = new URLSearchParams()
  if (resultFilter !== "ALL") params.set("result", resultFilter)
  const url = `/api/inspections${params.toString() ? `?${params.toString()}` : ""}`
  const { data, isLoading, refetch, isFetching } = useApi<Inspection[]>(listKey, url)

  const all = data ?? []

  // Client-side date filter (the API doesn't support date params)
  const filtered = useMemo(() => {
    return all.filter((i) => {
      if (resultFilter !== "ALL" && i.result !== resultFilter) return false
      const d = new Date(i.inspectedAt).getTime()
      if (fromDate && d < new Date(fromDate).getTime()) return false
      if (toDate && d > new Date(toDate).getTime() + 86400000) return false
      return true
    })
  }, [all, resultFilter, fromDate, toDate])

  const counts = useMemo(() => {
    const c = { total: all.length, passed: 0, obs: 0, failed: 0, maint: 0 }
    all.forEach((i) => {
      if (i.result === "PASSED") c.passed++
      else if (i.result === "PASSED_WITH_OBSERVATIONS") c.obs++
      else if (i.result === "FAILED") c.failed++
      else if (i.result === "MAINTENANCE_REQUIRED") c.maint++
    })
    return c
  }, [all])

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Inspections"
        description="Field inspection history and results across all visits"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setView("visits")} className="bg-teal-600 hover:bg-teal-700">
              <ClipboardList className="h-4 w-4 mr-2" />
              Go to Visits
            </Button>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard title="Total Inspections" value={counts.total} icon={ClipboardCheck} accent="teal" />
        <KpiCard title="Passed" value={counts.passed} icon={CheckCircle2} accent="emerald" />
        <KpiCard title="Passed w/ Observations" value={counts.obs} icon={AlertTriangle} accent="amber" />
        <KpiCard title="Failed" value={counts.failed} icon={CircleX} accent="rose" />
        <KpiCard title="Maintenance Required" value={counts.maint} icon={Wrench} accent="orange" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Result</Label>
              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All results" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All results</SelectItem>
                  {Object.entries(INSPECTION_RESULT).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">From date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-28" />
            </Card>
          ))
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                title="No inspections found"
                description="Try adjusting filters or start a new inspection from a visit."
                icon={ClipboardCheck}
              />
            </CardContent>
          </Card>
        ) : (
          filtered.map((i) => <InspectionMobileCard key={i.id} inspection={i} onClick={() => setDetailTarget(i)} />)
        )}
      </div>

      {/* Desktop: table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No inspections found"
              description="Try adjusting filters or start a new inspection from a visit."
              icon={ClipboardCheck}
            />
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Customer / Visit Date</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Inspected At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((i) => (
                    <TableRow
                      key={i.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setDetailTarget(i)}
                    >
                      <TableCell>
                        <div className="font-medium">{i.equipment?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {i.equipment?.serialNumber ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{i.visit?.customer?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {fmtDate(i.visit?.scheduledDate)}
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={i.result} label={INSPECTION_RESULT[i.result] ?? i.result} /></TableCell>
                      <TableCell className="text-sm">{i.technician?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm">{fmtDateTime(i.inspectedAt)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setDetailTarget(i)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <InspectionDetailDialog
        inspection={detailTarget}
        onOpenChange={(o) => !o && setDetailTarget(null)}
      />
    </div>
  )
}

// ============================================================
// Inspection Mobile Card (list view)
// ============================================================
function InspectionMobileCard({ inspection, onClick }: { inspection: Inspection; onClick: () => void }) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{inspection.equipment?.name ?? "—"}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Hash className="h-3 w-3" />
              {inspection.equipment?.serialNumber ?? "—"}
            </div>
          </div>
          <StatusBadge status={inspection.result} label={INSPECTION_RESULT[inspection.result] ?? inspection.result} />
        </div>
        <Separator className="my-3" />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Customer</div>
            <div className="font-medium truncate">{inspection.visit?.customer?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Visit date</div>
            <div className="font-medium">{fmtDate(inspection.visit?.scheduledDate)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Technician</div>
            <div className="font-medium truncate">{inspection.technician?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Inspected</div>
            <div className="font-medium">{fmtDateTime(inspection.inspectedAt)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Inspection Workflow (per visit)
// ============================================================
function InspectionWorkflow({ visitId }: { visitId: string }) {
  const { setInspectVisit, setView } = useNav()
  const [formTarget, setFormTarget] = useState<Equipment | null>(null)
  const [detailTarget, setDetailTarget] = useState<Inspection | null>(null)
  const [completing, setCompleting] = useState(false)

  const { data, isLoading, refetch, isFetching } = useApi<VisitDetail>(
    ["visits", visitId, "inspect"],
    `/api/visits/${visitId}`,
  )

  const technicians = useApi<User[]>(["technicians"], "/api/technicians")
  const createMut = useCreate<Inspection>("/api/inspections", [
    ["inspections"],
    ["visits", visitId, "inspect"],
    ["equipment"],
  ])

  const visit = data
  const equipmentList = visit?.contract?.equipment ?? []
  const inspections = visit?.inspections ?? []

  const inspectedIds = useMemo(
    () => new Set(inspections.map((i) => i.equipmentId)),
    [inspections],
  )
  const inspectedCount = equipmentList.filter((e) => inspectedIds.has(e.id)).length
  const totalCount = equipmentList.length
  const progressPct = totalCount === 0 ? 0 : Math.round((inspectedCount / totalCount) * 100)
  const allInspected = totalCount > 0 && inspectedCount === totalCount

  const handleBack = () => {
    setInspectVisit(null)
    setView("visits")
  }

  const handleCompleteVisit = async () => {
    setCompleting(true)
    try {
      await apiPut(`/api/visits/${visitId}`, { status: "COMPLETED" })
      toast.success("Visit completed — next visit scheduled automatically")
      await refetch()
      setInspectVisit(null)
      setView("visits")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to complete visit")
    } finally {
      setCompleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
        <Card className="animate-pulse"><CardContent className="p-6 h-40" /></Card>
        <Card className="animate-pulse"><CardContent className="p-6 h-32" /></Card>
      </div>
    )
  }

  if (!visit) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to visits
        </Button>
        <EmptyState title="Visit not found" description="This visit may have been deleted." icon={AlertTriangle} />
      </div>
    )
  }

  const techList = technicians.data ?? []

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={handleBack} className="h-10">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to visits
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-10"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <SectionTitle
        title="Field Inspection"
        description="Inspect each piece of equipment, then complete the visit"
      />

      {/* Visit header card */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Building2 className="h-5 w-5 text-teal-600 shrink-0" />
                  <h3 className="text-lg font-semibold truncate">{visit.customer?.name ?? "—"}</h3>
                  <StatusBadge status={visit.status} label={VISIT_STATUS[visit.status] ?? visit.status} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {visit.contract?.contractNumber ?? "No contract"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {fmtDate(visit.scheduledDate)}
                    {visit.scheduledTime ? ` · ${visit.scheduledTime}` : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3.5 w-3.5" />
                    {visit.technician?.name ?? "Unassigned"}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5" />
                    {VISIT_TYPE[visit.visitType] ?? visit.visitType}
                  </span>
                </div>
              </div>
            </div>

            {visit.notes && (
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <span className="font-medium">Notes: </span>{visit.notes}
              </div>
            )}

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4 text-teal-600" />
                  Inspection progress
                </span>
                <span className={cn("font-semibold", allInspected ? "text-emerald-600" : "text-amber-600")}>
                  {inspectedCount} of {totalCount} equipment inspected
                </span>
              </div>
              <Progress value={progressPct} className="h-2.5" />
              <p className="text-xs text-muted-foreground">
                {allInspected
                  ? "All equipment inspected — ready to complete the visit."
                  : totalCount === 0
                  ? "No equipment assigned to this contract yet."
                  : `${totalCount - inspectedCount} remaining to inspect.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Equipment list */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Equipment to Inspect</h3>
        {equipmentList.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                title="No equipment on this contract"
                description="Add equipment to the contract before inspecting."
                icon={Package}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
            {equipmentList.map((eq) => {
              const inspected = inspectedIds.has(eq.id)
              const inspection = inspections.find((i) => i.equipmentId === eq.id)
              return (
                <EquipmentInspectCard
                  key={eq.id}
                  equipment={eq}
                  inspected={inspected}
                  inspection={inspection}
                  onInspect={() => setFormTarget(eq)}
                  onView={() => inspection && setDetailTarget(inspection)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Complete visit */}
      <Card className={cn(allInspected && "border-emerald-300 dark:border-emerald-800")}>
        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {allInspected ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <CircleDashed className="h-5 w-5 text-amber-600" />
              )}
              <h4 className="font-semibold">
                {allInspected ? "Ready to complete visit" : "Visit in progress"}
              </h4>
            </div>
            <p className="text-sm text-muted-foreground">
              {allInspected
                ? "All equipment has been inspected. Completing the visit will schedule the next one automatically."
                : `Completing now will mark the visit done with ${inspectedCount}/${totalCount} equipment inspected.`}
            </p>
          </div>
          <Button
            size="lg"
            disabled={completing || inspectedCount === 0}
            onClick={handleCompleteVisit}
            className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto"
          >
            {completing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Completing…
              </>
            ) : (
              <>
                <CircleCheckBig className="h-4 w-4 mr-2" /> Complete Visit
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Form dialog */}
      <InspectionFormDialog
        open={!!formTarget}
        onOpenChange={(o) => !o && setFormTarget(null)}
        equipment={formTarget}
        visit={visit}
        technicians={techList}
        defaultTechnicianId={visit.technicianId ?? ""}
        submitting={createMut.isPending}
        onSubmit={async (payload) => {
          await apiPost("/api/inspections", payload)
          toast.success("Inspection saved — equipment status updated")
          createMut.reset()
          await refetch()
          setFormTarget(null)
        }}
      />

      {/* Detail dialog (for already-inspected equipment) */}
      <InspectionDetailDialog
        inspection={detailTarget}
        onOpenChange={(o) => !o && setDetailTarget(null)}
      />
    </div>
  )
}

// ============================================================
// Equipment Inspect Card
// ============================================================
function EquipmentInspectCard({
  equipment, inspected, inspection, onInspect, onView,
}: {
  equipment: Equipment & { category?: EquipmentCategory; location?: CustomerLocation }
  inspected: boolean
  inspection?: Inspection
  onInspect: () => void
  onView: () => void
}) {
  const usesBatteries = !!equipment.category?.usesBatteries
  return (
    <Card className={cn("transition-all", inspected && "border-emerald-200 dark:border-emerald-900/60")}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold truncate">{equipment.name}</h4>
              {inspected && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" /> Inspected
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
              <Hash className="h-3 w-3" /> {equipment.serialNumber}
            </div>
          </div>
          {inspected && inspection && (
            <StatusBadge
              status={inspection.result}
              label={INSPECTION_RESULT[inspection.result] ?? inspection.result}
            />
          )}
        </div>

        <Separator className="my-3" />

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Category</div>
            <div className="font-medium truncate">{equipment.category?.name ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Location</div>
            <div className="font-medium truncate flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {equipment.location?.name ?? "—"}
              {equipment.location?.floor ? ` · ${equipment.location.floor}` : ""}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Operational status</div>
            <div className="font-medium">
              <StatusBadge
                status={equipment.operationalStatus}
                label={OPERATIONAL_STATUS[equipment.operationalStatus] ?? equipment.operationalStatus}
              />
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Installation</div>
            <div className="font-medium">
              <StatusBadge
                status={equipment.installationStatus}
                label={INSTALLATION_STATUS[equipment.installationStatus] ?? equipment.installationStatus}
              />
            </div>
          </div>
          {usesBatteries && (
            <div className="col-span-2">
              <div className="text-muted-foreground">Battery level</div>
              <div className="flex items-center gap-2 mt-0.5">
                <BatteryLevelPill level={equipment.currentBatteryLevel} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          {inspected ? (
            <Button variant="outline" className="flex-1 h-11" onClick={onView}>
              <Eye className="h-4 w-4 mr-2" /> View inspection
            </Button>
          ) : (
            <Button className="flex-1 h-11 bg-teal-600 hover:bg-teal-700" onClick={onInspect}>
              <ClipboardCheck className="h-4 w-4 mr-2" /> Inspect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Battery Level Pill
// ============================================================
function BatteryLevelPill({ level }: { level: string }) {
  const colors: Record<string, string> = {
    FULL: "bg-emerald-500",
    SEVENTY_FIVE: "bg-emerald-400",
    FIFTY: "bg-amber-500",
    TWENTY_FIVE: "bg-orange-500",
    EMPTY: "bg-rose-500",
    UNKNOWN: "bg-zinc-400",
    NA: "bg-zinc-300",
  }
  const label = BATTERY_LEVEL[level] ?? level
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
      <Battery className="h-3.5 w-3.5 text-muted-foreground" />
      <span className={cn("h-2 w-2 rounded-full", colors[level] ?? "bg-zinc-400")} />
      {label}
    </span>
  )
}

// ============================================================
// Inspection Form Dialog
// ============================================================
const EMPTY_FORM: FormState = {
  equipmentPresent: "true",
  correctlyInstalled: "true",
  correctlyPositioned: "true",
  workingProperly: "true",
  equipmentClean: "true",
  batteryAvailable: "YES",
  batteryLevel: "FULL",
  batteryReplacementRequired: false,
  consumablesAvailable: "true",
  maintenanceRequired: false,
  equipmentDamaged: false,
  result: "",
  comments: "",
  technicianId: "",
  photos: [],
}

function InspectionFormDialog({
  open, onOpenChange, equipment, visit, technicians, defaultTechnicianId,
  submitting, onSubmit,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  equipment: Equipment | null
  visit: Visit
  technicians: User[]
  defaultTechnicianId: string
  submitting: boolean
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [photoInput, setPhotoInput] = useState<PhotoDraft>({
    imageUrl: "", type: "GENERAL", caption: "",
  })

  // Sync form when dialog opens
  const [syncedEqId, setSyncedEqId] = useState<string | null | undefined>(undefined)
  const eqId = equipment?.id ?? null
  if (open && syncedEqId !== eqId) {
    setForm({ ...EMPTY_FORM, technicianId: defaultTechnicianId })
    setErrors({})
    setPhotoInput({ imageUrl: "", type: "GENERAL", caption: "" })
    setSyncedEqId(eqId)
  }
  if (!open && syncedEqId !== undefined) {
    setSyncedEqId(undefined)
  }

  const usesBatteries = !!equipment?.category?.usesBatteries

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k as string]: undefined, result: undefined }))
  }

  const addPhoto = () => {
    if (!photoInput.imageUrl.trim()) {
      toast.error("Enter an image URL first")
      return
    }
    setForm((f) => ({ ...f, photos: [...f.photos, { ...photoInput, imageUrl: photoInput.imageUrl.trim() }] }))
    setPhotoInput({ imageUrl: "", type: "GENERAL", caption: "" })
  }

  const removePhoto = (idx: number) => {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }))
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.result) e.result = "Please select an inspection result"
    if (usesBatteries) {
      if (!form.batteryAvailable) e.batteryAvailable = "Required"
      if (!form.batteryLevel) e.batteryLevel = "Required"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!equipment) return
    if (!validate()) {
      toast.error("Please complete the required fields")
      return
    }
    const payload = {
      visitId: visit.id,
      equipmentId: equipment.id,
      technicianId: form.technicianId || undefined,
      equipmentPresent: form.equipmentPresent === "true",
      correctlyInstalled: form.correctlyInstalled === "true",
      correctlyPositioned: form.correctlyPositioned === "true",
      workingProperly: form.workingProperly === "true",
      equipmentClean: form.equipmentClean === "true",
      batteryAvailable: usesBatteries ? form.batteryAvailable : "N/A",
      batteryLevel: usesBatteries ? form.batteryLevel : "NA",
      batteryReplacementRequired: usesBatteries ? form.batteryReplacementRequired : false,
      consumablesAvailable: form.consumablesAvailable === "true",
      maintenanceRequired: form.maintenanceRequired,
      equipmentDamaged: form.equipmentDamaged,
      result: form.result,
      comments: form.comments.trim() || undefined,
      photos: form.photos,
    }
    await onSubmit(payload)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-teal-600" />
            Inspect: {equipment?.name ?? "Equipment"}
          </DialogTitle>
          <DialogDescription>
            Complete the checklist below. The equipment&apos;s operational status will update automatically based on your answers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Equipment info */}
          {equipment && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Serial: </span>
                  <span className="font-medium">{equipment.serialNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Category: </span>
                  <span className="font-medium">{equipment.category?.name ?? "—"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Technician */}
          <div className="space-y-1.5">
            <Label>Technician</Label>
            <Select value={form.technicianId} onValueChange={(v) => set("technicianId", v)}>
              <SelectTrigger className="w-full h-11">
                <SelectValue placeholder="Assign technician" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Checklist */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <ListChecks className="h-4 w-4 text-teal-600" /> Inspection Checklist
            </h4>

            <YesNoQuestion
              label="Equipment present?"
              value={form.equipmentPresent}
              onChange={(v) => set("equipmentPresent", v)}
            />
            <YesNoQuestion
              label="Correctly installed?"
              value={form.correctlyInstalled}
              onChange={(v) => set("correctlyInstalled", v)}
            />
            <YesNoQuestion
              label="Correctly positioned?"
              value={form.correctlyPositioned}
              onChange={(v) => set("correctlyPositioned", v)}
            />
            <YesNoQuestion
              label="Working properly?"
              value={form.workingProperly}
              onChange={(v) => set("workingProperly", v)}
            />
            <YesNoQuestion
              label="Equipment clean?"
              value={form.equipmentClean}
              onChange={(v) => set("equipmentClean", v)}
            />
          </div>

          {/* Battery section */}
          {usesBatteries && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Battery className="h-4 w-4 text-amber-600" /> Battery
                </h4>

                <div className="space-y-2">
                  <Label className="text-sm">Battery available?</Label>
                  <PillRadioGroup
                    value={form.batteryAvailable}
                    onValueChange={(v) => set("batteryAvailable", v)}
                    options={[
                      { value: "YES", label: "Yes", tone: "yes" },
                      { value: "NO", label: "No", tone: "no" },
                      { value: "N/A", label: "N/A", tone: "neutral" },
                    ]}
                  />
                  {errors.batteryAvailable && (
                    <p className="text-xs text-rose-500">{errors.batteryAvailable}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">Battery level</Label>
                  <Select
                    value={form.batteryLevel}
                    onValueChange={(v) => set("batteryLevel", v)}
                  >
                    <SelectTrigger className="w-full h-11">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BATTERY_LEVEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.batteryLevel && (
                    <p className="text-xs text-rose-500">{errors.batteryLevel}</p>
                  )}
                </div>

                <label
                  htmlFor="bat-replace"
                  className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30 min-h-[44px]"
                >
                  <Checkbox
                    id="bat-replace"
                    checked={form.batteryReplacementRequired}
                    onCheckedChange={(v) => set("batteryReplacementRequired", v === true)}
                  />
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <BatteryWarning className="h-4 w-4 text-amber-600" />
                    Battery replacement required
                  </span>
                </label>
              </div>
            </>
          )}

          {/* Consumables & flags */}
          <Separator />
          <div className="space-y-4">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Package className="h-4 w-4 text-violet-600" /> Consumables & Condition
            </h4>

            <YesNoQuestion
              label="Consumables available?"
              value={form.consumablesAvailable}
              onChange={(v) => set("consumablesAvailable", v)}
            />

            <label
              htmlFor="maint-req"
              className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30 min-h-[44px]"
            >
              <Checkbox
                id="maint-req"
                checked={form.maintenanceRequired}
                onCheckedChange={(v) => set("maintenanceRequired", v === true)}
              />
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-orange-600" />
                Maintenance required
              </span>
            </label>

            <label
              htmlFor="eq-damaged"
              className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30 min-h-[44px]"
            >
              <Checkbox
                id="eq-damaged"
                checked={form.equipmentDamaged}
                onCheckedChange={(v) => set("equipmentDamaged", v === true)}
              />
              <span className="text-sm font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Equipment damaged
              </span>
            </label>
          </div>

          {/* Result */}
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">
              Inspection result <span className="text-rose-500">*</span>
            </Label>
            <Select value={form.result} onValueChange={(v) => set("result", v)}>
              <SelectTrigger className={cn("w-full h-11", errors.result && "border-rose-500")}>
                <SelectValue placeholder="Select result" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INSPECTION_RESULT).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.result && <p className="text-xs text-rose-500">{errors.result}</p>}
          </div>

          {/* Comments */}
          <div className="space-y-1.5">
            <Label htmlFor="comments" className="text-sm">Comments / observations</Label>
            <Textarea
              id="comments"
              rows={3}
              placeholder="Add any additional notes, observations or recommended actions…"
              value={form.comments}
              onChange={(e) => set("comments", e.target.value)}
              className="resize-y"
            />
          </div>

          {/* Photos */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-teal-600" /> Photos
            </Label>

            {/* Existing photos */}
            {form.photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {form.photos.map((p, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
                    <PhotoThumb url={p.imageUrl} caption={p.caption} type={p.type} />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 rounded-full bg-rose-600 text-white p-1 shadow-md hover:bg-rose-700"
                      aria-label="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-0.5 px-1 text-center">
                      {p.type}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Add photo form */}
            <div className="rounded-md border p-3 space-y-2 bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="Image URL"
                  value={photoInput.imageUrl}
                  onChange={(e) => setPhotoInput((p) => ({ ...p, imageUrl: e.target.value }))}
                  className="h-10"
                />
                <Select
                  value={photoInput.type}
                  onValueChange={(v) => setPhotoInput((p) => ({ ...p, type: v as PhotoDraft["type"] }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEFORE">Before</SelectItem>
                    <SelectItem value="AFTER">After</SelectItem>
                    <SelectItem value="GENERAL">General</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addPhoto} className="h-10">
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <Input
                placeholder="Caption (optional)"
                value={photoInput.caption}
                onChange={(e) => setPhotoInput((p) => ({ ...p, caption: e.target.value }))}
                className="h-10"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11" disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="h-11 bg-teal-600 hover:bg-teal-700"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Submit Inspection</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Yes/No Question component
// ============================================================
function YesNoQuestion({
  label, value, onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <PillRadioGroup
        value={value}
        onValueChange={onChange}
        options={[
          { value: "true", label: "Yes", tone: "yes" },
          { value: "false", label: "No", tone: "no" },
        ]}
      />
    </div>
  )
}

// ============================================================
// Pill-style Radio Group
// ============================================================
function PillRadioGroup({
  value, onValueChange, options,
}: {
  value: string
  onValueChange: (v: string) => void
  options: { value: string; label: string; tone?: "yes" | "no" | "neutral" }[]
}) {
  const cols = options.length === 2 ? "grid-cols-2" : "grid-cols-3"
  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      className={cn("grid gap-2", cols)}
    >
      {options.map((opt) => {
        const active = value === opt.value
        const toneCls = active
          ? opt.tone === "yes"
            ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            : opt.tone === "no"
            ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
            : "border-zinc-500 bg-zinc-100 text-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-200"
          : "border-input bg-transparent hover:bg-muted/50 text-foreground"
        return (
          <Label
            key={opt.value}
            htmlFor={`pill-${opt.value}`}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors min-h-[44px] select-none",
              toneCls,
            )}
          >
            <RadioGroupItem
              id={`pill-${opt.value}`}
              value={opt.value}
              className="sr-only"
            />
            {opt.tone === "yes" && active && <CheckCircle className="h-4 w-4" />}
            {opt.tone === "no" && active && <CircleX className="h-4 w-4" />}
            {opt.label}
          </Label>
        )
      })}
    </RadioGroup>
  )
}

// ============================================================
// Photo Thumbnail
// ============================================================
function PhotoThumb({ url, caption, type }: { url: string; caption?: string; type?: string }) {
  const [broken, setBroken] = useState(false)
  if (broken || !url) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/60">
        <ImageIcon className="h-6 w-6" />
        {type && <span className="text-[10px] mt-1">{type}</span>}
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={caption ?? "inspection photo"}
      onError={() => setBroken(true)}
      className="w-full h-full object-cover"
    />
  )
}

// ============================================================
// Inspection Detail Dialog
// ============================================================
function InspectionDetailDialog({
  inspection, onOpenChange,
}: {
  inspection: Inspection | null
  onOpenChange: (o: boolean) => void
}) {
  const open = !!inspection
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        {inspection && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                <ClipboardCheck className="h-5 w-5 text-teal-600" />
                Inspection Details
                <StatusBadge
                  status={inspection.result}
                  label={INSPECTION_RESULT[inspection.result] ?? inspection.result}
                />
              </DialogTitle>
              <DialogDescription>
                Inspected on {fmtDateTime(inspection.inspectedAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {/* Equipment & visit info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoBlock
                  title="Equipment"
                  icon={<Package className="h-4 w-4 text-teal-600" />}
                  rows={[
                    ["Name", inspection.equipment?.name ?? "—"],
                    ["Serial", inspection.equipment?.serialNumber ?? "—"],
                    ["Category", inspection.equipment?.category?.name ?? "—"],
                  ]}
                />
                <InfoBlock
                  title="Visit"
                  icon={<FileText className="h-4 w-4 text-violet-600" />}
                  rows={[
                    ["Customer", inspection.visit?.customer?.name ?? "—"],
                    ["Contract", inspection.visit?.contract?.contractNumber ?? "—"],
                    ["Scheduled", fmtDate(inspection.visit?.scheduledDate)],
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoBlock
                  title="Technician"
                  icon={<UserIcon className="h-4 w-4 text-amber-600" />}
                  rows={[["Name", inspection.technician?.name ?? "—"]]}
                />
                <InfoBlock
                  title="Timing"
                  icon={<Calendar className="h-4 w-4 text-sky-600" />}
                  rows={[
                    ["Inspected at", fmtDateTime(inspection.inspectedAt)],
                  ]}
                />
              </div>

              <Separator />

              {/* Checklist answers */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4 text-teal-600" /> Checklist Answers
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <ChecklistRow label="Equipment present" value={inspection.equipmentPresent} />
                  <ChecklistRow label="Correctly installed" value={inspection.correctlyInstalled} />
                  <ChecklistRow label="Correctly positioned" value={inspection.correctlyPositioned} />
                  <ChecklistRow label="Working properly" value={inspection.workingProperly} />
                  <ChecklistRow label="Equipment clean" value={inspection.equipmentClean} />
                  <ChecklistRow label="Consumables available" value={inspection.consumablesAvailable} />
                </div>
              </div>

              {/* Battery info */}
              {(inspection.batteryAvailable && inspection.batteryAvailable !== "N/A") ||
                inspection.batteryLevel ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Battery className="h-4 w-4 text-amber-600" /> Battery
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <ChecklistRow
                      label="Battery available"
                      value={
                        inspection.batteryAvailable === "YES"
                          ? true
                          : inspection.batteryAvailable === "NO"
                          ? false
                          : null
                      }
                      naLabel={inspection.batteryAvailable === "N/A" ? "N/A" : undefined}
                    />
                    <div className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">Battery level</div>
                      <div className="font-medium mt-1">
                        <BatteryLevelPill level={inspection.batteryLevel} />
                      </div>
                    </div>
                    <ChecklistRow
                      label="Replacement required"
                      value={inspection.batteryReplacementRequired}
                    />
                  </div>
                </div>
              ) : null}

              {/* Flags */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-orange-600" /> Flags
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <ChecklistRow label="Maintenance required" value={inspection.maintenanceRequired} />
                  <ChecklistRow label="Equipment damaged" value={inspection.equipmentDamaged} />
                </div>
              </div>

              {/* Comments */}
              {inspection.comments && (
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">Comments</h4>
                  <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                    {inspection.comments}
                  </div>
                </div>
              )}

              {/* Photos */}
              {inspection.photos && inspection.photos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-teal-600" /> Photos ({inspection.photos.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {inspection.photos.map((p) => (
                      <div key={p.id} className="space-y-1">
                        <div className="relative aspect-square rounded-md overflow-hidden border bg-muted">
                          <PhotoThumb url={p.imageUrl} caption={p.caption} type={p.type} />
                          <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] py-0.5 px-1 text-center">
                            {p.type}
                          </span>
                        </div>
                        {p.caption && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{p.caption}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11">
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Info Block (for detail dialog)
// ============================================================
function InfoBlock({
  title, icon, rows,
}: {
  title: string
  icon: React.ReactNode
  rows: [string, string][]
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <h5 className="text-sm font-semibold">{title}</h5>
      </div>
      <dl className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium text-right truncate">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// ============================================================
// Checklist Row (Yes/No indicator)
// ============================================================
function ChecklistRow({
  label, value, naLabel,
}: {
  label: string
  value: boolean | null
  naLabel?: string
}) {
  let icon: React.ReactNode
  let tone: string
  if (value === null || naLabel) {
    icon = <CircleAlert className="h-4 w-4 text-zinc-400" />
    tone = "text-zinc-600 dark:text-zinc-400"
  } else if (value) {
    icon = <CircleCheckBig className="h-4 w-4 text-emerald-600" />
    tone = "text-emerald-700 dark:text-emerald-300"
  } else {
    icon = <CircleX className="h-4 w-4 text-rose-600" />
    tone = "text-rose-700 dark:text-rose-300"
  }
  const answer = naLabel ?? (value === null ? "N/A" : value ? "Yes" : "No")
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border p-3">
      <span className="text-sm">{label}</span>
      <span className={cn("flex items-center gap-1.5 text-sm font-medium", tone)}>
        {icon}
        {answer}
      </span>
    </div>
  )
}
