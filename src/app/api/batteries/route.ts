import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const equipmentId = searchParams.get("equipmentId")
  const customerId = searchParams.get("customerId")
  const contractId = searchParams.get("contractId")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) dateFilter.lte = new Date(to)

  const replacements = await db.batteryReplacement.findMany({
    where: {
      AND: [
        equipmentId ? { equipmentId } : {},
        customerId ? { customerId } : {},
        contractId ? { contractId } : {},
        (from || to) ? { replacementDate: dateFilter } : {},
      ],
    },
    include: {
      equipment: { include: { category: true, customer: true } },
      customer: true,
      contract: true,
      visit: true,
      technician: true,
    },
    orderBy: { replacementDate: "desc" },
  })
  return ok(replacements)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.equipmentId) return err("Equipment is required")

  const replacement = await db.batteryReplacement.create({
    data: {
      equipmentId: body.equipmentId,
      customerId: body.customerId || null,
      contractId: body.contractId || null,
      visitId: body.visitId || null,
      previousLevel: body.previousLevel || "UNKNOWN",
      newLevel: body.newLevel || "FULL",
      batteryType: body.batteryType || null,
      quantityUsed: Number(body.quantityUsed) || 0,
      replacementDate: body.replacementDate ? new Date(body.replacementDate) : new Date(),
      technicianId: body.technicianId || null,
      notes: body.notes,
    },
    include: { equipment: true, technician: true },
  })

  // 1. Update equipment's current battery info
  await db.equipment.update({
    where: { id: body.equipmentId },
    data: {
      currentBatteryLevel: body.newLevel || "FULL",
      lastBatteryReplacement: body.replacementDate ? new Date(body.replacementDate) : new Date(),
    },
  })

  // 2. Create battery replacement history
  await db.equipmentHistory.create({
    data: {
      equipmentId: body.equipmentId,
      eventType: "BATTERY_REPLACEMENT",
      description: `Battery replaced (${body.previousLevel} → ${body.newLevel}). Qty: ${body.quantityUsed}. ${body.notes ?? ""}`,
      performedBy: "Technician",
    },
  })

  // 3. Register batteries consumed in inventory (find battery product by type)
  if (body.quantityUsed > 0 && body.batteryType) {
    const sku = `BAT-${body.batteryType}-2`
    const product = await db.product.findUnique({ where: { sku } })
    if (product) {
      // decrement stock
      await db.product.update({
        where: { id: product.id },
        data: { currentStock: { decrement: Math.ceil(Number(body.quantityUsed) / 2) } },
      })
      await db.stockMovement.create({
        data: {
          productId: product.id,
          quantity: -Math.ceil(Number(body.quantityUsed) / 2),
          movementType: "EXIT",
          reference: `Battery replacement ${replacement.id}`,
          notes: `Battery replacement for equipment`,
          userId: body.technicianId,
        },
      })
      // consumption record
      await db.consumptionRecord.create({
        data: {
          productId: product.id,
          customerId: body.customerId || null,
          contractId: body.contractId || null,
          equipmentId: body.equipmentId,
          visitId: body.visitId || null,
          technicianId: body.technicianId || null,
          quantity: Math.ceil(Number(body.quantityUsed) / 2),
          notes: "Battery replacement",
        },
      })
    }
  }

  return ok(replacement, 201)
}
