import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get("productId")
  const customerId = searchParams.get("customerId")
  const contractId = searchParams.get("contractId")
  const equipmentId = searchParams.get("equipmentId")
  const visitId = searchParams.get("visitId")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) dateFilter.lte = new Date(to)

  const records = await db.consumptionRecord.findMany({
    where: {
      AND: [
        productId ? { productId } : {},
        customerId ? { customerId } : {},
        contractId ? { contractId } : {},
        equipmentId ? { equipmentId } : {},
        visitId ? { visitId } : {},
        (from || to) ? { date: dateFilter } : {},
      ],
    },
    include: {
      product: { include: { category: true } },
      customer: true,
      contract: true,
      equipment: true,
      visit: true,
      technician: true,
    },
    orderBy: { date: "desc" },
    take: 200,
  })
  return ok(records)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.productId || body.quantity === undefined) return err("Product and quantity are required")

  const record = await db.consumptionRecord.create({
    data: {
      productId: body.productId,
      customerId: body.customerId || null,
      contractId: body.contractId || null,
      equipmentId: body.equipmentId || null,
      visitId: body.visitId || null,
      technicianId: body.technicianId || null,
      quantity: Number(body.quantity),
      notes: body.notes,
    },
    include: { product: true, customer: true },
  })

  // Decrement technician stock if technician specified
  if (body.technicianId) {
    const existing = await db.technicianStock.findUnique({
      where: { productId_technicianId: { productId: body.productId, technicianId: body.technicianId } },
    })
    if (existing) {
      await db.technicianStock.update({
        where: { id: existing.id },
        data: { quantity: { decrement: Number(body.quantity) } },
      })
    }
  }

  return ok(record, 201)
}
