import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get("customerId")
  const locations = await db.customerLocation.findMany({
    where: customerId ? { customerId } : {},
    include: { customer: true, _count: { select: { equipment: true } } },
    orderBy: { name: "asc" },
  })
  return ok(locations)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.customerId || !body.name) return err("Customer and name are required")
  const loc = await db.customerLocation.create({
    data: { customerId: body.customerId, name: body.name, floor: body.floor, notes: body.notes },
  })
  return ok(loc, 201)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return err("id required")
  await db.customerLocation.delete({ where: { id } })
  return ok({ success: true })
}
