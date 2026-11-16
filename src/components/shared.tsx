"use client"

import { cn } from "@/lib/utils"
import { statusColor } from "@/lib/labels"
import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        statusColor(status)
      )}
    >
      {label ?? status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  )
}

export function KpiCard({
  title, value, icon: Icon, hint, accent = "default",
}: {
  title: string
  value: string | number
  icon: LucideIcon
  hint?: string
  accent?: "default" | "emerald" | "amber" | "rose" | "violet" | "teal" | "orange" | "sky"
}) {
  const accents: Record<string, string> = {
    default: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300",
    violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300",
    teal: "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300",
    sky: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300",
  }
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
            {hint && <p className="mt-0.5 text-xs text-muted-foreground truncate">{hint}</p>}
          </div>
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", accents[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function SectionTitle({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ title, description, icon: Icon }: { title: string; description?: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="h-10 w-10 text-muted-foreground/40 mb-3" />}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </div>
  )
}

export function fmtDate(d?: string | Date | null) {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

export function fmtDateTime(d?: string | Date | null) {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}
