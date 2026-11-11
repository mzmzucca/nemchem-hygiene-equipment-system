import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const equipment = await db.equipment.findUnique({
    where: { id },
    include: {
      category: true,
      customer: { include: { locations: true } },
      contract: { include: { customer: true } },
      location: true,
      history: { orderBy: { date: "desc" } },
      inspections: {
        include: { technician: true, visit: true, photos: true },
        orderBy: { inspectedAt: "desc" },
      },
      batteries: {
        include: { technician: true, visit: true },
        orderBy: { replacementDate: "desc" },
      },
      consumption: {
        include: { product: true, visit: true },
        orderBy: { date: "desc" },
      },
    },
  })
  if (!equipment) return err("Equipment not found", 404)
  return ok(equipment)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const old = await db.equipment.findUnique({ where: { id } })

  const equipment = await db.equipment.update({
    where: { id },
    data: {
      name: body.name,
      categoryId: body.categoryId,
      brand: body.brand,
      model: body.model,
      serialNumber: body.serialNumber,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
      installationDate: body.installationDate ? new Date(body.installationDate) : undefined,
      customerId: body.customerId,
      contractId: body.contractId,
      locationId: body.locationId,
      batteryType: body.batteryType,
      operationalStatus: body.operationalStatus,
      installationStatus: body.installationStatus,
      currentBatteryLevel: body.currentBatteryLevel,
      notes: body.notes,
    },
    include: { category: true, customer: true, contract: true, location: true },
  })

  // Record history for status changes
  if (old && body.operationalStatus && body.operationalStatus !== old.operationalStatus) {
    await db.equipmentHistory.create({
      data: {
        equipmentId: id,
        eventType: body.operationalStatus === "UNDER_MAINTENANCE" ? "MAINTENANCE" : "REPLACEMENT",
        description: `Operational status changed from ${old.operationalStatus} to ${body.operationalStatus}`,
      },
    })
  }
  if (old && body.customerId && body.customerId !== old.customerId) {
    const cust = await db.customer.findUnique({ where: { id: body.customerId } })
    await db.equipmentHistory.create({
      data: {
        equipmentId: id,
        eventType: "RELOCATION",
        description: `Reassigned to ${cust?.name ?? "new customer"}`,
      },
    })
  }
  return ok(equipment)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.equipmentHistory.create({
    data: {
      equipmentId: id,
      eventType: "DECOMMISSIONING",
      description: "Equipment decommissioned",
    },
  })
  await db.equipment.update({
    where: { id },
    data: {
      operationalStatus: "DECOMMISSIONED",
      customerId: null,
      contractId: null,
      locationId: null,
    },
  })
  return ok({ success: true })
}
