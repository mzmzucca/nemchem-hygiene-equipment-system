"use client"

import { useMemo, useState, createElement } from "react"
import {
  Bell, RefreshCw, CheckCheck, CheckCircle2, CircleDashed,
  AlertTriangle, ShieldAlert, MessageSquare, ClipboardCheck,
  Wrench, Info, CalendarClock,
} from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  KpiCard, SectionTitle, EmptyState, fmtDateTime,
} from "@/components/shared"
import { useApi } from "@/hooks/use-api"
import type { Notification } from "@/lib/types"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationsResponse {
  items: Notification[]
  unreadCount: number
}

const TYPE_ICON: Record<string, LucideIcon> = {
  CRITICAL_VIOLATION: ShieldAlert,
  LOW_SCORE: AlertTriangle,
  REPEATED_NON_COMPLIANCE: AlertTriangle,
  OVERDUE_CAPA: CalendarClock,
  MISSED_INSPECTION: CalendarClock,
  DECLINING_COMPLIANCE: AlertTriangle,
  INSPECTION_ASSIGNED: ClipboardCheck,
  CAPA_ASSIGNED: Wrench,
  MESSAGE: MessageSquare,
  ANNOUNCEMENT: Info,
  DEFAULT: Bell,
}

const TYPE_ACCENT: Record<string, string> = {
  CRITICAL_VIOLATION: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300",
  LOW_SCORE: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
  REPEATED_NON_COMPLIANCE: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
  OVERDUE_CAPA: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300",
  MISSED_INSPECTION: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300",
  DECLINING_COMPLIANCE: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300",
  INSPECTION_ASSIGNED: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300",
  CAPA_ASSIGNED: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300",
  MESSAGE: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300",
  ANNOUNCEMENT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
}

function NotificationIcon({ type, className }: { type: string; className?: string }) {
  const Comp = TYPE_ICON[type] ?? TYPE_ICON.DEFAULT
  return createElement(Comp, { className })
}

function getAccent(type: string): string {
  return TYPE_ACCENT[type] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
}

export function NotificationsModule() {
  const [tab, setTab] = useState<"unread" | "all">("unread")
  const qc = useQueryClient()

  const { data, isLoading, refetch, isFetching } = useApi<NotificationsResponse>(
    ["notifications", tab],
    tab === "unread" ? "/api/notifications?unread=true" : "/api/notifications",
  )

  const items = data?.items ?? []
  const unread = data?.unreadCount ?? 0
  const total = items.length

  const markRead = async (ids: string[]) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("Marked as read")
      qc.invalidateQueries({ queryKey: ["notifications"] })
    } catch {
      toast.error("Failed to update notification")
    }
  }

  const markAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("All notifications marked as read")
      qc.invalidateQueries({ queryKey: ["notifications"] })
    } catch {
      toast.error("Failed to mark all as read")
    }
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Notifications"
        description="Your personalised activity feed — inspections, CAPAs, alerts and messages"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" onClick={markAllRead} disabled={unread === 0}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <KpiCard title="Unread" value={unread} icon={Bell} accent={unread > 0 ? "rose" : "emerald"} />
        <KpiCard title={tab === "unread" ? "Showing" : "Total"} value={total} icon={Info} accent="teal" />
        <KpiCard title="Status" value={unread === 0 ? "All caught up" : `${unread} pending`} icon={CheckCircle2} accent={unread === 0 ? "emerald" : "amber"} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "unread" | "all")}>
        <TabsList>
          <TabsTrigger value="unread" className="relative">
            Unread
            {unread > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">
                {unread}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  title={tab === "unread" ? "No unread notifications" : "No notifications yet"}
                  description={tab === "unread" ? "You are all caught up!" : "Notifications about your inspections and CAPAs will appear here."}
                  icon={Bell}
                />
              ) : (
                <div className="max-h-[60vh] overflow-y-auto divide-y">
                  {items.map((n) => (
                    <NotificationRow key={n.id} notification={n} onMarkRead={() => markRead([n.id])} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NotificationRow({ notification: n, onMarkRead }: { notification: Notification; onMarkRead: () => void }) {
  const accent = getAccent(n.type)

  return (
    <div className={cn("p-4 flex gap-3 transition-colors", !n.read ? "bg-muted/30" : "")}>
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", accent)}>
        <NotificationIcon type={n.type} className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-medium truncate", !n.read && "font-semibold")}>{n.title}</p>
          {!n.read ? (
            <span className="inline-flex items-center rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap">
              Unread
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Read
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CircleDashed className="h-3 w-3" />
            {fmtDateTime(n.createdAt)}
          </span>
          {!n.read && (
            <Button size="sm" variant="outline" onClick={onMarkRead}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Mark as Read
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
