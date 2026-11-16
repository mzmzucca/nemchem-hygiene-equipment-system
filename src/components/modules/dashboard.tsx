"use client"

import {
  ClipboardCheck, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  ShieldAlert, Wrench, CalendarClock, RefreshCw, ArrowRight,
  Activity as ActivityIcon, FileCheck2, Trophy, MapPin, Layers,
  CircleCheckBig, CircleAlert, CircleDashed, CircleX, Plus,
  Gauge, Target, Sparkles,
} from "lucide-react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDateTime,
} from "@/components/shared"
import { useApi } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import { useNav } from "@/lib/nav-store"
import { INSPECTION_STATUS, complianceColor } from "@/lib/labels"
import type { DashboardData, Inspection } from "@/lib/types"
import { cn } from "@/lib/utils"

// Approved palette (no indigo / blue). Aligned with statusColor helpers.
const CHART_COLORS = ["#0d9488", "#f59e0b", "#8b5cf6", "#ef4444", "#10b981", "#06b6d4", "#f97316", "#ec4899"]

export function DashboardModule() {
  const { role } = usePermissions()
  if (role === "INSPECTOR") return <InspectorDashboard />
  if (role === "CEO") return <CeoDashboard />
  if (role === "SUPERVISOR") return <SupervisorDashboard />
  return <AdminDashboard /> // default for ADMIN and unauthenticated
}

// ============================================================
// Shared dashboard hooks
// ============================================================

function useDashboard() {
  return useApi<DashboardData>(["dashboard"], "/api/dashboard")
}

function DashboardSkeleton({ title, cards = 8 }: { title: string; cards?: number }) {
  return (
    <div className="space-y-6">
      <SectionTitle title={title} description="Loading live data…" />
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      title="Unable to load dashboard"
      description="There was a problem fetching the latest metrics."
      icon={AlertTriangle}
    />
  )
}

function ChartCard({
  title, description, children, action,
}: {
  title: string
  description?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription className="text-xs mt-0.5">{description}</CardDescription>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================

function AdminDashboard() {
  const { data, isLoading, refetch, isFetching, isError } = useDashboard()
  const { can } = usePermissions()

  if (isLoading) return <DashboardSkeleton title="Admin Dashboard" cards={8} />
  if (isError || !data) return <DashboardError onRetry={() => refetch()} />

  const { kpis, complianceTrend, locationPerformance, categoryPerformance, inspectorLeaderboard, recentActivity, statusBreakdown } = data

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Admin Dashboard"
        description="Company-wide inspection, compliance and CAPA overview"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        <KpiCard title="Total Inspections" value={kpis.total} icon={ClipboardCheck} accent="teal" />
        <KpiCard title="Completed" value={kpis.completed} icon={CheckCircle2} accent="emerald" hint="Closed & approved" />
        <KpiCard title="Pending" value={kpis.pending} icon={Clock} accent="amber" hint="Awaiting assignment" />
        <KpiCard title="Awaiting Review" value={kpis.awaitingReview} icon={FileCheck2} accent="violet" hint="Submitted / under review" />
        <KpiCard title="Avg Compliance" value={`${kpis.avgCompliance}%`} icon={TrendingUp} accent={kpis.avgCompliance >= 85 ? "emerald" : kpis.avgCompliance >= 70 ? "amber" : "rose"} />
        <KpiCard title="Critical Violations" value={kpis.criticalViolations} icon={ShieldAlert} accent={kpis.criticalViolations > 0 ? "rose" : "emerald"} />
        <KpiCard title="Open CAPAs" value={kpis.openCapas} icon={Wrench} accent="orange" />
        <KpiCard title="Overdue CAPAs" value={kpis.overdueCapas} icon={CalendarClock} accent={kpis.overdueCapas > 0 ? "rose" : "default"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Compliance Trend" description="Average compliance % over the last 6 months">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={complianceTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => [`${v}%`, "Compliance"]} />
              <Line type="monotone" dataKey="compliance" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 4 }} name="Compliance" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Location Performance" description="Average compliance by facility">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={locationPerformance}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => [`${v}%`, "Compliance"]} />
              <Bar dataKey="compliance" fill="#10b981" radius={[6, 6, 0, 0]} name="Compliance" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Breakdown" description="Inspection status distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusBreakdown.map((s) => ({ ...s, name: INSPECTION_STATUS[s.status] ?? s.status }))}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                label={(e: { count?: number; name?: string }) => (e.count && e.count > 0 ? `${e.name}: ${e.count}` : "")}
                labelLine={false}
              >
                {statusBreakdown.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Category Performance" description="Average score by hygiene category">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Bar dataKey="avgScore" fill="#f59e0b" radius={[0, 6, 6, 0]} name="Avg Score %" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-600" />
                  Inspector Leaderboard
                </CardTitle>
                <CardDescription className="text-xs">Top performers by avg score &amp; completed inspections</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-80 overflow-y-auto pr-1 -mr-1">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-2 font-medium">#</th>
                    <th className="text-left py-2 px-2 font-medium">Inspector</th>
                    <th className="text-right py-2 px-2 font-medium">Completed</th>
                    <th className="text-right py-2 px-2 font-medium">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {inspectorLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-muted-foreground py-6">No inspector activity yet</td>
                    </tr>
                  ) : (
                    inspectorLeaderboard.map((insp, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 px-2">
                          <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                            i === 0 ? "bg-amber-100 text-amber-700" :
                            i === 1 ? "bg-zinc-100 text-zinc-700" :
                            i === 2 ? "bg-orange-100 text-orange-700" :
                            "bg-muted text-muted-foreground")}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-medium truncate max-w-40">{insp.name}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{insp.completed}</td>
                        <td className={cn("py-2 px-2 text-right tabular-nums font-semibold", complianceColor(insp.avgScore))}>
                          {insp.avgScore}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ActivityIcon className="h-4 w-4 text-teal-600" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-xs">Latest system events</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="max-h-80 overflow-y-auto pr-1 -mr-1 space-y-2">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
              ) : (
                recentActivity.map((a) => (
                  <div key={a.id} className="flex gap-3 rounded-md border p-2.5 text-sm">
                    <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {a.action} <span className="text-muted-foreground font-normal">on {a.entity}</span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {a.user} · {fmtDateTime(a.time)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============================================================
// CEO DASHBOARD
// ============================================================

function CeoDashboard() {
  const { data, isLoading, refetch, isFetching, isError } = useDashboard()
  const capaCompletionRate = data
    ? data.kpis.openCapas + data.kpis.completed > 0
      ? Math.round((data.kpis.completed / (data.kpis.completed + data.kpis.openCapas)) * 100)
      : 0
    : 0

  if (isLoading) return <DashboardSkeleton title="Executive Dashboard" cards={4} />
  if (isError || !data) return <DashboardError onRetry={() => refetch()} />

  const { kpis, complianceTrend, locationPerformance, categoryPerformance } = data
  const topCategories = [...categoryPerformance].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5)
  const bottomCategories = [...categoryPerformance].sort((a, b) => a.avgScore - b.avgScore).slice(0, 5)

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Executive Dashboard"
        description="Strategic compliance overview across all facilities"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Overall Compliance" value={`${kpis.avgCompliance}%`} icon={Gauge} accent={kpis.avgCompliance >= 85 ? "emerald" : kpis.avgCompliance >= 70 ? "amber" : "rose"} hint="Company average" />
        <KpiCard title="Total Inspections" value={kpis.total} icon={ClipboardCheck} accent="teal" hint={`${kpis.completed} closed`} />
        <KpiCard title="Critical Violations" value={kpis.criticalViolations} icon={ShieldAlert} accent={kpis.criticalViolations > 0 ? "rose" : "emerald"} hint="Open critical defects" />
        <KpiCard title="CAPA Completion" value={`${capaCompletionRate}%`} icon={Target} accent={capaCompletionRate >= 80 ? "emerald" : "amber"} hint={`${kpis.openCapas} open`} />
      </div>

      <Card className="bg-gradient-to-br from-teal-50 via-emerald-50 to-amber-50 dark:from-teal-950/30 dark:via-emerald-950/20 dark:to-amber-950/20 border-teal-200/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-600" />
            Executive Summary
          </CardTitle>
          <CardDescription className="text-xs">Key insights derived from the latest data</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <CircleCheckBig className={cn("h-4 w-4 shrink-0 mt-0.5", complianceColor(kpis.avgCompliance))} />
              <span>Overall compliance is <strong className={complianceColor(kpis.avgCompliance)}>{kpis.avgCompliance}%</strong> across {kpis.total} inspections.</span>
            </li>
            <li className="flex gap-2">
              {kpis.criticalViolations > 0 ? (
                <CircleAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              ) : (
                <CircleCheckBig className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
              )}
              <span>{kpis.criticalViolations > 0 ? `${kpis.criticalViolations} critical violations need executive attention.` : "No open critical violations — strong compliance posture."}</span>
            </li>
            <li className="flex gap-2">
              <Wrench className="h-4 w-4 shrink-0 mt-0.5 text-orange-600" />
              <span>{kpis.openCapas} open CAPAs ({kpis.overdueCapas} overdue) — completion rate {capaCompletionRate}%.</span>
            </li>
            {complianceTrend.length > 1 && (
              <li className="flex gap-2">
                <TrendingUp className="h-4 w-4 shrink-0 mt-0.5 text-teal-600" />
                <span>Monthly trend moving from <strong>{complianceTrend[0].compliance}%</strong> to <strong>{complianceTrend[complianceTrend.length - 1].compliance}%</strong>.</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Monthly Compliance Trend" description="Last 6 months">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={complianceTrend}>
              <defs>
                <linearGradient id="ceoTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => [`${v}%`, "Compliance"]} />
              <Area type="monotone" dataKey="compliance" stroke="#0d9488" strokeWidth={2.5} fill="url(#ceoTrend)" name="Compliance" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Compliance by Location" description="Top facilities">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={locationPerformance}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => [`${v}%`, "Compliance"]} />
              <Bar dataKey="compliance" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Compliance" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top Performing Categories" description="Highest average scores">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topCategories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
              <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => [`${v}%`, "Avg score"]} />
              <Bar dataKey="avgScore" fill="#10b981" radius={[0, 6, 6, 0]} name="Avg Score" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Categories Needing Attention" description="Lowest average scores">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={bottomCategories} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
              <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => [`${v}%`, "Avg score"]} />
              <Bar dataKey="avgScore" fill="#ef4444" radius={[0, 6, 6, 0]} name="Avg Score" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}

// ============================================================
// SUPERVISOR DASHBOARD
// ============================================================

function SupervisorDashboard() {
  const { data, isLoading, refetch, isFetching, isError } = useDashboard()
  const { can } = usePermissions()
  const { goToCreateInspection, goToInspection } = useNav()
  const { data: inspections } = useApi<Inspection[]>(["inspections-awaiting", "list"], "/api/inspections?status=SUBMITTED")

  if (isLoading) return <DashboardSkeleton title="Operations Dashboard" cards={6} />
  if (isError || !data) return <DashboardError onRetry={() => refetch()} />

  const { kpis, statusBreakdown, categoryPerformance, inspectorLeaderboard } = data
  const awaiting = (inspections ?? []).slice(0, 8)

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Operations Dashboard"
        description="Daily operations and inspection pipeline"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {can("inspections:create") && (
          <Button onClick={goToCreateInspection} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Inspection
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={!awaiting.length}
          onClick={() => awaiting[0] && goToInspection(awaiting[0].id)}
        >
          <FileCheck2 className="h-4 w-4 mr-2" />
          Review Pending ({kpis.awaitingReview})
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard title="Pending" value={kpis.pending} icon={Clock} accent="amber" />
        <KpiCard title="Awaiting Review" value={kpis.awaitingReview} icon={FileCheck2} accent="violet" />
        <KpiCard title="In Progress" value={kpis.inProgress} icon={Layers} accent="teal" />
        <KpiCard title="Overdue" value={kpis.overdue} icon={CalendarClock} accent={kpis.overdue > 0 ? "rose" : "default"} />
        <KpiCard title="Returned" value={statusBreakdown.find((s) => s.status === "RETURNED")?.count ?? 0} icon={CircleX} accent="rose" />
        <KpiCard title="Critical Violations" value={kpis.criticalViolations} icon={ShieldAlert} accent={kpis.criticalViolations > 0 ? "rose" : "emerald"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Status Breakdown" description="Current inspection status distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusBreakdown.map((s) => ({ ...s, name: INSPECTION_STATUS[s.status] ?? s.status }))}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                label={(e: { count?: number; name?: string }) => (e.count && e.count > 0 ? `${e.name}: ${e.count}` : "")}
                labelLine={false}
              >
                {statusBreakdown.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Inspector Performance" description="Avg score by inspector">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={inspectorLeaderboard}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => [`${v}%`, "Avg score"]} />
              <Bar dataKey="avgScore" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Avg Score" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Category Issues" description="Violation count by hygiene category">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={categoryPerformance.filter((c) => c.violations > 0)}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8 }} />
            <Bar dataKey="violations" fill="#f97316" radius={[6, 6, 0, 0]} name="Violations" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Inspections Awaiting Review</CardTitle>
              <CardDescription className="text-xs">Click to open and review</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => useNav.getState().setView("inspections")}>
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {awaiting.length === 0 ? (
            <EmptyState title="No inspections awaiting review" description="Submitted inspections will appear here." icon={CircleDashed} />
          ) : (
            <div className="max-h-96 overflow-y-auto pr-1 -mr-1 divide-y">
              {awaiting.map((i) => (
                <button
                  key={i.id}
                  onClick={() => goToInspection(i.id)}
                  className="w-full text-left py-3 flex items-center justify-between gap-3 hover:bg-accent/40 rounded-md px-2 -mx-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{i.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {i.location?.name ?? "—"} · Inspector: {i.inspector?.name ?? "Unassigned"}
                    </p>
                  </div>
                  <StatusBadge status={i.status} />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// INSPECTOR DASHBOARD (mobile-first)
// ============================================================

function InspectorDashboard() {
  const { data, isLoading, refetch, isFetching, isError } = useDashboard()
  const { goToInspection, goToInspect } = useNav()
  const { data: inspections } = useApi<Inspection[]>(["inspector", "my-list"], "/api/inspections")

  if (isLoading) return <DashboardSkeleton title="My Dashboard" cards={6} />
  if (isError || !data) return <DashboardError onRetry={() => refetch()} />

  const { kpis, statusBreakdown } = data
  const mine = inspections ?? []
  const find = (s: string) => statusBreakdown.find((x) => x.status === s)?.count ?? 0

  const upcoming = mine.filter((i) => ["ASSIGNED", "ACCEPTED"].includes(i.status))
  const returned = mine.filter((i) => i.status === "RETURNED")
  const recentlyCompleted = mine
    .filter((i) => ["CLOSED", "APPROVED"].includes(i.status))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <SectionTitle
        title="My Dashboard"
        description="Your assigned inspections and tasks"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <KpiCard title="Pending Acceptance" value={find("ASSIGNED")} icon={Clock} accent="amber" />
        <KpiCard title="Assigned" value={upcoming.length} icon={ClipboardCheck} accent="sky" />
        <KpiCard title="In Progress" value={kpis.inProgress} icon={Layers} accent="violet" />
        <KpiCard title="Returned" value={returned.length} icon={CircleX} accent={returned.length > 0 ? "rose" : "default"} />
        <KpiCard title="Drafts" value={find("DRAFT")} icon={FileCheck2} accent="teal" />
        <KpiCard title="Completed" value={kpis.completed} icon={CheckCircle2} accent="emerald" />
      </div>

      {returned.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/60 dark:border-rose-900/60 dark:bg-rose-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <ShieldAlert className="h-5 w-5" />
              Returned for Corrections ({returned.length})
            </CardTitle>
            <CardDescription className="text-xs">These inspections need your immediate attention</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {returned.map((i) => (
              <button
                key={i.id}
                onClick={() => goToInspect(i.id)}
                className="w-full text-left rounded-lg border border-rose-200 dark:border-rose-900/50 bg-background p-3 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{i.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {i.location?.name ?? "—"} · {i.reviewComments ? `"${i.reviewComments.slice(0, 80)}${i.reviewComments.length > 80 ? "…" : ""}"` : "See review comments"}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white shrink-0">
                    Correct &amp; Resubmit
                  </span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-teal-600" />
            My Upcoming Inspections
          </CardTitle>
          <CardDescription className="text-xs">Tap to start or continue</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {upcoming.length === 0 ? (
            <EmptyState title="No upcoming inspections" description="Assigned inspections will appear here." icon={CircleDashed} />
          ) : (
            <div className="space-y-3">
              {upcoming.map((i) => (
                <div key={i.id} className="rounded-lg border p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => goToInspection(i.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-medium truncate">{i.title}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {i.location?.name ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                      <CalendarClock className="h-3 w-3" />
                      Scheduled: {fmtDateTime(i.scheduledDate)}
                    </p>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={i.status} />
                    {i.status === "ACCEPTED" ? (
                      <Button size="sm" onClick={() => goToInspect(i.id)} className="h-10 px-4">
                        Inspect
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => goToInspection(i.id)} className="h-10 px-4">
                        Start
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Recently Completed
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {recentlyCompleted.length === 0 ? (
            <EmptyState title="No completed inspections" description="Your closed inspections will appear here." icon={CircleDashed} />
          ) : (
            <div className="space-y-2">
              {recentlyCompleted.map((i) => (
                <button
                  key={i.id}
                  onClick={() => goToInspection(i.id)}
                  className="w-full text-left rounded-md border p-3 hover:bg-accent/40 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{i.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{i.location?.name ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {typeof i.compliancePercent === "number" && (
                      <span className={cn("text-sm font-bold tabular-nums", complianceColor(i.compliancePercent))}>
                        {i.compliancePercent}%
                      </span>
                    )}
                    <StatusBadge status={i.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
