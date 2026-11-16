import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

/**
 * GET /api/defects
 * List defects. Query: severity, status, locationId.
 */
export async function GET(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "defects:view")) {
    return err("Insufficient permissions: defects:view required", 403)
  }

  const { searchParams } = new URL(req.url)
  const severity = searchParams.get("severity") || undefined
  const status = searchParams.get("status") || undefined
  const locationId = searchParams.get("locationId") || undefined

  const defects = await db.defect.findMany({
    where: {
      ...(severity ? { severity } : {}),
      ...(status ? { status } : {}),
      ...(locationId ? { locationId } : {}),
    },
    include: {
      location: { select: { id: true, name: true, code: true } },
      category: { select: { id: true, name: true } },
      inspection: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return ok(defects)
}
