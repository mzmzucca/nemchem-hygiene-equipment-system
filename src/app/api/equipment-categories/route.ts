import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET() {
  const categories = await db.equipmentCategory.findMany({
    include: { _count: { select: { equipment: true, consumptionRates: true } } },
    orderBy: { name: "asc" },
  })
  return ok(categories)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.name) return err("Name is required")
  const cat = await db.equipmentCategory.create({
    data: {
      name: body.name,
      description: body.description,
      usesBatteries: body.usesBatteries ?? false,
    },
  })
  return ok(cat, 201)
}
