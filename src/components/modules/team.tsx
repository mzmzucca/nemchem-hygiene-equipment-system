"use client"

import { useMemo, useState } from "react"
import {
  Users, RefreshCw, Trophy, ClipboardCheck, TrendingUp,
  Award, Target, ChevronRight, User as UserIcon, Medal, Star,
} from "lucide-react"
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDate,
} from "@/components/shared"
import { useApi } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import { useNav } from "@/lib/nav-store"
import { INSPECTION_STATUS, complianceColor } from "@/lib/labels"
import type { User, Inspection } from "@/lib/types"
import { cn } from "@/lib/utils"

interface InspectorStat {
  user: User
  total: number
  completed: number
  pending: number
  returned: number
  avgScore: number
  complianceRate: number
}

export function TeamModule() {
  const { can } = usePermissions()
  const { goToInspection } = useNav()
  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null)

  const { data: users, isLoading: uLoading, refetch, isFetching } = useApi<User[]>(
    ["users", "inspectors", "team"],
    "/api/users?role=INSPECTOR",
    can("users:view"),
  )
  const { data: inspections, isLoading: iLoading } = useApi<Inspection[]>(
    ["inspections", "team"],
    "/api/inspections",
  )

  const stats: InspectorStat[] = useMemo(() => {
    const list = users ?? []
    return list.map((u) => {
      const mine = (inspections ?? []).filter((i) => i.inspectorId === u.id)
      const completed = mine.filter((i) => ["APPROVED", "CLOSED"].includes(i.status))
      const pending = mine.filter((i) => ["PENDING", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW"].includes(i.status))
      const returned = mine.filter((i) => i.status === "RETURNED")
      const scored = completed.filter((i) => i.compliancePercent != null)
      const avgScore = scored.length ? Math.round(scored.reduce((s, i) => s + (i.compliancePercent ?? 0), 0) / scored.length) : 0
      const complianceRate = mine.length ? Math.round((completed.length / mine.length) * 100) : 0
      return { user: u, total: mine.length, completed: completed.length, pending: pending.length, returned: returned.length, avgScore, complianceRate }
    }).sort((a, b) => b.avgScore - a.avgScore || b.completed - a.completed)
  }, [users, inspections])

  const kpis = useMemo(() => {
    const total = stats.length
    const avgScore = total ? Math.round(stats.reduce((s, x) => s + x.avgScore, 0) / total) : 0
    const top = stats[0]
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const monthInsps = (inspections ?? []).filter((i) =>
      i.inspectorId && new Date(i.scheduledDate) >= monthStart
    ).length
    return { total, avgScore, top, monthInsps }
  }, [stats, inspections])

  const chartData = useMemo(() => {
    return stats.map((s) => ({ name: s.user.name.split(" ")[0], completed: s.completed, total: s.total }))
  }, [stats])

  const isLoading = uLoading || iLoading
  const selected = selectedInspectorId ? stats.find((s) => s.user.id === selectedInspectorId) : null
  const selectedInsps = useMemo(() => {
    if (!selectedInspectorId) return []
    return (inspections ?? []).filter((i) => i.inspectorId === selectedInspectorId).slice(0, 20)
  }, [inspections, selectedInspectorId])

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Team Performance"
        description="Inspector leaderboard with completed work, average scores and compliance rates"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard title="Total Inspectors" value={kpis.total} icon={Users} accent="teal" />
        <KpiCard title="Avg Team Score" value={`${kpis.avgScore}%`} icon={TrendingUp} accent={kpis.avgScore >= 85 ? "emerald" : kpis.avgScore >= 70 ? "amber" : "rose"} />
        <KpiCard title="Top Performer" value={kpis.top?.user.name.split(" ")[0] ?? "—"} icon={Trophy} accent="violet" hint={kpis.top ? `${kpis.top.avgScore}% avg` : ""} />
        <KpiCard title="This Month" value={kpis.monthInsps} icon={ClipboardCheck} accent="amber" hint="Inspections scheduled" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Inspections Completed per Inspector</CardTitle>
            <CardDescription className="text-xs">Completed vs total assigned inspections</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <Skeleton className="h-72" />
            ) : chartData.length === 0 ? (
              <EmptyState title="No data" icon={ClipboardCheck} />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Completed" />
                    <Bar dataKey="total" stackId="b" fill="#0d9488" radius={[6, 6, 0, 0]} name="Total Assigned" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top Performers</CardTitle>
            <CardDescription className="text-xs">Ranked by average compliance score</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : stats.length === 0 ? (
              <EmptyState title="No inspectors" icon={Users} />
            ) : (
              <div className="space-y-2">
                {stats.slice(0, 5).map((s, idx) => (
                  <div
                    key={s.user.id}
                    className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted/30 cursor-pointer"
                    onClick={() => setSelectedInspectorId(s.user.id)}
                  >
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0",
                      idx === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        : idx === 1 ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        : idx === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                        : "bg-muted text-muted-foreground",
                    )}>
                      {idx === 0 ? <Medal className="h-4 w-4" /> : idx === 1 ? <Medal className="h-4 w-4" /> : idx === 2 ? <Medal className="h-4 w-4" /> : idx + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                        {s.user.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.user.name}</p>
                      <p className="text-[10px] text-muted-foreground">{s.completed} completed · {s.total} total</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-bold", complianceColor(s.avgScore))}>{s.avgScore}%</p>
                      <div className="flex items-center gap-0.5 justify-end">
                        {idx === 0 && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inspector Leaderboard</CardTitle>
          <CardDescription className="text-xs">Click an inspector to view their recent inspections</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : stats.length === 0 ? (
            <EmptyState title="No inspectors" description="No inspector users found." icon={Users} />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">Inspector</th>
                    <th className="text-right p-3 font-medium">Completed</th>
                    <th className="text-right p-3 font-medium">Avg Score</th>
                    <th className="text-right p-3 font-medium">Pending</th>
                    <th className="text-right p-3 font-medium">Returned</th>
                    <th className="text-right p-3 font-medium">Compliance Rate</th>
                    <th className="text-right p-3 font-medium">View</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s, idx) => (
                    <tr
                      key={s.user.id}
                      className="border-t hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelectedInspectorId(s.user.id)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                          <span className="font-medium">{s.user.name}</span>
                          <StatusBadge status={s.user.role} />
                        </div>
                      </td>
                      <td className="p-3 text-right font-semibold">{s.completed}</td>
                      <td className={cn("p-3 text-right font-bold", complianceColor(s.avgScore))}>{s.avgScore}%</td>
                      <td className="p-3 text-right text-amber-600">{s.pending}</td>
                      <td className="p-3 text-right text-rose-600">{s.returned}</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn("h-full",
                                s.complianceRate >= 85 ? "bg-emerald-500"
                                : s.complianceRate >= 70 ? "bg-amber-500"
                                : s.complianceRate >= 60 ? "bg-orange-500"
                                : "bg-rose-500"
                              )}
                              style={{ width: `${s.complianceRate}%` }}
                            />
                          </div>
                          <span className="font-medium">{s.complianceRate}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <ChevronRight className="h-4 w-4 inline text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                      {selected.user.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {selected.user.name}'s Recent Inspections
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {selected.completed} completed · {selected.pending} pending · {selected.avgScore}% avg
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedInspectorId(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto divide-y">
              {selectedInsps.map((i) => (
                <button
                  key={i.id}
                  onClick={() => goToInspection(i.id)}
                  className="w-full text-left p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{i.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {i.location?.name ?? "—"} · {fmtDate(i.scheduledDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {i.compliancePercent != null && (
                        <span className={cn("text-sm font-bold", complianceColor(i.compliancePercent))}>
                          {i.compliancePercent}%
                        </span>
                      )}
                      <StatusBadge status={i.status} label={INSPECTION_STATUS[i.status] ?? i.status} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
