import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

/**
 * GET /api/announcements
 * Announcements filtered by audience (ALL or user's role).
 */
export async function GET(req: Request) {
  const user = await requireAuthOrDemo()

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100)

  const announcements = await db.announcement.findMany({
    where: {
      OR: [{ audience: "ALL" }, { audience: user.role }],
    },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return ok(announcements)
}

/**
 * POST /api/announcements
 * Create announcement. Requires announcements:broadcast.
 */
export async function POST(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "announcements:broadcast")) {
    return err("Insufficient permissions: announcements:broadcast required", 403)
  }

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const { title, body: annBody, audience } = body as Record<string, unknown>
  if (!title || !annBody) return err("Title and body are required", 400)

  const validAudiences = ["ALL", "ADMIN", "CEO", "SUPERVISOR", "INSPECTOR"]
  const finalAudience = validAudiences.includes(String(audience)) ? String(audience) : "ALL"

  const announcement = await db.announcement.create({
    data: {
      createdById: user.id,
      title: String(title),
      body: String(annBody),
      audience: finalAudience,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  })

  // Notify every user who matches the audience
  const targetWhere =
    finalAudience === "ALL"
      ? { active: true }
      : { role: finalAudience, active: true }
  const recipients = await db.user.findMany({ where: targetWhere, select: { id: true } })

  if (recipients.length > 0) {
    await db.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.id,
        type: "ANNOUNCEMENT",
        title: String(title),
        message: String(annBody).slice(0, 200),
        relatedId: announcement.id,
      })),
    })
  }

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "CREATE",
    entityType: "Announcement",
    entityId: announcement.id,
    after: { title, audience: finalAudience, recipients: recipients.length },
  })

  return ok(announcement, 201)
}
