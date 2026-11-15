"use client"

import { useQuery } from "@tanstack/react-query"
import { useNav } from "@/lib/nav-store"
import {
  AlertTriangle, Clock, BatteryWarning, PackageX, FileClock,
  AlertOctagon, Wrench, RefreshCw, Bell, ChevronRight, ShieldAlert,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { KpiCard, SectionTitle, EmptyState, StatusBadge } from "@/components/shared"
import { cn } from "@/lib/utils"

type Severity = "critical" | "warning" | "info"
type AlertModule = "visits" | "contracts" | "equipment" | "consumables"

interface AlertItem {
  severity: Severity
  module: AlertModule
  entityId: string
  title: string
  subtitle: string
  meta?: string
}

interface AlertsData {
  summary: { total: number; critical: number; warning: number; info: number }
  overdueVisits: AlertItem[]
  upcomingVisits: AlertItem[]
  lowBatteries: AlertItem[]
  lowStock: AlertItem[]
  expiringContracts: AlertItem[]
  expiredContracts: AlertItem[]
  equipmentAlerts: AlertItem[]
  incorrectlyInstalled: AlertItem[]
}

const SEVERITY_STYLES: Record<Severity, { border: string; bg: string; icon: typeof AlertTriangle; iconColor: string }> = {
  critical: { border: "border-l-rose-500", bg: "bg-rose-50 dark:bg-rose-950/20", icon: AlertOctagon, iconColor: "text-rose-600" },
  warning: { border: "border-l-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", icon: AlertTriangle, iconColor: "text-amber-600" },
  info: { border: "border-l-sky-500", bg: "bg-sky-50 dark:bg-sky-950/20", icon: Clock, iconColor: "text-sky-600" },
}

const MODULE_LABELS: Record<AlertModule, string> = {
  visits: "Visits",
  contracts: "Contracts",
  equipment: "Equipment",
  consumables: "Stock",
}

export function AlertsModule() {
  const { data, isLoading, refetch, isFetching } = useQuery<AlertsData>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts")
      if (!res.ok) throw new Error("Failed to load alerts")
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionTitle title="Alerts Center" description="Loading alerts…" />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-24" /></Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return <EmptyState title="Unable to load alerts" icon={ShieldAlert} />
  }

  const allAlerts = [
    ...data.overdueVisits,
    ...data.expiredContracts,
    ...data.lowStock,
    ...data.lowBatteries,
    ...data.equipmentAlerts,
    ...data.expiringContracts,
    ...data.incorrectlyInstalled,
    ...data.upcomingVisits,
  ]

  const groups: { label: string; icon: typeof Bell; items: AlertItem[]; emptyText: string }[] = [
    { label: "Overdue Visits", icon: Clock, items: data.overdueVisits, emptyText: "No overdue visits" },
    { label: "Expired Contracts", icon: FileClock, items: data.expiredContracts, emptyText: "No expired contracts" },
    { label: "Stock Alerts", icon: PackageX, items: data.lowStock, emptyText: "All stock levels are healthy" },
    { label: "Battery Alerts", icon: BatteryWarning, items: data.lowBatteries, emptyText: "All batteries are healthy" },
    { label: "Equipment Issues", icon: Wrench, items: data.equipmentAlerts, emptyText: "No equipment issues" },
    { label: "Expiring Contracts (30 days)", icon: FileClock, items: data.expiringContracts, emptyText: "No contracts expiring soon" },
    { label: "Installation Issues", icon: AlertTriangle, items: data.incorrectlyInstalled, emptyText: "All equipment correctly installed" },
    { label: "Upcoming Visits (7 days)", icon: Clock, items: data.upcomingVisits, emptyText: "No upcoming visits this week" },
  ]

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Alerts Center"
        description="All operational alerts in one place — click any item to navigate to the record"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {/* Summary KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard title="Total Alerts" value={data.summary.total} icon={Bell} accent="default" />
        <KpiCard title="Critical" value={data.summary.critical} icon={AlertOctagon} accent="rose" />
        <KpiCard title="Warnings" value={data.summary.warning} icon={AlertTriangle} accent="amber" />
        <KpiCard title="Info" value={data.summary.info} icon={Clock} accent="sky" />
      </div>

      {allAlerts.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              title="No alerts — everything is under control"
              description="All visits, equipment, stock and contracts are within normal parameters"
              icon={Bell}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <AlertGroup key={group.label} {...group} />
          ))}
        </div>
      )}
    </div>
  )
}

function AlertGroup({
  label,
  icon: Icon,
  items,
  emptyText,
}: {
  label: string
  icon: typeof Bell
  items: AlertItem[]
  emptyText: string
}) {
  const { goToVisit, goToContract, goToEquipment, goToProduct } = useNav()

  const navigate = (item: AlertItem) => {
    switch (item.module) {
      case "visits": goToVisit(item.entityId); break
      case "contracts": goToContract(item.entityId); break
      case "equipment": goToEquipment(item.entityId); break
      case "consumables": goToProduct(item.entityId); break
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">{label}</CardTitle>
          </div>
          {items.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {items.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">{emptyText}</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {items.map((item, i) => {
              const style = SEVERITY_STYLES[item.severity]
              const ItemIcon = style.icon
              return (
                <button
                  key={i}
                  onClick={() => navigate(item)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-md border-l-4 p-3 text-left transition-colors hover:bg-muted/50",
                    style.border,
                    style.bg
                  )}
                >
                  <ItemIcon className={cn("h-4 w-4 mt-0.5 shrink-0", style.iconColor)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    {item.meta && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.meta}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-background/80 text-muted-foreground font-medium">
                      {MODULE_LABELS[item.module]}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
