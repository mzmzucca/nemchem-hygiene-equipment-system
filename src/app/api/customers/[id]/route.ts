import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      locations: { include: { _count: { select: { equipment: true } } } },
      contracts: {
        include: { technician: true, _count: { select: { equipment: true, visits: true } } },
        orderBy: { startDate: "desc" },
      },
      equipment: {
        include: { category: true, location: true, contract: true },
      },
      visits: {
        include: { technician: true, contract: true, _count: { select: { inspections: true } } },
        orderBy: { scheduledDate: "desc" },
        take: 20,
      },
      consumption: { include: { product: true }, orderBy: { date: "desc" }, take: 20 },
      batteries: { include: { equipment: true }, orderBy: { replacementDate: "desc" }, take: 20 },
    },
  })
  if (!customer) return err("Customer not found", 404)
  return ok(customer)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const customer = await db.customer.update({
    where: { id },
    data: {
      name: body.name,
      category: body.category,
      address: body.address,
      city: body.city,
      contactPerson: body.contactPerson,
      phone: body.phone,
      email: body.email,
      notes: body.notes,
      status: body.status,
    },
  })
  return ok(customer)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.customer.delete({ where: { id } })
  return ok({ success: true })
}
