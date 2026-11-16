"use client"

import { useMemo, useState } from "react"
import {
  Bell, RefreshCw, AlertOctagon, ShieldAlert, CheckCircle2, CircleDashed,
  MapPin, ChevronRight, Loader2, Clock, AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDateTime,
} from "@/components/shared"
import type { Alert } from "@/lib/types"
import { ALERT_TYPES, SEVERITY_LABELS } from "@/lib/labels"
import { useNav } from "@/lib/nav-store"
import { useApi, apiPut } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import { ExportButton } from "@/components/export-button"
import { cn } from "@/lib/utils"

type SeverityKey = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"

const SEVERITY_CARD_STYLES: Record<SeverityKey, { border: string; bg: string; icon: typeof AlertOctagon; iconColor: string; ring: string }> = {
  CRITICAL: {
    border: "border-l-rose-500",
    bg: "bg-rose-50/60 dark:bg-rose-950/20",
    icon: AlertOctagon,
    iconColor: "text-rose-600",
    ring: "ring-rose-500/20",
  },
  HIGH: {
    border: "border-l-orange-500",
    bg: "bg-orange-50/60 dark:bg-orange-950/20",
    icon: AlertTriangle,
    iconColor: "text-orange-600",
    ring: "ring-orange-500/20",
  },
  MEDIUM: {
    border: "border-l-amber-500",
    bg: "bg-amber-50/60 dark:bg-amber-950/20",
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    ring: "ring-amber-500/20",
  },
  LOW: {
    border: "border-l-sky-500",
    bg: "bg-sky-50/60 dark:bg-sky-950/20",
    icon: Clock,
    iconColor: "text-sky-600",
    ring: "ring-sky-500/20",
  },
}

const SEVERITY_ORDER: SeverityKey[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

export function AlertsModule() {
  const { can } = usePermissions()
  const { goToLocation, goToInspection } = useNav()
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [severityFilter, setSeverityFilter] = useState<string>("ALL")
  const [resolving, setResolving] = useState<Set<string>>(new Set())

  const { data: alerts, isLoading, refetch, isFetching } = useApi<Alert[]>(
    ["alerts", "list"],
    "/api/alerts",
  )

  const filtered = useMemo(() => {
    const list = alerts ?? []
    return list.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false
      if (severityFilter !== "ALL" && a.severity !== severityFilter) return false
      return true
    })
  }, [alerts, statusFilter, severityFilter])

  const kpis = useMemo(() => {
    const all = alerts ?? []
    return {
      total: all.length,
      critical: all.filter((a) => a.severity === "CRITICAL" && a.status !== "RESOLVED").length,
      high: all.filter((a) => a.severity === "HIGH" && a.status !== "RESOLVED").length,
      resolved: all.filter((a) => a.status === "RESOLVED").length,
    }
  }, [alerts])

  const grouped = useMemo(() => {
    const map: Record<SeverityKey, Alert[]> = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] }
    filtered.forEach((a) => {
      const key = (a.severity as SeverityKey) in map ? (a.severity as SeverityKey) : "LOW"
      map[key].push(a)
    })
    return map
  }, [filtered])

  const handleResolve = async (id: string) => {
    setResolving((prev) => new Set(prev).add(id))
    try {
      await apiPut(`/api/alerts/${id}`, { action: "resolve" })
      toast.success("Alert resolved")
      refetch()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setResolving((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleClick = (a: Alert) => {
    if (a.inspectionId) goToInspection(a.inspectionId)
    else if (a.locationId) goToLocation(a.locationId)
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Hygiene Alerts"
        description="Real-time compliance alerts — critical violations, overdue CAPAs, missed inspections and more"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <ExportButton type="inspections" label="Export" filename={`alerts-${new Date().toISOString().split("T")[0]}.csv`} />
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard title="Total Alerts" value={kpis.total} icon={Bell} accent="default" />
        <KpiCard title="Critical (open)" value={kpis.critical} icon={AlertOctagon} accent={kpis.critical > 0 ? "rose" : "default"} />
        <KpiCard title="High (open)" value={kpis.high} icon={AlertTriangle} accent={kpis.high > 0 ? "orange" : "default"} />
        <KpiCard title="Resolved" value={kpis.resolved} icon={CheckCircle2} accent="emerald" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="w-full md:w-48">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
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

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              title="No alerts — everything is under control"
              description="All hygiene operations are within normal parameters"
              icon={Bell}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {SEVERITY_ORDER.map((sev) => {
            const items = grouped[sev]
            if (items.length === 0) return null
            const style = SEVERITY_CARD_STYLES[sev]
            const Icon = style.icon
            return (
              <div key={sev} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", style.iconColor)} />
                  <h3 className="text-sm font-semibold">{SEVERITY_LABELS[sev]} Alerts</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((a) => (
                    <AlertCard
                      key={a.id}
                      alert={a}
                      onResolve={() => handleResolve(a.id)}
                      onOpen={() => handleClick(a)}
                      resolving={resolving.has(a.id)}
                      canResolve={!!can("alerts:resolve")}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AlertCard({
  alert,
  onResolve,
  onOpen,
  resolving,
  canResolve,
}: {
  alert: Alert
  onResolve: () => void
  onOpen: () => void
  resolving: boolean
  canResolve: boolean
}) {
  const style = SEVERITY_CARD_STYLES[(alert.severity as SeverityKey) ?? "LOW"] ?? SEVERITY_CARD_STYLES.LOW
  const Icon = style.icon
  const isResolved = alert.status === "RESOLVED"
  const hasLink = !!alert.inspectionId || !!alert.locationId

  return (
    <Card className={cn("overflow-hidden border-l-4 ring-1", style.border, style.ring, style.bg)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-background/80", style.iconColor)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <StatusBadge status={alert.type} label={ALERT_TYPES[alert.type] ?? alert.type.replace(/_/g, " ")} />
              {isResolved && <StatusBadge status="RESOLVED" />}
            </div>
            <p className="text-sm font-semibold leading-tight">{alert.title}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.message}</p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
              {alert.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {alert.location.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {fmtDateTime(alert.createdAt)}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3">
              {hasLink && !isResolved && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={onOpen}
                >
                  Open
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              )}
              {canResolve && !isResolved && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs ml-auto"
                  onClick={onResolve}
                  disabled={resolving}
                >
                  {resolving ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  )}
                  Resolve
                </Button>
              )}
              {isResolved && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 ml-auto">
                  <CheckCircle2 className="h-3 w-3" />
                  Resolved {alert.resolvedAt ? fmtDateTime(alert.resolvedAt) : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
