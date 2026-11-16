"use client"

import { useMemo, useState } from "react"
import {
  MapPin, RefreshCw, ExternalLink, Navigation, Building2,
  ClipboardCheck, ShieldCheck, Search, AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState,
} from "@/components/shared"
import { useApi } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import { useNav } from "@/lib/nav-store"
import { FACILITY_TYPES, complianceColor, complianceBg } from "@/lib/labels"
import type { Location, Inspection } from "@/lib/types"
import { cn } from "@/lib/utils"

function complianceBand(pct: number): { label: string; bg: string; text: string; ring: string } {
  if (pct >= 85) return { label: "Excellent", bg: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-500/30" }
  if (pct >= 70) return { label: "Acceptable", bg: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-500/30" }
  if (pct >= 60) return { label: "At Risk", bg: "bg-orange-500", text: "text-orange-600", ring: "ring-orange-500/30" }
  return { label: "Critical", bg: "bg-rose-500", text: "text-rose-600", ring: "ring-rose-500/30" }
}

export function MapModule() {
  const { can } = usePermissions()
  const { goToLocation } = useNav()
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: locations, isLoading: locLoading, refetch: locRefetch, isFetching: locFetching } = useApi<Location[]>(
    ["locations", "map"],
    "/api/locations",
    can("locations:view"),
  )
  const { data: inspections, isLoading: inspLoading } = useApi<Inspection[]>(
    ["inspections", "map"],
    "/api/inspections",
  )

  const enriched = useMemo(() => {
    const list = locations ?? []
    return list.map((l) => {
      const inL = (inspections ?? []).filter((i) => i.locationId === l.id)
      const scored = inL.filter((i) => i.compliancePercent != null)
      const compliance = scored.length
        ? Math.round(scored.reduce((s, i) => s + (i.compliancePercent ?? 0), 0) / scored.length)
        : 0
      return {
        ...l,
        inspectionsCount: inL.length,
        compliance,
      }
    })
  }, [locations, inspections])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return enriched
    return enriched.filter((l) =>
      l.name.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q) ||
      (l.city ?? "").toLowerCase().includes(q) ||
      FACILITY_TYPES[l.facilityType]?.toLowerCase().includes(q)
    )
  }, [enriched, search])

  const kpis = useMemo(() => {
    const all = enriched
    const total = all.length
    const avg = total ? Math.round(all.reduce((s, l) => s + (l as any).compliance, 0) / total) : 0
    const critical = all.filter((l) => (l as any).compliance < 60).length
    const withGps = all.filter((l) => l.gpsLat != null && l.gpsLng != null).length
    return { total, avg, critical, withGps }
  }, [enriched])

  const selected = enriched.find((l) => l.id === selectedId) ?? null

  // Determine GPS bounds for stylized map projection
  const bounds = useMemo(() => {
    const points = enriched.filter((l) => l.gpsLat != null && l.gpsLng != null)
    if (points.length === 0) return null
    const lats = points.map((p) => p.gpsLat!)
    const lngs = points.map((p) => p.gpsLng!)
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    }
  }, [enriched])

  function project(lat: number, lng: number): { x: number; y: number } {
    if (!bounds) return { x: 50, y: 50 }
    const x = ((lng - bounds.minLng) / Math.max(bounds.maxLng - bounds.minLng, 0.0001)) * 100
    const y = 100 - ((lat - bounds.minLat) / Math.max(bounds.maxLat - bounds.minLat, 0.0001)) * 100
    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) }
  }

  const isLoading = locLoading || inspLoading

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Field Map"
        description="Geographic overview of facilities, their compliance scores and inspection volume"
        action={
          <Button variant="outline" size="sm" onClick={() => locRefetch()} disabled={locFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", locFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard title="Total Locations" value={kpis.total} icon={Building2} accent="teal" />
        <KpiCard title="Avg Compliance" value={`${kpis.avg}%`} icon={ShieldCheck} accent={kpis.avg >= 85 ? "emerald" : kpis.avg >= 70 ? "amber" : "rose"} />
        <KpiCard title="Critical (<60%)" value={kpis.critical} icon={AlertTriangle} accent={kpis.critical > 0 ? "rose" : "emerald"} />
        <KpiCard title="GPS-Tagged" value={`${kpis.withGps}/${kpis.total}`} icon={Navigation} accent="sky" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Stylized Map */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Facility Map
            </CardTitle>
            <CardDescription className="text-xs">
              {bounds
                ? "Locations plotted by GPS coordinates — colour-coded by compliance band"
                : "No GPS coordinates available — switch to the grid view below"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-80" />
            ) : bounds ? (
              <div className="relative aspect-[16/10] rounded-lg border bg-gradient-to-br from-teal-50 via-sky-50 to-emerald-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800 overflow-hidden">
                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: "linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)",
                  backgroundSize: "8% 10%",
                }} />
                {/* Compass */}
                <div className="absolute top-3 right-3 rounded-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur px-2 py-1 text-[10px] font-medium text-muted-foreground">
                  N ↑
                </div>
                {/* Scale */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <div className="h-1 w-12 bg-zinc-400 rounded-full" />
                  <span className="text-[10px] text-muted-foreground">~5 km</span>
                </div>
                {/* Pins */}
                {filtered.map((l) => {
                  if (l.gpsLat == null || l.gpsLng == null) return null
                  const { x, y } = project(l.gpsLat, l.gpsLng)
                  const band = complianceBand((l as any).compliance)
                  const isActive = l.id === selectedId
                  return (
                    <button
                      key={l.id}
                      onClick={() => { setSelectedId(l.id); goToLocation(l.id) }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group"
                      style={{ left: `${x}%`, top: `${y}%` }}
                      title={`${l.name} — ${band.label}`}
                    >
                      <span className={cn(
                        "rounded-full p-1 ring-4 transition-transform group-hover:scale-125",
                        band.bg,
                        band.ring,
                        isActive && "scale-150",
                      )}>
                        <MapPin className="h-3 w-3 text-white" />
                      </span>
                      <span className="mt-0.5 max-w-[100px] truncate text-[9px] font-medium bg-white/80 dark:bg-zinc-900/80 px-1 rounded">
                        {l.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <EmptyState title="No GPS coordinates" description="Add GPS coordinates to locations to see them on the map." icon={Navigation} />
            )}
          </CardContent>
        </Card>

        {/* Side panel — selected location detail */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Location Detail</CardTitle>
            <CardDescription className="text-xs">
              {selected ? selected.name : "Click a pin or card to inspect"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {!selected ? (
              <EmptyState title="No selection" description="Pick a location card below or a pin on the map." icon={MapPin} />
            ) : (
              <SelectedLocationDetail location={selected} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Location grid */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Location Directory</CardTitle>
              <CardDescription className="text-xs">{filtered.length} of {enriched.length} facilities</CardDescription>
            </div>
            <div className="flex-1 max-w-sm">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, code, city, type…"
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No locations" description="No facilities match your search." icon={Building2} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[60vh] overflow-y-auto pr-1">
              {filtered.map((l) => (
                <LocationCard
                  key={l.id}
                  location={l}
                  compliance={(l as any).compliance}
                  inspectionsCount={(l as any).inspectionsCount}
                  isSelected={l.id === selectedId}
                  onSelect={() => setSelectedId(l.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LocationCard({
  location: l, compliance, inspectionsCount, isSelected, onSelect,
}: {
  location: Location
  compliance: number
  inspectionsCount: number
  isSelected: boolean
  onSelect: () => void
}) {
  const band = complianceBand(compliance)
  const hasGps = l.gpsLat != null && l.gpsLng != null
  return (
    <button
      onClick={onSelect}
      className={cn(
        "text-left rounded-lg border p-3 transition-all hover:shadow-md",
        isSelected && "ring-2 ring-teal-500",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{l.name}</p>
          <p className="text-[10px] text-muted-foreground font-mono">{l.code}</p>
        </div>
        <span className={cn("inline-flex h-2.5 w-2.5 rounded-full shrink-0", band.bg)} title={band.label} />
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Building2 className="h-3 w-3" />
        {FACILITY_TYPES[l.facilityType] ?? l.facilityType}
      </div>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground">Compliance</p>
          <p className={cn("text-lg font-bold", band.text)}>{compliance}%</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Inspections</p>
          <p className="text-sm font-medium">{inspectionsCount}</p>
        </div>
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full", band.bg)} style={{ width: `${compliance}%` }} />
      </div>
      {hasGps && (
        <div className="mt-2 text-[10px] font-mono text-muted-foreground truncate">
          {l.gpsLat?.toFixed(4)}, {l.gpsLng?.toFixed(4)}
        </div>
      )}
    </button>
  )
}

function SelectedLocationDetail({ location: l }: { location: Location }) {
  const hasGps = l.gpsLat != null && l.gpsLng != null
  const compliance = (l as any).compliance ?? 0
  const band = complianceBand(compliance)
  const mapsUrl = hasGps ? `https://www.google.com/maps?q=${l.gpsLat},${l.gpsLng}` : null

  return (
    <div className="space-y-3">
      <div>
        <p className="text-base font-semibold">{l.name}</p>
        <p className="text-xs font-mono text-muted-foreground">{l.code}</p>
      </div>
      <div className="grid gap-2 grid-cols-2 text-xs">
        <div className="rounded-md border p-2">
          <p className="text-muted-foreground">Type</p>
          <p className="font-medium mt-0.5">{FACILITY_TYPES[l.facilityType] ?? l.facilityType}</p>
        </div>
        <div className="rounded-md border p-2">
          <p className="text-muted-foreground">City</p>
          <p className="font-medium mt-0.5">{l.city ?? "—"}</p>
        </div>
        <div className="rounded-md border p-2">
          <p className="text-muted-foreground">Compliance</p>
          <p className={cn("font-bold mt-0.5", band.text)}>{compliance}%</p>
        </div>
        <div className="rounded-md border p-2">
          <p className="text-muted-foreground">Inspections</p>
          <p className="font-medium mt-0.5">{(l as any).inspectionsCount ?? 0}</p>
        </div>
      </div>
      <div className="rounded-md border p-2">
        <p className="text-xs text-muted-foreground">Address</p>
        <p className="text-sm mt-0.5">{l.address ?? "—"}</p>
      </div>
      {hasGps && (
        <div className="rounded-md border p-2">
          <p className="text-xs text-muted-foreground">GPS Coordinates</p>
          <p className="text-sm font-mono mt-0.5">
            {l.gpsLat?.toFixed(6)}, {l.gpsLng?.toFixed(6)}
          </p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <StatusBadge status={l.status} />
      </div>
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in Google Maps
        </a>
      )}
    </div>
  )
}
