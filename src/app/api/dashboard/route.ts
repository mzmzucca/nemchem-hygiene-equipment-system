import { db } from "@/lib/db"
import { ok } from "@/lib/api"
import { requireAuthOrDemo } from "@/lib/auth-guard"
import type { DashboardData } from "@/lib/types"

/**
 * GET /api/dashboard
 * Returns aggregated KPIs + chart data in the DashboardData shape:
 *   { kpis: { total, completed, pending, awaitingReview, inProgress, overdue,
 *             avgCompliance, criticalViolations, openCapas, overdueCapas },
 *     complianceTrend: [{month, compliance}],
 *     locationPerformance: [{name, compliance, inspections}],
 *     categoryPerformance: [{name, avgScore, violations}],
 *     inspectorLeaderboard: [{name, completed, avgScore}],
 *     recentActivity: [{id, action, entity, user, time}],
 *     statusBreakdown: [{status, count}] }
 *
 * INSPECTOR role sees only their own stats; everyone else sees company-wide stats.
 */
export async function GET() {
  const user = await requireAuthOrDemo()
  const scoped = user.role === "INSPECTOR" ? { inspectorId: user.id } : {}

  const now = new Date()
  const activeStatuses = ["PENDING", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "SUBMITTED", "UNDER_REVIEW", "RETURNED"]

  const [
    totalInspections,
    completed,
    pending,
    awaitingReview,
    inProgress,
    overdue,
    criticalDefects,
    openCapas,
    overdueCapas,
    complianceAgg,
  ] = await Promise.all([
    db.inspection.count({ where: scoped }),
    db.inspection.count({ where: { ...scoped, status: "CLOSED" } }),
    db.inspection.count({ where: { ...scoped, status: "PENDING" } }),
    db.inspection.count({ where: { ...scoped, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    db.inspection.count({ where: { ...scoped, status: "IN_PROGRESS" } }),
    db.inspection.count({
      where: { ...scoped, status: { in: activeStatuses }, scheduledDate: { lt: now } },
    }),
    db.defect.count({ where: { severity: "CRITICAL", status: { not: "RESOLVED" } } }),
    db.cAPA.count({
      where: { status: { notIn: ["CLOSED", "CANCELLED"] }, ...(user.role === "INSPECTOR" ? { assignedToId: user.id } : {}) },
    }),
    db.cAPA.count({
      where: {
        status: { notIn: ["CLOSED", "CANCELLED"] },
        targetDate: { lt: now },
        ...(user.role === "INSPECTOR" ? { assignedToId: user.id } : {}),
      },
    }),
    db.inspection.aggregate({
      _avg: { compliancePercent: true },
      where: { ...scoped, compliancePercent: { not: null } },
    }),
  ])

  // Compliance trend — last 6 months
  const complianceTrend: { month: string; compliance: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const ms = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const me = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const agg = await db.inspection.aggregate({
      _avg: { compliancePercent: true },
      where: { ...scoped, completedDate: { gte: ms, lte: me }, compliancePercent: { not: null } },
    })
    complianceTrend.push({
      month: ms.toLocaleString("default", { month: "short" }),
      compliance: Math.round(agg._avg.compliancePercent ?? 0),
    })
  }

  // Location performance — top 8 by inspection count
  const locationPerfRaw = await db.location.findMany({
    where: user.role === "INSPECTOR" ? { inspections: { some: { inspectorId: user.id } } } : {},
    include: {
      _count: { select: { inspections: true } },
      inspections: { where: { compliancePercent: { not: null } }, select: { compliancePercent: true } },
    },
    take: 8,
  })
  const locationPerformance = locationPerfRaw
    .map((l) => ({
      name: l.name,
      inspections: l._count.inspections,
      compliance: l.inspections.length
        ? Math.round(l.inspections.reduce((s, i) => s + (i.compliancePercent ?? 0), 0) / l.inspections.length)
        : 0,
    }))
    .sort((a, b) => b.compliance - a.compliance)

  // Category performance — avg score (compliance %) and violations (non-compliant responses)
  const categories = await db.hygieneCategory.findMany({
    include: {
      items: { include: { responses: { where: { response: { not: null } } } } },
    },
    orderBy: { sortOrder: "asc" },
  })
  const categoryPerformance = categories.map((c) => {
    const all = c.items.flatMap((i) => i.responses)
    const compliant = all.filter((r) => r.response === "COMPLIANT").length
    const violations = all.filter((r) => r.response === "NON_COMPLIANT").length
    const avgScore = all.length ? Math.round((compliant / all.length) * 100) : 0
    return { name: c.name, avgScore, violations }
  })

  // Inspector leaderboard — top 10 by avg score then completed count
  const inspectorWhere = user.role === "INSPECTOR" ? { id: user.id } : {}
  const inspectors = await db.user.findMany({
    where: { role: "INSPECTOR", ...inspectorWhere },
    include: {
      inspectionsAssigned: {
        where: { status: { in: ["CLOSED", "APPROVED"] } },
        select: { compliancePercent: true },
      },
      _count: { select: { inspectionsAssigned: true } },
    },
    take: 10,
  })
  const inspectorLeaderboard = inspectors
    .map((i) => ({
      name: i.name,
      completed: i.inspectionsAssigned.length,
      avgScore: i.inspectionsAssigned.length
        ? Math.round(i.inspectionsAssigned.reduce((s, x) => s + (x.compliancePercent ?? 0), 0) / i.inspectionsAssigned.length)
        : 0,
    }))
    .sort((a, b) => b.avgScore - a.avgScore || b.completed - a.completed)

  // Status breakdown
  const statusGroups = await db.inspection.groupBy({ by: ["status"], where: scoped, _count: true })
  const statusBreakdown = statusGroups.map((s) => ({ status: s.status, count: s._count }))

  // Recent activity — latest audit log entries
  const auditWhere = user.role === "INSPECTOR" ? { userId: user.id } : {}
  const recentLogs = await db.auditLog.findMany({
    where: auditWhere,
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 12,
  })
  const recentActivity = recentLogs.map((l) => ({
    id: l.id,
    action: l.action,
    entity: l.entityType,
    user: l.user?.name ?? "System",
    time: l.createdAt.toISOString(),
  }))

  const payload: DashboardData = {
    kpis: {
      total: totalInspections,
      completed,
      pending,
      awaitingReview,
      inProgress,
      overdue,
      avgCompliance: Math.round(complianceAgg._avg.compliancePercent ?? 0),
      criticalViolations: criticalDefects,
      openCapas,
      overdueCapas,
    },
    complianceTrend,
    locationPerformance,
    categoryPerformance,
    inspectorLeaderboard,
    recentActivity,
    statusBreakdown,
  }

  return ok(payload)
}
