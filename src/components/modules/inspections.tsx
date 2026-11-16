"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ClipboardCheck, CheckCircle2, Clock, AlertTriangle, RefreshCw,
  ArrowLeft, Eye, Camera, MapPin, User as UserIcon, Calendar,
  Building2, FileText, ChevronRight, Loader2, Plus,
  CheckCircle, ListChecks, ShieldAlert, History as HistoryIcon,
  Image as ImageIcon, Save, Send, ArrowRightCircle, XCircle,
  ThumbsUp, RotateCcw, MessageSquare, AlertCircle, FileCheck2,
  CircleDashed, ClipboardList, Lock,
} from "lucide-react"
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
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDate, fmtDateTime,
} from "@/components/shared"
import type {
  Inspection, InspectionItem, InspectionTemplate, Location, User,
} from "@/lib/types"
import {
  INSPECTION_STATUS, RESPONSE_LABELS, SEVERITY_LABELS,
  complianceColor, complianceBg,
} from "@/lib/labels"
import { useNav } from "@/lib/nav-store"
import { useApi, useCreate, apiPost, apiPut } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import { cn } from "@/lib/utils"

// ============================================================
// Module entrypoint — picks view based on nav state
// ============================================================

export function InspectionsModule() {
  const { selectedInspectionId, inspectMode } = useNav()

  if (inspectMode === "create") return <CreateInspectionForm />
  if (selectedInspectionId && inspectMode === "inspect") return <InspectionForm />
  if (selectedInspectionId) return <InspectionDetail />
  return <InspectionsList />
}

// ============================================================
// LIST VIEW
// ============================================================

function InspectionsList() {
  const { can } = usePermissions()
  const { goToInspection, goToCreateInspection } = useNav()
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [locationFilter, setLocationFilter] = useState<string>("ALL")
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const { data: inspections, isLoading, refetch, isFetching } = useApi<Inspection[]>(
    ["inspections", "list"],
    "/api/inspections",
  )
  const { data: locations } = useApi<Location[]>(["locations", "list"], "/api/locations")

  const filtered = useMemo(() => {
    const list = inspections ?? []
    return list.filter((i) => {
      if (statusFilter !== "ALL" && i.status !== statusFilter) return false
      if (locationFilter !== "ALL" && i.locationId !== locationFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !i.title.toLowerCase().includes(q) &&
          !(i.location?.name ?? "").toLowerCase().includes(q) &&
          !(i.inspector?.name ?? "").toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [inspections, statusFilter, locationFilter, search])

  const kpis = useMemo(() => {
    const all = inspections ?? []
    return {
      total: all.length,
      pending: all.filter((i) => i.status === "PENDING").length,
      inProgress: all.filter((i) => i.status === "IN_PROGRESS").length,
      awaitingReview: all.filter((i) => ["SUBMITTED", "UNDER_REVIEW"].includes(i.status)).length,
      returned: all.filter((i) => i.status === "RETURNED").length,
    }
  }, [inspections])

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Hygiene Inspections"
        description="Create, assign, and track inspections across all facilities"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            {can("inspections:create") && (
              <Button size="sm" onClick={goToCreateInspection}>
                <Plus className="h-4 w-4 mr-2" />
                Create Inspection
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard title="Total" value={kpis.total} icon={ClipboardCheck} accent="teal" />
        <KpiCard title="Pending" value={kpis.pending} icon={Clock} accent="amber" />
        <KpiCard title="In Progress" value={kpis.inProgress} icon={ListChecks} accent="violet" />
        <KpiCard title="Awaiting Review" value={kpis.awaitingReview} icon={FileCheck2} accent="orange" />
        <KpiCard title="Returned" value={kpis.returned} icon={AlertCircle} accent={kpis.returned > 0 ? "rose" : "default"} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <Input
                placeholder="Title, location, inspector…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="w-full md:w-48">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {Object.entries(INSPECTION_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-56">
              <Label className="text-xs text-muted-foreground">Location</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All locations</SelectItem>
                  {(locations ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No inspections found"
              description="Adjust your filters or create a new inspection."
              icon={CircleDashed}
            />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-1/3">Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((i) => (
                    <TableRow
                      key={i.id}
                      onClick={() => goToInspection(i.id)}
                      className="cursor-pointer"
                    >
                      <TableCell className="font-medium max-w-72 truncate">{i.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-40 truncate">{i.location?.name ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground max-w-32 truncate">{i.inspector?.name ?? "Unassigned"}</TableCell>
                      <TableCell className="text-muted-foreground">{fmtDate(i.scheduledDate)}</TableCell>
                      <TableCell><StatusBadge status={i.status} /></TableCell>
                      <TableCell className="text-right">
                        {typeof i.compliancePercent === "number" ? (
                          <span className={cn("font-semibold tabular-nums", complianceColor(i.compliancePercent))}>
                            {i.compliancePercent}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick create dialog kept for legacy entry points — primary CTA is goToCreateInspection */}
      <CreateInspectionDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}

// ============================================================
// CREATE INSPECTION DIALOG
// ============================================================

function CreateInspectionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <CreateInspectionFormBody
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

// Full-page create form (inspectMode === "create")
function CreateInspectionForm() {
  const { selectInspection, setInspectMode } = useNav()
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-teal-600" />
            Create New Inspection
          </CardTitle>
          <CardDescription>Schedule a new hygiene inspection against a template.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateInspectionFormBody
            onDone={() => {
              selectInspection(null)
              setInspectMode(null)
            }}
            embedded
          />
        </CardContent>
      </Card>
    </div>
  )
}

function CreateInspectionFormBody({ onDone, embedded }: { onDone: () => void; embedded?: boolean }) {
  const { goToInspection } = useNav()
  const [title, setTitle] = useState("")
  const [templateId, setTemplateId] = useState("")
  const [locationId, setLocationId] = useState("")
  const [inspectorId, setInspectorId] = useState("NONE")
  const [scheduledDate, setScheduledDate] = useState("")

  const { data: templates } = useApi<InspectionTemplate[]>(["templates", "list"], "/api/templates")
  const { data: locations } = useApi<Location[]>(["locations", "list"], "/api/locations")
  const { data: users } = useApi<User[]>(["users", "list"], "/api/users")
  const inspectors = (users ?? []).filter((u) => u.role === "INSPECTOR" && u.active)

  const create = useCreate<Inspection>("/api/inspections", [["inspections", "list"], ["dashboard"]])

  const submit = async () => {
    if (!title || !templateId || !locationId || !scheduledDate) {
      toast.error("Please fill in all required fields")
      return
    }
    try {
      const created = await create.mutateAsync({
        title,
        templateId,
        locationId,
        inspectorId: inspectorId === "NONE" ? null : inspectorId,
        scheduledDate: new Date(scheduledDate).toISOString(),
      } as Partial<Inspection>)
      onDone()
      if (created?.id) goToInspection(created.id)
    } catch {
      // toast handled by useCreate
    }
  }

  return (
    <div className={embedded ? "" : "space-y-4"}>
      {!embedded && (
        <DialogHeader>
          <DialogTitle>Create New Inspection</DialogTitle>
          <DialogDescription>Schedule a new hygiene inspection.</DialogDescription>
        </DialogHeader>
      )}
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Inspection Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q4 Kitchen Hygiene Inspection"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="template">Template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger id="template" className="mt-1 w-full">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {(templates ?? []).filter((t) => t.isActive).map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger id="location" className="mt-1 w-full">
              <SelectValue placeholder="Select a facility" />
            </SelectTrigger>
            <SelectContent>
              {(locations ?? []).map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="inspector">Assign Inspector (optional)</Label>
          <Select value={inspectorId} onValueChange={setInspectorId}>
            <SelectTrigger id="inspector" className="mt-1 w-full">
              <SelectValue placeholder="Leave unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">Leave unassigned</SelectItem>
              {inspectors.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="scheduledDate">Scheduled Date</Label>
          <Input
            id="scheduledDate"
            type="datetime-local"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {!embedded && (
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDone}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      )}
      {embedded && (
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onDone}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Inspection
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================================
// INSPECTION DETAIL VIEW
// ============================================================

function InspectionDetail() {
  const { selectedInspectionId, selectInspection } = useNav()
  const { can, role } = usePermissions()
  const { goToInspect } = useNav()

  const { data: inspection, isLoading, refetch } = useApi<Inspection>(
    ["inspections", "detail", selectedInspectionId ?? ""],
    `/api/inspections/${selectedInspectionId}`,
    !!selectedInspectionId,
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => selectInspection(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!inspection) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => selectInspection(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <EmptyState title="Inspection not found" description="It may have been deleted." icon={AlertCircle} />
      </div>
    )
  }

  const isClosed = inspection.status === "CLOSED"

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => selectInspection(null)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to list
      </Button>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">{inspection.title}</h1>
                <StatusBadge status={inspection.status} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {inspection.location?.name ?? "—"}</span>
                <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> {inspection.template?.name ?? "—"}</span>
                <span className="flex items-center gap-1.5"><UserIcon className="h-4 w-4" /> {inspection.inspector?.name ?? "Unassigned"}</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {fmtDate(inspection.scheduledDate)}</span>
              </div>
            </div>
            {typeof inspection.compliancePercent === "number" && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Compliance Score</p>
                <p className={cn("text-3xl font-bold tabular-nums", complianceColor(inspection.compliancePercent))}>
                  {inspection.compliancePercent}%
                </p>
                <div className="mt-1 h-2 w-32 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full", complianceBg(inspection.compliancePercent))} style={{ width: `${inspection.compliancePercent}%` }} />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <InspectionActions inspection={inspection} onChanged={() => refetch()} onInspect={() => goToInspect(inspection.id)} />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview"><Eye className="h-4 w-4 mr-1" /> Overview</TabsTrigger>
          <TabsTrigger value="checklist"><ListChecks className="h-4 w-4 mr-1" /> Checklist ({inspection.items?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="history"><HistoryIcon className="h-4 w-4 mr-1" /> History</TabsTrigger>
          <TabsTrigger value="photos"><ImageIcon className="h-4 w-4 mr-1" /> Photos ({inspection.photos?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab inspection={inspection} />
        </TabsContent>
        <TabsContent value="checklist">
          <ChecklistTab inspection={inspection} readOnly />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab inspection={inspection} />
        </TabsContent>
        <TabsContent value="photos">
          <PhotosTab inspection={inspection} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OverviewTab({ inspection }: { inspection: Inspection }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Inspection Details</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-2 text-sm">
          <Row label="Title" value={inspection.title} />
          <Row label="Status" value={<StatusBadge status={inspection.status} />} />
          <Row label="Template" value={inspection.template?.name ?? "—"} />
          <Row label="Location" value={inspection.location?.name ?? "—"} />
          <Row label="Inspector" value={inspection.inspector?.name ?? "Unassigned"} />
          <Row label="Created by" value={inspection.createdBy?.name ?? "—"} />
          <Row label="Scheduled" value={fmtDate(inspection.scheduledDate)} />
          <Row label="Completed" value={inspection.completedDate ? fmtDate(inspection.completedDate) : "—"} />
          <Row label="Compliance" value={typeof inspection.compliancePercent === "number" ? `${inspection.compliancePercent}%` : "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Review Notes</CardTitle></CardHeader>
        <CardContent className="pt-0 space-y-3 text-sm">
          {inspection.declineReason && (
            <div className="rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-3">
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 mb-1 flex items-center gap-1"><XCircle className="h-3 w-3" /> Decline Reason</p>
              <p className="text-sm">{inspection.declineReason}</p>
            </div>
          )}
          {inspection.reviewComments && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Review Comments</p>
              <p className="text-sm">{inspection.reviewComments}</p>
            </div>
          )}
          {inspection.correctionNotes && (
            <div className="rounded-md bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 p-3">
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-1 flex items-center gap-1"><ClipboardCheck className="h-3 w-3" /> Correction Notes</p>
              <p className="text-sm">{inspection.correctionNotes}</p>
            </div>
          )}
          {!inspection.declineReason && !inspection.reviewComments && !inspection.correctionNotes && (
            <EmptyState title="No review notes" description="Notes will appear here once reviewers add comments." icon={CircleDashed} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b pb-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  )
}

function HistoryTab({ inspection }: { inspection: Inspection }) {
  const history = inspection.history ?? []
  if (history.length === 0) {
    return <EmptyState title="No history" description="Status changes will appear here." icon={HistoryIcon} />
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="max-h-96 overflow-y-auto pr-2">
          <ol className="relative border-l border-muted ml-2 space-y-4">
            {history.map((h) => (
              <li key={h.id} className="ml-4">
                <span className="absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full bg-teal-500 ring-4 ring-background" />
                <div className="flex flex-wrap items-baseline gap-2">
                  <StatusBadge status={h.toStatus} />
                  {h.fromStatus && <span className="text-xs text-muted-foreground">from {INSPECTION_STATUS[h.fromStatus] ?? h.fromStatus}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">{fmtDateTime(h.timestamp)}</span>
                </div>
                {h.user && <p className="text-xs text-muted-foreground mt-0.5">by {h.user.name}</p>}
                {h.comments && <p className="text-sm mt-1 rounded-md bg-muted/50 px-2 py-1">{h.comments}</p>}
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}

function PhotosTab({ inspection }: { inspection: Inspection }) {
  const photos = inspection.photos ?? []
  if (photos.length === 0) {
    return <EmptyState title="No photos" description="Photos attached to this inspection will appear here." icon={Camera} />
  }
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((p) => (
        <Card key={p.id} className="overflow-hidden">
          <div className="aspect-square bg-muted">
            <img src={p.imageUrl} alt={p.caption ?? "Inspection photo"} className="h-full w-full object-cover" />
          </div>
          {p.caption && (
            <CardContent className="p-2">
              <p className="text-xs text-muted-foreground truncate">{p.caption}</p>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}

function ChecklistTab({ inspection, readOnly }: { inspection: Inspection; readOnly?: boolean }) {
  const items = inspection.items ?? []
  if (items.length === 0) {
    return <EmptyState title="No checklist items" description="This inspection has no template items." icon={ListChecks} />
  }
  return (
    <Card>
      <CardContent className="p-0">
        <div className="max-h-[32rem] overflow-y-auto divide-y">
          {items.map((it, i) => (
            <ChecklistItemRow key={it.id} item={it} index={i} readOnly={readOnly} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ChecklistItemRow({ item, index, readOnly }: { item: InspectionItem; index: number; readOnly?: boolean }) {
  const tpl = item.templateItem
  const response = item.response
  const severity = item.severity
  return (
    <div className="p-4">
      <div className="flex items-start gap-2">
        <span className="text-xs font-semibold text-muted-foreground mt-0.5">#{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{tpl?.question ?? "Untitled item"}</p>
          {tpl?.category && <p className="text-xs text-muted-foreground mt-0.5">{tpl.category.name}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {response && <StatusBadge status={response} label={RESPONSE_LABELS[response] ?? response} />}
            {severity && <StatusBadge status={severity} label={SEVERITY_LABELS[severity] ?? severity} />}
          </div>
          {item.comments && <p className="text-xs text-muted-foreground mt-2 rounded-md bg-muted/40 p-2">{item.comments}</p>}
          {item.correctiveRecommendation && (
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1.5">
              <span className="font-semibold">Recommendation:</span> {item.correctiveRecommendation}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// ACTION BUTTONS
// ============================================================

function InspectionActions({
  inspection, onChanged, onInspect,
}: {
  inspection: Inspection
  onChanged: () => void
  onInspect: () => void
}) {
  const { can, role } = usePermissions()
  const [declineOpen, setDeclineOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState("")
  const [reviewComments, setReviewComments] = useState("")
  const [assignInspectorId, setAssignInspectorId] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const { data: users } = useApi<User[]>(["users", "list"], "/api/users")
  const inspectors = (users ?? []).filter((u) => u.role === "INSPECTOR" && u.active)

  const doTransition = async (status: string, extra: Record<string, unknown> = {}) => {
    setSubmitting(true)
    try {
      await apiPut(`/api/inspections/${inspection.id}`, { status, ...extra })
      toast.success(`Inspection ${status.toLowerCase().replace(/_/g, " ")}`)
      onChanged()
    } catch (e) {
      toast.error((e as Error).message || "Action failed")
    } finally {
      setSubmitting(false)
    }
  }

  const status = inspection.status
  const buttons: React.ReactNode[] = []

  if (status === "PENDING" && can("inspections:assign")) {
    buttons.push(
      <Button key="assign" size="sm" onClick={() => setAssignOpen(true)} disabled={submitting}>
        <UserIcon className="h-4 w-4 mr-1" /> Assign Inspector
      </Button>,
    )
  }
  if (status === "ASSIGNED" && can("inspections:accept")) {
    buttons.push(
      <Button key="accept" size="sm" onClick={() => doTransition("ACCEPTED")} disabled={submitting}>
        <ThumbsUp className="h-4 w-4 mr-1" /> Accept
      </Button>,
    )
  }
  if (status === "ASSIGNED" && can("inspections:decline")) {
    buttons.push(
      <Button key="decline" size="sm" variant="outline" onClick={() => setDeclineOpen(true)} disabled={submitting}>
        <XCircle className="h-4 w-4 mr-1" /> Decline
      </Button>,
    )
  }
  if (status === "ACCEPTED" && can("inspections:start")) {
    buttons.push(
      <Button key="start" size="sm" onClick={onInspect} disabled={submitting}>
        <ArrowRightCircle className="h-4 w-4 mr-1" /> Start Inspection
      </Button>,
    )
  }
  if (status === "SUBMITTED" && can("inspections:approve")) {
    buttons.push(
      <Button key="approve" size="sm" onClick={() => doTransition("APPROVED")} disabled={submitting}>
        <CheckCircle className="h-4 w-4 mr-1" /> Approve
      </Button>,
    )
  }
  if (status === "SUBMITTED" && can("inspections:return")) {
    buttons.push(
      <Button key="return" size="sm" variant="outline" onClick={() => setReturnOpen(true)} disabled={submitting}>
        <RotateCcw className="h-4 w-4 mr-1" /> Return
      </Button>,
    )
  }
  if (status === "APPROVED" && can("inspections:close")) {
    buttons.push(
      <Button key="close" size="sm" onClick={() => doTransition("CLOSED")} disabled={submitting}>
        <Lock className="h-4 w-4 mr-1" /> Close
      </Button>,
    )
  }
  if (status === "CLOSED" && can("inspections:reopen") && role === "ADMIN") {
    buttons.push(
      <Button key="reopen" size="sm" variant="outline" onClick={() => doTransition("UNDER_REVIEW")} disabled={submitting}>
        <RotateCcw className="h-4 w-4 mr-1" /> Reopen
      </Button>,
    )
  }
  if (status === "RETURNED" && can("inspections:submit")) {
    buttons.push(
      <Button key="correct" size="sm" onClick={onInspect} disabled={submitting}>
        <ArrowRightCircle className="h-4 w-4 mr-1" /> Correct &amp; Resubmit
      </Button>,
    )
  }

  if (buttons.length === 0) return null

  return (
    <>
      <Card className="bg-muted/30">
        <CardContent className="p-3 flex flex-wrap gap-2">{buttons}</CardContent>
      </Card>

      {/* Assign inspector dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Inspector</DialogTitle>
            <DialogDescription>Choose an inspector to take on this inspection.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="assign-select">Inspector</Label>
            <Select value={assignInspectorId} onValueChange={setAssignInspectorId}>
              <SelectTrigger id="assign-select" className="w-full">
                <SelectValue placeholder="Select inspector" />
              </SelectTrigger>
              <SelectContent>
                {inspectors.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button
              disabled={!assignInspectorId || submitting}
              onClick={async () => {
                await doTransition("ASSIGNED", { inspectorId: assignInspectorId })
                setAssignOpen(false)
                setAssignInspectorId("")
              }}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline dialog */}
      <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this inspection?</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason. The inspection will be returned to the supervisor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder="Reason for declining…"
            className="mt-2 min-h-24"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeclineReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!declineReason || submitting}
              onClick={async () => {
                await doTransition("DECLINED", { declineReason })
                setDeclineOpen(false)
                setDeclineReason("")
              }}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirm Decline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Return dialog */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return for corrections</DialogTitle>
            <DialogDescription>Review comments are required.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reviewComments}
            onChange={(e) => setReviewComments(e.target.value)}
            placeholder="What needs correcting? Be specific…"
            className="min-h-28"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button
              disabled={!reviewComments || submitting}
              onClick={async () => {
                await doTransition("RETURNED", { reviewComments })
                setReturnOpen(false)
                setReviewComments("")
              }}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================
// INSPECTION FORM (inspectMode === "inspect")
// ============================================================

interface FormItemState {
  id: string
  response: string | null
  comments: string
  severity: string | null
  correctiveRecommendation: string
}

function InspectionForm() {
  const { selectedInspectionId, selectInspection, setInspectMode } = useNav()
  const { data: inspection, isLoading, refetch } = useApi<Inspection>(
    ["inspections", "form", selectedInspectionId ?? ""],
    `/api/inspections/${selectedInspectionId}`,
    !!selectedInspectionId,
  )

  const [items, setItems] = useState<FormItemState[]>([])
  const [correctionNotes, setCorrectionNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null)

  // Sync server items into local form state when the inspection loads
  useEffect(() => {
    if (inspection?.items) {
      setItems(
        inspection.items.map((it) => ({
          id: it.id,
          response: it.response ?? null,
          comments: it.comments ?? "",
          severity: it.severity ?? null,
          correctiveRecommendation: it.correctiveRecommendation ?? "",
        })),
      )
    }
    if (inspection?.correctionNotes) setCorrectionNotes(inspection.correctionNotes)
  }, [inspection])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { selectInspection(null); setInspectMode(null) }}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!inspection) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { selectInspection(null); setInspectMode(null) }}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <EmptyState title="Inspection not found" description="It may have been deleted." icon={AlertCircle} />
      </div>
    )
  }

  const completed = items.filter((i) => i.response).length
  const total = items.length
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0

  const update = (id: string, patch: Partial<FormItemState>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  const buildPayload = (status: string) => ({
    status,
    correctionNotes: correctionNotes || null,
    items: items.map((it) => ({
      id: it.id,
      response: it.response,
      comments: it.comments || null,
      severity: it.response === "NON_COMPLIANT" ? it.severity : null,
      correctiveRecommendation: it.correctiveRecommendation || null,
    })),
  })

  const saveDraft = async () => {
    setSaving(true)
    try {
      await apiPut(`/api/inspections/${inspection.id}`, buildPayload("DRAFT"))
      toast.success("Draft saved")
    } catch (e) {
      toast.error((e as Error).message || "Failed to save draft")
    } finally {
      setSaving(false)
    }
  }

  const submit = async () => {
    const unanswered = items.filter((i) => !i.response)
    if (unanswered.length > 0) {
      toast.error(`${unanswered.length} item(s) still need a response`)
      return
    }
    const missingSeverity = items.some((i) => i.response === "NON_COMPLIANT" && !i.severity)
    if (missingSeverity) {
      toast.error("All non-compliant items require a severity")
      return
    }
    setSubmitting(true)
    try {
      await apiPut(`/api/inspections/${inspection.id}`, buildPayload("SUBMITTED"))
      toast.success("Inspection submitted for review")
      selectInspection(null)
      setInspectMode(null)
    } catch (e) {
      toast.error((e as Error).message || "Failed to submit")
    } finally {
      setSubmitting(false)
    }
  }

  const uploadPhoto = async (itemId: string, file: File) => {
    setUploadingItemId(itemId)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: form })
      if (!res.ok) throw new Error("Upload failed")
      const json = await res.json()
      // Persist the photo record against the inspection (and optional item)
      await apiPost(`/api/inspections/${inspection.id}/photos`, {
        itemId,
        imageUrl: json.url,
        caption: file.name,
        type: "EVIDENCE",
      })
      toast.success("Photo uploaded")
      refetch()
    } catch (e) {
      toast.error((e as Error).message || "Photo upload failed")
    } finally {
      setUploadingItemId(null)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => { selectInspection(null); setInspectMode(null) }}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={saveDraft} disabled={saving || submitting}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Draft
          </Button>
          <Button size="sm" onClick={submit} disabled={saving || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Submit for Review
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight">{inspection.title}</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {inspection.location?.name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Template: {inspection.template?.name ?? "—"}</p>
            </div>
            <StatusBadge status={inspection.status} />
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completed} of {total} items</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {inspection.status === "RETURNED" && inspection.reviewComments && (
        <Card className="border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" /> Returned for Corrections
            </p>
            <p className="text-sm mt-1">{inspection.reviewComments}</p>
          </CardContent>
        </Card>
      )}

      {/* Checklist items */}
      <div className="space-y-3">
        {items.length === 0 ? (
          <EmptyState title="No checklist items" description="This template has no items to fill in." icon={ListChecks} />
        ) : (
          items.map((it, idx) => {
            const tpl = inspection.items?.find((x) => x.id === it.id)?.templateItem
            return (
              <Card key={it.id}>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground mr-1.5">#{idx + 1}</span>
                      {tpl?.question ?? "Untitled item"}
                    </p>
                    {tpl?.category && (
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground mt-1.5">
                        {tpl.category.name}
                      </span>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Response</Label>
                    <RadioGroup
                      value={it.response ?? ""}
                      onValueChange={(v) => update(it.id, { response: v })}
                      className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2"
                    >
                      {Object.entries(RESPONSE_LABELS).map(([k, v]) => (
                        <label
                          key={k}
                          className={cn(
                            "flex items-center gap-2 rounded-md border p-2.5 cursor-pointer transition-colors text-sm min-h-11",
                            it.response === k
                              ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30 font-medium"
                              : "hover:bg-accent/40",
                          )}
                        >
                          <RadioGroupItem value={k} id={`${it.id}-${k}`} />
                          <span>{v}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  {it.response === "NON_COMPLIANT" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Severity</Label>
                        <Select
                          value={it.severity ?? ""}
                          onValueChange={(v) => update(it.id, { severity: v })}
                        >
                          <SelectTrigger className="mt-1.5 w-full min-h-11">
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Corrective Recommendation</Label>
                        <Input
                          value={it.correctiveRecommendation}
                          onChange={(e) => update(it.id, { correctiveRecommendation: e.target.value })}
                          placeholder="Recommended corrective action…"
                          className="mt-1.5 min-h-11"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground">Comments</Label>
                    <Textarea
                      value={it.comments}
                      onChange={(e) => update(it.id, { comments: e.target.value })}
                      placeholder="Observations, evidence, context…"
                      className="mt-1.5 min-h-20"
                    />
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Photo Evidence</Label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm cursor-pointer hover:bg-accent/40 transition-colors min-h-11">
                        {uploadingItemId === it.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                        <span>{uploadingItemId === it.id ? "Uploading…" : "Upload Photo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) uploadPhoto(it.id, f)
                            e.target.value = ""
                          }}
                        />
                      </label>
                      {inspection.items?.find((x) => x.id === it.id)?.photos?.map((p) => (
                        <img key={p.id} src={p.imageUrl} alt={p.caption ?? ""} className="h-10 w-10 rounded object-cover border" />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Submission notes */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label htmlFor="correctionNotes" className="text-xs text-muted-foreground">Submission Notes (optional)</Label>
            <Textarea
              id="correctionNotes"
              value={correctionNotes}
              onChange={(e) => setCorrectionNotes(e.target.value)}
              placeholder="Summary or context for the reviewer…"
              className="mt-1.5 min-h-20"
            />
          </div>
          <Separator />
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" onClick={saveDraft} disabled={saving || submitting}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Draft
            </Button>
            <Button onClick={submit} disabled={saving || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit for Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
