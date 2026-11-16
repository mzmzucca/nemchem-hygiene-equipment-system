/**
 * Hygiene Management System — RBAC Permission Matrix
 *
 * Four roles with distinct capabilities:
 *   ADMIN       — System Administrator (full access)
 *   CEO         — Executive Oversight (company-wide visibility, no config)
 *   SUPERVISOR  — Operational Management (inspection operations)
 *   INSPECTOR   — Field Operations (own inspections only)
 */

export type Role = "ADMIN" | "CEO" | "SUPERVISOR" | "INSPECTOR"

export type Capability =
  // Dashboard
  | "dashboard:view"
  // Inspections
  | "inspections:view" | "inspections:create" | "inspections:assign"
  | "inspections:accept" | "inspections:decline" | "inspections:start"
  | "inspections:complete" | "inspections:saveDraft" | "inspections:submit"
  | "inspections:approve" | "inspections:return" | "inspections:close"
  | "inspections:reopen" | "inspections:delete" | "inspections:reschedule"
  // Templates
  | "templates:view" | "templates:manage"
  // Categories & Standards
  | "categories:view" | "categories:manage" | "standards:manage"
  // CAPA
  | "capa:view" | "capa:close" | "capa:cancel" | "capa:addEvidence"
  // Defects
  | "defects:view"
  // Alerts
  | "alerts:view" | "alerts:resolve"
  // Locations
  | "locations:view" | "locations:manage"
  // Reports
  | "reports:view" | "reports:export" | "reports:exportExecutive"
  // Users
  | "users:view" | "users:manage"
  // Messages & Notifications
  | "messages:view" | "messages:send" | "announcements:broadcast"
  // Audit
  | "audit:view"
  // Settings
  | "settings:manage"
  // Team Performance
  | "team:view"
  // Field Map
  | "map:view"
  // Roles reference
  | "roles:view"

export const PERMISSIONS: Record<Role, Capability[]> = {
  ADMIN: [
    "dashboard:view",
    "inspections:view", "inspections:create", "inspections:assign", "inspections:accept",
    "inspections:decline", "inspections:start", "inspections:complete", "inspections:saveDraft",
    "inspections:submit", "inspections:approve", "inspections:return", "inspections:close",
    "inspections:reopen", "inspections:delete", "inspections:reschedule",
    "templates:view", "templates:manage",
    "categories:view", "categories:manage", "standards:manage",
    "capa:view", "capa:close", "capa:cancel", "capa:addEvidence",
    "defects:view",
    "alerts:view", "alerts:resolve",
    "locations:view", "locations:manage",
    "reports:view", "reports:export", "reports:exportExecutive",
    "users:view", "users:manage",
    "messages:view", "messages:send", "announcements:broadcast",
    "audit:view", "settings:manage", "team:view", "map:view", "roles:view",
  ],
  CEO: [
    "dashboard:view",
    "inspections:view", "inspections:approve", "inspections:return", "inspections:close",
    "templates:view", "categories:view",
    "capa:view", "capa:close",
    "defects:view",
    "alerts:view",
    "locations:view",
    "reports:view", "reports:export", "reports:exportExecutive",
    "users:view",
    "messages:view", "messages:send", "announcements:broadcast",
    "audit:view", "roles:view",
  ],
  SUPERVISOR: [
    "dashboard:view",
    "inspections:view", "inspections:create", "inspections:assign", "inspections:accept",
    "inspections:decline", "inspections:start", "inspections:complete", "inspections:saveDraft",
    "inspections:submit", "inspections:approve", "inspections:return", "inspections:close",
    "inspections:delete", "inspections:reschedule",
    "templates:view", "categories:view",
    "capa:view", "capa:close", "capa:addEvidence",
    "defects:view",
    "alerts:view", "alerts:resolve",
    "locations:view", "locations:manage",
    "reports:view", "reports:export",
    "users:view",
    "messages:view", "messages:send", "announcements:broadcast",
    "audit:view", "team:view", "map:view",
  ],
  INSPECTOR: [
    "dashboard:view",
    "inspections:view", "inspections:create", "inspections:accept", "inspections:decline",
    "inspections:start", "inspections:complete", "inspections:saveDraft", "inspections:submit",
    "inspections:delete",
    "capa:view", "capa:addEvidence",
    "messages:view", "messages:send",
  ],
}

/**
 * Nav items visible per role.
 */
export const NAV_ACCESS: Record<Role, string[]> = {
  ADMIN: [
    "dashboard", "inspections", "agenda", "reports", "notifications", "messages",
    "map", "team", "activity", "alerts", "capa", "defects",
    "users", "locations", "templates", "standards", "audit", "settings",
  ],
  CEO: [
    "dashboard", "inspections", "reports", "notifications", "messages",
    "activity", "alerts", "capa", "audit",
  ],
  SUPERVISOR: [
    "dashboard", "inspections", "agenda", "reports", "notifications", "messages",
    "map", "team", "activity", "alerts", "capa", "defects",
    "locations", "standards", "audit",
  ],
  INSPECTOR: [
    "dashboard", "inspections", "notifications", "messages", "capa",
  ],
}

export const ROLE_INFO: Record<Role, { label: string; description: string; color: string }> = {
  ADMIN: {
    label: "Administrator",
    description: "Full system access — users, settings, templates, all modules, audit logs.",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
  CEO: {
    label: "Chief Executive Officer",
    description: "Company-wide visibility — executive dashboards, approvals, reports, announcements.",
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  },
  SUPERVISOR: {
    label: "Supervisor",
    description: "Operational management — create/assign inspections, review, CAPA, team performance.",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  INSPECTOR: {
    label: "Inspector",
    description: "Field operations — assigned inspections, checklists, photos, evidence. Mobile-first.",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
}

export function can(role: Role | undefined | null, capability: Capability): boolean {
  if (!role) return false
  return PERMISSIONS[role]?.includes(capability) ?? false
}

export function getCapabilities(role: Role | undefined | null): Capability[] {
  if (!role) return []
  return PERMISSIONS[role] ?? []
}

export function getAllowedNav(role: Role | undefined | null): string[] {
  if (!role) return []
  return NAV_ACCESS[role] ?? []
}

export const CAPABILITY_GROUPS: { group: string; capabilities: { key: Capability; label: string; description: string }[] }[] = [
  {
    group: "Dashboard",
    capabilities: [
      { key: "dashboard:view", label: "View Dashboard", description: "Role-specific dashboard with KPIs" },
    ],
  },
  {
    group: "Inspections",
    capabilities: [
      { key: "inspections:view", label: "View Inspections", description: "Inspectors see own only; others see all" },
      { key: "inspections:create", label: "Create Inspections", description: "Create new hygiene inspections" },
      { key: "inspections:assign", label: "Assign Inspector", description: "Assign inspections to inspectors" },
      { key: "inspections:accept", label: "Accept Task", description: "Accept an assigned inspection" },
      { key: "inspections:decline", label: "Decline Task", description: "Decline with reason" },
      { key: "inspections:start", label: "Start Inspection", description: "Begin the inspection checklist" },
      { key: "inspections:complete", label: "Complete Checklist", description: "Fill in scores and observations" },
      { key: "inspections:saveDraft", label: "Save Draft", description: "Save partial inspection" },
      { key: "inspections:submit", label: "Submit for Review", description: "Submit completed inspection" },
      { key: "inspections:approve", label: "Approve", description: "Approve a submitted inspection" },
      { key: "inspections:return", label: "Return for Corrections", description: "Return with review comments" },
      { key: "inspections:close", label: "Close Inspection", description: "Final closure after approval" },
      { key: "inspections:reopen", label: "Reopen Closed", description: "Admin only — reopen a closed inspection" },
      { key: "inspections:delete", label: "Delete", description: "Delete pending inspections (own for inspectors)" },
      { key: "inspections:reschedule", label: "Reschedule", description: "Change the scheduled date" },
    ],
  },
  {
    group: "Templates & Standards",
    capabilities: [
      { key: "templates:view", label: "View Templates", description: "Browse inspection templates" },
      { key: "templates:manage", label: "Manage Templates", description: "Create/edit templates and checklist items" },
      { key: "categories:view", label: "View Categories", description: "Browse hygiene categories" },
      { key: "categories:manage", label: "Manage Categories", description: "Create/edit hygiene categories" },
      { key: "standards:manage", label: "Manage Standards", description: "Configure compliance thresholds" },
    ],
  },
  {
    group: "CAPA & Defects",
    capabilities: [
      { key: "capa:view", label: "View CAPAs", description: "Inspectors see assigned only" },
      { key: "capa:close", label: "Close CAPA", description: "Mark a CAPA as closed" },
      { key: "capa:cancel", label: "Cancel CAPA", description: "Cancel a CAPA (admin only)" },
      { key: "capa:addEvidence", label: "Add Evidence", description: "Upload corrective evidence" },
      { key: "defects:view", label: "View Defects", description: "Non-compliance management" },
    ],
  },
  {
    group: "Alerts & Locations",
    capabilities: [
      { key: "alerts:view", label: "View Alerts", description: "Hygiene alerts and warnings" },
      { key: "alerts:resolve", label: "Resolve Alerts", description: "Mark alerts as resolved" },
      { key: "locations:view", label: "View Locations", description: "Browse facilities" },
      { key: "locations:manage", label: "Manage Locations", description: "Create/edit facilities" },
      { key: "map:view", label: "Field Map", description: "Geographic view of inspections" },
    ],
  },
  {
    group: "Reports & Analytics",
    capabilities: [
      { key: "reports:view", label: "View Reports", description: "Reports Center access" },
      { key: "reports:export", label: "Export Reports", description: "PDF/Excel exports" },
      { key: "reports:exportExecutive", label: "Executive Exports", description: "Boardroom-level company reports" },
      { key: "team:view", label: "Team Performance", description: "Inspector KPIs and leaderboard" },
      { key: "activity:view", label: "Activity Reports", description: "System activity tracking" },
    ],
  },
  {
    group: "Administration",
    capabilities: [
      { key: "users:view", label: "View Users", description: "Browse user accounts" },
      { key: "users:manage", label: "Manage Users", description: "Create/edit/disable users and roles" },
      { key: "messages:view", label: "View Messages", description: "Direct messaging" },
      { key: "messages:send", label: "Send Messages", description: "Send direct messages" },
      { key: "announcements:broadcast", label: "Broadcast", description: "Company-wide announcements" },
      { key: "audit:view", label: "View Audit Logs", description: "Append-only event history" },
      { key: "settings:manage", label: "System Settings", description: "Configure system parameters" },
      { key: "roles:view", label: "View Roles Matrix", description: "Permission reference" },
    ],
  },
]
