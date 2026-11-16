"use client"

import { useMemo, useState } from "react"
import {
  Activity as ActivityIcon, RefreshCw, Filter, Clock,
  User as UserIcon, ChevronRight, TrendingUp, Zap,
  History, CircleDot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDateTime,
} from "@/components/shared"
import { useApi } from "@/hooks/use-api"
import { useNav } from "@/lib/nav-store"
import type { AuditLog } from "@/lib/types"
import { cn } from "@/lib/utils"

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "STATUS_CHANGE", "APPROVE", "RETURN", "ASSIGN", "LOGIN", "EXPORT"]

const ACTION_DOT: Record<string, string> = {
  CREATE: "bg-emerald-500",
  UPDATE: "bg-amber-500",
  DELETE: "bg-rose-500",
  STATUS_CHANGE: "bg-violet-500",
  APPROVE: "bg-teal-500",
  RETURN: "bg-orange-500",
  ASSIGN: "bg-sky-500",
  LOGIN: "bg-zinc-400",
  EXPORT: "bg-teal-500",
}

export function ActivityModule() {
  const { goToInspection } = useNav()
  const [action, setAction] = useState<string>("ALL")
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")

  const params = new URLSearchParams()
  if (action !== "ALL") params.set("action", action)
  if (from) params.set("from", from)
  if (to) params.set("to", to + "T23:59:59")
  params.set("limit", "100")

  const { data: logs, isLoading, refetch, isFetching } = useApi<AuditLog[]>(
    ["activity", action, from, to],
    `/api/audit?${params.toString()}`,
  )

  const kpis = useMemo(() => {
    const all = logs ?? []
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    const today = all.filter((l) => new Date(l.createdAt) >= todayStart).length
    const thisWeek = all.filter((l) => new Date(l.createdAt) >= weekStart).length

    // Most active user
    const userCounts: Record<string, { name: string; count: number }> = {}
    for (const l of all) {
      const name = (l as any).user?.name ?? "System"
      const id = l.userId ?? "system"
      if (!userCounts[id]) userCounts[id] = { name, count: 0 }
      userCounts[id].count += 1
    }
    const top = Object.values(userCounts).sort((a, b) => b.count - a.count)[0]
    return { today, thisWeek, top }
  }, [logs])

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Activity Timeline"
        description="Live feed of system events — inspections, CAPAs, approvals and configuration changes"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <KpiCard title="Actions Today" value={kpis.today} icon={Zap} accent="teal" />
        <KpiCard title="This Week" value={kpis.thisWeek} icon={TrendingUp} accent="violet" />
        <KpiCard title="Most Active" value={kpis.top?.name ?? "—"} icon={UserIcon} accent="amber" hint={kpis.top ? `${kpis.top.count} actions` : ""} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Action type</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All actions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All actions</SelectItem>
                  {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">From date</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1" />
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">To date</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1" />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setAction("ALL"); setFrom(""); setTo("") }}>
              <Filter className="h-4 w-4 mr-2" /> Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : !logs || logs.length === 0 ? (
            <EmptyState title="No activity" description="No audit entries match the current filters." icon={ActivityIcon} />
          ) : (
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <div className="relative">
                {/* Timeline spine */}
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                <div className="space-y-4">
                  {logs.map((l) => {
                    const dot = ACTION_DOT[l.action] ?? "bg-zinc-400"
                    const userName = (l as any).user?.name ?? "System"
                    const initials = userName.slice(0, 2).toUpperCase()
                    return (
                      <div key={l.id} className="relative flex gap-4 pl-0">
                        {/* Dot */}
                        <div className="relative z-10 flex-shrink-0">
                          <div className={cn("h-8 w-8 rounded-full ring-4 ring-background flex items-center justify-center", dot)}>
                            <CircleDot className="h-4 w-4 text-white" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[9px] bg-muted">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{userName}</span>
                            {l.userRole && <StatusBadge status={l.userRole} />}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {fmtDateTime(l.createdAt)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
                            <span className="text-muted-foreground">performed</span>
                            <span className={cn(
                              "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium",
                              "bg-muted",
                            )}>
                              {l.action.replace(/_/g, " ")}
                            </span>
                            <span className="text-muted-foreground">on</span>
                            <span className="font-medium">{l.entityType}</span>
                            {l.reason && (
                              <>
                                <span className="text-muted-foreground">—</span>
                                <span className="text-xs text-muted-foreground italic">{l.reason}</span>
                              </>
                            )}
                          </div>
                          {l.entityId && (
                            l.entityType === "Inspection" ? (
                              <button
                                onClick={() => goToInspection(l.entityId!)}
                                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline"
                              >
                                <ChevronRight className="h-3 w-3" />
                                View inspection
                              </button>
                            ) : (
                              <div className="mt-1.5 text-xs font-mono text-muted-foreground">
                                ID: {l.entityId.slice(-12)}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <History className="h-3.5 w-3.5" />
        Showing the most recent {logs?.length ?? 0} audit entries.
      </p>
    </div>
  )
}
