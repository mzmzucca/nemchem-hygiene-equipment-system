import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"
import { Prisma } from "@prisma/client"

interface RouteCtx {
  params: Promise<{ id: string }>
}

const CAPABILITY_BY_STATUS: Record<string, string> = {
  ASSIGNED: "inspections:assign",
  ACCEPTED: "inspections:accept",
  DECLINED: "inspections:decline",
  IN_PROGRESS: "inspections:start",
  SUBMITTED: "inspections:submit",
  APPROVED: "inspections:approve",
  RETURNED: "inspections:return",
  CLOSED: "inspections:close",
  UNDER_REVIEW: "inspections:reopen",
}

/**
 * GET /api/inspections/:id
 * Single inspection with full relations.
 */
export async function GET(req: Request, { params }: RouteCtx) {
  const user = await requireAuthOrDemo()
  const { id } = await params

  const inspection = await db.inspection.findUnique({
    where: { id },
    include: {
      template: {
        include: {
          items: { include: { category: true }, orderBy: { sortOrder: "asc" } },
        },
      },
      location: true,
      inspector: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          templateItem: { include: { category: true } },
          photos: true,
        },
        orderBy: { templateItem: { sortOrder: "asc" } },
      },
      history: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { timestamp: "desc" },
      },
      photos: true,
      capas: { select: { id: true, title: true, status: true, severity: true } },
      defects: { select: { id: true, title: true, severity: true, status: true } },
    },
  })

  if (!inspection) return err("Inspection not found", 404)

  // INSPECTOR role can only see their own
  if (user.role === "INSPECTOR" && inspection.inspectorId !== user.id && inspection.createdById !== user.id) {
    return err("You can only access your own inspections", 403)
  }

  return ok(inspection)
}

/**
 * PUT /api/inspections/:id
 * Status transition with RBAC guards. Body: { status, inspectorId, declineReason, reviewComments, correctionNotes, items[] }.
 */
export async function PUT(req: Request, { params }: RouteCtx) {
  const user = await requireAuthOrDemo()
  const { id } = await params

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const existing = await db.inspection.findUnique({ where: { id }, include: { items: true } })
  if (!existing) return err("Inspection not found", 404)

  // INSPECTOR access check
  if (user.role === "INSPECTOR" && existing.inspectorId !== user.id && existing.createdById !== user.id) {
    return err("You can only modify your own inspections", 403)
  }

  const targetStatus = String(body.status || "").toUpperCase()
  const requiredCap = CAPABILITY_BY_STATUS[targetStatus]
  if (!requiredCap) {
    return err(`Unsupported status transition: ${targetStatus || "(none)"}`, 400)
  }
  if (!can(user.role, requiredCap as any)) {
    return err(`Insufficient permissions: ${requiredCap} required`, 403)
  }

  // REOPEN is ADMIN only
  if (targetStatus === "UNDER_REVIEW" && user.role !== "ADMIN") {
    return err("Only ADMIN can reopen inspections", 403)
  }

  // Self-approval prevention
  if (targetStatus === "APPROVED") {
    if (existing.createdById === user.id || existing.inspectorId === user.id) {
      return err("Self-approval is prohibited: you cannot approve an inspection you created or were assigned to", 403)
    }
  }

  // Validate required payloads per transition
  if (targetStatus === "DECLINED" && !body.declineReason) {
    return err("Decline reason is required", 400)
  }
  if (targetStatus === "RETURNED" && !body.reviewComments) {
    return err("Review comments are required when returning an inspection", 400)
  }

  // Validate transition ordering — basic sanity
  const SEQUENCE: Record<string, string[]> = {
    ASSIGNED: ["PENDING"],
    ACCEPTED: ["ASSIGNED", "RETURNED"],
    DECLINED: ["ASSIGNED"],
    IN_PROGRESS: ["ACCEPTED", "ASSIGNED", "RETURNED"],
    SUBMITTED: ["IN_PROGRESS", "ACCEPTED", "RETURNED"],
    APPROVED: ["SUBMITTED", "UNDER_REVIEW"],
    RETURNED: ["SUBMITTED", "UNDER_REVIEW"],
    CLOSED: ["APPROVED"],
    UNDER_REVIEW: ["CLOSED", "APPROVED", "RETURNED"],
  }
  const allowedFrom = SEQUENCE[targetStatus]
  if (allowedFrom && !allowedFrom.includes(existing.status)) {
    return err(`Cannot transition from ${existing.status} to ${targetStatus}`, 400)
  }

  // Compose update payload
  const update: Prisma.InspectionUpdateInput = {
    status: targetStatus,
    history: {
      create: {
        fromStatus: existing.status,
        toStatus: targetStatus,
        userId: user.id,
        comments:
          body.declineReason || body.reviewComments || body.correctionNotes || `Status changed to ${targetStatus}`,
      },
    },
  }

  if (targetStatus === "ASSIGNED") {
    if (!body.inspectorId) return err("Inspector ID is required to assign", 400)
    update.inspector = { connect: { id: body.inspectorId } }
  }
  if (targetStatus === "DECLINED") {
    update.declineReason = body.declineReason
  }
  if (targetStatus === "RETURNED") {
    update.reviewComments = body.reviewComments
  }
  if (targetStatus === "SUBMITTED") {
    update.correctionNotes = body.correctionNotes ?? null
  }
  if (targetStatus === "APPROVED") {
    update.reviewComments = body.reviewComments ?? null
  }
  if (targetStatus === "CLOSED") {
    update.completedDate = new Date()
  }

  // Process items[] updates for SUBMIT or any state with items
  const itemsData = Array.isArray(body.items) ? body.items : []

  await db.$transaction(async (tx) => {
    // Persist item responses before status flip (especially for SUBMIT)
    if (itemsData.length > 0) {
      for (const it of itemsData) {
        if (!it.id) continue
        await tx.inspectionItem.update({
          where: { id: it.id },
          data: {
            response: it.response ?? null,
            score: typeof it.score === "number" ? it.score : null,
            comments: it.comments ?? null,
            correctiveRecommendation: it.correctiveRecommendation ?? null,
            severity: it.severity ?? null,
          },
        })
      }

      // Recompute compliance percentage (responses weighted equally for simplicity)
      const refreshed = await tx.inspectionItem.findMany({
        where: { inspectionId: id, response: { not: null } },
      })
      if (refreshed.length) {
        const weights: Record<string, number> = { COMPLIANT: 1, PARTIALLY_COMPLIANT: 0.5, NON_COMPLIANT: 0, NOT_APPLICABLE: 1 }
        const sum = refreshed.reduce((s, r) => s + (weights[r.response ?? ""] ?? 0), 0)
        const pct = Math.round((sum / refreshed.length) * 100)
        const criticalCount = refreshed.filter((r) => r.severity === "CRITICAL" && r.response === "NON_COMPLIANT").length
        update.overallScore = pct / 100
        update.compliancePercent = pct

        // Auto-create a Defect for every critical non-compliant item
        for (const r of refreshed) {
          if (r.severity === "CRITICAL" && r.response === "NON_COMPLIANT") {
            const tplItem = await tx.templateItem.findUnique({
              where: { id: r.templateItemId },
              select: { categoryId: true, question: true },
            })
            await tx.defect.upsert({
              where: { id: `defect-${r.id}` },
              update: {},
              create: {
                id: `defect-${r.id}`,
                inspectionId: id,
                locationId: existing.locationId,
                categoryId: tplItem?.categoryId ?? null,
                title: `Critical: ${tplItem?.question ?? "Non-compliance"}`,
                description: r.comments || "Critical non-compliance detected during inspection",
                severity: "CRITICAL",
                status: "OPEN",
                resolutionDeadline: new Date(Date.now() + 7 * 86400000),
              },
            })
            void criticalCount
          }
        }

        // If compliance below threshold, raise a critical alert
        if (pct < 70) {
          await tx.alert.upsert({
            where: { id: `alert-low-${id}` },
            update: {},
            create: {
              id: `alert-low-${id}`,
              type: "LOW_SCORE",
              severity: pct < 50 ? "CRITICAL" : "HIGH",
              inspectionId: id,
              locationId: existing.locationId,
              title: `Low compliance score: ${pct}%`,
              message: `Inspection "${existing.title}" scored ${pct}% compliance`,
              status: "OPEN",
            },
          })
        }
      }
    }

    // Apply the status update
    await tx.inspection.update({ where: { id }, data: update })

    // Notifications for downstream actors
    if (targetStatus === "SUBMITTED" && existing.inspectorId) {
      // Notify supervisors/admins (create one for each non-inspector with audit view)
      const reviewers = await tx.user.findMany({
        where: { role: { in: ["ADMIN", "SUPERVISOR", "CEO"] }, active: true },
        select: { id: true },
      })
      await tx.notification.createMany({
        data: reviewers.map((r) => ({
          userId: r.id,
          type: "INSPECTION_SUBMITTED",
          title: "Inspection submitted for review",
          message: `Inspection "${existing.title}" is awaiting your review`,
          relatedId: id,
        })),
      })
    }
    if (targetStatus === "APPROVED" && existing.inspectorId) {
      await tx.notification.create({
        data: {
          userId: existing.inspectorId,
          type: "INSPECTION_APPROVED",
          title: "Inspection approved",
          message: `Your inspection "${existing.title}" has been approved`,
          relatedId: id,
        },
      })
    }
    if (targetStatus === "RETURNED" && existing.inspectorId) {
      await tx.notification.create({
        data: {
          userId: existing.inspectorId,
          type: "INSPECTION_RETURNED",
          title: "Inspection returned for corrections",
          message: `Inspection "${existing.title}" was returned: ${body.reviewComments || ""}`,
          relatedId: id,
        },
      })
    }
    if (targetStatus === "ASSIGNED" && body.inspectorId) {
      await tx.notification.create({
        data: {
          userId: body.inspectorId,
          type: "INSPECTION_ASSIGNED",
          title: "New inspection assigned",
          message: `You have been assigned: ${existing.title}`,
          relatedId: id,
        },
      })
    }
  })

  const updated = await db.inspection.findUnique({ where: { id } })

  await audit({
    userId: user.id,
    userRole: user.role,
    action: targetStatus === "APPROVED" ? "APPROVE" : targetStatus === "RETURNED" ? "RETURN" : targetStatus === "ASSIGNED" ? "ASSIGN" : "STATUS_CHANGE",
    entityType: "Inspection",
    entityId: id,
    before: { status: existing.status },
    after: { status: targetStatus, declineReason: body.declineReason ?? null, reviewComments: body.reviewComments ?? null },
  })

  return ok(updated)
}
