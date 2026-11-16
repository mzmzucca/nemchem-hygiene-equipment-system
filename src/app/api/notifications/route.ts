import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo } from "@/lib/auth-guard"

/**
 * GET /api/notifications
 * List notifications for the current user (filtered by userId === user.id).
 */
export async function GET(req: Request) {
  const user = await requireAuthOrDemo()

  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get("unread") === "true"

  const notifications = await db.notification.findMany({
    where: {
      userId: user.id,
      ...(unreadOnly ? { read: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const unreadCount = await db.notification.count({
    where: { userId: user.id, read: false },
  })

  return ok({ items: notifications, unreadCount })
}

/**
 * PUT /api/notifications
 * Mark as read. Body: { ids?: string[], all?: boolean }
 */
export async function PUT(req: Request) {
  const user = await requireAuthOrDemo()
  const body = await req.json().catch(() => ({}))

  const ids: string[] = Array.isArray(body.ids) ? body.ids : []
  const all: boolean = body.all === true

  if (all) {
    const result = await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    })
    return ok({ updated: result.count })
  }

  if (ids.length === 0) return err("Provide ids[] or all=true", 400)

  const result = await db.notification.updateMany({
    where: { id: { in: ids }, userId: user.id },
    data: { read: true },
  })

  return ok({ updated: result.count })
}
