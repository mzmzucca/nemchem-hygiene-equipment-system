import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

/**
 * GET /api/alerts
 * List alerts. Query: status, severity.
 */
export async function GET(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "alerts:view")) {
    return err("Insufficient permissions: alerts:view required", 403)
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || undefined
  const severity = searchParams.get("severity") || undefined

  const alerts = await db.alert.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(severity ? { severity } : {}),
    },
    include: {
      location: { select: { id: true, name: true, code: true } },
      inspection: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return ok(alerts)
}
