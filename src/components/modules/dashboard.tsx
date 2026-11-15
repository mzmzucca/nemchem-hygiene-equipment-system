"use client"

import { useQuery } from "@tanstack/react-query"
import {
  Users, UserCheck, FileText, FileCheck2, FileX2, FileClock,
  Boxes, Wrench, AlertTriangle, PackageCheck,
  CalendarDays, CheckCircle2, Clock, CalendarClock,
  BatteryFull, BatteryLow, BatteryWarning,
  Package, TrendingUp, PackageX, AlertCircle, RefreshCw,
} from "lucide-react"
import { usePermissions } from "@/hooks/use-permissions"
import { TechnicianDashboard } from "@/components/modules/tech-dashboard"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { KpiCard, SectionTitle, EmptyState } from "@/components/shared"
import type { DashboardData } from "@/lib/types"
import { Button } from "@/components/ui/button"

const CHART_COLORS = ["#0d9488", "#f59e0b", "#8b5cf6", "#ef4444", "#10b981", "#06b6d4", "#f97316", "#ec4899"]

const STATUS_LABELS: Record<string, string> = {
  OPERATIONAL: "Operational",
  NOT_OPERATIONAL: "Not Operational",
  DAMAGED: "Damaged",
  UNDER_MAINTENANCE: "Under Maintenance",
  NEEDS_REPLACEMENT: "Needs Replacement",
  MISSING: "Missing",
  DECOMMISSIONED: "Decommissioned",
}

export function DashboardModule() {
  const { role } = usePermissions()

  // Technicians see a focused personal dashboard, not the company-wide one
  if (role === "TECHNICIAN") {
    return <TechnicianDashboard />
  }

  return <AdminDashboard />
}

function AdminDashboard() {
  const { data, isLoading, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard")
      if (!res.ok) throw new Error("Failed to load dashboard")
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionTitle title="Dashboard" description="Operational overview" />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-24" />
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return <EmptyState title="Unable to load dashboard data" description="Please try again" icon={AlertCircle} />
  }

  const { kpis, charts } = data

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Operations Dashboard"
        description="Real-time overview of customers, equipment, visits and inventory"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2.5">Customers & Contracts</h3>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard title="Total Customers" value={kpis.customers.totalCustomers} icon={Users} accent="teal" />
          <KpiCard title="Active Customers" value={kpis.customers.activeCustomers} icon={UserCheck} accent="emerald" />
          <KpiCard title="Active Contracts" value={kpis.contracts.totalActiveContracts} icon={FileText} accent="violet" />
          <KpiCard title="Rental Contracts" value={kpis.contracts.rentalContracts} icon={FileCheck2} accent="teal" />
          <KpiCard title="FOL Contracts" value={kpis.contracts.folContracts} icon={FileCheck2} accent="violet" />
          <KpiCard title="Expiring Soon" value={kpis.contracts.approachingExpiration} hint={`${kpis.contracts.expiredContracts} expired`} icon={FileClock} accent="amber" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2.5">Equipment</h3>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard title="Total Equipment" value={kpis.equipment.totalEquipment} icon={Boxes} accent="default" />
          <KpiCard title="Installed" value={kpis.equipment.installedEquipment} icon={PackageCheck} accent="teal" />
          <KpiCard title="Operational" value={kpis.equipment.operational} icon={CheckCircle2} accent="emerald" />
          <KpiCard title="Under Maintenance" value={kpis.equipment.underMaintenance} icon={Wrench} accent="amber" />
          <KpiCard title="Damaged" value={kpis.equipment.damaged} icon={AlertTriangle} accent="rose" />
          <KpiCard title="Needs Replacement" value={kpis.equipment.needsReplacement} icon={AlertTriangle} accent="orange" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2.5">Visits This Month</h3>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
            <KpiCard title="Total Visits" value={kpis.visits.totalVisitsMonth} icon={CalendarDays} accent="default" />
            <KpiCard title="Completed" value={kpis.visits.completedVisits} icon={CheckCircle2} accent="emerald" />
            <KpiCard title="Scheduled" value={kpis.visits.scheduledVisits} icon={CalendarClock} accent="sky" />
            <KpiCard title="Pending" value={kpis.visits.pendingVisits} icon={Clock} accent="amber" />
            <KpiCard title="Overdue" value={kpis.visits.overdueVisits} icon={AlertTriangle} accent="rose" />
            <KpiCard title="Upcoming" value={kpis.visits.upcomingVisits} icon={CalendarClock} accent="violet" />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2.5">Batteries</h3>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
            <KpiCard title="Healthy" value={kpis.batteries.healthyBatteries} icon={BatteryFull} accent="emerald" />
            <KpiCard title="Low" value={kpis.batteries.lowBatteries} icon={BatteryLow} accent="amber" />
            <KpiCard title="Need Replacement" value={kpis.batteries.needReplacement} icon={BatteryWarning} accent="rose" />
            <KpiCard title="Replacements (Month)" value={kpis.batteries.batteryReplacementsMonth} icon={BatteryWarning} accent="violet" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2.5">Consumables & Stock</h3>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <KpiCard title="Total in Stock" value={kpis.consumables.totalStock} icon={Package} accent="default" />
          <KpiCard title="Est. Monthly" value={kpis.consumables.estimatedMonthly} icon={TrendingUp} accent="sky" />
          <KpiCard title="Actual Monthly" value={kpis.consumables.actualMonthly} icon={TrendingUp} accent="teal" />
          <KpiCard title="Low Stock" value={kpis.consumables.lowStock} icon={AlertTriangle} accent="amber" />
          <KpiCard title="Out of Stock" value={kpis.consumables.outOfStock} icon={PackageX} accent="rose" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Visits</CardTitle>
            <CardDescription>Visits over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.monthlyVisits}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Bar dataKey="visits" fill="#0d9488" radius={[6, 6, 0, 0]} name="Visits" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipment Status Distribution</CardTitle>
            <CardDescription>Current operational status of all equipment</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={charts.equipmentStatusDist.map((d) => ({ ...d, name: STATUS_LABELS[d.name] ?? d.name }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  label={(e: { value?: number; name?: string }) => (e.value && e.value > 0 ? `${e.name}: ${e.value}` : "")}
                  labelLine={false}
                >
                  {charts.equipmentStatusDist.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rental vs FOL Contracts</CardTitle>
            <CardDescription>Distribution of active contracts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={charts.contractTypeDist}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(e: { value?: number; name?: string }) => (e.value ? `${e.name}: ${e.value}` : "")}
                  labelLine={false}
                >
                  <Cell fill="#0d9488" />
                  <Cell fill="#8b5cf6" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Consumables Consumption</CardTitle>
            <CardDescription>Actual units consumed per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={charts.monthlyConsumption}>
                <defs>
                  <linearGradient id="consumptionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Area type="monotone" dataKey="consumption" stroke="#f59e0b" fill="url(#consumptionGrad)" name="Consumption" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipment by Customer</CardTitle>
            <CardDescription>Top customers by installed equipment</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={charts.equipByCustomerChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Bar dataKey="value" fill="#06b6d4" radius={[0, 6, 6, 0]} name="Equipment" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Battery Replacements</CardTitle>
            <CardDescription>Replacements over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={charts.batteryReplacementsChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8 }} />
                <Line type="monotone" dataKey="replacements" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} name="Replacements" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maintenance Overview</CardTitle>
          <CardDescription>Equipment requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {charts.maintenanceOverview.map((m, i) => (
              <div key={m.name} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{m.name}</span>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
                <p className="mt-1 text-2xl font-bold">{m.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
