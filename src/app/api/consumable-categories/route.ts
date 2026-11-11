import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET() {
  const categories = await db.consumableCategory.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  })
  return ok(categories)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.name) return err("Name is required")
  const cat = await db.consumableCategory.create({
    data: { name: body.name, description: body.description },
  })
  return ok(cat, 201)
}
