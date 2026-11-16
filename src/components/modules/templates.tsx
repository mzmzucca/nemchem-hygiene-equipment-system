"use client"

import { useEffect, useMemo, useState } from "react"
import {
  FileSpreadsheet, RefreshCw, ArrowLeft, Plus, Loader2, ChevronRight,
  CircleDashed, ListChecks, ClipboardList, Pencil, CheckCircle2,
  XCircle, Image as ImageIcon, Hash, Weight,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState,
} from "@/components/shared"
import type { InspectionTemplate, TemplateItem, HygieneCategory } from "@/lib/types"
import { useNav } from "@/lib/nav-store"
import { useApi, useCreate, apiPut } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import { cn } from "@/lib/utils"

const SCORING_METHODS: Record<string, string> = {
  COMPLIANCE: "Compliance (Yes/Partial/No)",
  SCORE: "Numeric Score",
  YES_NO: "Yes / No",
}

export function TemplatesModule() {
  const { selectedTemplateId } = useNav()
  if (selectedTemplateId) return <TemplateDetail />
  return <TemplatesList />
}

// ============================================================
// LIST VIEW
// ============================================================

function TemplatesList() {
  const { can } = usePermissions()
  const { goToTemplate } = useNav()
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const { data: templates, isLoading, refetch, isFetching } = useApi<InspectionTemplate[]>(
    ["templates", "list"],
    "/api/templates",
  )

  const filtered = useMemo(() => {
    const list = templates ?? []
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      (t.description ?? "").toLowerCase().includes(q)
    )
  }, [templates, search])

  const kpis = useMemo(() => {
    const all = templates ?? []
    return {
      total: all.length,
      active: all.filter((t) => t.isActive).length,
      items: all.reduce((s, t) => s + (t._count?.items ?? t.items?.length ?? 0), 0),
      inspections: all.reduce((s, t) => s + (t._count?.inspections ?? 0), 0),
    }
  }, [templates])

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Inspection Templates"
        description="Reusable checklist templates — define questions, scoring methods and category weights"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            {can("templates:manage") && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <KpiCard title="Templates" value={kpis.total} icon={FileSpreadsheet} accent="teal" />
        <KpiCard title="Active" value={kpis.active} icon={CheckCircle2} accent="emerald" />
        <KpiCard title="Total Items" value={kpis.items} icon={ListChecks} accent="violet" />
        <KpiCard title="Inspections" value={kpis.inspections} icon={ClipboardList} accent="orange" />
      </div>

      <Card>
        <CardContent className="p-4">
          <Label className="text-xs text-muted-foreground">Search</Label>
          <Input
            placeholder="Template name or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-1 max-w-md"
          />
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              title="No templates found"
              description="Create your first inspection template to begin."
              icon={CircleDashed}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => {
            const itemCount = t._count?.items ?? t.items?.length ?? 0
            const inspCount = t._count?.inspections ?? 0
            return (
              <Card
                key={t.id}
                className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                onClick={() => goToTemplate(t.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <StatusBadge status={t.isActive ? "ACTIVE" : "INACTIVE"} />
                  </div>
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{t.name}</h3>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                  )}
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <ListChecks className="h-3.5 w-3.5" />
                        {itemCount} items
                      </span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <ClipboardList className="h-3.5 w-3.5" />
                        {inspCount} inspections
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {createOpen && (
        <CreateTemplateDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </div>
  )
}

function CreateTemplateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const create = useCreate<InspectionTemplate>("/api/templates", [["templates", "list"]])
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Template name is required")
      return
    }
    try {
      const created = await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        isActive: true,
      } as Partial<InspectionTemplate>)
      setName("")
      setDescription("")
      onOpenChange(false)
      // Navigate to the new template's detail view to add items
      if (created?.id) {
        // Small delay to allow list refetch
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("nav-goToTemplate", { detail: created.id }))
        }, 100)
      }
    } catch {
      /* handled by mutation */
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Inspection Template</DialogTitle>
          <DialogDescription>
            Start with a name and description — you'll add checklist items in the next step.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="tpl-name">Name *</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hotel Kitchen Hygiene Audit"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="tpl-desc">Description</Label>
            <Textarea
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this template covers…"
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// DETAIL VIEW
// ============================================================

function TemplateDetail() {
  const { selectedTemplateId, selectTemplate, goToTemplate } = useNav()
  const { can } = usePermissions()
  const [itemDialog, setItemDialog] = useState<{ open: boolean; item: TemplateItem | null }>({ open: false, item: null })
  const [editTplOpen, setEditTplOpen] = useState(false)

  // Listen for navigation event from create dialog
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (id) goToTemplate(id)
    }
    window.addEventListener("nav-goToTemplate", handler)
    return () => window.removeEventListener("nav-goToTemplate", handler)
  }, [goToTemplate])

  const { data: template, isLoading, refetch, isFetching } = useApi<InspectionTemplate>(
    ["template", "detail", selectedTemplateId],
    `/api/templates/${selectedTemplateId}`,
  )
  const { data: categories } = useApi<HygieneCategory[]>(["categories", "list"], "/api/categories")

  const items = template?.items ?? []
  const canManage = can("templates:manage")

  const toggleActive = async () => {
    if (!template) return
    try {
      await apiPut(`/api/templates/${template.id}`, { isActive: !template.isActive })
      toast.success(`Template ${!template.isActive ? "activated" : "deactivated"}`)
      refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const saveItems = async (newItems: Array<Partial<TemplateItem>>) => {
    if (!template) return
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newItems.map((it, idx) => ({
          categoryId: it.categoryId,
          question: it.question,
          description: it.description ?? null,
          scoringMethod: it.scoringMethod ?? "COMPLIANCE",
          weight: typeof it.weight === "number" ? it.weight : 1.0,
          mandatory: it.mandatory ?? true,
          photoRequired: it.photoRequired ?? false,
          sortOrder: typeof it.sortOrder === "number" ? it.sortOrder : idx,
        })) }),
      })
      if (!res.ok) {
        const er = await res.json().catch(() => ({}))
        throw new Error(er.error || "Failed to save items")
      }
      toast.success("Items saved")
      refetch()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!template) return
    const remaining = items.filter((i) => i.id !== itemId).map((it, idx) => ({
      categoryId: it.categoryId,
      question: it.question,
      description: it.description,
      scoringMethod: it.scoringMethod,
      weight: it.weight,
      mandatory: it.mandatory,
      photoRequired: it.photoRequired,
      sortOrder: idx,
    }))
    await saveItems(remaining)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => selectTemplate(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => selectTemplate(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <EmptyState title="Template not found" icon={CircleDashed} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => selectTemplate(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Templates
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditTplOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleActive}
                className={template.isActive ? "text-amber-600" : "text-emerald-600"}
              >
                {template.isActive ? (
                  <><XCircle className="h-4 w-4 mr-2" /> Deactivate</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Activate</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={template.isActive ? "ACTIVE" : "INACTIVE"} />
                <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  {items.length} items
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  {template._count?.inspections ?? 0} inspections
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight">{template.name}</h1>
              {template.description && (
                <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
              )}
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setItemDialog({ open: true, item: null })}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Checklist Items</CardTitle>
          <CardDescription className="text-xs">
            Questions, scoring methods and weights that inspectors will complete.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <EmptyState
              title="No items yet"
              description={canManage ? "Click 'Add Item' to define your first checklist question." : undefined}
              icon={ListChecks}
            />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-1/3">Question</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Scoring</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Photo</TableHead>
                    <TableHead>Order</TableHead>
                    {canManage && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium text-sm">{it.question}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {it.category?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {SCORING_METHODS[it.scoringMethod] ?? it.scoringMethod}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-flex items-center gap-1">
                          <Weight className="h-3 w-3 text-muted-foreground" />
                          {it.weight}
                        </span>
                      </TableCell>
                      <TableCell>
                        {it.mandatory ? (
                          <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Required</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Optional</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {it.photoRequired ? (
                          <ImageIcon className="h-4 w-4 text-amber-600" />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Hash className="h-3 w-3" />
                          {it.sortOrder}
                        </span>
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setItemDialog({ open: true, item: it })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {itemDialog.open && (
        <ItemDialog
          open={itemDialog.open}
          onOpenChange={(o) => setItemDialog({ open: o, item: itemDialog.item })}
          item={itemDialog.item}
          categories={categories ?? []}
          nextOrder={items.length}
          onSave={async (data) => {
            if (itemDialog.item) {
              // Edit — replace this item in the list
              const updated = items.map((it) =>
                it.id === itemDialog.item!.id ? { ...it, ...data } : it
              ).map((it, idx) => ({
                categoryId: it.categoryId,
                question: it.question,
                description: it.description,
                scoringMethod: it.scoringMethod,
                weight: it.weight,
                mandatory: it.mandatory,
                photoRequired: it.photoRequired,
                sortOrder: idx,
              }))
              await saveItems(updated)
            } else {
              // Add new
              const newList = [
                ...items.map((it, idx) => ({
                  categoryId: it.categoryId,
                  question: it.question,
                  description: it.description,
                  scoringMethod: it.scoringMethod,
                  weight: it.weight,
                  mandatory: it.mandatory,
                  photoRequired: it.photoRequired,
                  sortOrder: idx,
                })),
                {
                  ...data,
                  sortOrder: items.length,
                },
              ]
              await saveItems(newList)
            }
            setItemDialog({ open: false, item: null })
          }}
        />
      )}

      {editTplOpen && (
        <EditTemplateDialog
          open={editTplOpen}
          onOpenChange={setEditTplOpen}
          template={template}
          onDone={() => refetch()}
        />
      )}
    </div>
  )
}

// ============================================================
// ITEM DIALOG (Add / Edit)
// ============================================================

interface ItemFormState {
  question: string
  description: string
  categoryId: string
  scoringMethod: string
  weight: string
  mandatory: boolean
  photoRequired: boolean
  sortOrder: string
}

function ItemDialog({
  open,
  onOpenChange,
  item,
  categories,
  nextOrder,
  onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  item: TemplateItem | null
  categories: HygieneCategory[]
  nextOrder: number
  onSave: (data: {
    question: string
    description?: string
    categoryId: string
    scoringMethod: string
    weight: number
    mandatory: boolean
    photoRequired: boolean
    sortOrder: number
  }) => Promise<void>
}) {
  const [form, setForm] = useState<ItemFormState>({
    question: "",
    description: "",
    categoryId: "",
    scoringMethod: "COMPLIANCE",
    weight: "1",
    mandatory: true,
    photoRequired: false,
    sortOrder: String(nextOrder),
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (item) {
        setForm({
          question: item.question,
          description: item.description ?? "",
          categoryId: item.categoryId,
          scoringMethod: item.scoringMethod,
          weight: String(item.weight),
          mandatory: item.mandatory,
          photoRequired: item.photoRequired,
          sortOrder: String(item.sortOrder),
        })
      } else {
        setForm({
          question: "",
          description: "",
          categoryId: categories[0]?.id ?? "",
          scoringMethod: "COMPLIANCE",
          weight: "1",
          mandatory: true,
          photoRequired: false,
          sortOrder: String(nextOrder),
        })
      }
    }
  }, [open, item, categories, nextOrder])

  const submit = async () => {
    if (!form.question.trim()) {
      toast.error("Question is required")
      return
    }
    if (!form.categoryId) {
      toast.error("Please select a category")
      return
    }
    setSaving(true)
    try {
      await onSave({
        question: form.question.trim(),
        description: form.description.trim() || undefined,
        categoryId: form.categoryId,
        scoringMethod: form.scoringMethod,
        weight: Number(form.weight) || 1,
        mandatory: form.mandatory,
        photoRequired: form.photoRequired,
        sortOrder: Number(form.sortOrder) || 0,
      })
    } catch {
      /* handled in onSave */
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add Checklist Item"}</DialogTitle>
          <DialogDescription>
            Define a question, the scoring method, and how it contributes to overall compliance.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="item-question">Question *</Label>
            <Textarea
              id="item-question"
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="e.g. Are all food contact surfaces cleaned and sanitized?"
              rows={2}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="item-desc">Description / Guidance</Label>
            <Textarea
              id="item-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Additional context or instructions for the inspector…"
              rows={2}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scoring Method</Label>
              <Select value={form.scoringMethod} onValueChange={(v) => setForm({ ...form, scoringMethod: v })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCORING_METHODS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="item-weight">Weight</Label>
              <Input
                id="item-weight"
                type="number"
                step="0.1"
                min="0"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="item-order">Sort Order</Label>
              <Input
                id="item-order"
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="item-mandatory"
                checked={form.mandatory}
                onCheckedChange={(v) => setForm({ ...form, mandatory: v === true })}
              />
              <Label htmlFor="item-mandatory" className="text-sm font-normal cursor-pointer">
                Mandatory (must be answered)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="item-photo"
                checked={form.photoRequired}
                onCheckedChange={(v) => setForm({ ...form, photoRequired: v })}
              />
              <Label htmlFor="item-photo" className="text-sm font-normal cursor-pointer">
                Photo Required
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {item ? "Save Changes" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================
// EDIT TEMPLATE DIALOG (name / description)
// ============================================================

function EditTemplateDialog({
  open,
  onOpenChange,
  template,
  onDone,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  template: InspectionTemplate
  onDone: () => void
}) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? "")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(template.name)
      setDescription(template.description ?? "")
    }
  }, [open, template])

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Template name is required")
      return
    }
    setSaving(true)
    try {
      await apiPut(`/api/templates/${template.id}`, {
        name: name.trim(),
        description: description.trim() || null,
      })
      toast.success("Template updated")
      onOpenChange(false)
      onDone()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>Update the template name and description.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="edt-name">Name *</Label>
            <Input
              id="edt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="edt-desc">Description</Label>
            <Textarea
              id="edt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
