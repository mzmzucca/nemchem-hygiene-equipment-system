import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo as requireAuth, audit } from "@/lib/auth-guard"

/**
 * GET — fetch a single inspection (read-only, no auth required for demo)
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const inspection = await db.inspection.findUnique({
    where: { id },
    include: {
      equipment: { include: { category: true, customer: true } },
      visit: { include: { customer: true, contract: true } },
      technician: true,
      photos: true,
    },
  })
  if (!inspection) return err("Inspection not found", 404)
  return ok(inspection)
}

/**
 * PATCH — submit a CORRECTION to a submitted inspection.
 *
 * Business rule: submitted inspections cannot be edited directly.
 * Instead, a correction creates a new AuditLog entry with before/after
 * snapshots and the required justification reason, then updates the
 * inspection. The original values are preserved in the audit trail.
 *
 * Requires MANAGER or ADMIN role — technicians cannot correct their own
 * submissions without manager approval.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  // Only managers and admins can correct inspections
  const user = await requireAuth()
  if (user.role === "TECHNICIAN") {
    return err("Inspection corrections require MANAGER or ADMIN role", 403)
  }

  // A justification reason is mandatory for any correction
  if (!body.reason || body.reason.trim().length < 5) {
    return err("A correction reason (min 5 chars) is required for audit compliance", 400)
  }

  // Capture the state BEFORE the correction (for the audit trail)
  const before = await db.inspection.findUnique({
    where: { id },
    include: { photos: true },
  })
  if (!before) return err("Inspection not found", 404)

  // Apply the correction in a transaction
  const updated = await db.$transaction(async (tx) => {
    const insp = await tx.inspection.update({
      where: { id },
      data: {
        equipmentPresent: body.equipmentPresent ?? undefined,
        correctlyInstalled: body.correctlyInstalled ?? undefined,
        correctlyPositioned: body.correctlyPositioned ?? undefined,
        workingProperly: body.workingProperly ?? undefined,
        equipmentClean: body.equipmentClean ?? undefined,
        batteryAvailable: body.batteryAvailable ?? undefined,
        batteryLevel: body.batteryLevel ?? undefined,
        batteryReplacementRequired: body.batteryReplacementRequired ?? undefined,
        consumablesAvailable: body.consumablesAvailable ?? undefined,
        maintenanceRequired: body.maintenanceRequired ?? undefined,
        equipmentDamaged: body.equipmentDamaged ?? undefined,
        result: body.result ?? undefined,
        comments: body.comments ?? undefined,
      },
      include: { equipment: true, visit: true, photos: true },
    })

    // Append-only audit record with before/after snapshots
    await tx.auditLog.create({
      data: {
        userId: user.id,
        userRole: user.role,
        action: "CORRECTION",
        entityType: "Inspection",
        entityId: id,
        before: JSON.stringify({
          result: before.result,
          comments: before.comments,
          equipmentPresent: before.equipmentPresent,
          workingProperly: before.workingProperly,
          equipmentDamaged: before.equipmentDamaged,
          maintenanceRequired: before.maintenanceRequired,
        }),
        after: JSON.stringify({
          result: body.result ?? before.result,
          comments: body.comments ?? before.comments,
          equipmentPresent: body.equipmentPresent ?? before.equipmentPresent,
          workingProperly: body.workingProperly ?? before.workingProperly,
          equipmentDamaged: body.equipmentDamaged ?? before.equipmentDamaged,
          maintenanceRequired: body.maintenanceRequired ?? before.maintenanceRequired,
        }),
        reason: body.reason,
      },
    })

    return insp
  })

  return ok(updated)
}
