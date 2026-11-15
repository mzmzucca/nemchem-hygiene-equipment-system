import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")
  const category = searchParams.get("category")
  const status = searchParams.get("status")

  const customers = await db.customer.findMany({
    where: {
      AND: [
        q ? { OR: [{ name: { contains: q } }, { code: { contains: q } }, { contactPerson: { contains: q } }] } : {},
        category ? { category } : {},
        status ? { status } : {},
      ],
    },
    include: {
      locations: true,
      _count: { select: { contracts: true, equipment: true, visits: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return ok(customers)
}

export async function POST(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "customers:create")) {
    return err("Insufficient permissions: creating customers requires MANAGER or ADMIN role", 403)
  }

  const body = await req.json()
  if (!body.name || !body.code) return err("Name and code are required")
  const existing = await db.customer.findUnique({ where: { code: body.code } })
  if (existing) return err("Customer code already exists")
  const customer = await db.customer.create({
    data: {
      name: body.name,
      code: body.code,
      category: body.category || "OTHER",
      address: body.address,
      city: body.city,
      contactPerson: body.contactPerson,
      phone: body.phone,
      email: body.email,
      notes: body.notes,
      status: body.status || "ACTIVE",
    },
  })

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "CREATE",
    entityType: "Customer",
    entityId: customer.id,
    after: { name: body.name, code: body.code },
  })

  return ok(customer, 201)
}
