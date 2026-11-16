"use client"

import { useMemo, useState } from "react"
import {
  AlertTriangle, RefreshCw, Clock, Wrench, CheckCircle2, ArrowUpCircle,
  CircleDashed, ChevronRight, MapPin, User as UserIcon, Calendar,
  FileText, ShieldAlert, History as HistoryIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDate, fmtDateTime,
} from "@/components/shared"
import type { Defect, Location } from "@/lib/types"
import { DEFECT_STATUS, SEVERITY_LABELS } from "@/lib/labels"
import { useNav } from "@/lib/nav-store"
import { useApi } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import { ExportButton } from "@/components/export-button"
import { cn } from "@/lib/utils"

export function DefectsModule() {
  const { can } = usePermissions()
  const { goToLocation } = useNav()
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [severityFilter, setSeverityFilter] = useState<string>("ALL")
  const [locationFilter, setLocationFilter] = useState<string>("ALL")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Defect | null>(null)

  const { data: defects, isLoading, refetch, isFetching } = useApi<Defect[]>(
    ["defects", "list"],
    "/api/defects",
  )
  const { data: locations } = useApi<Location[]>(["locations", "list"], "/api/locations")

  const filtered = useMemo(() => {
    const list = defects ?? []
    return list.filter((d) => {
      if (statusFilter !== "ALL" && d.status !== statusFilter) return false
      if (severityFilter !== "ALL" && d.severity !== severityFilter) return false
      if (locationFilter !== "ALL" && d.locationId !== locationFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !d.title.toLowerCase().includes(q) &&
          !(d.location?.name ?? "").toLowerCase().includes(q) &&
          !(d.responsiblePerson ?? "").toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [defects, statusFilter, severityFilter, locationFilter, search])

  const kpis = useMemo(() => {
    const all = defects ?? []
    return {
      total: all.length,
      open: all.filter((d) => d.status === "OPEN").length,
      inProgress: all.filter((d) => d.status === "IN_PROGRESS").length,
      escalated: all.filter((d) => d.status === "ESCALATED").length,
      resolved: all.filter((d) => d.status === "RESOLVED").length,
    }
  }, [defects])

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Defects & Non-compliance"
        description="Track observed defects and verify their resolution across all facilities"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <ExportButton type="inspections" label="Export" filename={`defects-${new Date().toISOString().split("T")[0]}.csv`} />
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard title="Total" value={kpis.total} icon={AlertTriangle} accent="orange" />
        <KpiCard title="Open" value={kpis.open} icon={Clock} accent="amber" />
        <KpiCard title="In Progress" value={kpis.inProgress} icon={Wrench} accent="violet" />
        <KpiCard title="Escalated" value={kpis.escalated} icon={ArrowUpCircle} accent={kpis.escalated > 0 ? "rose" : "default"} />
        <KpiCard title="Resolved" value={kpis.resolved} icon={CheckCircle2} accent="emerald" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <Input
                placeholder="Title, location, responsible person…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="w-full md:w-44">
              <Label className="text-xs text-muted-foreground">Severity</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All severities</SelectItem>
                  {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-44">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {Object.entries(DEFECT_STATUS).map(([k, v]) => (
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
              title="No defects found"
              description="Adjust your filters — defects are created from inspection non-compliance findings."
              icon={CircleDashed}
            />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-1/3">Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Responsible</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelected(d)}
                    >
                      <TableCell className="font-medium truncate max-w-xs">{d.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.location?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.category?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={d.severity} label={SEVERITY_LABELS[d.severity] ?? d.severity} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {d.responsiblePerson ?? <span className="text-muted-foreground italic">Unassigned</span>}
                      </TableCell>
                      <TableCell className="text-sm">{fmtDate(d.resolutionDeadline)}</TableCell>
                      <TableCell>
                        <StatusBadge status={d.status} label={DEFECT_STATUS[d.status] ?? d.status} />
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

      <DefectDetailDialog
        defect={selected}
        onClose={() => setSelected(null)}
        onJumpLocation={(id) => { setSelected(null); goToLocation(id) }}
        canManage={!!can("defects:view")}
      />
    </div>
  )
}

function DefectDetailDialog({
  defect,
  onClose,
  onJumpLocation,
}: {
  defect: Defect | null
  onClose: () => void
  onJumpLocation: (id: string) => void
  canManage: boolean
}) {
  return (
    <Dialog open={!!defect} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">{defect?.title}</DialogTitle>
          <DialogDescription>
            Defect / non-compliance record — review description, resolution and timeline.
          </DialogDescription>
        </DialogHeader>

        {defect && (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-2">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={defect.severity} label={SEVERITY_LABELS[defect.severity] ?? defect.severity} />
                <StatusBadge status={defect.status} label={DEFECT_STATUS[defect.status] ?? defect.status} />
                {defect.category && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                    {defect.category.name}
                  </span>
                )}
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Description
                </p>
                <p className="text-sm whitespace-pre-wrap">{defect.description}</p>
              </div>

              <Separator />

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3">
                <MetaItem icon={MapPin} label="Location" value={defect.location?.name ?? "—"} />
                <MetaItem icon={UserIcon} label="Responsible" value={defect.responsiblePerson ?? "Unassigned"} />
                <MetaItem icon={Calendar} label="Deadline" value={fmtDate(defect.resolutionDeadline)} />
                <MetaItem icon={Calendar} label="Reported" value={fmtDate(defect.createdAt)} />
              </div>

              {/* Resolution notes */}
              {defect.resolutionNotes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Resolution Notes
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{defect.resolutionNotes}</p>
                  </div>
                </>
              )}

              {/* Timeline */}
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide flex items-center gap-1">
                  <HistoryIcon className="h-3 w-3" /> Timeline
                </p>
                <div className="space-y-3">
                  <TimelineItem
                    label="Reported"
                    date={defect.createdAt}
                    done
                  />
                  <TimelineItem
                    label="Resolution Deadline"
                    date={defect.resolutionDeadline}
                    done={!!defect.resolutionDeadline}
                    overdue={!!defect.resolutionDeadline && new Date(defect.resolutionDeadline) < new Date() && defect.status !== "RESOLVED"}
                  />
                  <TimelineItem
                    label="Resolved"
                    date={defect.resolvedAt}
                    done={!!defect.resolvedAt}
                  />
                </div>
              </div>

              {/* Linked inspection */}
              {defect.inspection && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Linked inspection:</span>
                    <span className="font-medium">{defect.inspection.title}</span>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {defect?.locationId && (
            <Button variant="outline" size="sm" onClick={() => onJumpLocation(defect.locationId!)}>
              <MapPin className="h-4 w-4 mr-2" />
              View Location
            </Button>
          )}
          <Button size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MetaItem({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

function TimelineItem({
  label,
  date,
  done,
  overdue,
}: {
  label: string
  date?: string
  done?: boolean
  overdue?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full border-2",
          overdue
            ? "border-rose-500 bg-rose-100 text-rose-600"
            : done
            ? "border-emerald-500 bg-emerald-100 text-emerald-600"
            : "border-muted bg-muted/50 text-muted-foreground"
        )}
      >
        {done && !overdue && <CheckCircle2 className="h-3.5 w-3.5" />}
        {overdue && <AlertTriangle className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {date ? fmtDateTime(date) : "—"}
          {overdue && " · Overdue"}
        </p>
      </div>
    </div>
  )
}
