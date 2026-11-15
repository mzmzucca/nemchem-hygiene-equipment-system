import { db } from "@/lib/db"
import { ok } from "@/lib/api"
import { requireRole } from "@/lib/auth-guard"

/**
 * GET /api/audit
 * Returns the append-only audit log. Only MANAGER and ADMIN roles
 * can view the audit trail.
 */
export async function GET(req: Request) {
  const user = await requireRole("MANAGER", "ADMIN")
  if (user instanceof Response) return user

  const { searchParams } = new URL(req.url)
  const entityType = searchParams.get("entityType")
  const entityId = searchParams.get("entityId")
  const action = searchParams.get("action")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) dateFilter.lte = new Date(to)

  const logs = await db.auditLog.findMany({
    where: {
      AND: [
        entityType ? { entityType } : {},
        entityId ? { entityId } : {},
        action ? { action } : {},
        (from || to) ? { createdAt: dateFilter } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })
  return ok(logs)
}
