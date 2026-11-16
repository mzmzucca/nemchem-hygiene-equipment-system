"use client"

import { useMemo, useState } from "react"
import {
  Building2, RefreshCw, ArrowLeft, Plus, Loader2, MapPin,
  ChevronRight, CircleDashed, ShieldCheck, ClipboardCheck, Wrench,
  AlertTriangle, Pencil, User as UserIcon, Navigation, Hash,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDate,
} from "@/components/shared"
import type { Location, User, Inspection, CAPA, Defect } from "@/lib/types"
import { FACILITY_TYPES, CAPA_STATUS, DEFECT_STATUS, SEVERITY_LABELS, complianceColor } from "@/lib/labels"
import { useNav } from "@/lib/nav-store"
import { useApi, useCreate, useUpdate } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import { ExportButton } from "@/components/export-button"
import { cn } from "@/lib/utils"

export function LocationsModule() {
  const { selectedLocationId } = useNav()
  if (selectedLocationId) return <LocationDetail />
  return <LocationsList />
}

// ============================================================
// LIST VIEW
// ============================================================

function LocationsList() {
  const { can } = usePermissions()
  const { goToLocation } = useNav()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)

  const { data: locations, isLoading, refetch, isFetching } = useApi<Location[]>(
    ["locations", "list"],
    "/api/locations",
  )
  const { data: users } = useApi<User[]>(["users", "list"], "/api/users")

  const filtered = useMemo(() => {
    const list = locations ?? []
    return list.filter((l) => {
      if (typeFilter !== "ALL" && l.facilityType !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !l.name.toLowerCase().includes(q) &&
          !l.code.toLowerCase().includes(q) &&
          !(l.city ?? "").toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [locations, search, typeFilter])

  const kpis = useMemo(() => {
    const all = locations ?? []
    return {
      total: all.length,
      active: all.filter((l) => l.status === "ACTIVE").length,
      avgCompliance: 0, // Calculated below
    }
  }, [locations])

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Locations & Facilities"
        description="Manage all inspected facilities — hotels, restaurants, hospitals, kitchens and more"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <ExportButton type="locations" />
            {can("locations:manage") && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Location
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <KpiCard title="Total Facilities" value={kpis.total} icon={Building2} accent="teal" />
        <KpiCard title="Active" value={kpis.active} icon={ShieldCheck} accent="emerald" />
        <KpiCard
          title="Avg Compliance"
          value="—"
          hint="Aggregated from inspections"
          icon={ClipboardCheck}
          accent="violet"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <Input
                placeholder="Name, code, city…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="w-full md:w-56">
              <Label className="text-xs text-muted-foreground">Facility Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  {Object.entries(FACILITY_TYPES).map(([k, v]) => (
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
              title="No locations found"
              description="Adjust your filters or add a new facility."
              icon={CircleDashed}
            />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-1/4">Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Inspections</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow
                      key={l.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => goToLocation(l.id)}
                    >
                      <TableCell className="font-medium truncate max-w-xs">{l.name}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground">{l.code}</span>
                      </TableCell>
                      <TableCell className="text-sm">{FACILITY_TYPES[l.facilityType] ?? l.facilityType}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.city ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {l.supervisor?.name ?? <span className="text-muted-foreground italic">—</span>}
                      </TableCell>
                      <TableCell className="text-sm">{l._count?.inspections ?? 0}</TableCell>
                      <TableCell>
                        <StatusBadge status={l.status} />
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
        <LocationFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          users={users ?? []}
        />
      )}
      {editing && (
        <LocationFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          location={editing}
          users={users ?? []}
        />
      )}
    </div>
  )
}

// ============================================================
// DETAIL VIEW
// ============================================================

function LocationDetail() {
  const { selectedLocationId, selectLocation } = useNav()
  const { can } = usePermissions()
  const [editOpen, setEditOpen] = useState(false)

  const { data: location, isLoading, refetch, isFetching } = useApi<Location>(
    ["location", "detail", selectedLocationId],
    `/api/locations/${selectedLocationId}`,
  )
  const { data: users } = useApi<User[]>(["users", "list"], "/api/users")
  const { data: capas } = useApi<CAPA[]>(["capa", "byLocation", selectedLocationId], `/api/capa?locationId=${selectedLocationId}`)
  const { data: defects } = useApi<Defect[]>(["defects", "byLocation", selectedLocationId], `/api/defects?locationId=${selectedLocationId}`)

  const inspections = (location?.inspections ?? []) as Inspection[]

  const kpis = useMemo(() => {
    const completed = inspections.filter((i) => i.compliancePercent != null)
    const avgCompliance = completed.length
      ? Math.round(completed.reduce((s, i) => s + (i.compliancePercent ?? 0), 0) / completed.length)
      : 0
    return {
      inspections: inspections.length,
      openCapas: (capas ?? []).filter((c) => c.status !== "CLOSED" && c.status !== "CANCELLED").length,
      openDefects: (defects ?? []).filter((d) => d.status !== "RESOLVED").length,
      compliance: avgCompliance,
    }
  }, [inspections, capas, defects])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => selectLocation(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!location) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => selectLocation(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <EmptyState title="Location not found" icon={CircleDashed} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => selectLocation(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Locations
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
          {can("locations:manage") && (
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={location.status} />
                <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  {FACILITY_TYPES[location.facilityType] ?? location.facilityType}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-mono text-muted-foreground">
                  <Hash className="h-3 w-3" />{location.code}
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight">{location.name}</h1>
              {location.address && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {location.address}{location.city ? `, ${location.city}` : ""}
                </p>
              )}
              {location.gpsLat != null && location.gpsLng != null && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  {location.gpsLat.toFixed(5)}, {location.gpsLng.toFixed(5)}
                </p>
              )}
            </div>
            <div className="text-right text-sm">
              <p className="text-xs text-muted-foreground">Supervisor</p>
              <p className="font-medium flex items-center gap-1 justify-end">
                <UserIcon className="h-3.5 w-3.5" />
                {location.supervisor?.name ?? "Unassigned"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard title="Inspections" value={kpis.inspections} icon={ClipboardCheck} accent="teal" />
        <KpiCard title="Open CAPAs" value={kpis.openCapas} icon={Wrench} accent={kpis.openCapas > 0 ? "amber" : "default"} />
        <KpiCard title="Open Defects" value={kpis.openDefects} icon={AlertTriangle} accent={kpis.openDefects > 0 ? "rose" : "default"} />
        <KpiCard title="Compliance Score" value={`${kpis.compliance}%`} icon={ShieldCheck} accent="emerald" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4 max-w-md">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="capas">CAPAs</TabsTrigger>
          <TabsTrigger value="defects">Defects</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Facility Overview</CardTitle>
              <CardDescription className="text-xs">All registered details for this facility.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-x-6 gap-y-4 md:grid-cols-2 text-sm">
              <MetaRow label="Name" value={location.name} />
              <MetaRow label="Code" value={location.code} />
              <MetaRow label="Facility Type" value={FACILITY_TYPES[location.facilityType] ?? location.facilityType} />
              <MetaRow label="Status" value={location.status} />
              <MetaRow label="Address" value={location.address ?? "—"} />
              <MetaRow label="City" value={location.city ?? "—"} />
              <MetaRow label="GPS Latitude" value={location.gpsLat != null ? location.gpsLat.toFixed(5) : "—"} />
              <MetaRow label="GPS Longitude" value={location.gpsLng != null ? location.gpsLng.toFixed(5) : "—"} />
              <MetaRow label="Supervisor" value={location.supervisor?.name ?? "—"} />
              <MetaRow label="Supervisor Email" value={location.supervisor?.email ?? "—"} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inspection History */}
        <TabsContent value="inspections" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {inspections.length === 0 ? (
                <EmptyState title="No inspections yet" icon={ClipboardCheck} />
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Compliance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inspections.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-medium truncate max-w-xs">{i.title}</TableCell>
                          <TableCell className="text-sm">{fmtDate(i.scheduledDate)}</TableCell>
                          <TableCell className={cn("text-sm font-semibold", complianceColor(i.compliancePercent ?? 0))}>
                            {i.compliancePercent != null ? `${i.compliancePercent}%` : "—"}
                          </TableCell>
                          <TableCell><StatusBadge status={i.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CAPAs */}
        <TabsContent value="capas" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {(capas ?? []).length === 0 ? (
                <EmptyState title="No CAPAs for this location" icon={Wrench} />
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="w-1/3">Title</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Target Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(capas ?? []).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium truncate max-w-xs">{c.title}</TableCell>
                          <TableCell><StatusBadge status={c.severity} label={SEVERITY_LABELS[c.severity] ?? c.severity} /></TableCell>
                          <TableCell className="text-sm">{fmtDate(c.targetDate)}</TableCell>
                          <TableCell><StatusBadge status={c.status} label={CAPA_STATUS[c.status] ?? c.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Defects */}
        <TabsContent value="defects" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {(defects ?? []).length === 0 ? (
                <EmptyState title="No defects for this location" icon={AlertTriangle} />
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="w-1/3">Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(defects ?? []).map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium truncate max-w-xs">{d.title}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{d.category?.name ?? "—"}</TableCell>
                          <TableCell><StatusBadge status={d.severity} label={SEVERITY_LABELS[d.severity] ?? d.severity} /></TableCell>
                          <TableCell className="text-sm">{fmtDate(d.resolutionDeadline)}</TableCell>
                          <TableCell><StatusBadge status={d.status} label={DEFECT_STATUS[d.status] ?? d.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editOpen && (
        <LocationFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          location={location}
          users={users ?? []}
        />
      )}
    </div>
  )
}

// ============================================================
// CREATE / EDIT DIALOG
// ============================================================

interface LocationFormState {
  name: string
  code: string
  address: string
  city: string
  gpsLat: string
  gpsLng: string
  facilityType: string
  supervisorId: string
  status: string
}

function emptyForm(): LocationFormState {
  return {
    name: "", code: "", address: "", city: "", gpsLat: "", gpsLng: "",
    facilityType: "OTHER", supervisorId: "", status: "ACTIVE",
  }
}

function LocationFormDialog({
  open,
  onOpenChange,
  location,
  users,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  location?: Location
  users: User[]
}) {
  const isEdit = !!location
  const create = useCreate<Location>("/api/locations", [["locations", "list"]])
  const update = useUpdate<Location>("/api/locations", [["locations", "list"], ["location", "detail", location?.id ?? ""]])
  const [form, setForm] = useState<LocationFormState>(() =>
    location
      ? {
          name: location.name,
          code: location.code,
          address: location.address ?? "",
          city: location.city ?? "",
          gpsLat: location.gpsLat != null ? String(location.gpsLat) : "",
          gpsLng: location.gpsLng != null ? String(location.gpsLng) : "",
          facilityType: location.facilityType,
          supervisorId: location.supervisorId ?? "",
          status: location.status,
        }
      : emptyForm()
  )

  const submit = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and code are required")
      return
    }
    const payload: Partial<Location> = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      gpsLat: form.gpsLat ? Number(form.gpsLat) : undefined,
      gpsLng: form.gpsLng ? Number(form.gpsLng) : undefined,
      facilityType: form.facilityType,
      supervisorId: form.supervisorId || undefined,
      status: form.status,
    } as Partial<Location>

    try {
      if (isEdit && location) {
        await update.mutateAsync({ id: location.id, data: payload })
      } else {
        await create.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch {
      /* handled by mutation */
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Location" : "Add Location"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update facility details." : "Register a new facility for inspection."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label htmlFor="loc-name">Name *</Label>
              <Input
                id="loc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Grand Hotel — Main Kitchen"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="loc-code">Code *</Label>
              <Input
                id="loc-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="GH-MK1"
                className="mt-1 font-mono"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="loc-address">Address</Label>
            <Input
              id="loc-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Street address"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="loc-city">City</Label>
            <Input
              id="loc-city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="City"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="loc-lat">GPS Latitude</Label>
              <Input
                id="loc-lat"
                type="number"
                step="any"
                value={form.gpsLat}
                onChange={(e) => setForm({ ...form, gpsLat: e.target.value })}
                placeholder="-25.9740"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="loc-lng">GPS Longitude</Label>
              <Input
                id="loc-lng"
                type="number"
                step="any"
                value={form.gpsLng}
                onChange={(e) => setForm({ ...form, gpsLng: e.target.value })}
                placeholder="32.5732"
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Facility Type</Label>
              <Select value={form.facilityType} onValueChange={(v) => setForm({ ...form, facilityType: v })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FACILITY_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Supervisor</Label>
            <Select value={form.supervisorId || "NONE"} onValueChange={(v) => setForm({ ...form, supervisorId: v === "NONE" ? "" : v })}>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="No supervisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No supervisor</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} — {u.role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Add Location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate">{value}</span>
    </div>
  )
}
