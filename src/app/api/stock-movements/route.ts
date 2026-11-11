import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo as requireAuth, audit } from "@/lib/auth-guard"

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

  const user = await requireAuth()

  const qty = Number(body.quantity)
  if (isNaN(qty) || qty <= 0) return err("Quantity must be a positive number")

  // Compute the resulting stock level and enforce the negative-stock rule.
  // Stock can ONLY go negative via an explicit ADJUSTMENT movement (which is
  // a deliberate reconciliation act, not a routine exit/allocation).
  const product = await db.product.findUnique({ where: { id: body.productId } })
  if (!product) return err("Product not found", 404)

  let newStock = product.currentStock
  const isEntry = body.movementType === "ENTRY" || body.movementType === "RETURN"
  const isExit = body.movementType === "EXIT" || body.movementType === "ALLOCATION"
  const isAdjustment = body.movementType === "ADJUSTMENT"

  if (isEntry) newStock += qty
  else if (isExit) newStock -= qty
  else if (isAdjustment) newStock = qty // set to absolute value
  else if (body.movementType === "TRANSFER") newStock -= qty

  // NEGATIVE STOCK PROTECTION:
  // Routine movements (EXIT, ALLOCATION, TRANSFER) cannot drive stock below zero.
  // If they would, the operation is REJECTED — the user must either reduce the
  // quantity or perform an explicit ADJUSTMENT to correct the stock level first.
  // Only ADJUSTMENT can set stock to any value (including correcting to zero).
  if (newStock < 0 && !isAdjustment) {
    return err(
      `Insufficient stock: current ${product.currentStock}, ` +
        `requested ${qty} (${body.movementType}) would result in ${newStock}. ` +
        `Use an ADJUSTMENT movement to reconcile stock if this is correct.`,
      400
    )
  }

  // Everything runs in a transaction so stock + movement + technician stock
  // stay consistent.
  const movement = await db.$transaction(async (tx) => {
    const mv = await tx.stockMovement.create({
      data: {
        productId: body.productId,
        quantity: qty,
        movementType: body.movementType || "ENTRY",
        userId: user.id,
        reference: body.reference,
        notes: body.notes,
      },
      include: { product: true, user: true },
    })

    await tx.product.update({
      where: { id: body.productId },
      data: { currentStock: Math.max(0, newStock) },
    })

    // For allocation, add to technician stock
    if (body.movementType === "ALLOCATION" && body.technicianId) {
      const existing = await tx.technicianStock.findUnique({
        where: { productId_technicianId: { productId: body.productId, technicianId: body.technicianId } },
      })
      if (existing) {
        await tx.technicianStock.update({
          where: { id: existing.id },
          data: { quantity: { increment: qty } },
        })
      } else {
        await tx.technicianStock.create({
          data: { productId: body.productId, technicianId: body.technicianId, quantity: qty },
        })
      }
    }

    // For return, decrement technician stock
    if (body.movementType === "RETURN" && body.technicianId) {
      const existing = await tx.technicianStock.findUnique({
        where: { productId_technicianId: { productId: body.productId, technicianId: body.technicianId } },
      })
      if (existing) {
        const newTechStock = Math.max(0, existing.quantity - qty)
        await tx.technicianStock.update({
          where: { id: existing.id },
          data: { quantity: newTechStock },
        })
      }
    }

    return mv
  })

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "CREATE",
    entityType: "StockMovement",
    entityId: movement.id,
    after: { productId: body.productId, type: body.movementType, qty, resultingStock: newStock },
  })

  return ok(movement, 201)
}
