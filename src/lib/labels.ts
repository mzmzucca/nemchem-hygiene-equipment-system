// Label & color mappings for the Hygiene Management System

export const INSPECTION_STATUS: Record<string, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  IN_PROGRESS: "In Progress",
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  RETURNED: "Returned for Corrections",
  APPROVED: "Approved",
  CLOSED: "Closed",
}

export const RESPONSE_LABELS: Record<string, string> = {
  COMPLIANT: "Compliant",
  PARTIALLY_COMPLIANT: "Partially Compliant",
  NON_COMPLIANT: "Non-Compliant",
  NOT_APPLICABLE: "Not Applicable",
}

export const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
}

export const CAPA_STATUS: Record<string, string> = {
  OPEN: "Open",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  SUBMITTED_FOR_VERIFICATION: "Submitted for Verification",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
  OVERDUE: "Overdue",
}

export const DEFECT_STATUS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  ESCALATED: "Escalated",
}

export const ALERT_TYPES: Record<string, string> = {
  CRITICAL_VIOLATION: "Critical Violation",
  LOW_SCORE: "Low Score",
  REPEATED_NON_COMPLIANCE: "Repeated Non-Compliance",
  OVERDUE_CAPA: "Overdue CAPA",
  MISSED_INSPECTION: "Missed Inspection",
  DECLINING_COMPLIANCE: "Declining Compliance",
}

export const FACILITY_TYPES: Record<string, string> = {
  HOTEL: "Hotel",
  RESTAURANT: "Restaurant",
  HOSPITAL: "Hospital",
  OFFICE: "Office",
  FACTORY: "Factory",
  KITCHEN: "Kitchen",
  OTHER: "Other",
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    COMPLIANT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    CLOSED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    ASSIGNED: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    ACCEPTED: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    IN_PROGRESS: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    DRAFT: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
    SUBMITTED: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    UNDER_REVIEW: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    RETURNED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    DECLINED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    OVERDUE: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    ESCALATED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    CANCELLED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
    INACTIVE: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
    OPEN: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    NON_COMPLIANT: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    PARTIALLY_COMPLIANT: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    NOT_APPLICABLE: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
    CRITICAL: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    LOW: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    ADMIN: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    CEO: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    SUPERVISOR: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    INSPECTOR: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  }
  return map[status] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300"
}

export function severityIcon(sev: string): string {
  const map: Record<string, string> = {
    CRITICAL: "text-rose-600",
    HIGH: "text-orange-600",
    MEDIUM: "text-amber-600",
    LOW: "text-sky-600",
  }
  return map[sev] ?? "text-zinc-600"
}

export function complianceColor(percent: number): string {
  if (percent >= 85) return "text-emerald-600"
  if (percent >= 70) return "text-amber-600"
  if (percent >= 60) return "text-orange-600"
  return "text-rose-600"
}

export function complianceBg(percent: number): string {
  if (percent >= 85) return "bg-emerald-500"
  if (percent >= 70) return "bg-amber-500"
  if (percent >= 60) return "bg-orange-500"
  return "bg-rose-500"
}
