"use client"

import { useMemo, useRef, useState } from "react"
import {
  ClipboardList, AlertTriangle, RefreshCw, ArrowLeft, Plus, Loader2,
  ShieldCheck, Clock, CheckCircle2, XCircle, Camera, MapPin, User as UserIcon,
  Calendar, FileText, Image as ImageIcon, ChevronRight, CircleDashed,
  Wrench, X, Eye, Scale,
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
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDate, fmtDateTime,
} from "@/components/shared"
import type { CAPA, CapaEvidence, Location, User, HygieneCategory } from "@/lib/types"
import { CAPA_STATUS, SEVERITY_LABELS, statusColor } from "@/lib/labels"
import { useNav } from "@/lib/nav-store"
import { useApi, useCreate, apiPost, apiPut } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import { ExportButton } from "@/components/export-button"
import { cn } from "@/lib/utils"

// ============================================================
// Module entrypoint — picks list vs detail
// ============================================================

export function CapaModule() {
  const { selectedCapaId } = useNav()
  if (selectedCapaId) return <CapaDetail />
  return <CapaList />
}

// ============================================================
// LIST VIEW
// ============================================================

function CapaList() {
  const { can } = usePermissions()
  const { goToCapa } = useNav()
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [severityFilter, setSeverityFilter] = useState<string>("ALL")
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const { data: capas, isLoading, refetch, isFetching } = useApi<CAPA[]>(
    ["capa", "list"],
    "/api/capa",
  )
  const { data: locations } = useApi<Location[]>(["locations", "list"], "/api/locations")
  const { data: users } = useApi<User[]>(["users", "list"], "/api/users")

  const filtered = useMemo(() => {
    const list = capas ?? []
    return list.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false
      if (severityFilter !== "ALL" && c.severity !== severityFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !c.title.toLowerCase().includes(q) &&
          !(c.location?.name ?? "").toLowerCase().includes(q) &&
          !(c.assignedTo?.name ?? "").toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [capas, statusFilter, severityFilter, search])

  const kpis = useMemo(() => {
    const all = capas ?? []
    return {
      total: all.length,
      open: all.filter((c) => c.status === "OPEN").length,
      inProgress: all.filter((c) => ["ASSIGNED", "IN_PROGRESS", "SUBMITTED_FOR_VERIFICATION"].includes(c.status)).length,
      overdue: all.filter((c) => c.status === "OVERDUE" || (c.targetDate && new Date(c.targetDate) < new Date() && c.status !== "CLOSED" && c.status !== "CANCELLED")).length,
      closed: all.filter((c) => c.status === "CLOSED").length,
    }
  }, [capas])

  return (
    <div className="space-y-6">
      <SectionTitle
        title="CAPA Management"
        description="Corrective and Preventive Actions — track root-cause fixes across all facilities"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <ExportButton type="inspections" label="Export" filename={`capas-${new Date().toISOString().split("T")[0]}.csv`} />
            {can("capa:view") && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create CAPA
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard title="Total" value={kpis.total} icon={ClipboardList} accent="teal" />
        <KpiCard title="Open" value={kpis.open} icon={Clock} accent="amber" />
        <KpiCard title="In Progress" value={kpis.inProgress} icon={Wrench} accent="violet" />
        <KpiCard title="Overdue" value={kpis.overdue} icon={AlertTriangle} accent={kpis.overdue > 0 ? "rose" : "default"} />
        <KpiCard title="Closed" value={kpis.closed} icon={CheckCircle2} accent="emerald" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <Input
                placeholder="Title, location, assignee…"
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
                  {Object.entries(CAPA_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
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
              title="No CAPAs found"
              description="Adjust your filters or create a new corrective action."
              icon={CircleDashed}
            />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-1/3">Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Target Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => goToCapa(c.id)}
                    >
                      <TableCell className="font-medium truncate max-w-xs">{c.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.location?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.severity} label={SEVERITY_LABELS[c.severity] ?? c.severity} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.assignedTo?.name ?? <span className="text-muted-foreground italic">Unassigned</span>}
                      </TableCell>
                      <TableCell className="text-sm">{fmtDate(c.targetDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} label={CAPA_STATUS[c.status] ?? c.status} />
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

      {createOpen && (
        <CreateCapaDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          locations={locations ?? []}
          users={users ?? []}
        />
      )}
    </div>
  )
}

// ============================================================
// CREATE CAPA DIALOG
// ============================================================

function CreateCapaDialog({
  open,
  onOpenChange,
  locations,
  users,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  locations: Location[]
  users: User[]
}) {
  const create = useCreate<CAPA>("/api/capa", [["capa", "list"]])
  const [form, setForm] = useState({
    title: "",
    description: "",
    severity: "MEDIUM",
    correctiveAction: "",
    locationId: "",
    assignedToId: "",
    targetDate: "",
  })

  const submit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required")
      return
    }
    try {
      await create.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim(),
        severity: form.severity,
        correctiveAction: form.correctiveAction || undefined,
        locationId: form.locationId || undefined,
        assignedToId: form.assignedToId || undefined,
        targetDate: form.targetDate || undefined,
      } as Partial<CAPA>)
      setForm({
        title: "", description: "", severity: "MEDIUM",
        correctiveAction: "", locationId: "", assignedToId: "", targetDate: "",
      })
      onOpenChange(false)
    } catch {
      /* handled by mutation */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create CAPA</DialogTitle>
          <DialogDescription>
            Document a corrective and preventive action. Assignee will be notified.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="capa-title">Title *</Label>
            <Input
              id="capa-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Recurring pest control gap in Kitchen B"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="capa-desc">Description *</Label>
            <Textarea
              id="capa-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What is the issue, when was it observed, what is the impact?"
              className="mt-1"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Date</Label>
              <Input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Location</Label>
            <Select value={form.locationId || "NONE"} onValueChange={(v) => setForm({ ...form, locationId: v === "NONE" ? "" : v })}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Not linked" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Not linked</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Assign To</Label>
            <Select value={form.assignedToId || "NONE"} onValueChange={(v) => setForm({ ...form, assignedToId: v === "NONE" ? "" : v })}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} — {u.role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="capa-action">Corrective Action Plan</Label>
            <Textarea
              id="capa-action"
              value={form.correctiveAction}
              onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })}
              placeholder="Step-by-step corrective and preventive measures…"
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create CAPA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// DETAIL VIEW
// ============================================================

function CapaDetail() {
  const { selectedCapaId, selectCapa } = useNav()
  const { can } = usePermissions()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: capa, isLoading, refetch, isFetching } = useApi<CAPA>(
    ["capa", "detail", selectedCapaId],
    `/api/capa/${selectedCapaId}`,
  )

  const [closeOpen, setCloseOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !capa) return
    try {
      setUploading(true)
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) {
        const er = await res.json().catch(() => ({}))
        throw new Error(er.error || "Upload failed")
      }
      const { url } = await res.json()
      await apiPut(`/api/capa/${capa.id}`, {
        action: "addEvidence",
        imageUrl: url,
        caption: file.name,
      })
      toast.success("Evidence uploaded")
      refetch()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => selectCapa(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!capa) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => selectCapa(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <EmptyState title="CAPA not found" icon={CircleDashed} />
      </div>
    )
  }

  const isClosed = capa.status === "CLOSED" || capa.status === "CANCELLED"
  const showCreateButton = can("capa:view")

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => selectCapa(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to CAPAs
        </Button>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={capa.severity} label={SEVERITY_LABELS[capa.severity] ?? capa.severity} />
                <StatusBadge status={capa.status} label={CAPA_STATUS[capa.status] ?? capa.status} />
                {capa.location && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {capa.location.name}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold tracking-tight">{capa.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Created {fmtDate(capa.createdAt)}
                {capa.inspection && <> · Linked inspection: {capa.inspection.title}</>}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {can("capa:addEvidence") && !isClosed && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                  />
                  <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />}
                    Add Evidence
                  </Button>
                </>
              )}
              {can("capa:close") && capa.status !== "CLOSED" && capa.status !== "CANCELLED" && (
                <Button size="sm" onClick={() => setCloseOpen(true)}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Close CAPA
                </Button>
              )}
              {can("capa:cancel") && capa.status !== "CLOSED" && capa.status !== "CANCELLED" && (
                <Button size="sm" variant="destructive" onClick={() => setCancelOpen(true)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-4 md:grid-cols-3">
            <DetailItem icon={UserIcon} label="Assigned To" value={capa.assignedTo?.name ?? "Unassigned"} />
            <DetailItem icon={Calendar} label="Target Date" value={fmtDate(capa.targetDate)} />
            <DetailItem icon={ShieldCheck} label="Closed By" value={capa.closedBy?.name ?? "—"} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Description & corrective action */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Description
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm whitespace-pre-wrap">{capa.description}</p>
            {capa.correctiveAction && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Corrective Action Plan</p>
                  <p className="text-sm whitespace-pre-wrap">{capa.correctiveAction}</p>
                </div>
              </>
            )}
            {capa.verificationComments && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide flex items-center gap-1">
                    <Scale className="h-3 w-3" /> Verification Comments
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{capa.verificationComments}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Meta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <MetaRow label="Category" value={capa.category?.name ?? "—"} />
            <MetaRow label="Location" value={capa.location?.name ?? "—"} />
            <MetaRow label="Assignee" value={capa.assignedTo?.email ?? "—"} />
            <MetaRow label="Closure Date" value={fmtDate(capa.closureDate)} />
          </CardContent>
        </Card>
      </div>

      {/* Evidence gallery */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            Evidence Gallery
            {(capa.evidence?.length ?? 0) > 0 && (
              <span className="text-xs text-muted-foreground">({capa.evidence!.length})</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(capa.evidence?.length ?? 0) === 0 ? (
            <EmptyState
              title="No evidence uploaded"
              description={can("capa:addEvidence") ? "Use 'Add Evidence' to upload corrective photos." : undefined}
              icon={Camera}
            />
          ) : (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {capa.evidence!.map((ev: CapaEvidence) => (
                <a
                  key={ev.id}
                  href={ev.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                >
                  {/* CAPA evidence photo */}
                  <img
                    src={ev.imageUrl}
                    alt={ev.caption ?? "CAPA evidence"}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white truncate">{ev.caption ?? "Evidence"}</p>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white">
                      <Eye className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Close dialog */}
      <CloseCapaDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        capaId={capa.id}
        onDone={() => { setCloseOpen(false); refetch() }}
      />

      {/* Cancel dialog (admin only) */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this CAPA?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The CAPA will be marked as Cancelled. Only administrators can perform this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep CAPA</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={async () => {
                try {
                  await apiPut(`/api/capa/${capa.id}`, { action: "cancel", reason: "Cancelled by admin" })
                  toast.success("CAPA cancelled")
                  setCancelOpen(false)
                  refetch()
                } catch (e) {
                  toast.error((e as Error).message)
                }
              }}
            >
              Cancel CAPA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DetailItem({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  )
}

function CloseCapaDialog({
  open,
  onOpenChange,
  capaId,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  capaId: string
  onDone: () => void
}) {
  const [comments, setComments] = useState("")
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    try {
      await apiPut(`/api/capa/${capaId}`, {
        action: "close",
        verificationComments: comments.trim() || undefined,
      })
      toast.success("CAPA closed")
      setComments("")
      onDone()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close CAPA</DialogTitle>
          <DialogDescription>
            Provide verification comments confirming the corrective action has been completed and validated.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Label htmlFor="close-comments">Verification Comments</Label>
          <Textarea
            id="close-comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Confirm the corrective action has been verified and validated…"
            rows={4}
            className="mt-1"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Close CAPA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
