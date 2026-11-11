import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get("productId")
  const movementType = searchParams.get("movementType")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) dateFilter.lte = new Date(to)

  const movements = await db.stockMovement.findMany({
    where: {
      AND: [
        productId ? { productId } : {},
        movementType ? { movementType } : {},
        (from || to) ? { date: dateFilter } : {},
      ],
    },
    include: { product: { include: { category: true } }, user: true },
    orderBy: { date: "desc" },
    take: 200,
  })
  return ok(movements)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.productId || body.quantity === undefined) return err("Product and quantity are required")

  const qty = Number(body.quantity)
  const movement = await db.stockMovement.create({
    data: {
      productId: body.productId,
      quantity: qty,
      movementType: body.movementType || "ENTRY",
      userId: body.userId || null,
      reference: body.reference,
      notes: body.notes,
    },
    include: { product: true, user: true },
  })

  // Update product stock
  const product = await db.product.findUnique({ where: { id: body.productId } })
  if (product) {
    let newStock = product.currentStock
    if (body.movementType === "ENTRY") newStock += qty
    else if (body.movementType === "EXIT") newStock -= qty
    else if (body.movementType === "ADJUSTMENT") newStock = qty // set to absolute
    else if (body.movementType === "RETURN") newStock += qty
    else if (body.movementType === "ALLOCATION") newStock -= qty
    newStock = Math.max(0, newStock)
    await db.product.update({ where: { id: body.productId }, data: { currentStock: newStock } })

    // For allocation, add to technician stock
    if (body.movementType === "ALLOCATION" && body.technicianId) {
      const existing = await db.technicianStock.findUnique({
        where: { productId_technicianId: { productId: body.productId, technicianId: body.technicianId } },
      })
      if (existing) {
        await db.technicianStock.update({
          where: { id: existing.id },
          data: { quantity: { increment: qty } },
        })
      } else {
        await db.technicianStock.create({
          data: { productId: body.productId, technicianId: body.technicianId, quantity: qty },
        })
      }
    }
    if (body.movementType === "RETURN" && body.technicianId) {
      const existing = await db.technicianStock.findUnique({
        where: { productId_technicianId: { productId: body.productId, technicianId: body.technicianId } },
      })
      if (existing) {
        await db.technicianStock.update({
          where: { id: existing.id },
          data: { quantity: { decrement: qty } },
        })
      }
    }
  }

  return ok(movement, 201)
}
