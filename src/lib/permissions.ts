/**
 * Central permission matrix for the Hygiene Equipment Management System.
 *
 * Three roles are defined:
 *   ADMIN      — CEO / System Administrator (Sérgio Zucca)
 *                Full access to everything, including user management.
 *   MANAGER    — Operations Supervisor
 *                Full operational access; cannot manage users or system settings.
 *   TECHNICIAN — Field Inspector
 *                Sees only their assigned visits, inspections, and stock.
 *
 * The matrix is the single source of truth — the UI uses usePermissions()
 * to show/hide nav items and actions, and the API uses requireRole() /
 * requireTechnicianScope() to enforce the same rules server-side.
 */

export type Role = "ADMIN" | "MANAGER" | "TECHNICIAN"

export type Capability =
  // Dashboard
  | "dashboard:view"
  // Alerts
  | "alerts:view"
  // Customers
  | "customers:view" | "customers:create" | "customers:edit" | "customers:delete"
  // Contracts
  | "contracts:view" | "contracts:create" | "contracts:edit" | "contracts:delete"
  | "contracts:profitability"
  // Equipment
  | "equipment:view" | "equipment:create" | "equipment:edit" | "equipment:delete"
  | "equipment:qr"
  // Visits
  | "visits:view" | "visits:create" | "visits:edit" | "visits:delete" | "visits:assign"
  // Inspections
  | "inspections:view" | "inspections:submit" | "inspections:correct"
  // Batteries
  | "batteries:view" | "batteries:replace"
  // Consumables & Stock
  | "consumables:view" | "consumables:manage"
  | "stock:entry" | "stock:exit" | "stock:adjust" | "stock:allocate"
  // Cross-cutting
  | "audit:view" | "export:any" | "users:manage" | "settings:manage"
  | "categories:manage" | "roles:view"

/**
 * The full permission matrix. Each capability is explicitly listed per role
 * — no implicit inheritance. This makes audits trivial.
 */
export const PERMISSIONS: Record<Role, Capability[]> = {
  ADMIN: [
    "dashboard:view",
    "alerts:view",
    "customers:view", "customers:create", "customers:edit", "customers:delete",
    "contracts:view", "contracts:create", "contracts:edit", "contracts:delete", "contracts:profitability",
    "equipment:view", "equipment:create", "equipment:edit", "equipment:delete", "equipment:qr",
    "visits:view", "visits:create", "visits:edit", "visits:delete", "visits:assign",
    "inspections:view", "inspections:submit", "inspections:correct",
    "batteries:view", "batteries:replace",
    "consumables:view", "consumables:manage",
    "stock:entry", "stock:exit", "stock:adjust", "stock:allocate",
    "audit:view", "export:any", "users:manage", "settings:manage", "categories:manage", "roles:view",
  ],
  MANAGER: [
    "dashboard:view",
    "alerts:view",
    "customers:view", "customers:create", "customers:edit", "customers:delete",
    "contracts:view", "contracts:create", "contracts:edit", "contracts:delete", "contracts:profitability",
    "equipment:view", "equipment:create", "equipment:edit", "equipment:delete", "equipment:qr",
    "visits:view", "visits:create", "visits:edit", "visits:delete", "visits:assign",
    "inspections:view", "inspections:submit", "inspections:correct",
    "batteries:view", "batteries:replace",
    "consumables:view", "consumables:manage",
    "stock:entry", "stock:exit", "stock:adjust", "stock:allocate",
    "audit:view", "export:any", "categories:manage", "roles:view",
    // Manager CANNOT: users:manage, settings:manage
  ],
  TECHNICIAN: [
    // Technician sees a focused dashboard with their tasks
    "dashboard:view",
    "alerts:view", // sees alerts related to their visits
    // Customers: read-only, only those they have visits for
    "customers:view",
    // Contracts: read-only
    "contracts:view",
    // Equipment: view only (cannot create/edit/delete)
    "equipment:view", "equipment:qr",
    // Visits: view their assigned visits only, cannot create/schedule
    "visits:view",
    // Inspections: submit (their own), cannot correct
    "inspections:view", "inspections:submit",
    // Batteries: view + replace during their visits
    "batteries:view", "batteries:replace",
    // Consumables: view stock levels + their own allocation
    "consumables:view",
    // No stock management, no audit, no export, no user/settings management
  ],
}

/**
 * Nav items visible per role. The app shell uses this to filter the sidebar.
 */
export const NAV_ACCESS: Record<Role, string[]> = {
  ADMIN: [
    "dashboard", "alerts", "customers", "contracts", "equipment",
    "visits", "inspections", "batteries", "consumables",
  ],
  MANAGER: [
    "dashboard", "alerts", "customers", "contracts", "equipment",
    "visits", "inspections", "batteries", "consumables",
  ],
  TECHNICIAN: [
    "dashboard", "alerts", "visits", "inspections", "batteries", "consumables",
    // Technicians do NOT see: customers, contracts, equipment in the nav
    // (they can view a customer/equipment if navigated from a visit, but
    //  the nav items are hidden to keep the interface focused)
  ],
}

/**
 * Human-readable role descriptions for the UI.
 */
export const ROLE_INFO: Record<Role, { label: string; description: string; color: string }> = {
  ADMIN: {
    label: "Administrator (CEO)",
    description: "Full system access — users, settings, all modules, audit logs, and financial data.",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  },
  MANAGER: {
    label: "Operations Manager",
    description: "Full operational access — customers, contracts, equipment, visits, stock. Cannot manage users or system settings.",
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  },
  TECHNICIAN: {
    label: "Field Technician",
    description: "Focused on assigned visits, inspections, and personal stock. Cannot create customers, contracts, or schedule visits.",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
}

/**
 * Check if a role has a specific capability.
 */
export function can(role: Role | undefined | null, capability: Capability): boolean {
  if (!role) return false
  return PERMISSIONS[role]?.includes(capability) ?? false
}

/**
 * Returns all capabilities for a role.
 */
export function getCapabilities(role: Role | undefined | null): Capability[] {
  if (!role) return []
  return PERMISSIONS[role] ?? []
}

/**
 * Returns the nav items a role is allowed to see.
 */
export function getAllowedNav(role: Role | undefined | null): string[] {
  if (!role) return []
  return NAV_ACCESS[role] ?? []
}

/**
 * The full capability catalog, grouped for display in the permissions matrix UI.
 */
export const CAPABILITY_GROUPS: { group: string; capabilities: { key: Capability; label: string; description: string }[] }[] = [
  {
    group: "Dashboard & Alerts",
    capabilities: [
      { key: "dashboard:view", label: "View Dashboard", description: "KPIs and charts (technicians see a personal view)" },
      { key: "alerts:view", label: "View Alerts", description: "Operational alerts and warnings" },
    ],
  },
  {
    group: "Customers",
    capabilities: [
      { key: "customers:view", label: "View Customers", description: "Browse customer profiles" },
      { key: "customers:create", label: "Create Customers", description: "Add new customer accounts" },
      { key: "customers:edit", label: "Edit Customers", description: "Modify customer information" },
      { key: "customers:delete", label: "Delete Customers", description: "Remove customer records" },
    ],
  },
  {
    group: "Contracts",
    capabilities: [
      { key: "contracts:view", label: "View Contracts", description: "Browse contract details" },
      { key: "contracts:create", label: "Create Contracts", description: "Add new Rental or FOL contracts" },
      { key: "contracts:edit", label: "Edit Contracts", description: "Modify contract terms and status" },
      { key: "contracts:delete", label: "Delete Contracts", description: "Remove contract records" },
      { key: "contracts:profitability", label: "View Profitability", description: "Financial analysis: revenue vs costs" },
    ],
  },
  {
    group: "Equipment",
    capabilities: [
      { key: "equipment:view", label: "View Equipment", description: "Browse equipment inventory" },
      { key: "equipment:create", label: "Create Equipment", description: "Register new equipment" },
      { key: "equipment:edit", label: "Edit Equipment", description: "Modify equipment details and status" },
      { key: "equipment:delete", label: "Decommission", description: "Decommission equipment" },
      { key: "equipment:qr", label: "QR Codes", description: "Generate and download QR labels" },
    ],
  },
  {
    group: "Visits",
    capabilities: [
      { key: "visits:view", label: "View Visits", description: "Browse visit schedule (technicians: own only)" },
      { key: "visits:create", label: "Schedule Visits", description: "Create new visit appointments" },
      { key: "visits:edit", label: "Edit Visits", description: "Modify visit details and status" },
      { key: "visits:delete", label: "Delete Visits", description: "Remove visit records" },
      { key: "visits:assign", label: "Assign Technicians", description: "Assign technicians to visits" },
    ],
  },
  {
    group: "Inspections",
    capabilities: [
      { key: "inspections:view", label: "View Inspections", description: "Browse inspection history" },
      { key: "inspections:submit", label: "Submit Inspections", description: "Record inspection findings on-site" },
      { key: "inspections:correct", label: "Correct Inspections", description: " Amend submitted inspections (with audit trail)" },
    ],
  },
  {
    group: "Batteries",
    capabilities: [
      { key: "batteries:view", label: "View Batteries", description: "Monitor battery levels and history" },
      { key: "batteries:replace", label: "Record Replacements", description: "Log battery replacement operations" },
    ],
  },
  {
    group: "Consumables & Stock",
    capabilities: [
      { key: "consumables:view", label: "View Stock", description: "Browse product inventory" },
      { key: "consumables:manage", label: "Manage Products", description: "Create/edit products and categories" },
      { key: "stock:entry", label: "Stock Entry", description: "Register incoming stock" },
      { key: "stock:exit", label: "Stock Exit", description: "Register outgoing stock" },
      { key: "stock:adjust", label: "Stock Adjustment", description: "Reconcile stock levels" },
      { key: "stock:allocate", label: "Allocate to Technician", description: "Assign stock to technicians" },
    ],
  },
  {
    group: "Administration",
    capabilities: [
      { key: "audit:view", label: "View Audit Log", description: "Append-only event history" },
      { key: "export:any", label: "Export Data", description: "Download CSV exports" },
      { key: "users:manage", label: "Manage Users", description: "Create/edit/disable user accounts" },
      { key: "settings:manage", label: "System Settings", description: "Configure thresholds and parameters" },
      { key: "categories:manage", label: "Manage Categories", description: "Create equipment/consumable categories" },
      { key: "roles:view", label: "View Roles & Permissions", description: "Access the permission matrix" },
    ],
  },
]
