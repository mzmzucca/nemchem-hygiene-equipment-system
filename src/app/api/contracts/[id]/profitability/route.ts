import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

/**
 * GET /api/contracts/[id]/profitability
 *
 * Calculates the financial performance of a contract:
 * - Revenue: monthlyFee × months elapsed since start date
 * - Consumables cost: sum of (consumption quantity × product unit cost)
 * - Estimated technician cost: number of completed visits × assumed cost per visit
 * - Profit margin: (revenue - costs) / revenue
 *
 * For FOL contracts (no monthly fee), only costs are shown — the
 * "profitability" becomes a cost-of-service metric.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const contract = await db.contract.findUnique({
    where: { id },
    include: {
      customer: true,
      equipment: true,
      visits: { where: { status: "COMPLETED" } },
    },
  })
  if (!contract) return err("Contract not found", 404)

  const now = new Date()
  const monthsElapsed = Math.max(
    1,
    Math.round((now.getTime() - contract.startDate.getTime()) / (30 * 86400000))
  )

  const totalRevenue = contract.monthlyFee * monthsElapsed
  const isRental = contract.type === "RENTAL"

  const consumption = await db.consumptionRecord.findMany({
    where: { contractId: id },
    include: { product: true },
  })
  const consumablesCost = consumption.reduce(
    (sum, r) => sum + r.quantity * (r.product?.unitCost ?? 0),
    0
  )
  const consumablesUnits = consumption.reduce((sum, r) => sum + r.quantity, 0)

  const costPerVisit = 350
  const completedVisits = contract.visits.length
  const technicianCost = completedVisits * costPerVisit

  const costPerEquipmentPerMonth = 2000
  const equipmentCount = contract.equipment.length
  const equipmentCost = equipmentCount * monthsElapsed * costPerEquipmentPerMonth

  const totalCosts = consumablesCost + technicianCost + equipmentCost
  const netResult = totalRevenue - totalCosts
  const margin = totalRevenue > 0 ? (netResult / totalRevenue) * 100 : 0

  const monthly = []
  for (let i = 5; i >= 0; i--) {
    const ms = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const me = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const monthConsumption = await db.consumptionRecord.findMany({
      where: { contractId: id, date: { gte: ms, lte: me } },
      include: { product: true },
    })
    const monthVisits = await db.visit.count({
      where: { contractId: id, status: "COMPLETED", completedAt: { gte: ms, lte: me } },
    })
    monthly.push({
      month: ms.toLocaleString("default", { month: "short" }),
      revenue: contract.monthlyFee,
      consumables: monthConsumption.reduce((s, r) => s + r.quantity * (r.product?.unitCost ?? 0), 0),
      visits: monthVisits,
      technicianCost: monthVisits * costPerVisit,
    })
  }

  return ok({
    type: contract.type,
    isRental,
    monthsElapsed,
    completedVisits,
    equipmentCount,
    revenue: { monthlyFee: contract.monthlyFee, total: totalRevenue },
    costs: {
      consumables: consumablesCost,
      consumablesUnits,
      technician: technicianCost,
      costPerVisit,
      equipment: equipmentCost,
      costPerEquipmentPerMonth,
      total: totalCosts,
    },
    netResult,
    margin: Math.round(margin * 10) / 10,
    monthly,
  })
}
