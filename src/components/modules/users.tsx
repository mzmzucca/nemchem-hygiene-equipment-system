"use client"

import { useMemo, useState } from "react"
import {
  RefreshCw, Plus, Loader2, ChevronRight, CircleDashed,
  Shield, Crown, UserCog, ClipboardCheck, Mail, Calendar,
  Search, KeyRound,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  StatusBadge, KpiCard, SectionTitle, EmptyState, fmtDate,
} from "@/components/shared"
import type { User } from "@/lib/types"
import { useApi, useCreate, useUpdate } from "@/hooks/use-api"
import { usePermissions } from "@/hooks/use-permissions"
import { ExportButton } from "@/components/export-button"
import { cn } from "@/lib/utils"

const ROLES = [
  { key: "ADMIN", label: "Administrator", icon: Shield, accent: "violet" as const },
  { key: "CEO", label: "Chief Executive", icon: Crown, accent: "teal" as const },
  { key: "SUPERVISOR", label: "Supervisor", icon: UserCog, accent: "amber" as const },
  { key: "INSPECTOR", label: "Inspector", icon: ClipboardCheck, accent: "sky" as const },
]

interface UserRow extends User {
  createdAt?: string
  _count?: {
    inspectionsCreated: number
    inspectionsAssigned: number
    capasAssigned: number
  }
}

export function UsersModule() {
  const { can } = usePermissions()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("ALL")
  const [activeFilter, setActiveFilter] = useState<string>("ALL")
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: users, isLoading, refetch, isFetching } = useApi<UserRow[]>(
    ["users", "list"],
    "/api/users",
  )

  const filtered = useMemo(() => {
    const list = users ?? []
    return list.filter((u) => {
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false
      if (activeFilter !== "ALL" && (activeFilter === "ACTIVE") !== u.active) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !u.name.toLowerCase().includes(q) &&
          !u.email.toLowerCase().includes(q) &&
          !(u.phone ?? "").toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [users, search, roleFilter, activeFilter])

  const roleCounts = useMemo(() => {
    const all = users ?? []
    return {
      admins: all.filter((u) => u.role === "ADMIN").length,
      ceos: all.filter((u) => u.role === "CEO").length,
      supervisors: all.filter((u) => u.role === "SUPERVISOR").length,
      inspectors: all.filter((u) => u.role === "INSPECTOR").length,
    }
  }, [users])

  return (
    <div className="space-y-6">
      <SectionTitle
        title="User Management"
        description="Manage system users, roles and access across the hygiene platform"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Refresh
            </Button>
            <ExportButton type="users" />
            {can("users:manage") && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            )}
          </div>
        }
      />

      {/* Role distribution KPIs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {ROLES.map((r) => {
          const count =
            r.key === "ADMIN" ? roleCounts.admins
            : r.key === "CEO" ? roleCounts.ceos
            : r.key === "SUPERVISOR" ? roleCounts.supervisors
            : roleCounts.inspectors
          return (
            <KpiCard
              key={r.key}
              title={r.label}
              value={count}
              icon={r.icon}
              accent={r.accent}
              hint={`${r.key} role`}
            />
          )
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="flex-1 min-w-0">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, email or phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-full md:w-44">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All roles</SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-44">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All users</SelectItem>
                  <SelectItem value="ACTIVE">Active only</SelectItem>
                  <SelectItem value="INACTIVE">Inactive only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No users found"
              description="Adjust your filters or add a new user."
              icon={CircleDashed}
            />
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-1/4">Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setEditing(u)}
                    >
                      <TableCell className="font-medium truncate max-w-xs">{u.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <StatusBadge status={u.role} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.phone ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={u.active ? "ACTIVE" : "INACTIVE"} />
                      </TableCell>
                      <TableCell className="text-sm">{fmtDate(u.createdAt)}</TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {createOpen && (
        <UserFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}
      {editing && (
        <UserFormDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          user={editing}
        />
      )}
    </div>
  )
}

// ============================================================
// CREATE / EDIT DIALOG (with detail view)
// ============================================================

interface UserFormState {
  name: string
  email: string
  password: string
  role: string
  phone: string
  active: boolean
}

function emptyForm(): UserFormState {
  return {
    name: "",
    email: "",
    password: "",
    role: "INSPECTOR",
    phone: "",
    active: true,
  }
}

function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  user?: UserRow
}) {
  const isEdit = !!user
  const create = useCreate<UserRow>("/api/users", [["users", "list"]])
  const update = useUpdate<UserRow>("/api/users", [["users", "list"]])
  const [form, setForm] = useState<UserFormState>(() =>
    user
      ? {
          name: user.name,
          email: user.email,
          password: "",
          role: user.role,
          phone: user.phone ?? "",
          active: user.active,
        }
      : emptyForm()
  )
  const [showPassword, setShowPassword] = useState(false)

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required")
      return
    }
    if (!isEdit && !form.password.trim()) {
      toast.error("Password is required for new users")
      return
    }
    try {
      if (isEdit && user) {
        const data: Partial<UserRow> = {
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role,
          phone: form.phone.trim() || undefined,
          active: form.active,
        }
        if (form.password.trim()) {
          ;(data as Record<string, unknown>).password = form.password
        }
        await update.mutateAsync({ id: user.id, data })
      } else {
        await create.mutateAsync({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
          phone: form.phone.trim() || undefined,
          active: form.active,
        } as Partial<UserRow>)
      }
      onOpenChange(false)
    } catch {
      /* handled by mutation */
    }
  }

  const saving = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `${user!.name}` : "Add New User"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Review profile details or update role and status." : "Create a new user account with a specific role."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isEdit && user && (
            <>
              {/* Profile summary */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <SummaryStat label="Inspections" value={user._count?.inspectionsCreated ?? 0} icon={ClipboardCheck} />
                <SummaryStat label="Assigned" value={user._count?.inspectionsAssigned ?? 0} icon={ClipboardCheck} />
                <SummaryStat label="CAPAs" value={user._count?.capasAssigned ?? 0} icon={Shield} />
              </div>
              <Separator />
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="usr-name">Name *</Label>
              <Input
                id="usr-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="usr-email">Email *</Label>
              <Input
                id="usr-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="usr-phone">Phone</Label>
              <Input
                id="usr-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+27…"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="usr-password">
              {isEdit ? "New Password (leave blank to keep current)" : "Password *"}
            </Label>
            <div className="relative mt-1">
              <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="usr-password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={isEdit ? "••••••••" : "Set a strong password"}
                className="pl-9"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="usr-active" className="text-sm font-medium cursor-pointer">Active Account</Label>
              <p className="text-xs text-muted-foreground">Inactive users cannot sign in</p>
            </div>
            <Switch
              id="usr-active"
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
          </div>

          {isEdit && user?.createdAt && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Joined {fmtDate(user.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {canUserManage() ? (
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? "Save Changes" : "Create User"}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function canUserManage(): boolean {
  // Hookless check for the dialog footer label.
  // The actual mutation is gated by the API on users:manage.
  return true
}

function SummaryStat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Shield }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  )
}
