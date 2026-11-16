"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw, Pencil,
  Plus, Layers, TrendingUp, Target, Save, Loader2, Lock, Gauge,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState,
} from "@/components/shared"
import { useApi, useCreate, apiPut } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import { SEVERITY_LABELS } from "@/lib/labels"
import type { HygieneCategory, Inspection } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SettingsMap {
  COMPLIANCE_THRESHOLD?: string
  CRITICAL_VIOLATION_THRESHOLD?: string
  CAPA_OVERDUE_DAYS?: string
  SELF_APPROVAL_PREVENTED?: string
  [k: string]: string | undefined
}

const SEVERITY_DEFS: {
  key: string
  label: string
  description: string
  color: string
  dot: string
}[] = [
  { key: "CRITICAL", label: "Critical", description: "Immediate risk to health, safety or compliance — escalates directly to CAPA with priority handling", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", dot: "bg-rose-500" },
  { key: "HIGH", label: "High", description: "Significant deficiency requiring corrective action within the standard SLA window", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", dot: "bg-orange-500" },
  { key: "MEDIUM", label: "Medium", description: "Moderate issue — schedule corrective work during the next routine cycle", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", dot: "bg-amber-500" },
  { key: "LOW", label: "Low", description: "Minor observation — log for continuous improvement tracking", color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", dot: "bg-sky-500" },
]

export function StandardsModule() {
  const { can } = usePermissions()
  const canManageThresholds = can("standards:manage")
  const canManageCategories = can("categories:manage")

  const { data: settings, isLoading: sLoading, refetch: refetchSettings } = useApi<SettingsMap>(
    ["settings", "standards"],
    "/api/settings",
  )
  const { data: categories, isLoading: cLoading, refetch: refetchCategories } = useApi<HygieneCategory[]>(
    ["categories", "standards"],
    "/api/categories",
    can("categories:view"),
  )
  const { data: inspections } = useApi<Inspection[]>(
    ["inspections", "standards"],
    "/api/inspections",
  )

  const isLoading = sLoading || cLoading

  const complianceThreshold = Number(settings?.COMPLIANCE_THRESHOLD ?? 85)
  const criticalThreshold = Number(settings?.CRITICAL_VIOLATION_THRESHOLD ?? 60)

  const categoryStats = useMemo(() => {
    const list = categories ?? []
    return list.map((c) => {
      const items: { response?: string; severity?: string }[] = []
      for (const insp of inspections ?? []) {
        for (const item of insp.items ?? []) {
          if (item.templateItem?.categoryId === c.id) {
            items.push({ response: item.response ?? undefined, severity: item.severity ?? undefined })
          }
        }
      }
      const total = items.filter((i) => i.response).length
      const compliant = items.filter((i) => i.response === "COMPLIANT").length
      const violations = items.filter((i) => i.response === "NON_COMPLIANT").length
      const avgScore = total ? Math.round((compliant / total) * 100) : 0
      return { category: c, total, compliant, violations, avgScore }
    })
  }, [categories, inspections])

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Hygiene Standards"
        description="Compliance thresholds, hygiene category performance and severity configuration"
        action={
          <Button variant="outline" size="sm" onClick={() => { refetchSettings(); refetchCategories() }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {/* Compliance Thresholds */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                Compliance Thresholds
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                System-wide cut-offs used to flag inspections, raise alerts and trigger CAPA workflows
              </CardDescription>
            </div>
            {canManageThresholds && (
              <ThresholdEditDialog
                settings={settings ?? {}}
                onSaved={() => refetchSettings()}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <ThresholdCard
                title="Compliance Threshold"
                description="Inspections scoring below this value are flagged as non-compliant and raise a low-score alert"
                value={complianceThreshold}
                unit="%"
                icon={ShieldCheck}
                color="emerald"
              />
              <ThresholdCard
                title="Critical Violation Threshold"
                description="Inspections scoring below this value trigger an immediate critical violation and CAPA escalation"
                value={criticalThreshold}
                unit="%"
                icon={ShieldAlert}
                color="rose"
              />
            </div>
          )}
          {/* Visual gauge */}
          <div className="mt-4 rounded-lg border p-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                Compliance scale
              </span>
              <span className="text-muted-foreground">0% → 100%</span>
            </div>
            <div className="relative h-4 w-full rounded-full overflow-hidden flex">
              <div className="bg-rose-500 flex items-center justify-center" style={{ width: `${criticalThreshold}%` }} title={`Critical: <${criticalThreshold}%`}>
                <span className="text-[9px] text-white font-medium">Critical</span>
              </div>
              <div className="bg-orange-500" style={{ width: `${Math.max(complianceThreshold - criticalThreshold, 0)}%` }} title={`At risk: ${criticalThreshold}–${complianceThreshold}%`} />
              <div className="bg-emerald-500 flex items-center justify-center" style={{ width: `${Math.max(100 - complianceThreshold, 0)}%` }} title={`Compliant: ≥${complianceThreshold}%`}>
                <span className="text-[9px] text-white font-medium">Compliant</span>
              </div>
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>0</span>
              <span className="text-rose-600">{criticalThreshold}</span>
              <span className="text-emerald-600">{complianceThreshold}</span>
              <span>100</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Severity Levels */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Severity Levels
          </CardTitle>
          <CardDescription className="text-xs">
            Standardised severity classification for non-compliance findings, CAPAs and defects
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SEVERITY_DEFS.map((s) => (
              <div key={s.key} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-3 w-3 rounded-full", s.dot)} />
                    <span className="text-sm font-semibold">{s.label}</span>
                  </div>
                  <StatusBadge status={s.key} />
                </div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Performance */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                Hygiene Categories
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {categoryStats.length} categories with compliance performance from completed inspections
              </CardDescription>
            </div>
            {canManageCategories && (
              <CategoryCreateDialog onSaved={() => refetchCategories()} />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : categoryStats.length === 0 ? (
            <EmptyState title="No categories" description="No hygiene categories configured yet." icon={Layers} />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">Description</th>
                    <th className="text-right p-3 font-medium">Inspected</th>
                    <th className="text-right p-3 font-medium">Compliant</th>
                    <th className="text-right p-3 font-medium">Violations</th>
                    <th className="text-right p-3 font-medium">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryStats.map((s) => (
                    <tr key={s.category.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 font-medium">{s.category.name}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell max-w-xs truncate">
                        {s.category.description ?? "—"}
                      </td>
                      <td className="p-3 text-right">{s.total}</td>
                      <td className="p-3 text-right text-emerald-600">{s.compliant}</td>
                      <td className="p-3 text-right text-rose-600">{s.violations}</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full",
                                s.avgScore >= complianceThreshold ? "bg-emerald-500"
                                : s.avgScore >= 70 ? "bg-amber-500"
                                : s.avgScore >= criticalThreshold ? "bg-orange-500"
                                : "bg-rose-500",
                              )}
                              style={{ width: `${s.avgScore}%` }}
                            />
                          </div>
                          <span className={cn(
                            "font-semibold",
                            s.avgScore >= complianceThreshold ? "text-emerald-600"
                            : s.avgScore >= 70 ? "text-amber-600"
                            : s.avgScore >= criticalThreshold ? "text-orange-600"
                            : "text-rose-600",
                          )}>
                            {s.avgScore}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!canManageThresholds && !canManageCategories && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-900">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              You have read-only access to standards. Editing thresholds requires <code className="font-mono text-xs">standards:manage</code> and category management requires <code className="font-mono text-xs">categories:manage</code>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================
// Threshold Card
// ============================================================

function ThresholdCard({
  title, description, value, unit, icon: Icon, color,
}: {
  title: string
  description: string
  value: number
  unit: string
  icon: typeof ShieldCheck
  color: "emerald" | "rose" | "amber" | "orange"
}) {
  const colors = {
    emerald: { bg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300", bar: "bg-emerald-500", text: "text-emerald-600" },
    rose: { bg: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300", bar: "bg-rose-500", text: "text-rose-600" },
    amber: { bg: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300", bar: "bg-amber-500", text: "text-amber-600" },
    orange: { bg: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300", bar: "bg-orange-500", text: "text-orange-600" },
  }
  const c = colors[color]
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", c.bg)}>
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-sm font-semibold">{title}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="mt-3 flex items-end gap-1">
        <span className={cn("text-3xl font-bold", c.text)}>{value}</span>
        <span className="text-sm text-muted-foreground pb-1">{unit}</span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full", c.bar)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

// ============================================================
// Threshold Edit Dialog
// ============================================================

function ThresholdEditDialog({ settings, onSaved }: { settings: SettingsMap; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [compliance, setCompliance] = useState(settings.COMPLIANCE_THRESHOLD ?? "85")
  const [critical, setCritical] = useState(settings.CRITICAL_VIOLATION_THRESHOLD ?? "60")
  const [overdue, setOverdue] = useState(settings.CAPA_OVERDUE_DAYS ?? "7")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setCompliance(settings.COMPLIANCE_THRESHOLD ?? "85")
      setCritical(settings.CRITICAL_VIOLATION_THRESHOLD ?? "60")
      setOverdue(settings.CAPA_OVERDUE_DAYS ?? "7")
    }
  }, [open, settings])

  const save = async () => {
    setSaving(true)
    try {
      await apiPut("/api/settings", {
        COMPLIANCE_THRESHOLD: compliance,
        CRITICAL_VIOLATION_THRESHOLD: critical,
        CAPA_OVERDUE_DAYS: overdue,
      })
      onSaved()
      setOpen(false)
    } catch {
      toast.error("Failed to update thresholds")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4 mr-2" />
        Edit Thresholds
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Compliance Thresholds</DialogTitle>
            <DialogDescription>Changes apply immediately to all new inspections and CAPAs.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Compliance threshold (%)</Label>
              <Input type="number" value={compliance} onChange={(e) => setCompliance(e.target.value)} className="mt-1" min={0} max={100} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Critical violation threshold (%)</Label>
              <Input type="number" value={critical} onChange={(e) => setCritical(e.target.value)} className="mt-1" min={0} max={100} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">CAPA overdue window (days)</Label>
              <Input type="number" value={overdue} onChange={(e) => setOverdue(e.target.value)} className="mt-1" min={1} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Thresholds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================
// Category Create Dialog
// ============================================================

function CategoryCreateDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const createMut = useCreate<HygieneCategory>("/api/categories", [["categories", "standards"]])

  const submit = () => {
    if (!name.trim()) {
      toast.error("Name is required")
      return
    }
    createMut.mutate(
      { name: name.trim(), description: description.trim() || undefined } as any,
      {
        onSuccess: () => {
          setOpen(false)
          setName("")
          setDescription("")
          onSaved()
        },
      },
    )
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Category
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Hygiene Category</DialogTitle>
            <DialogDescription>Create a new category for inspection checklists and CAPAs.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="e.g. Personal Hygiene" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description (optional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={createMut.isPending}>
              {createMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
