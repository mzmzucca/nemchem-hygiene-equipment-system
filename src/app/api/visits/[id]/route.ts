import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const visit = await db.visit.findUnique({
    where: { id },
    include: {
      customer: { include: { locations: true } },
      contract: { include: { equipment: { include: { category: true, location: true } } } },
      technician: true,
      inspections: { include: { equipment: true, technician: true, photos: true } },
      consumption: { include: { product: true, equipment: true } },
      batteries: { include: { equipment: true } },
    },
  })
  if (!visit) return err("Visit not found", 404)
  return ok(visit)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const visit = await db.visit.update({
    where: { id },
    data: {
      customerId: body.customerId,
      contractId: body.contractId,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined,
      scheduledTime: body.scheduledTime,
      technicianId: body.technicianId,
      visitType: body.visitType,
      status: body.status,
      notes: body.notes,
      completedAt: body.status === "COMPLETED" ? new Date() : undefined,
    },
    include: { customer: true, contract: true, technician: true },
  })

  // Auto-schedule next if completed
  if (body.status === "COMPLETED" && visit.contractId) {
    const contract = await db.contract.findUnique({ where: { id: visit.contractId } })
    if (contract) {
      const freq = contract.visitFrequency
      const days = freq === "DAILY" ? 1 : freq === "WEEKLY" ? 7 : freq === "BIWEEKLY" ? 14 : freq === "MONTHLY" ? 30 : (contract.customDays ?? 30)
      const nextDate = new Date(visit.scheduledDate)
      nextDate.setDate(nextDate.getDate() + days)
      const existing = await db.visit.findFirst({
        where: { contractId: visit.contractId, scheduledDate: nextDate, status: { in: ["SCHEDULED", "PENDING"] } },
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
  }
  return ok(visit)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.visit.delete({ where: { id } })
  return ok({ success: true })
}
