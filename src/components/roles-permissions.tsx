"use client"

import { useState, Fragment } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, X, ShieldCheck, Eye, EyeOff } from "lucide-react"
import {
  CAPABILITY_GROUPS, PERMISSIONS, ROLE_INFO, type Role,
} from "@/lib/permissions"
import { usePermissions } from "@/hooks/use-permissions"
import { cn } from "@/lib/utils"

const ROLES: Role[] = ["ADMIN", "MANAGER", "TECHNICIAN"]

export function RolesPermissionsButton() {
  const [open, setOpen] = useState(false)
  const { can } = usePermissions()

  // Only show the button if the user can view roles
  if (!can("roles:view")) return null

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-xs w-full justify-start"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Roles & Permissions
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Roles & Permissions Matrix
            </DialogTitle>
            <DialogDescription>
              What each user role can and cannot do across the system. This is the single source of truth enforced by both the UI and the API.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {/* Role summary cards */}
            <div className="grid gap-3 grid-cols-1 md:grid-cols-3 mb-6">
              {ROLES.map((r) => {
                const info = ROLE_INFO[r]
                const caps = PERMISSIONS[r]
                return (
                  <div
                    key={r}
                    className={cn("rounded-lg border p-4", r === "TECHNICIAN" ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10" : r === "MANAGER" ? "border-teal-200 bg-teal-50/50 dark:bg-teal-950/10" : "border-violet-200 bg-violet-50/50 dark:bg-violet-950/10")}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded", info.color)}>
                        {r}
                      </span>
                      <span className="text-xs text-muted-foreground">{caps.length} permissions</span>
                    </div>
                    <p className="text-sm font-medium">{info.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
                  </div>
                )
              })}
            </div>

            {/* Permission matrix table */}
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted z-10">
                  <tr>
                    <th className="text-left p-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Capability</th>
                    {ROLES.map((r) => (
                      <th key={r} className="text-center p-2 font-semibold text-xs w-24">
                        <span className={cn("inline-block px-2 py-0.5 rounded", ROLE_INFO[r].color)}>
                          {ROLE_INFO[r].label.split(" ")[0]}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CAPABILITY_GROUPS.map((group) => (
                    <Fragment key={group.group}>
                      <tr className="bg-muted/50">
                        <td colSpan={4} className="p-2 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                          {group.group}
                        </td>
                      </tr>
                      {group.capabilities.map((cap) => (
                        <tr key={cap.key} className="border-t">
                          <td className="p-2">
                            <p className="text-sm font-medium">{cap.label}</p>
                            <p className="text-xs text-muted-foreground">{cap.description}</p>
                          </td>
                          {ROLES.map((r) => {
                            const allowed = PERMISSIONS[r].includes(cap.key)
                            return (
                              <td key={r} className="text-center p-2">
                                {allowed ? (
                                  <Check className="h-4 w-4 text-emerald-600 inline" />
                                ) : (
                                  <X className="h-4 w-4 text-muted-foreground/40 inline" />
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>
                <strong>Technician data scoping:</strong> Technicians only see visits, inspections and stock
                assigned to them. The API filters by the authenticated user's ID — they cannot access
                other technicians' data even by guessing URLs.
              </p>
            </div>
            <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
              <EyeOff className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>
                <strong>Audit enforcement:</strong> Every correction, deletion, and status change is logged
                to the append-only AuditLog with the user's ID, role, and a timestamp.
              </p>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
