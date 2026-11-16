"use client"

import { useMemo, useState } from "react"
import {
  Settings as SettingsIcon, RefreshCw, Save, Loader2,
  ShieldCheck, ShieldAlert, CalendarClock, UserCheck,
  Database, Info, Users, Server, Lock,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { SectionTitle } from "@/components/shared"
import { useApi, apiPut } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import type { User } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SettingsMap {
  COMPLIANCE_THRESHOLD?: string
  CRITICAL_VIOLATION_THRESHOLD?: string
  CAPA_OVERDUE_DAYS?: string
  SELF_APPROVAL_PREVENTED?: string
  [k: string]: string | undefined
}

const SETTING_DEFS: {
  key: keyof SettingsMap
  label: string
  description: string
  type: "number" | "switch"
  unit?: string
}[] = [
  {
    key: "COMPLIANCE_THRESHOLD",
    label: "Compliance Threshold",
    description: "Minimum compliance % required for an inspection to be considered passing. Locations / inspections below this value raise alerts.",
    type: "number",
    unit: "%",
  },
  {
    key: "CRITICAL_VIOLATION_THRESHOLD",
    label: "Critical Violation Threshold",
    description: "Compliance % below which an inspection is flagged as a critical violation requiring immediate CAPA.",
    type: "number",
    unit: "%",
  },
  {
    key: "CAPA_OVERDUE_DAYS",
    label: "CAPA Overdue Window",
    description: "Number of days after the target date before an open CAPA is flagged as overdue.",
    type: "number",
    unit: "days",
  },
  {
    key: "SELF_APPROVAL_PREVENTED",
    label: "Prevent Self-Approval",
    description: "When enabled, the inspector who submitted an inspection cannot approve it themselves — enforces segregation of duties.",
    type: "switch",
  },
]

export function SettingsModule() {
  const { can } = usePermissions()
  const canManage = can("settings:manage")

  const { data: settings, isLoading, refetch, isFetching } = useApi<SettingsMap>(
    ["settings"],
    "/api/settings",
  )
  const { data: users } = useApi<User[]>(["users", "list"], "/api/users", can("users:view"))

  // Local editable draft. We track the last-synced settings key so we can
  // re-derive the draft whenever the server data changes (React's
  // "adjusting state during render" pattern — permitted by the lint rule).
  const [draft, setDraft] = useState<SettingsMap>({})
  const [lastSynced, setLastSynced] = useState<string>("")
  const settingsKey = JSON.stringify(settings ?? {})
  if (settings && settingsKey !== lastSynced) {
    setLastSynced(settingsKey)
    setDraft({ ...settings })
  }

  const dirty = useMemo(() => {
    if (!settings) return false
    return SETTING_DEFS.some((d) => (draft[d.key] ?? "") !== (settings[d.key] ?? ""))
  }, [settings, draft])

  const save = async () => {
    if (!settings) return
    const updates: Record<string, string> = {}
    for (const def of SETTING_DEFS) {
      const newVal = draft[def.key] ?? ""
      const oldVal = settings[def.key] ?? ""
      if (newVal !== oldVal) {
        updates[def.key] = String(newVal)
      }
    }
    if (Object.keys(updates).length === 0) {
      toast.info("Nothing to save")
      return
    }
    try {
      await apiPut("/api/settings", updates)
      refetch()
    } catch {
      toast.error("Failed to save settings")
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SectionTitle title="System Settings" description="Configure compliance thresholds and operational rules" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="System Settings"
        description="Configure company-wide compliance thresholds, CAPA rules and approval policies"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            {canManage && (
              <Button size="sm" onClick={save} disabled={!dirty}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            )}
          </div>
        }
      />

      {!canManage && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Read-only view — you do not have permission to modify system settings (requires <code className="font-mono text-xs">settings:manage</code>).
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {SETTING_DEFS.map((def) => (
          <SettingCard
            key={def.key}
            def={def}
            value={draft[def.key] ?? ""}
            onChange={(v) => canManage && setDraft((d) => ({ ...d, [def.key]: v }))}
            readOnly={!canManage}
          />
        ))}
      </div>

      <SystemInformationCard users={users ?? []} />
    </div>
  )
}

function SettingCard({
  def, value, onChange, readOnly,
}: {
  def: typeof SETTING_DEFS[number]
  value: string
  onChange: (v: string) => void
  readOnly: boolean
}) {
  const icon = def.key === "COMPLIANCE_THRESHOLD" ? ShieldCheck
    : def.key === "CRITICAL_VIOLATION_THRESHOLD" ? ShieldAlert
    : def.key === "CAPA_OVERDUE_DAYS" ? CalendarClock
    : UserCheck

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <icon className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{def.label}</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">{def.description}</CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] shrink-0">{def.key}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {def.type === "number" ? (
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Current value</Label>
              <Input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={readOnly}
                className="mt-1"
              />
            </div>
            {def.unit && <span className="text-sm text-muted-foreground pb-2.5">{def.unit}</span>}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-muted-foreground">Current state</Label>
              <p className="text-sm font-medium mt-0.5">{value === "true" ? "Enabled" : "Disabled"}</p>
            </div>
            <Switch
              checked={value === "true"}
              onCheckedChange={(c) => onChange(c ? "true" : "false")}
              disabled={readOnly}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SystemInformationCard({ users }: { users: User[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">System Information</CardTitle>
        </div>
        <CardDescription className="text-xs">Read-only environment details.</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoTile label="Application" value="Hygiene Management System" icon={Info} />
          <InfoTile label="Version" value="v1.0.0" icon={SettingsIcon} />
          <InfoTile label="Database" value="SQLite (Prisma)" icon={Database} />
          <InfoTile label="Total Users" value={String(users.length)} icon={Users} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoTile label="Admins" value={String(users.filter((u) => u.role === "ADMIN").length)} icon={Users} />
          <InfoTile label="Executives" value={String(users.filter((u) => u.role === "CEO").length)} icon={Users} />
          <InfoTile label="Supervisors" value={String(users.filter((u) => u.role === "SUPERVISOR").length)} icon={Users} />
          <InfoTile label="Inspectors" value={String(users.filter((u) => u.role === "INSPECTOR").length)} icon={Users} />
        </div>
      </CardContent>
    </Card>
  )
}

function InfoTile({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Info }) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="text-sm font-medium mt-1 truncate">{value}</p>
    </div>
  )
}
