"use client"

import { useQuery } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { useNav } from "@/lib/nav-store"
import {
  CalendarDays, Clock, CheckCircle2, AlertTriangle, ClipboardCheck,
  Package, BatteryWarning, ChevronRight, MapPin, User,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SectionTitle, StatusBadge, EmptyState, fmtDate, fmtDateTime } from "@/components/shared"
import { VISIT_STATUS, VISIT_TYPE } from "@/lib/labels"
import { cn } from "@/lib/utils"
import type { Visit } from "@/lib/types"

interface TechData {
  visits: Visit[]
  todayCount: number
  pendingCount: number
  completedCount: number
  overdueCount: number
  upcomingCount: number
}

export function TechnicianDashboard() {
  const { data: session } = useSession()
  const { goToVisit, goToInspect } = useNav()
  const techId = (session?.user as any)?.id

  const { data, isLoading } = useQuery<TechData>({
    queryKey: ["tech-dashboard", techId],
    queryFn: async () => {
      // If no session (demo mode), load all visits as a fallback
      const url = techId ? `/api/visits?technicianId=${techId}` : `/api/visits?status=SCHEDULED`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed")
      const visits: Visit[] = await res.json()

      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

      return {
        visits: visits.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()),
        todayCount: visits.filter(v => {
          const d = new Date(v.scheduledDate)
          return d >= todayStart && d <= todayEnd
        }).length,
        pendingCount: visits.filter(v => v.status === "SCHEDULED" || v.status === "PENDING").length,
        completedCount: visits.filter(v => v.status === "COMPLETED").length,
        overdueCount: visits.filter(v => v.status === "OVERDUE").length,
        upcomingCount: visits.filter(v => v.status === "SCHEDULED" && new Date(v.scheduledDate) >= now).length,
      }
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionTitle title="My Dashboard" description="Loading your tasks…" />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4 h-24" /></Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return <EmptyState title="Unable to load your tasks" icon={AlertTriangle} />
  }

  const upcoming = data.visits.filter(v =>
    (v.status === "SCHEDULED" || v.status === "PENDING" || v.status === "OVERDUE") &&
    new Date(v.scheduledDate) <= new Date(Date.now() + 7 * 86400000)
  ).slice(0, 10)

  const recentCompleted = data.visits.filter(v => v.status === "COMPLETED").slice(0, 5)

  return (
    <div className="space-y-6">
      <SectionTitle
        title="My Dashboard"
        description="Your assigned visits, inspections and tasks"
      />

      {/* Task KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{data.todayCount}</p>
              </div>
              <CalendarDays className="h-5 w-5 text-sky-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{data.pendingCount}</p>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{data.overdueCount}</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{data.completedCount}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming visits with Start Inspection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            My Upcoming Visits
            <span className="text-xs font-normal text-muted-foreground">({upcoming.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming visits"
              description="You're all caught up — check back when new visits are assigned"
              icon={CheckCircle2}
            />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {upcoming.map((v) => {
                const isOverdue = v.status === "OVERDUE"
                const isToday = new Date(v.scheduledDate).toDateString() === new Date().toDateString()
                return (
                  <div
                    key={v.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                      isOverdue ? "border-rose-300 bg-rose-50 dark:bg-rose-950/20" :
                      isToday ? "border-sky-300 bg-sky-50 dark:bg-sky-950/20" :
                      "border-border"
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{v.customer?.name ?? "Unknown"}</p>
                        {isToday && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-semibold">TODAY</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{fmtDate(v.scheduledDate)}</span>
                        {v.scheduledTime && <span>{v.scheduledTime}</span>}
                        <span>·</span>
                        <span>{VISIT_TYPE[v.visitType] ?? v.visitType}</span>
                      </div>
                    </div>
                    <StatusBadge status={v.status} />
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => goToVisit(v.id)}
                      >
                        Details
                      </Button>
                      {(v.status === "SCHEDULED" || v.status === "PENDING" || v.status === "OVERDUE") && (
                        <Button
                          size="sm"
                          onClick={() => goToInspect(v.id)}
                        >
                          <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                          Inspect
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent completed */}
      {recentCompleted.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Recently Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentCompleted.map((v) => (
                <button
                  key={v.id}
                  onClick={() => goToVisit(v.id)}
                  className="w-full flex items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{v.customer?.name ?? "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{fmtDateTime(v.completedAt ?? v.scheduledDate)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
