import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

/**
 * GET /api/audit
 * List audit logs. Requires audit:view. Query: entityType, entityId, action, from, to.
 */
export async function GET(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "audit:view")) {
    return err("Insufficient permissions: audit:view required", 403)
  }

  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get("entityType") || undefined
  const entityId = searchParams.get("entityId") || undefined
  const action = searchParams.get("action") || undefined
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const userId = searchParams.get("userId") || undefined
  const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 500)

  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) dateFilter.lte = new Date(to)

  const logs = await db.auditLog.findMany({
    where: {
      AND: [
        entityType ? { entityType } : {},
        entityId ? { entityId } : {},
        action ? { action } : {},
        userId ? { userId } : {},
        (from || to) ? { createdAt: dateFilter } : {},
      ],
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return ok(logs)
}
