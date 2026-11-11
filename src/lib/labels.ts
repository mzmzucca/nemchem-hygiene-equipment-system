// Label & color mappings for the system

export const CUSTOMER_CATEGORIES: Record<string, string> = {
  HOTEL: "Hotel",
  RESTAURANT: "Restaurant",
  HOSPITAL: "Hospital",
  OFFICE: "Office",
  SHOPPING_CENTRE: "Shopping Centre",
  OTHER: "Other",
}

export const CONTRACT_TYPES: Record<string, string> = {
  RENTAL: "Rental",
  FOL: "FOL (Free on Loan)",
}

export const CONTRACT_STATUS: Record<string, string> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
  SUSPENDED: "Suspended",
  PENDING: "Pending",
}

export const VISIT_FREQUENCY: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  BIWEEKLY: "Biweekly",
  MONTHLY: "Monthly",
  CUSTOM: "Custom",
}

export const VISIT_STATUS: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  PENDING: "Pending",
  CANCELLED: "Cancelled",
  OVERDUE: "Overdue",
}

export const VISIT_TYPE: Record<string, string> = {
  INSPECTION: "Inspection",
  MAINTENANCE: "Maintenance",
  INSTALLATION: "Installation",
  REPLACEMENT: "Replacement",
  OTHER: "Other",
}

export const OPERATIONAL_STATUS: Record<string, string> = {
  OPERATIONAL: "Operational",
  NOT_OPERATIONAL: "Not Operational",
  DAMAGED: "Damaged",
  UNDER_MAINTENANCE: "Under Maintenance",
  MISSING: "Missing",
  NEEDS_REPLACEMENT: "Needs Replacement",
  DECOMMISSIONED: "Decommissioned",
}

export const INSTALLATION_STATUS: Record<string, string> = {
  CORRECTLY_INSTALLED: "Correctly Installed",
  INCORRECTLY_INSTALLED: "Incorrectly Installed",
  NEEDS_REPOSITIONING: "Needs Repositioning",
  INSTALLATION_PENDING: "Installation Pending",
}

export const BATTERY_LEVEL: Record<string, string> = {
  FULL: "100%",
  SEVENTY_FIVE: "75%",
  FIFTY: "50%",
  TWENTY_FIVE: "25%",
  EMPTY: "0%",
  UNKNOWN: "Unknown",
  NA: "N/A",
}

export const INSPECTION_RESULT: Record<string, string> = {
  PASSED: "Passed",
  PASSED_WITH_OBSERVATIONS: "Passed with Observations",
  FAILED: "Failed",
  MAINTENANCE_REQUIRED: "Maintenance Required",
  REPLACEMENT_REQUIRED: "Replacement Required",
}

export const MOVEMENT_TYPE: Record<string, string> = {
  ENTRY: "Stock Entry",
  EXIT: "Stock Exit",
  ADJUSTMENT: "Adjustment",
  TRANSFER: "Transfer",
  ALLOCATION: "Technician Allocation",
  RETURN: "Return",
}

export const EVENT_TYPE: Record<string, string> = {
  REGISTRATION: "Registration",
  INSTALLATION: "Installation",
  CUSTOMER_ASSIGNMENT: "Customer Assignment",
  CONTRACT_ASSIGNMENT: "Contract Assignment",
  INSPECTION: "Inspection",
  MAINTENANCE: "Maintenance",
  BATTERY_REPLACEMENT: "Battery Replacement",
  CONSUMABLE_USAGE: "Consumable Usage",
  RELOCATION: "Relocation",
  REPLACEMENT: "Replacement",
  DECOMMISSIONING: "Decommissioning",
}

// Status -> tailwind badge classes (avoiding indigo/blue per guidelines)
export function statusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    OPERATIONAL: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    SCHEDULED: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    IN_PROGRESS: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    OVERDUE: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    EXPIRED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    TERMINATED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    SUSPENDED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    DAMAGED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    NOT_OPERATIONAL: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    UNDER_MAINTENANCE: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    NEEDS_REPLACEMENT: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    MISSING: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    DECOMMISSIONED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
    INCORRECTLY_INSTALLED: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    NEEDS_REPOSITIONING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    INSTALLATION_PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    CORRECTLY_INSTALLED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    CANCELLED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
    INACTIVE: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
    PASSED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    PASSED_WITH_OBSERVATIONS: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    FAILED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    MAINTENANCE_REQUIRED: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    REPLACEMENT_REQUIRED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    RENTAL: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    FOL: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  }
  return map[status] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300"
}

export function batteryLevelColor(level: string): string {
  const map: Record<string, string> = {
    FULL: "bg-emerald-500",
    SEVENTY_FIVE: "bg-emerald-400",
    FIFTY: "bg-amber-500",
    TWENTY_FIVE: "bg-orange-500",
    EMPTY: "bg-rose-500",
    UNKNOWN: "bg-zinc-400",
    NA: "bg-zinc-300",
  }
  return map[level] ?? "bg-zinc-400"
}

export function batteryLevelPercent(level: string): number {
  const map: Record<string, number> = {
    FULL: 100,
    SEVENTY_FIVE: 75,
    FIFTY: 50,
    TWENTY_FIVE: 25,
    EMPTY: 0,
    UNKNOWN: 0,
    NA: 0,
  }
  return map[level] ?? 0
}
