"use client"

import { useMemo, useState } from "react"
import {
  ClipboardCheck, TrendingUp, ShieldCheck, Building2, UserCheck,
  Layers, ShieldAlert, AlertTriangle, Wrench, CalendarClock,
  FileText, RefreshCw, Calendar, Loader2, ChevronRight, BarChart3,
} from "lucide-react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDate, fmtDateTime,
} from "@/components/shared"
import { useApi } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import { ExportButton } from "@/components/export-button"
import { INSPECTION_STATUS, complianceColor } from "@/lib/labels"
import type { Inspection, CAPA, Location, User } from "@/lib/types"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const CHART_COLORS = ["#0d9488", "#f59e0b", "#8b5cf6", "#ef4444", "#10b981", "#06b6d4", "#f97316", "#ec4899"]

type ReportKey =
  | "daily" | "weekly" | "monthly" | "location" | "inspector"
  | "category" | "noncompliance" | "critical" | "capa" | "overdue" | "executive"

interface ReportDef {
  key: ReportKey
  title: string
  description: string
  icon: LucideIcon
  accent: "teal" | "emerald" | "amber" | "violet" | "rose" | "orange" | "sky"
}

const REPORTS: ReportDef[] = [
  { key: "daily", title: "Daily Inspection", description: "Inspections completed today with scores and status breakdown", icon: ClipboardCheck, accent: "teal" },
  { key: "weekly", title: "Weekly Performance", description: "Rolling 7-day inspection throughput and average compliance", icon: TrendingUp, accent: "emerald" },
  { key: "monthly", title: "Monthly Compliance", description: "Compliance trend across the selected date range", icon: ShieldCheck, accent: "violet" },
  { key: "location", title: "Location Performance", description: "Compliance score per facility with inspection counts", icon: Building2, accent: "amber" },
  { key: "inspector", title: "Inspector Performance", description: "Completed inspections and average scores per inspector", icon: UserCheck, accent: "sky" },
  { key: "category", title: "Category Analysis", description: "Average score by hygiene category and violation counts", icon: Layers, accent: "orange" },
  { key: "noncompliance", title: "Non-compliance", description: "Items flagged non-compliant grouped by category", icon: ShieldAlert, accent: "rose" },
  { key: "critical", title: "Critical Violations", description: "All critical-severity defects and unresolved findings", icon: AlertTriangle, accent: "rose" },
  { key: "capa", title: "CAPA Tracking", description: "Corrective and preventive actions with current status", icon: Wrench, accent: "orange" },
  { key: "overdue", title: "Overdue CAPAs", description: "CAPAs past their target date — risk of escalation", icon: CalendarClock, accent: "rose" },
  { key: "executive", title: "Executive Summary", description: "Boardroom-level KPI snapshot and trend overview", icon: FileText, accent: "teal" },
]

export function ReportsModule() {
  const { can } = usePermissions()
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")
  const [openReport, setOpenReport] = useState<ReportKey | null>(null)

  const canExport = can("reports:export")

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Reports Center"
        description="Generate on-demand hygiene, compliance, CAPA and performance reports"
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton type="inspections" label="Export Inspections" />
            <ExportButton type="locations" label="Export Locations" />
            {can("users:view") && <ExportButton type="users" label="Export Users" />}
          </div>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> From date
              </Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> To date
              </Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setFrom(""); setTo("") }}>
              Clear
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Date filters apply to scheduled inspections and CAPA creation dates within the generated report.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {REPORTS.map((r) => (
          <ReportCard key={r.key} report={r} onGenerate={() => setOpenReport(r.key)} canExport={canExport} />
        ))}
      </div>

      {openReport && (
        <ReportDialog
          reportKey={openReport}
          from={from}
          to={to}
          onClose={() => setOpenReport(null)}
        />
      )}
    </div>
  )
}

// ============================================================
// Report Card
// ============================================================

function ReportCard({ report, onGenerate, canExport }: { report: ReportDef; onGenerate: () => void; canExport: boolean }) {
  const accentBg: Record<string, string> = {
    teal: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
    violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300",
    rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300",
    sky: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300",
  }
  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", accentBg[report.accent])}>
            <report.icon className="h-5 w-5" />
          </div>
        </div>
        <CardTitle className="text-base mt-3">{report.title}</CardTitle>
        <CardDescription className="text-xs mt-1">{report.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0 mt-auto">
        <Button size="sm" variant="outline" className="w-full" onClick={onGenerate}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
        {!canExport && (
          <p className="mt-2 text-[11px] text-muted-foreground text-center">Export gated by reports:export</p>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Report Dialog
// ============================================================

function ReportDialog({ reportKey, from, to, onClose }: { reportKey: ReportKey; from: string; to: string; onClose: () => void }) {
  const reportDef = REPORTS.find((r) => r.key === reportKey)!
  const params = new URLSearchParams()
  if (from) params.set("from", from)
  if (to) params.set("to", to)

  const inspectionsQ = useApi<Inspection[]>(["reports", "inspections", reportKey, from, to], `/api/inspections?${params.toString()}`, reportKey !== "capa" && reportKey !== "overdue" && reportKey !== "executive")
  const capasQ = useApi<CAPA[]>(["reports", "capas", reportKey, from, to], `/api/capa`, reportKey === "capa" || reportKey === "overdue" || reportKey === "critical" || reportKey === "executive")
  const locationsQ = useApi<Location[]>(["reports", "locations"], `/api/locations`, reportKey === "location" || reportKey === "executive")
  const usersQ = useApi<User[]>(["reports", "users"], `/api/users?role=INSPECTOR`, reportKey === "inspector" || reportKey === "executive")

  const isLoading = inspectionsQ.isLoading || capasQ.isLoading || locationsQ.isLoading || usersQ.isLoading

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <reportDef.icon className="h-5 w-5" />
            {reportDef.title} Report
          </DialogTitle>
          <DialogDescription>
            {reportDef.description}
            {(from || to) && (
              <span className="ml-2 text-xs">
                Period: {from ? fmtDate(from) : "—"} → {to ? fmtDate(to) : "today"}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-2">
          {isLoading ? (
            <div className="space-y-3 p-2">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          ) : (
            <ReportContent
              reportKey={reportKey}
              inspections={inspectionsQ.data ?? []}
              capas={capasQ.data ?? []}
              locations={locationsQ.data ?? []}
              users={usersQ.data ?? []}
              from={from}
              to={to}
            />
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// Report Content Dispatcher
// ============================================================

interface ReportContentProps {
  reportKey: ReportKey
  inspections: Inspection[]
  capas: CAPA[]
  locations: Location[]
  users: User[]
  from: string
  to: string
}

function ReportContent({ reportKey, inspections, capas, locations, users, from, to }: ReportContentProps) {
  switch (reportKey) {
    case "daily": return <DailyReport inspections={inspections} />
    case "weekly": return <WeeklyReport inspections={inspections} />
    case "monthly": return <MonthlyReport inspections={inspections} />
    case "location": return <LocationReport inspections={inspections} locations={locations} />
    case "inspector": return <InspectorReport inspections={inspections} users={users} />
    case "category": return <CategoryReport inspections={inspections} />
    case "noncompliance": return <NonComplianceReport inspections={inspections} />
    case "critical": return <CriticalReport inspections={inspections} capas={capas} />
    case "capa": return <CapaReport capas={capas} />
    case "overdue": return <OverdueCapaReport capas={capas} />
    case "executive": return <ExecutiveReport inspections={inspections} capas={capas} locations={locations} users={users} from={from} to={to} />
    default: return null
  }
}

// ============================================================
// Individual Reports
// ============================================================

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h4>
      {children}
    </div>
  )
}

function useDateFilter(inspections: Inspection[], from: string, to: string) {
  return useMemo(() => {
    return inspections.filter((i) => {
      const d = new Date(i.scheduledDate)
      if (from && d < new Date(from)) return false
      if (to && d > new Date(to + "T23:59:59")) return false
      return true
    })
  }, [inspections, from, to])
}

function DailyReport({ inspections }: { inspections: Inspection[] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todays = inspections.filter((i) => new Date(i.scheduledDate) >= today)
  const completed = todays.filter((i) => ["APPROVED", "CLOSED"].includes(i.status))
  const avg = completed.length ? Math.round(completed.reduce((s, i) => s + (i.compliancePercent ?? 0), 0) / completed.length) : 0

  return (
    <div className="space-y-4 p-2">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard title="Scheduled Today" value={todays.length} icon={ClipboardCheck} accent="teal" />
        <KpiCard title="Completed" value={completed.length} icon={ShieldCheck} accent="emerald" />
        <KpiCard title="Avg Compliance" value={`${avg}%`} icon={TrendingUp} accent={avg >= 85 ? "emerald" : avg >= 70 ? "amber" : "rose"} />
        <KpiCard title="Pending" value={todays.length - completed.length} icon={CalendarClock} accent="amber" />
      </div>
      <ReportSection title="Today's Inspections">
        <InspectionMiniTable inspections={todays.slice(0, 20)} />
      </ReportSection>
    </div>
  )
}

function WeeklyReport({ inspections }: { inspections: Inspection[] }) {
  const last7 = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    return inspections.filter((i) => new Date(i.scheduledDate) >= cutoff)
  }, [inspections])

  const byDay = useMemo(() => {
    const days: { day: string; count: number; avg: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      const dayInsps = last7.filter((x) => {
        const sx = new Date(x.scheduledDate)
        return sx >= d && sx < next
      })
      const done = dayInsps.filter((x) => x.compliancePercent != null)
      const avg = done.length ? Math.round(done.reduce((s, x) => s + (x.compliancePercent ?? 0), 0) / done.length) : 0
      days.push({ day: d.toLocaleDateString("default", { weekday: "short" }), count: dayInsps.length, avg })
    }
    return days
  }, [last7])

  return (
    <div className="space-y-4 p-2">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <KpiCard title="Last 7 Days" value={last7.length} icon={ClipboardCheck} accent="teal" />
        <KpiCard title="Avg Compliance" value={`${Math.round(byDay.reduce((s, d) => s + d.avg, 0) / Math.max(byDay.length, 1))}%`} icon={TrendingUp} accent="emerald" />
        <KpiCard title="Best Day" value={byDay.reduce((m, d) => d.count > m.count ? d : m, byDay[0] ?? { day: "—", count: 0 }).day} icon={BarChart3} accent="violet" />
      </div>
      <ReportSection title="7-Day Throughput">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} name="Inspections" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportSection>
    </div>
  )
}

function MonthlyReport({ inspections }: { inspections: Inspection[] }) {
  const byMonth = useMemo(() => {
    const months: { month: string; compliance: number; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const start = new Date()
      start.setMonth(start.getMonth() - i, 1)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59)
      const inMonth = inspections.filter((x) => {
        const sx = new Date(x.scheduledDate)
        return sx >= start && sx <= end && x.compliancePercent != null
      })
      const compliance = inMonth.length ? Math.round(inMonth.reduce((s, x) => s + (x.compliancePercent ?? 0), 0) / inMonth.length) : 0
      months.push({ month: start.toLocaleString("default", { month: "short" }), compliance, count: inMonth.length })
    }
    return months
  }, [inspections])

  return (
    <div className="space-y-4 p-2">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <KpiCard title="6-Month Avg" value={`${Math.round(byMonth.reduce((s, m) => s + m.compliance, 0) / Math.max(byMonth.length, 1))}%`} icon={TrendingUp} accent="emerald" />
        <KpiCard title="Inspected" value={byMonth.reduce((s, m) => s + m.count, 0)} icon={ClipboardCheck} accent="teal" />
        <KpiCard title="Best Month" value={byMonth.reduce((m, d) => d.compliance > m.compliance ? d : m, byMonth[0] ?? { month: "—", compliance: 0 }).month} icon={ShieldCheck} accent="violet" />
      </div>
      <ReportSection title="Compliance Trend (6 months)">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8 }} formatter={(v: number) => [`${v}%`, "Compliance"]} />
              <Line type="monotone" dataKey="compliance" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} name="Compliance %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ReportSection>
    </div>
  )
}

function LocationReport({ inspections, locations }: { inspections: Inspection[]; locations: Location[] }) {
  const data = useMemo(() => {
    return locations.map((l) => {
      const inL = inspections.filter((i) => i.locationId === l.id)
      const scored = inL.filter((i) => i.compliancePercent != null)
      const compliance = scored.length ? Math.round(scored.reduce((s, i) => s + (i.compliancePercent ?? 0), 0) / scored.length) : 0
      return { name: l.name, compliance, inspections: inL.length }
    }).sort((a, b) => b.compliance - a.compliance)
  }, [inspections, locations])

  return (
    <div className="space-y-4 p-2">
      <ReportSection title="Compliance by Location">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={150} />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Bar dataKey="compliance" radius={[0, 6, 6, 0]} name="Compliance %">
                {data.map((d, i) => (
                  <Cell key={i} fill={d.compliance >= 85 ? "#10b981" : d.compliance >= 70 ? "#f59e0b" : d.compliance >= 60 ? "#f97316" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportSection>
      <ReportSection title="Detail Table">
        <div className="max-h-60 overflow-y-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-2 font-medium">Location</th>
                <th className="text-right p-2 font-medium">Inspections</th>
                <th className="text-right p-2 font-medium">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.name} className="border-t">
                  <td className="p-2">{d.name}</td>
                  <td className="p-2 text-right">{d.inspections}</td>
                  <td className={cn("p-2 text-right font-semibold", complianceColor(d.compliance))}>{d.compliance}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>
    </div>
  )
}

function InspectorReport({ inspections, users }: { inspections: Inspection[]; users: User[] }) {
  const data = useMemo(() => {
    return users.map((u) => {
      const mine = inspections.filter((i) => i.inspectorId === u.id)
      const done = mine.filter((i) => i.compliancePercent != null)
      const avg = done.length ? Math.round(done.reduce((s, i) => s + (i.compliancePercent ?? 0), 0) / done.length) : 0
      return { name: u.name, completed: done.length, avg, total: mine.length }
    }).filter((x) => x.total > 0).sort((a, b) => b.avg - a.avg)
  }, [inspections, users])

  return (
    <div className="space-y-4 p-2">
      <ReportSection title="Performance per Inspector">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="completed" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Completed" />
              <Bar dataKey="avg" fill="#0d9488" radius={[6, 6, 0, 0]} name="Avg Score %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportSection>
      <ReportSection title="Detail Table">
        <div className="max-h-60 overflow-y-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-2 font-medium">Inspector</th>
                <th className="text-right p-2 font-medium">Assigned</th>
                <th className="text-right p-2 font-medium">Completed</th>
                <th className="text-right p-2 font-medium">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.name} className="border-t">
                  <td className="p-2">{d.name}</td>
                  <td className="p-2 text-right">{d.total}</td>
                  <td className="p-2 text-right">{d.completed}</td>
                  <td className={cn("p-2 text-right font-semibold", complianceColor(d.avg))}>{d.avg}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>
    </div>
  )
}

function CategoryReport({ inspections }: { inspections: Inspection[] }) {
  // Aggregate by template item category via inspection items
  const data = useMemo(() => {
    const map: Record<string, { compliant: number; total: number }> = {}
    for (const insp of inspections) {
      for (const item of insp.items ?? []) {
        const cat = item.templateItem?.category?.name ?? "Uncategorised"
        if (!map[cat]) map[cat] = { compliant: 0, total: 0 }
        if (item.response) {
          map[cat].total += 1
          if (item.response === "COMPLIANT") map[cat].compliant += 1
        }
      }
    }
    return Object.entries(map).map(([name, v]) => ({
      name,
      avgScore: v.total ? Math.round((v.compliant / v.total) * 100) : 0,
      violations: v.total - v.compliant,
    })).sort((a, b) => a.avgScore - b.avgScore)
  }, [inspections])

  if (data.length === 0) {
    return <EmptyState title="No category data" description="No inspection items with responses in this period." icon={Layers} />
  }

  return (
    <div className="space-y-4 p-2">
      <ReportSection title="Category Performance">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Bar dataKey="avgScore" radius={[0, 6, 6, 0]} name="Avg Score %">
                {data.map((d, i) => (
                  <Cell key={i} fill={d.avgScore >= 85 ? "#10b981" : d.avgScore >= 70 ? "#f59e0b" : d.avgScore >= 60 ? "#f97316" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ReportSection>
    </div>
  )
}

function NonComplianceReport({ inspections }: { inspections: Inspection[] }) {
  const items = useMemo(() => {
    const out: { inspection: string; question: string; category: string; severity: string }[] = []
    for (const insp of inspections) {
      for (const item of insp.items ?? []) {
        if (item.response === "NON_COMPLIANT") {
          out.push({
            inspection: insp.title,
            question: item.templateItem?.question ?? "—",
            category: item.templateItem?.category?.name ?? "—",
            severity: item.severity ?? "MEDIUM",
          })
        }
      }
    }
    return out
  }, [inspections])

  if (items.length === 0) {
    return <EmptyState title="No non-compliance items" description="All inspected items were compliant in this period." icon={ShieldCheck} />
  }

  return (
    <div className="space-y-4 p-2">
      <KpiCard title="Non-compliant Items" value={items.length} icon={ShieldAlert} accent="rose" />
      <ReportSection title="Findings">
        <div className="max-h-72 overflow-y-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-2 font-medium">Inspection</th>
                <th className="text-left p-2 font-medium">Category</th>
                <th className="text-left p-2 font-medium">Question</th>
                <th className="text-left p-2 font-medium">Severity</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">{it.inspection}</td>
                  <td className="p-2">{it.category}</td>
                  <td className="p-2 max-w-xs truncate">{it.question}</td>
                  <td className="p-2"><StatusBadge status={it.severity} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>
    </div>
  )
}

function CriticalReport({ inspections, capas }: { inspections: Inspection[]; capas: CAPA[] }) {
  const criticalCapas = capas.filter((c) => c.severity === "CRITICAL")
  const criticalItems = useMemo(() => {
    const out: { inspection: string; question: string; severity: string }[] = []
    for (const insp of inspections) {
      for (const item of insp.items ?? []) {
        if (item.severity === "CRITICAL" && item.response && item.response !== "COMPLIANT" && item.response !== "NOT_APPLICABLE") {
          out.push({ inspection: insp.title, question: item.templateItem?.question ?? "—", severity: item.severity })
        }
      }
    }
    return out
  }, [inspections])

  return (
    <div className="space-y-4 p-2">
      <div className="grid gap-3 grid-cols-2">
        <KpiCard title="Critical CAPAs" value={criticalCapas.length} icon={AlertTriangle} accent="rose" />
        <KpiCard title="Critical Findings" value={criticalItems.length} icon={ShieldAlert} accent="rose" />
      </div>
      <ReportSection title="Critical CAPAs">
        {criticalCapas.length === 0 ? (
          <EmptyState title="No critical CAPAs" icon={ShieldCheck} />
        ) : (
          <div className="max-h-60 overflow-y-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium">Title</th>
                  <th className="text-left p-2 font-medium">Location</th>
                  <th className="text-left p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {criticalCapas.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-2">{c.title}</td>
                    <td className="p-2">{c.location?.name ?? "—"}</td>
                    <td className="p-2"><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ReportSection>
    </div>
  )
}

function CapaReport({ capas }: { capas: CAPA[] }) {
  const byStatus = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of capas) map[c.status] = (map[c.status] ?? 0) + 1
    return Object.entries(map).map(([status, count]) => ({ status, count }))
  }, [capas])

  return (
    <div className="space-y-4 p-2">
      <KpiCard title="Total CAPAs" value={capas.length} icon={Wrench} accent="orange" />
      <ReportSection title="CAPAs by Status">
        {byStatus.length === 0 ? (
          <EmptyState title="No CAPAs in range" icon={Wrench} />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label={(e: { count?: number; status?: string }) => `${e.status}: ${e.count}`}>
                  {byStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </ReportSection>
      <ReportSection title="CAPA Detail">
        <div className="max-h-60 overflow-y-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-2 font-medium">Title</th>
                <th className="text-left p-2 font-medium">Severity</th>
                <th className="text-left p-2 font-medium">Target</th>
                <th className="text-left p-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {capas.slice(0, 30).map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2">{c.title}</td>
                  <td className="p-2"><StatusBadge status={c.severity} /></td>
                  <td className="p-2">{fmtDate(c.targetDate)}</td>
                  <td className="p-2"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>
    </div>
  )
}

function OverdueCapaReport({ capas }: { capas: CAPA[] }) {
  const now = new Date()
  const overdue = capas.filter((c) => c.targetDate && new Date(c.targetDate) < now && !["CLOSED", "CANCELLED"].includes(c.status))

  return (
    <div className="space-y-4 p-2">
      <KpiCard title="Overdue CAPAs" value={overdue.length} icon={CalendarClock} accent="rose" hint="Past target date, not closed" />
      {overdue.length === 0 ? (
        <EmptyState title="No overdue CAPAs" description="All CAPAs are on track." icon={ShieldCheck} />
      ) : (
        <ReportSection title="Overdue Details">
          <div className="max-h-72 overflow-y-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium">Title</th>
                  <th className="text-left p-2 font-medium">Severity</th>
                  <th className="text-left p-2 font-medium">Target</th>
                  <th className="text-left p-2 font-medium">Days Overdue</th>
                  <th className="text-left p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((c) => {
                  const days = Math.floor((now.getTime() - new Date(c.targetDate!).getTime()) / 86400000)
                  return (
                    <tr key={c.id} className="border-t">
                      <td className="p-2">{c.title}</td>
                      <td className="p-2"><StatusBadge status={c.severity} /></td>
                      <td className="p-2">{fmtDate(c.targetDate)}</td>
                      <td className="p-2 text-rose-600 font-semibold">{days}d</td>
                      <td className="p-2"><StatusBadge status={c.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ReportSection>
      )}
    </div>
  )
}

function ExecutiveReport({ inspections, capas, locations, users, from, to }: {
  inspections: Inspection[]; capas: CAPA[]; locations: Location[]; users: User[]; from: string; to: string
}) {
  const completed = inspections.filter((i) => ["APPROVED", "CLOSED"].includes(i.status))
  const avgCompliance = completed.length ? Math.round(completed.reduce((s, i) => s + (i.compliancePercent ?? 0), 0) / completed.length) : 0
  const openCapas = capas.filter((c) => !["CLOSED", "CANCELLED"].includes(c.status)).length
  const overdueCapas = capas.filter((c) => c.targetDate && new Date(c.targetDate) < new Date() && !["CLOSED", "CANCELLED"].includes(c.status)).length
  const inspectors = users.filter((u) => u.role === "INSPECTOR")

  return (
    <div className="space-y-4 p-2">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard title="Total Inspections" value={inspections.length} icon={ClipboardCheck} accent="teal" />
        <KpiCard title="Avg Compliance" value={`${avgCompliance}%`} icon={TrendingUp} accent={avgCompliance >= 85 ? "emerald" : avgCompliance >= 70 ? "amber" : "rose"} />
        <KpiCard title="Open CAPAs" value={openCapas} icon={Wrench} accent="orange" />
        <KpiCard title="Overdue" value={overdueCapas} icon={CalendarClock} accent={overdueCapas > 0 ? "rose" : "emerald"} />
      </div>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <KpiCard title="Locations" value={locations.length} icon={Building2} accent="amber" />
        <KpiCard title="Inspectors" value={inspectors.length} icon={UserCheck} accent="sky" />
        <KpiCard title="Period" value={from || to ? `${from ? fmtDate(from) : "Start"} → ${to ? fmtDate(to) : "Today"}` : "All time"} icon={Calendar} accent="violet" />
      </div>
      <ReportSection title="Status Breakdown">
        <div className="max-h-48 overflow-y-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-left p-2 font-medium">Status</th>
                <th className="text-right p-2 font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(inspections.reduce((m, i) => { m[i.status] = (m[i.status] ?? 0) + 1; return m }, {} as Record<string, number>)).map(([s, c]) => (
                <tr key={s} className="border-t">
                  <td className="p-2"><StatusBadge status={s} label={INSPECTION_STATUS[s] ?? s} /></td>
                  <td className="p-2 text-right font-semibold">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReportSection>
    </div>
  )
}

// ============================================================
// Reusable mini table
// ============================================================

function InspectionMiniTable({ inspections }: { inspections: Inspection[] }) {
  if (inspections.length === 0) {
    return <EmptyState title="No inspections" description="Nothing scheduled in this period." icon={ClipboardCheck} />
  }
  return (
    <div className="max-h-72 overflow-y-auto rounded-md border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            <th className="text-left p-2 font-medium">Title</th>
            <th className="text-left p-2 font-medium">Location</th>
            <th className="text-left p-2 font-medium">Scheduled</th>
            <th className="text-left p-2 font-medium">Score</th>
            <th className="text-left p-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {inspections.map((i) => (
            <tr key={i.id} className="border-t hover:bg-muted/30">
              <td className="p-2 truncate max-w-[200px]">{i.title}</td>
              <td className="p-2">{i.location?.name ?? "—"}</td>
              <td className="p-2">{fmtDateTime(i.scheduledDate)}</td>
              <td className={cn("p-2 font-semibold", i.compliancePercent != null ? complianceColor(i.compliancePercent) : "")}>
                {i.compliancePercent != null ? `${i.compliancePercent}%` : "—"}
              </td>
              <td className="p-2"><StatusBadge status={i.status} label={INSPECTION_STATUS[i.status] ?? i.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
