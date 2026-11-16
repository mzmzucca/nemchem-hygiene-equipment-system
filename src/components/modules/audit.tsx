"use client"

import { useMemo, useState } from "react"
import {
  ShieldAlert, RefreshCw, Filter, History, AlertTriangle,
  Eye, Clock, User as UserIcon, Building2, ChevronRight, FileJson,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDateTime,
} from "@/components/shared"
import { useApi } from "@/hooks/use-api"
import type { AuditLog } from "@/lib/types"
import { cn } from "@/lib/utils"

const ENTITY_TYPES = ["Inspection", "CAPA", "Defect", "User", "Template", "Location", "SystemSetting", "Message"]
const ACTIONS = ["CREATE", "UPDATE", "DELETE", "STATUS_CHANGE", "APPROVE", "RETURN", "ASSIGN", "LOGIN", "EXPORT"]

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  UPDATE: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  DELETE: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  STATUS_CHANGE: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  APPROVE: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  RETURN: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  ASSIGN: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  LOGIN: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
  EXPORT: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", ACTION_COLORS[action] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300")}>
      {action.replace(/_/g, " ")}
    </span>
  )
}

export function AuditModule() {
  const [entityType, setEntityType] = useState<string>("ALL")
  const [action, setAction] = useState<string>("ALL")
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")
  const [selected, setSelected] = useState<AuditLog | null>(null)

  const params = new URLSearchParams()
  if (entityType !== "ALL") params.set("entityType", entityType)
  if (action !== "ALL") params.set("action", action)
  if (from) params.set("from", from)
  if (to) params.set("to", to + "T23:59:59")
  params.set("limit", "300")

  const { data: logs, isLoading, refetch, isFetching } = useApi<AuditLog[]>(
    ["audit", entityType, action, from, to],
    `/api/audit?${params.toString()}`,
  )

  const kpis = useMemo(() => {
    const all = logs ?? []
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)
    return {
      total: all.length,
      today: all.filter((l) => new Date(l.createdAt) >= todayStart).length,
      thisWeek: all.filter((l) => new Date(l.createdAt) >= weekStart).length,
    }
  }, [logs])

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Audit Trail"
        description="Immutable, append-only record of every system action for compliance and traceability"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        <KpiCard title="Total Entries" value={kpis.total} icon={History} accent="teal" hint="Matching current filter" />
        <KpiCard title="Today" value={kpis.today} icon={Clock} accent="amber" />
        <KpiCard title="This Week" value={kpis.thisWeek} icon={ShieldAlert} accent="violet" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All entities" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All entities</SelectItem>
                  {ENTITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Action</Label>
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
            <Button variant="outline" size="sm" onClick={() => { setEntityType("ALL"); setAction("ALL"); setFrom(""); setTo("") }}>
              <Filter className="h-4 w-4 mr-2" /> Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : !logs || logs.length === 0 ? (
            <EmptyState title="No audit entries" description="No log entries match the current filters." icon={History} />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-3 font-medium">Timestamp</th>
                    <th className="text-left p-3 font-medium">User</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Action</th>
                    <th className="text-left p-3 font-medium">Entity</th>
                    <th className="text-left p-3 font-medium">Entity ID</th>
                    <th className="text-left p-3 font-medium">Reason</th>
                    <th className="text-right p-3 font-medium">View</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr
                      key={l.id}
                      className="border-t hover:bg-muted/30 cursor-pointer"
                      onClick={() => setSelected(l)}
                    >
                      <td className="p-3 whitespace-nowrap text-muted-foreground">{fmtDateTime(l.createdAt)}</td>
                      <td className="p-3 font-medium">{l.userId ? (l as any).user?.name ?? "Unknown" : "System"}</td>
                      <td className="p-3">{l.userRole ? <StatusBadge status={l.userRole} /> : "—"}</td>
                      <td className="p-3"><ActionBadge action={l.action} /></td>
                      <td className="p-3">{l.entityType}</td>
                      <td className="p-3 font-mono text-[10px] text-muted-foreground">{l.entityId ? l.entityId.slice(-8) : "—"}</td>
                      <td className="p-3 max-w-xs truncate text-muted-foreground">{l.reason ?? "—"}</td>
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

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5" />
        Read-only module — audit entries cannot be modified or deleted.
      </p>

      {selected && <DetailDialog log={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

// ============================================================
// Detail Dialog with before/after JSON
// ============================================================

function DetailDialog({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  const before = useMemo(() => {
    try { return log.before ? JSON.stringify(JSON.parse(log.before), null, 2) : null } catch { return log.before ?? null }
  }, [log])
  const after = useMemo(() => {
    try { return log.after ? JSON.stringify(JSON.parse(log.after), null, 2) : null } catch { return log.after ?? null }
  }, [log])

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Audit Entry Detail
          </DialogTitle>
          <DialogDescription>
            {log.action.replace(/_/g, " ")} on {log.entityType} — {fmtDateTime(log.createdAt)}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-2">
          <div className="space-y-4">
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              <InfoTile label="User" value={(log as any).user?.name ?? (log.userId ? "Unknown" : "System")} icon={UserIcon} />
              <InfoTile label="Role" value={log.userRole ?? "—"} />
              <InfoTile label="Action" value={log.action.replace(/_/g, " ")} />
              <InfoTile label="Entity Type" value={log.entityType} icon={Building2} />
            </div>
            {log.entityId && (
              <div className="rounded-md border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground mb-1">Entity ID</p>
                <p className="font-mono text-xs break-all">{log.entityId}</p>
              </div>
            )}
            {log.reason && (
              <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">Reason</p>
                <p className="text-sm">{log.reason}</p>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <JsonPanel title="Before" data={before} accent="rose" />
              <JsonPanel title="After" data={after} accent="emerald" />
            </div>
            {!before && !after && (
              <EmptyState title="No payload captured" description="This audit entry did not record before/after data." icon={FileJson} />
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function InfoTile({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="rounded-md border p-2.5">
      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <p className="text-sm font-medium truncate mt-0.5">{value}</p>
    </div>
  )
}

function JsonPanel({ title, data, accent }: { title: string; data: string | null; accent: "rose" | "emerald" }) {
  const colors = {
    rose: "border-rose-200 bg-rose-50 dark:bg-rose-900/10 dark:border-rose-900",
    emerald: "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900",
  }
  return (
    <div className={cn("rounded-md border p-3", colors[accent])}>
      <p className="text-xs font-semibold mb-2">{title}</p>
      {data ? (
        <pre className="text-[11px] font-mono whitespace-pre-wrap break-all max-h-60 overflow-y-auto">{data}</pre>
      ) : (
        <p className="text-xs text-muted-foreground italic">No data</p>
      )}
    </div>
  )
}
