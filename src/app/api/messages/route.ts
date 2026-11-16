import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

/**
 * GET /api/messages
 * Messages where fromUserId or toUserId === user.id.
 */
export async function GET(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "messages:view")) {
    return err("Insufficient permissions: messages:view required", 403)
  }

  const { searchParams } = new URL(req.url)
  const withUserId = searchParams.get("with")
  const unreadOnly = searchParams.get("unread") === "true"

  const where = {
    OR: [{ fromUserId: user.id }, { toUserId: user.id }],
    ...(withUserId ? { OR: [{ fromUserId: user.id, toUserId: withUserId }, { fromUserId: withUserId, toUserId: user.id }] } : {}),
    ...(unreadOnly ? { read: false, toUserId: user.id } : {}),
  }

  const messages = await db.message.findMany({
    where,
    include: {
      sender: { select: { id: true, name: true, email: true, role: true } },
      recipient: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return ok(messages)
}

/**
 * POST /api/messages
 * Send a message. Requires messages:send.
 */
export async function POST(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "messages:send")) {
    return err("Insufficient permissions: messages:send required", 403)
  }

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const { toUserId, subject, body: msgBody } = body as Record<string, unknown>
  if (!toUserId || !subject || !msgBody) {
    return err("toUserId, subject, and body are required", 400)
  }
  if (toUserId === user.id) {
    return err("Cannot send a message to yourself", 400)
  }

  const recipient = await db.user.findUnique({ where: { id: String(toUserId) } })
  if (!recipient) return err("Recipient not found", 404)

  const message = await db.message.create({
    data: {
      fromUserId: user.id,
      toUserId: String(toUserId),
      subject: String(subject),
      body: String(msgBody),
    },
    include: {
      sender: { select: { id: true, name: true } },
      recipient: { select: { id: true, name: true } },
    },
  })

  // Notify recipient
  await db.notification.create({
    data: {
      userId: String(toUserId),
      type: "MESSAGE",
      title: `New message from ${user.name}`,
      message: String(subject),
      relatedId: message.id,
    },
  })

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "CREATE",
    entityType: "Message",
    entityId: message.id,
    after: { toUserId, subject },
  })

  return ok(message, 201)
}

/**
 * PUT /api/messages
 * Mark a message as read. Body: { id, read: true }
 * Only the recipient can mark a message as read.
 */
export async function PUT(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "messages:view")) {
    return err("Insufficient permissions: messages:view required", 403)
  }

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const { id, read } = body as { id?: string; read?: boolean }
  if (!id) return err("Message id is required", 400)

  const existing = await db.message.findUnique({ where: { id: String(id) } })
  if (!existing) return err("Message not found", 404)
  if (existing.toUserId !== user.id) {
    return err("Only the recipient can mark a message as read", 403)
  }

  const updated = await db.message.update({
    where: { id: String(id) },
    data: { read: read !== false },
  })

  return ok(updated)
}
