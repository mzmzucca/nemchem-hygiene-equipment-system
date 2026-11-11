import { db } from "@/lib/db"
import { ok } from "@/lib/api"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get("customerId") || undefined
  const contractId = searchParams.get("contractId") || undefined
  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")

  const from = fromStr ? new Date(fromStr) : undefined
  const to = toStr ? new Date(toStr) : undefined

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const custFilter = customerId ? { customerId } : {}
  const contractFilter = contractId ? { contractId } : {}
  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (from) dateFilter.gte = from
  if (to) dateFilter.lte = to

  const totalCustomers = await db.customer.count()
  const activeCustomers = await db.customer.count({ where: { status: "ACTIVE" } })

  const contracts = await db.contract.findMany({ where: { ...contractFilter } })
  const totalActiveContracts = contracts.filter(c => c.status === "ACTIVE").length
  const rentalContracts = contracts.filter(c => c.type === "RENTAL" && c.status === "ACTIVE").length
  const folContracts = contracts.filter(c => c.type === "FOL" && c.status === "ACTIVE").length
  const expiredContracts = contracts.filter(c => c.status === "EXPIRED" || (c.endDate < now && c.status === "ACTIVE")).length
  const expiryWarningDays = 30
  const approachingExpiration = contracts.filter(c => {
    const diff = (c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return c.status === "ACTIVE" && diff > 0 && diff <= expiryWarningDays
  }).length

  const allEquipment = await db.equipment.findMany({ where: customerId ? { customerId } : {} })
  const totalEquipment = allEquipment.length
  const installedEquipment = allEquipment.filter(e => e.installationDate !== null).length
  const operational = allEquipment.filter(e => e.operationalStatus === "OPERATIONAL").length
  const nonOperational = allEquipment.filter(e => e.operationalStatus === "NOT_OPERATIONAL").length
  const damaged = allEquipment.filter(e => e.operationalStatus === "DAMAGED").length
  const underMaintenance = allEquipment.filter(e => e.operationalStatus === "UNDER_MAINTENANCE").length
  const needsReplacement = allEquipment.filter(e => e.operationalStatus === "NEEDS_REPLACEMENT").length

  const monthVisitFilter = { ...custFilter, ...contractFilter, scheduledDate: { gte: monthStart, lte: monthEnd } }
  const totalVisitsMonth = await db.visit.count({ where: monthVisitFilter })
  const completedVisits = await db.visit.count({ where: { ...monthVisitFilter, status: "COMPLETED" } })
  const scheduledVisits = await db.visit.count({ where: { ...monthVisitFilter, status: "SCHEDULED" } })
  const pendingVisits = await db.visit.count({ where: { ...monthVisitFilter, status: "PENDING" } })
  const overdueVisits = await db.visit.count({ where: { ...monthVisitFilter, status: "OVERDUE" } })
  const upcomingVisits = await db.visit.count({ where: { ...custFilter, ...contractFilter, scheduledDate: { gte: now }, status: { in: ["SCHEDULED", "PENDING"] } } })

  const batteryCats = await db.equipmentCategory.findMany({ where: { usesBatteries: true } })
  const batteryCatIds = new Set(batteryCats.map(c => c.id))
  const batteryEquipment = allEquipment.filter(e => batteryCatIds.has(e.categoryId))
  const healthyBatteries = batteryEquipment.filter(e => ["FULL", "SEVENTY_FIVE"].includes(e.currentBatteryLevel)).length
  const lowBatteries = batteryEquipment.filter(e => ["FIFTY", "TWENTY_FIVE"].includes(e.currentBatteryLevel)).length
  const needReplacement = batteryEquipment.filter(e => e.currentBatteryLevel === "EMPTY").length
  const batteryReplacementsMonth = await db.batteryReplacement.count({ where: { replacementDate: { gte: monthStart, lte: monthEnd } } })

  const products = await db.product.findMany()
  const totalStock = products.reduce((s, p) => s + p.currentStock, 0)
  const lowStock = products.filter(p => p.currentStock > 0 && p.currentStock <= p.minimumStock).length
  const outOfStock = products.filter(p => p.currentStock === 0).length

  const rates = await db.equipmentConsumptionRate.findMany()
  const ratesByCat = new Map(rates.map(r => [r.categoryId, r.averageConsumptionPerMonth]))
  const installedByCat = new Map<string, number>()
  for (const e of allEquipment) {
    if (e.installationDate) installedByCat.set(e.categoryId, (installedByCat.get(e.categoryId) ?? 0) + 1)
  }
  let estimatedMonthly = 0
  for (const [catId, count] of installedByCat) {
    estimatedMonthly += count * (ratesByCat.get(catId) ?? 0)
  }

  const consumptionRecords = await db.consumptionRecord.findMany({ where: { date: { gte: monthStart, lte: monthEnd } } })
  const actualMonthly = consumptionRecords.reduce((s, r) => s + r.quantity, 0)

  const monthlyVisits = []
  for (let i = 5; i >= 0; i--) {
    const ms = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const me = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const count = await db.visit.count({ where: { ...custFilter, ...contractFilter, scheduledDate: { gte: ms, lte: me } } })
    monthlyVisits.push({ month: ms.toLocaleString("default", { month: "short" }), visits: count })
  }

  const statusCounts: Record<string, number> = {}
  for (const e of allEquipment) statusCounts[e.operationalStatus] = (statusCounts[e.operationalStatus] ?? 0) + 1
  const equipmentStatusDist = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  const activeContracts = contracts.filter(c => c.status === "ACTIVE")
  const contractTypeDist = [
    { name: "Rental", value: activeContracts.filter(c => c.type === "RENTAL").length },
    { name: "FOL", value: activeContracts.filter(c => c.type === "FOL").length },
  ]

  const monthlyConsumption = []
  for (let i = 5; i >= 0; i--) {
    const ms = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const me = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const recs = await db.consumptionRecord.findMany({ where: { date: { gte: ms, lte: me } } })
    monthlyConsumption.push({ month: ms.toLocaleString("default", { month: "short" }), consumption: recs.reduce((s, r) => s + r.quantity, 0) })
  }

  const equipByCustomer = await db.equipment.groupBy({ by: ["customerId"], _count: true })
  const customersForChart = await db.customer.findMany({ where: { id: { in: equipByCustomer.map(e => e.customerId) } } })
  const equipByCustomerChart = equipByCustomer.map(e => ({
    name: customersForChart.find(c => c.id === e.customerId)?.name ?? "Unknown",
    value: e._count,
  })).sort((a, b) => b.value - a.value).slice(0, 6)

  const batteryReplacementsChart = []
  for (let i = 5; i >= 0; i--) {
    const ms = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const me = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const count = await db.batteryReplacement.count({ where: { replacementDate: { gte: ms, lte: me } } })
    batteryReplacementsChart.push({ month: ms.toLocaleString("default", { month: "short" }), replacements: count })
  }

  const maintenanceOverview = [
    { name: "Operational", value: operational },
    { name: "Under Maintenance", value: underMaintenance },
    { name: "Needs Replacement", value: needsReplacement },
    { name: "Damaged", value: damaged },
  ]

  return ok({
    kpis: {
      customers: { totalCustomers, activeCustomers },
      contracts: { totalActiveContracts, rentalContracts, folContracts, expiredContracts, approachingExpiration },
      equipment: { totalEquipment, installedEquipment, operational, nonOperational, damaged, underMaintenance, needsReplacement },
      visits: { totalVisitsMonth, completedVisits, scheduledVisits, pendingVisits, overdueVisits, upcomingVisits },
      batteries: { healthyBatteries, lowBatteries, needReplacement, batteryReplacementsMonth },
      consumables: { totalStock, estimatedMonthly: Math.round(estimatedMonthly * 10) / 10, actualMonthly, lowStock, outOfStock },
    },
    charts: {
      monthlyVisits,
      equipmentStatusDist,
      contractTypeDist,
      monthlyConsumption,
      equipByCustomerChart,
      batteryReplacementsChart,
      maintenanceOverview,
    },
  })
}
