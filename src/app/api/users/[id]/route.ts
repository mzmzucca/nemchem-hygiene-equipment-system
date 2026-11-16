import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"
import { hashPassword } from "@/lib/password"

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * GET /api/users/:id
 */
export async function GET(_req: Request, { params }: RouteCtx) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "users:view")) {
    return err("Insufficient permissions: users:view required", 403)
  }

  const { id } = await params
  const target = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      active: true,
      avatar: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          inspectionsCreated: true,
          inspectionsAssigned: true,
          capasAssigned: true,
          capasClosed: true,
        },
      },
    },
  })

  if (!target) return err("User not found", 404)
  return ok(target)
}

/**
 * PUT /api/users/:id
 * Update role, active, name, phone, password, etc. Requires users:manage.
 */
export async function PUT(req: Request, { params }: RouteCtx) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "users:manage")) {
    return err("Insufficient permissions: users:manage required", 403)
  }

  const { id } = await params
  const existing = await db.user.findUnique({ where: { id } })
  if (!existing) return err("User not found", 404)

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const { name, email, role, phone, active, password, avatar } = body as Record<string, unknown>

  if (email && String(email).toLowerCase() !== existing.email) {
    const dup = await db.user.findUnique({ where: { email: String(email).toLowerCase() } })
    if (dup) return err("A user with this email already exists", 409)
  }

  const validRoles = ["ADMIN", "CEO", "SUPERVISOR", "INSPECTOR"]
  if (role && !validRoles.includes(String(role))) {
    return err(`Invalid role: ${role}`, 400)
  }

  const updated = await db.user.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: String(name) } : {}),
      ...(email !== undefined ? { email: String(email).toLowerCase() } : {}),
      ...(role !== undefined ? { role: String(role) } : {}),
      ...(phone !== undefined ? { phone: (phone as string) || null } : {}),
      ...(active !== undefined ? { active: Boolean(active) } : {}),
      ...(avatar !== undefined ? { avatar: (avatar as string) || null } : {}),
      ...(password ? { password: hashPassword(String(password)) } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      active: true,
      avatar: true,
      updatedAt: true,
    },
  })

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "UPDATE",
    entityType: "User",
    entityId: id,
    before: { ...existing, password: "[redacted]" },
    after: { ...updated, password: password ? "[changed]" : undefined },
  })

  return ok(updated)
}
