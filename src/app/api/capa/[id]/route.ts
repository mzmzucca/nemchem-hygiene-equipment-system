import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * GET /api/capa/:id
 * Single CAPA with all relations + evidence.
 */
export async function GET(_req: Request, { params }: RouteCtx) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "capa:view")) {
    return err("Insufficient permissions: capa:view required", 403)
  }

  const { id } = await params
  const capa = await db.cAPA.findUnique({
    where: { id },
    include: {
      inspection: { select: { id: true, title: true, status: true, scheduledDate: true } },
      location: true,
      category: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      closedBy: { select: { id: true, name: true } },
      evidence: {
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!capa) return err("CAPA not found", 404)

  if (user.role === "INSPECTOR" && capa.assignedToId !== user.id) {
    return err("You can only access CAPAs assigned to you", 403)
  }

  return ok(capa)
}

/**
 * PUT /api/capa/:id
 * Action dispatch — body.action: "addEvidence" | "close" | "cancel" | "update"
 */
export async function PUT(req: Request, { params }: RouteCtx) {
  const user = await requireAuthOrDemo()
  const { id } = await params

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const existing = await db.cAPA.findUnique({ where: { id } })
  if (!existing) return err("CAPA not found", 404)

  const action = String(body.action || "update").toLowerCase()

  // Update generic fields (e.g. severity, targetDate, correctiveAction, status)
  if (action === "update") {
    if (!can(user.role, "capa:view")) {
      return err("Insufficient permissions: capa:view required", 403)
    }
    if (user.role === "INSPECTOR" && existing.assignedToId !== user.id) {
      return err("You can only update CAPAs assigned to you", 403)
    }
    const { severity, correctiveAction, targetDate, assignedToId, status, title, description, verificationComments } = body as Record<string, unknown>
    const updated = await db.cAPA.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: String(title) } : {}),
        ...(description !== undefined ? { description: String(description) } : {}),
        ...(severity !== undefined ? { severity: String(severity) } : {}),
        ...(correctiveAction !== undefined ? { correctiveAction: (correctiveAction as string) || null } : {}),
        ...(targetDate !== undefined ? { targetDate: targetDate ? new Date(targetDate as string) : null } : {}),
        ...(assignedToId !== undefined ? { assignedToId: (assignedToId as string) || null } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
        ...(verificationComments !== undefined ? { verificationComments: (verificationComments as string) || null } : {}),
      },
    })
    await audit({
      userId: user.id,
      userRole: user.role,
      action: "UPDATE",
      entityType: "CAPA",
      entityId: id,
      before: existing,
      after: updated,
    })
    return ok(updated)
  }

  if (action === "addevidence") {
    if (!can(user.role, "capa:addEvidence")) {
      return err("Insufficient permissions: capa:addEvidence required", 403)
    }
    if (user.role === "INSPECTOR" && existing.assignedToId !== user.id) {
      return err("You can only add evidence to CAPAs assigned to you", 403)
    }
    const { imageUrl, caption } = body as Record<string, unknown>
    if (!imageUrl) return err("imageUrl is required", 400)

    const evidence = await db.capaEvidence.create({
      data: {
        capaId: id,
        imageUrl: String(imageUrl),
        caption: (caption as string) ?? null,
        uploadedById: user.id,
      },
    })

    // If CAPA was OPEN or ASSIGNED, move it to IN_PROGRESS
    if (existing.status === "OPEN" || existing.status === "ASSIGNED") {
      await db.cAPA.update({ where: { id }, data: { status: "IN_PROGRESS" } })
    }

    await audit({
      userId: user.id,
      userRole: user.role,
      action: "UPDATE",
      entityType: "CAPA",
      entityId: id,
      reason: "Added corrective evidence",
      after: { evidenceId: evidence.id },
    })
    return ok(evidence, 201)
  }

  if (action === "close") {
    if (!can(user.role, "capa:close")) {
      return err("Insufficient permissions: capa:close required", 403)
    }
    if (user.role === "INSPECTOR" && existing.assignedToId !== user.id) {
      return err("You can only close CAPAs assigned to you", 403)
    }
    const { verificationComments } = body as Record<string, unknown>
    const closed = await db.cAPA.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedById: user.id,
        closureDate: new Date(),
        verificationComments: (verificationComments as string) ?? null,
      },
    })
    await audit({
      userId: user.id,
      userRole: user.role,
      action: "STATUS_CHANGE",
      entityType: "CAPA",
      entityId: id,
      before: { status: existing.status },
      after: { status: "CLOSED" },
      reason: "CAPA closed",
    })
    return ok(closed)
  }

  if (action === "cancel") {
    if (!can(user.role, "capa:cancel")) {
      return err("Insufficient permissions: capa:cancel required", 403)
    }
    if (user.role !== "ADMIN") {
      return err("Only ADMIN can cancel CAPAs", 403)
    }
    const { reason } = body as Record<string, unknown>
    const cancelled = await db.cAPA.update({
      where: { id },
      data: { status: "CANCELLED" },
    })
    await audit({
      userId: user.id,
      userRole: user.role,
      action: "STATUS_CHANGE",
      entityType: "CAPA",
      entityId: id,
      before: { status: existing.status },
      after: { status: "CANCELLED" },
      reason: (reason as string) ?? "CAPA cancelled by admin",
    })
    return ok(cancelled)
  }

  return err(`Unsupported action: ${action}`, 400)
}
