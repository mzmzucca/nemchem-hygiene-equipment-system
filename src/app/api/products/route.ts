import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get("categoryId")
  const status = searchParams.get("status")
  const q = searchParams.get("q")

  const products = await db.product.findMany({
    where: {
      AND: [
        categoryId ? { categoryId } : {},
        status ? { status } : {},
        q ? { OR: [{ name: { contains: q } }, { sku: { contains: q } }] } : {},
      ],
    },
    include: {
      category: true,
      movements: { orderBy: { date: "desc" }, take: 10 },
      _count: { select: { consumption: true } },
    },
    orderBy: { name: "asc" },
  })
  return ok(products)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.name || !body.sku || !body.categoryId) return err("Name, SKU and category are required")
  const existing = await db.product.findUnique({ where: { sku: body.sku } })
  if (existing) return err("SKU already exists")

  const product = await db.product.create({
    data: {
      name: body.name,
      categoryId: body.categoryId,
      sku: body.sku,
      unitOfMeasurement: body.unitOfMeasurement || "unit",
      currentStock: Number(body.currentStock) || 0,
      minimumStock: Number(body.minimumStock) || 0,
      maximumStock: Number(body.maximumStock) || 0,
      unitCost: Number(body.unitCost) || 0,
      supplier: body.supplier,
      status: body.status || "ACTIVE",
    },
    include: { category: true },
  })

  if (Number(body.currentStock) > 0) {
    await db.stockMovement.create({
      data: {
        productId: product.id,
        quantity: Number(body.currentStock),
        movementType: "ENTRY",
        reference: "Initial stock",
        notes: "Product created with initial stock",
      },
    })
  }
  return ok(product, 201)
}
