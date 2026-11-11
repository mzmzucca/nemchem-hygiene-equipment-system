import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get("customerId")
  const contractId = searchParams.get("contractId")
  const technicianId = searchParams.get("technicianId")
  const status = searchParams.get("status")
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const visitType = searchParams.get("visitType")

  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) dateFilter.lte = new Date(to)

  const visits = await db.visit.findMany({
    where: {
      AND: [
        customerId ? { customerId } : {},
        contractId ? { contractId } : {},
        technicianId ? { technicianId } : {},
        status ? { status } : {},
        visitType ? { visitType } : {},
        (from || to) ? { scheduledDate: dateFilter } : {},
      ],
    },
    include: {
      customer: true,
      contract: true,
      technician: true,
      _count: { select: { inspections: true, consumption: true, batteries: true } },
    },
    orderBy: { scheduledDate: "desc" },
  })
  return ok(visits)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.customerId || !body.scheduledDate) return err("Customer and scheduled date are required")

  const visit = await db.visit.create({
    data: {
      customerId: body.customerId,
      contractId: body.contractId || null,
      scheduledDate: new Date(body.scheduledDate),
      scheduledTime: body.scheduledTime,
      technicianId: body.technicianId || null,
      visitType: body.visitType || "INSPECTION",
      status: body.status || "SCHEDULED",
      notes: body.notes,
    },
    include: { customer: true, contract: true, technician: true },
  })
  return ok(visit, 201)
}

// Auto-schedule next visit
export async function PUT(req: Request) {
  const body = await req.json()
  const { action, visitId } = body

  if (action === "complete") {
    const visit = await db.visit.findUnique({
      where: { id: visitId },
      include: { contract: true },
    })
    if (!visit) return err("Visit not found", 404)

    const updated = await db.visit.update({
      where: { id: visitId },
      data: { status: "COMPLETED", completedAt: new Date() },
    })

    // Auto-schedule next visit based on contract frequency
    if (visit.contract) {
      const freq = visit.contract.visitFrequency
      const days = freq === "DAILY" ? 1 : freq === "WEEKLY" ? 7 : freq === "BIWEEKLY" ? 14 : freq === "MONTHLY" ? 30 : (visit.contract.customDays ?? 30)
      const nextDate = new Date(visit.scheduledDate)
      nextDate.setDate(nextDate.getDate() + days)

      // Avoid duplicate
      const existing = await db.visit.findFirst({
        where: {
          contractId: visit.contractId,
          scheduledDate: nextDate,
          status: { in: ["SCHEDULED", "PENDING"] },
        },
      })
      if (!existing) {
        await db.visit.create({
          data: {
            customerId: visit.customerId,
            contractId: visit.contractId,
            scheduledDate: nextDate,
            scheduledTime: visit.scheduledTime,
            technicianId: visit.technicianId,
            visitType: "INSPECTION",
            status: "SCHEDULED",
          },
        })
      }
    }
    return ok(updated)
  }
  return err("Unknown action")
}
