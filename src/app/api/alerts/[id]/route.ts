import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/alerts/:id
 * Resolve (or reopen) an alert. Requires alerts:resolve.
 * Body: { action: "resolve" | "reopen" }
 */
export async function PUT(req: Request, { params }: RouteCtx) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "alerts:resolve")) {
    return err("Insufficient permissions: alerts:resolve required", 403)
  }

  const { id } = await params
  const existing = await db.alert.findUnique({ where: { id } })
  if (!existing) return err("Alert not found", 404)

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const action = String(body.action || "resolve").toLowerCase()

  if (action === "resolve") {
    const resolved = await db.alert.update({
      where: { id },
      data: {
        status: "RESOLVED",
        resolvedById: user.id,
        resolvedAt: new Date(),
      },
    })
    await audit({
      userId: user.id,
      userRole: user.role,
      action: "STATUS_CHANGE",
      entityType: "Alert",
      entityId: id,
      before: { status: existing.status },
      after: { status: "RESOLVED" },
      reason: "Alert resolved",
    })
    return ok(resolved)
  }

  if (action === "reopen") {
    const reopened = await db.alert.update({
      where: { id },
      data: {
        status: "OPEN",
        resolvedById: null,
        resolvedAt: null,
      },
    })
    await audit({
      userId: user.id,
      userRole: user.role,
      action: "STATUS_CHANGE",
      entityType: "Alert",
      entityId: id,
      before: { status: existing.status },
      after: { status: "OPEN" },
      reason: "Alert reopened",
    })
    return ok(reopened)
  }

  return err(`Unsupported action: ${action}`, 400)
}
