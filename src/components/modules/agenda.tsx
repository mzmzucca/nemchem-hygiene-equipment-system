"use client"

import { useMemo, useState } from "react"
import {
  CalendarDays, RefreshCw, ChevronLeft, ChevronRight,
  LayoutGrid, List, ClipboardCheck, MapPin, User as UserIcon,
  Clock, Filter,
} from "lucide-react"
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, isSameMonth, isSameDay, format,
  eachDayOfInterval,
} from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDate, fmtDateTime,
} from "@/components/shared"
import { useApi } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import { useNav } from "@/lib/nav-store"
import { INSPECTION_STATUS } from "@/lib/labels"
import type { Inspection, User } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-amber-500",
  ASSIGNED: "bg-sky-500",
  ACCEPTED: "bg-sky-500",
  IN_PROGRESS: "bg-violet-500",
  DRAFT: "bg-zinc-400",
  SUBMITTED: "bg-teal-500",
  UNDER_REVIEW: "bg-orange-500",
  RETURNED: "bg-rose-500",
  DECLINED: "bg-rose-500",
  APPROVED: "bg-emerald-500",
  CLOSED: "bg-emerald-500",
}

export function AgendaModule() {
  const { can } = usePermissions()
  const [cursor, setCursor] = useState<Date>(new Date())
  const [view, setView] = useState<"calendar" | "list">("calendar")
  const [inspectorFilter, setInspectorFilter] = useState<string>("ALL")
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const { data: users } = useApi<User[]>(["users", "inspectors"], "/api/users?role=INSPECTOR", can("users:view"))

  // Build date params for the visible month (with overflow weeks)
  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const params = new URLSearchParams()
  params.set("from", calStart.toISOString().slice(0, 10))
  params.set("to", calEnd.toISOString().slice(0, 10))

  const { data: inspections, isLoading, refetch, isFetching } = useApi<Inspection[]>(
    ["agenda", "inspections", params.toString()],
    `/api/inspections?${params.toString()}`,
  )

  const filtered = useMemo(() => {
    const list = inspections ?? []
    if (inspectorFilter === "ALL") return list
    return list.filter((i) => i.inspectorId === inspectorFilter)
  }, [inspections, inspectorFilter])

  // Group by day
  const byDay = useMemo(() => {
    const map: Record<string, Inspection[]> = {}
    for (const i of filtered) {
      const key = format(new Date(i.scheduledDate), "yyyy-MM-dd")
      if (!map[key]) map[key] = []
      map[key].push(i)
    }
    return map
  }, [filtered])

  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const selectedDayKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null
  const selectedDayInspections = selectedDayKey ? (byDay[selectedDayKey] ?? []) : []

  const monthTotal = filtered.filter((i) => isSameMonth(new Date(i.scheduledDate), cursor)).length

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Inspection Agenda"
        description="Monthly calendar of scheduled inspections — plan capacity and track coverage"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <div className="inline-flex rounded-md border overflow-hidden">
              <Button
                size="sm"
                variant={view === "calendar" ? "default" : "ghost"}
                onClick={() => setView("calendar")}
                className="rounded-none"
              >
                <LayoutGrid className="h-4 w-4 mr-1.5" /> Calendar
              </Button>
              <Button
                size="sm"
                variant={view === "list" ? "default" : "ghost"}
                onClick={() => setView("list")}
                className="rounded-none"
              >
                <List className="h-4 w-4 mr-1.5" /> List
              </Button>
            </div>
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard title="This Month" value={monthTotal} icon={CalendarDays} accent="teal" />
        <KpiCard title="Pending" value={filtered.filter((i) => i.status === "PENDING").length} icon={Clock} accent="amber" />
        <KpiCard title="In Progress" value={filtered.filter((i) => i.status === "IN_PROGRESS").length} icon={ClipboardCheck} accent="violet" />
        <KpiCard title="Completed" value={filtered.filter((i) => ["APPROVED", "CLOSED"].includes(i.status)).length} icon={ClipboardCheck} accent="emerald" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 min-w-0">
              <Label>Inspector</Label>
              <Select value={inspectorFilter} onValueChange={setInspectorFilter}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All inspectors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All inspectors</SelectItem>
                  {(users ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {inspectorFilter !== "ALL" && (
              <Button variant="outline" size="sm" onClick={() => setInspectorFilter("ALL")}>
                <Filter className="h-4 w-4 mr-2" /> Clear filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {view === "calendar" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    {format(cursor, "MMMM yyyy")}
                  </CardTitle>
                  <CardDescription className="text-xs">Click a day to view scheduled inspections</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>
                    Today
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => setCursor((c) => addMonths(c, -1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => setCursor((c) => addMonths(c, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <Skeleton className="h-72" />
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                      {d}
                    </div>
                  ))}
                  {days.map((day) => {
                    const key = format(day, "yyyy-MM-dd")
                    const dayInsps = byDay[key] ?? []
                    const inMonth = isSameMonth(day, cursor)
                    const isToday = isSameDay(day, new Date())
                    const isSelected = selectedDay && isSameDay(day, selectedDay)
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedDay(day)}
                        className={cn(
                          "min-h-[64px] sm:min-h-[80px] rounded-md border p-1 text-left transition-colors",
                          inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground",
                          isSelected && "border-teal-500 ring-1 ring-teal-500",
                          isToday && !isSelected && "border-amber-400",
                          "hover:bg-muted/50",
                        )}
                      >
                        <div className={cn(
                          "text-xs font-medium",
                          isToday && "inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white",
                        )}>
                          {format(day, "d")}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {dayInsps.slice(0, 5).map((i) => (
                            <span
                              key={i.id}
                              className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[i.status] ?? "bg-zinc-400")}
                              title={`${i.title} — ${INSPECTION_STATUS[i.status] ?? i.status}`}
                            />
                          ))}
                          {dayInsps.length > 5 && (
                            <span className="text-[9px] text-muted-foreground">+{dayInsps.length - 5}</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selectedDay ? format(selectedDay, "EEEE, d MMM") : "Select a day"}
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedDayInspections.length} inspection{selectedDayInspections.length === 1 ? "" : "s"} scheduled
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {!selectedDay ? (
                <EmptyState title="No day selected" description="Click any day on the calendar to view its inspections." icon={CalendarDays} />
              ) : selectedDayInspections.length === 0 ? (
                <EmptyState title="Nothing scheduled" description="No inspections booked for this day." icon={ClipboardCheck} />
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {selectedDayInspections.map((i) => (
                    <DayInspectionCard key={i.id} inspection={i} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState title="No inspections" description="Nothing scheduled in this date range." icon={CalendarDays} />
            ) : (
              <div className="max-h-[60vh] overflow-y-auto divide-y">
                {[...filtered]
                  .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                  .map((i) => <DayInspectionCard key={i.id} inspection={i} expanded />)}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("text-xs font-medium text-muted-foreground", className)}>{children}</span>
}

function DayInspectionCard({ inspection: i, expanded }: { inspection: Inspection; expanded?: boolean }) {
  const { goToInspection } = useNav()
  return (
    <button
      onClick={() => goToInspection(i.id)}
      className={cn(
        "w-full text-left p-3 rounded-md border transition-colors hover:bg-muted/30",
        expanded ? "" : "bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{i.title}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {i.location?.name ?? "—"}
            </span>
            <span className="flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              {i.inspector?.name ?? "Unassigned"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {fmtDateTime(i.scheduledDate)}
            </span>
          </div>
        </div>
        <StatusBadge status={i.status} label={INSPECTION_STATUS[i.status] ?? i.status} />
      </div>
    </button>
  )
}
