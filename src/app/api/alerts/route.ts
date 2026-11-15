import { db } from "@/lib/db"
import { ok } from "@/lib/api"

/**
 * GET /api/alerts
 *
 * Aggregates all operational alerts into a single payload for the
 * Alerts Center. Each category returns items with severity, title,
 * subtitle, and a link target (entityId + module) so the UI can
 * navigate directly to the affected record.
 */
export async function GET() {
  const now = new Date()
  const expiryWarningDays = 30
  const expiryThreshold = new Date(now.getTime() + expiryWarningDays * 86400000)

  // 1. Overdue visits
  const overdueVisits = await db.visit.findMany({
    where: { status: "OVERDUE" },
    include: { customer: true, contract: true, technician: true },
    orderBy: { scheduledDate: "asc" },
  })

  // 2. Upcoming visits (next 7 days, scheduled)
  const weekAhead = new Date(now.getTime() + 7 * 86400000)
  const upcomingVisits = await db.visit.findMany({
    where: {
      status: "SCHEDULED",
      scheduledDate: { gte: now, lte: weekAhead },
    },
    include: { customer: true, technician: true },
    orderBy: { scheduledDate: "asc" },
    take: 20,
  })

  // 3. Low / critical batteries
  const batteryCats = await db.equipmentCategory.findMany({ where: { usesBatteries: true } })
  const batteryCatIds = batteryCats.map((c) => c.id)
  const lowBatteryEquipment = await db.equipment.findMany({
    where: {
      categoryId: { in: batteryCatIds },
      currentBatteryLevel: { in: ["TWENTY_FIVE", "EMPTY"] },
      operationalStatus: { not: "DECOMMISSIONED" },
    },
    include: { category: true, customer: true, contract: true },
    orderBy: { currentBatteryLevel: "asc" },
  })

  // 4. Low / out-of-stock products
  const lowStockProducts = await db.product.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { currentStock: 0 },
        { currentStock: { lte: db.product.fields.minimumStock } },
      ],
    },
    include: { category: true },
    orderBy: { currentStock: "asc" },
  })

  // 5. Expiring contracts (within 30 days)
  const expiringContracts = await db.contract.findMany({
    where: {
      status: "ACTIVE",
      endDate: { gte: now, lte: expiryThreshold },
    },
    include: { customer: true, technician: true },
    orderBy: { endDate: "asc" },
  })

  // 6. Expired contracts (past end date, still marked active)
  const expiredContracts = await db.contract.findMany({
    where: {
      status: "ACTIVE",
      endDate: { lt: now },
    },
    include: { customer: true },
  })

  // 7. Equipment needing attention (damaged, needs replacement, under maintenance)
  const equipmentAlerts = await db.equipment.findMany({
    where: {
      operationalStatus: { in: ["DAMAGED", "NEEDS_REPLACEMENT", "UNDER_MAINTENANCE", "NOT_OPERATIONAL"] },
    },
    include: { category: true, customer: true, contract: true },
    orderBy: { operationalStatus: "asc" },
  })

  // 8. Incorrectly installed equipment
  const incorrectlyInstalled = await db.equipment.findMany({
    where: {
      installationStatus: { in: ["INCORRECTLY_INSTALLED", "NEEDS_REPOSITIONING"] },
      operationalStatus: { not: "DECOMMISSIONED" },
    },
    include: { category: true, customer: true },
  })

  const alerts = {
    summary: {
      total: overdueVisits.length + lowBatteryEquipment.length + lowStockProducts.length +
        expiringContracts.length + expiredContracts.length + equipmentAlerts.length +
        incorrectlyInstalled.length,
      critical: overdueVisits.length + lowStockProducts.filter((p) => p.currentStock === 0).length +
        lowBatteryEquipment.filter((e) => e.currentBatteryLevel === "EMPTY").length +
        equipmentAlerts.filter((e) => e.operationalStatus === "DAMAGED" || e.operationalStatus === "NEEDS_REPLACEMENT").length,
      warning: lowBatteryEquipment.filter((e) => e.currentBatteryLevel === "TWENTY_FIVE").length +
        lowStockProducts.filter((p) => p.currentStock > 0).length +
        expiringContracts.length + incorrectlyInstalled.length,
      info: upcomingVisits.length + expiredContracts.length,
    },
    overdueVisits: overdueVisits.map((v) => ({
      severity: "critical",
      module: "visits" as const,
      entityId: v.id,
      title: `Overdue visit — ${v.customer?.name ?? "Unknown"}`,
      subtitle: `Scheduled ${v.scheduledDate.toLocaleDateString()} · ${v.visitType}`,
      meta: v.technician?.name,
    })),
    upcomingVisits: upcomingVisits.map((v) => ({
      severity: "info" as const,
      module: "visits" as const,
      entityId: v.id,
      title: `Upcoming visit — ${v.customer?.name ?? "Unknown"}`,
      subtitle: `${v.scheduledDate.toLocaleDateString()} ${v.scheduledTime ?? ""} · ${v.visitType}`,
      meta: v.technician?.name,
    })),
    lowBatteries: lowBatteryEquipment.map((e) => ({
      severity: e.currentBatteryLevel === "EMPTY" ? ("critical" as const) : ("warning" as const),
      module: "equipment" as const,
      entityId: e.id,
      title: `${e.currentBatteryLevel === "EMPTY" ? "Empty battery" : "Low battery"} — ${e.name}`,
      subtitle: `${e.brand ?? ""} ${e.model ?? ""} · ${e.customer?.name ?? "Unassigned"} · ${e.serialNumber}`,
      meta: e.currentBatteryLevel,
    })),
    lowStock: lowStockProducts.map((p) => ({
      severity: p.currentStock === 0 ? ("critical" as const) : ("warning" as const),
      module: "consumables" as const,
      entityId: p.id,
      title: `${p.currentStock === 0 ? "Out of stock" : "Low stock"} — ${p.name}`,
      subtitle: `${p.currentStock} ${p.unitOfMeasurement} remaining (min: ${p.minimumStock}) · ${p.sku}`,
      meta: p.category?.name,
    })),
    expiringContracts: expiringContracts.map((c) => ({
      severity: "warning" as const,
      module: "contracts" as const,
      entityId: c.id,
      title: `Contract expiring — ${c.contractNumber}`,
      subtitle: `${c.customer?.name ?? ""} · ends ${c.endDate.toLocaleDateString()} · ${c.type}`,
      meta: c.technician?.name,
    })),
    expiredContracts: expiredContracts.map((c) => ({
      severity: "critical" as const,
      module: "contracts" as const,
      entityId: c.id,
      title: `Contract expired — ${c.contractNumber}`,
      subtitle: `${c.customer?.name ?? ""} · ended ${c.endDate.toLocaleDateString()}`,
      meta: c.type,
    })),
    equipmentAlerts: equipmentAlerts.map((e) => ({
      severity: e.operationalStatus === "DAMAGED" || e.operationalStatus === "NEEDS_REPLACEMENT"
        ? ("critical" as const) : ("warning" as const),
      module: "equipment" as const,
      entityId: e.id,
      title: `${e.operationalStatus.replace(/_/g, " ").toLowerCase()} — ${e.name}`,
      subtitle: `${e.brand ?? ""} ${e.serialNumber} · ${e.customer?.name ?? "Unassigned"}`,
      meta: e.category?.name,
    })),
    incorrectlyInstalled: incorrectlyInstalled.map((e) => ({
      severity: "warning" as const,
      module: "equipment" as const,
      entityId: e.id,
      title: `${e.installationStatus.replace(/_/g, " ").toLowerCase()} — ${e.name}`,
      subtitle: `${e.serialNumber} · ${e.customer?.name ?? "Unassigned"}`,
      meta: e.category?.name,
    })),
  }

  return ok(alerts)
}
