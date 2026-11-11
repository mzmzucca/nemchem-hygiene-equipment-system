import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      movements: { include: { user: true }, orderBy: { date: "desc" } },
      consumption: {
        include: { customer: true, equipment: true, visit: true, technician: true },
        orderBy: { date: "desc" },
        take: 30,
      },
      technicianStock: { include: { technician: true } },
      consumptionRates: { include: { category: true } },
    },
  })
  if (!product) return err("Product not found", 404)
  return ok(product)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const product = await db.product.update({
    where: { id },
    data: {
      name: body.name,
      categoryId: body.categoryId,
      unitOfMeasurement: body.unitOfMeasurement,
      minimumStock: body.minimumStock !== undefined ? Number(body.minimumStock) : undefined,
      maximumStock: body.maximumStock !== undefined ? Number(body.maximumStock) : undefined,
      unitCost: body.unitCost !== undefined ? Number(body.unitCost) : undefined,
      supplier: body.supplier,
      status: body.status,
    },
    include: { category: true },
  })
  return ok(product)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.product.delete({ where: { id } })
  return ok({ success: true })
}
