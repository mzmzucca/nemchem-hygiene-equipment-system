import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const contract = await db.contract.findUnique({
    where: { id },
    include: {
      customer: { include: { locations: true } },
      technician: true,
      equipment: {
        include: { category: true, location: true, history: { orderBy: { date: "desc" }, take: 50 } },
      },
      visits: {
        include: { technician: true, _count: { select: { inspections: true } } },
        orderBy: { scheduledDate: "desc" },
      },
      batteries: { include: { equipment: true, technician: true }, orderBy: { replacementDate: "desc" } },
      consumption: { include: { product: true, equipment: true }, orderBy: { date: "desc" } },
    },
  })
  if (!contract) return err("Contract not found", 404)

  const completed = contract.visits.filter(v => v.status === "COMPLETED")
  const lastCompleted = completed[0] ?? null
  const upcoming = contract.visits.filter(v => v.status === "SCHEDULED" && v.scheduledDate >= new Date()).sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
  const nextScheduled = upcoming[0] ?? null

  return ok({
    ...contract,
    lastCompletedVisit: lastCompleted,
    nextScheduledVisit: nextScheduled,
    totalCompletedVisits: completed.length,
    overdueVisits: contract.visits.filter(v => v.status === "OVERDUE").length,
    installedMachines: contract.equipment.length,
  })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  // Handle status transitions for history
  const old = await db.contract.findUnique({ where: { id } })
  const contract = await db.contract.update({
    where: { id },
    data: {
      type: body.type,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      status: body.status,
      visitFrequency: body.visitFrequency,
      customDays: body.customDays !== undefined ? (body.customDays ? Number(body.customDays) : null) : undefined,
      technicianId: body.technicianId,
      monthlyFee: body.monthlyFee !== undefined ? Number(body.monthlyFee) : undefined,
      notes: body.notes,
    },
    include: { customer: true, technician: true },
  })

  if (old && body.status && body.status !== old.status) {
    // could log status change
  }
  return ok(contract)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.contract.update({ where: { id }, data: { equipment: { set: [] } } })
  await db.contract.delete({ where: { id } })
  return ok({ success: true })
}
