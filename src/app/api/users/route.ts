import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"
import { hashPassword } from "@/lib/password"

/**
 * GET /api/users
 * List users. Requires users:view.
 */
export async function GET(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "users:view")) {
    return err("Insufficient permissions: users:view required", 403)
  }

  const { searchParams } = new URL(req.url)
  const role = searchParams.get("role") || undefined
  const active = searchParams.get("active")

  const users = await db.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(active !== null && active !== undefined ? { active: active === "true" } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      active: true,
      avatar: true,
      createdAt: true,
      _count: {
        select: {
          inspectionsCreated: true,
          inspectionsAssigned: true,
          capasAssigned: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return ok(users)
}

/**
 * POST /api/users
 * Create a user. Requires users:manage.
 */
export async function POST(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "users:manage")) {
    return err("Insufficient permissions: users:manage required", 403)
  }

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const { email, name, password, role, phone, active } = body as Record<string, unknown>
  if (!email || !name || !password) {
    return err("Email, name, and password are required", 400)
  }

  const existing = await db.user.findUnique({ where: { email: String(email).toLowerCase() } })
  if (existing) return err("A user with this email already exists", 409)

  const validRoles = ["ADMIN", "CEO", "SUPERVISOR", "INSPECTOR"]
  const finalRole = validRoles.includes(String(role)) ? String(role) : "INSPECTOR"

  const created = await db.user.create({
    data: {
      email: String(email).toLowerCase(),
      name: String(name),
      password: hashPassword(String(password)),
      role: finalRole,
      phone: (phone as string) ?? null,
      active: active !== false,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      active: true,
      createdAt: true,
    },
  })

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "CREATE",
    entityType: "User",
    entityId: created.id,
    after: { ...created, password: "[redacted]" },
  })

  return ok(created, 201)
}
