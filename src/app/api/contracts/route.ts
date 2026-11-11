import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get("customerId")
  const type = searchParams.get("type")
  const status = searchParams.get("status")
  const q = searchParams.get("q")

  const contracts = await db.contract.findMany({
    where: {
      AND: [
        customerId ? { customerId } : {},
        type ? { type } : {},
        status ? { status } : {},
        q ? { contractNumber: { contains: q } } : {},
      ],
    },
    include: {
      customer: true,
      technician: true,
      _count: { select: { equipment: true, visits: true } },
    },
    orderBy: { startDate: "desc" },
  })

  // Enrich with computed visit info
  const enriched = await Promise.all(
    contracts.map(async (c) => {
      const visits = await db.visit.findMany({
        where: { contractId: c.id },
        orderBy: { scheduledDate: "desc" },
      })
      const completed = visits.filter(v => v.status === "COMPLETED")
      const lastCompleted = completed[0] ?? null
      const upcoming = visits.filter(v => v.status === "SCHEDULED" && v.scheduledDate >= new Date()).sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
      const nextScheduled = upcoming[0] ?? null
      const overdueCount = visits.filter(v => v.status === "OVERDUE").length
      return {
        ...c,
        lastCompletedVisit: lastCompleted,
        nextScheduledVisit: nextScheduled,
        totalCompletedVisits: completed.length,
        overdueVisits: overdueCount,
        installedMachines: c._count.equipment,
      }
    })
  )
  return ok(enriched)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.contractNumber || !body.customerId || !body.startDate || !body.endDate) {
    return err("Missing required fields")
  }
  const existing = await db.contract.findUnique({ where: { contractNumber: body.contractNumber } })
  if (existing) return err("Contract number already exists")

  const contract = await db.contract.create({
    data: {
      contractNumber: body.contractNumber,
      customerId: body.customerId,
      type: body.type || "RENTAL",
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      status: body.status || "ACTIVE",
      visitFrequency: body.visitFrequency || "MONTHLY",
      customDays: body.customDays ? Number(body.customDays) : null,
      technicianId: body.technicianId || null,
      monthlyFee: body.monthlyFee ? Number(body.monthlyFee) : 0,
      notes: body.notes,
    },
    include: { customer: true, technician: true },
  })
  return ok(contract, 201)
}
