import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo as requireAuth, audit } from "@/lib/auth-guard"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const visitId = searchParams.get("visitId")
  const equipmentId = searchParams.get("equipmentId")
  const technicianId = searchParams.get("technicianId")

  const inspections = await db.inspection.findMany({
    where: {
      AND: [
        visitId ? { visitId } : {},
        equipmentId ? { equipmentId } : {},
        technicianId ? { technicianId } : {},
      ],
    },
    include: {
      equipment: { include: { category: true } },
      visit: { include: { customer: true, contract: true } },
      technician: true,
      photos: true,
    },
    orderBy: { inspectedAt: "desc" },
  })
  return ok(inspections)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.visitId || !body.equipmentId) return err("Visit and equipment are required")

  const user = await requireAuth()

  // The entire inspection submission runs in a single database transaction.
  // If any step fails, the whole operation rolls back — no partial data.
  const inspection = await db.$transaction(async (tx) => {
    // 1. Create the inspection record
    const insp = await tx.inspection.create({
      data: {
        visitId: body.visitId,
        equipmentId: body.equipmentId,
        technicianId: body.technicianId || user.id,
        equipmentPresent: body.equipmentPresent ?? true,
        correctlyInstalled: body.correctlyInstalled ?? true,
        correctlyPositioned: body.correctlyPositioned ?? true,
        workingProperly: body.workingProperly ?? true,
        equipmentClean: body.equipmentClean ?? true,
        batteryAvailable: body.batteryAvailable ?? "N/A",
        batteryLevel: body.batteryLevel ?? "UNKNOWN",
        batteryReplacementRequired: body.batteryReplacementRequired ?? false,
        consumablesAvailable: body.consumablesAvailable ?? true,
        maintenanceRequired: body.maintenanceRequired ?? false,
        equipmentDamaged: body.equipmentDamaged ?? false,
        result: body.result || "PASSED",
        comments: body.comments,
      },
      include: { equipment: true, visit: true, photos: true },
    })

    // 2. Update equipment status based on inspection findings
    let newOpStatus = "OPERATIONAL"
    if (body.equipmentDamaged)
      newOpStatus = body.result === "REPLACEMENT_REQUIRED" ? "NEEDS_REPLACEMENT" : "DAMAGED"
    else if (body.maintenanceRequired) newOpStatus = "UNDER_MAINTENANCE"

    await tx.equipment.update({
      where: { id: body.equipmentId },
      data: {
        operationalStatus: newOpStatus,
        currentBatteryLevel: body.batteryLevel ?? undefined,
        installationStatus: body.correctlyInstalled
          ? "CORRECTLY_INSTALLED"
          : "INCORRECTLY_INSTALLED",
      },
    })

    // 3. Record in equipment history
    await tx.equipmentHistory.create({
      data: {
        equipmentId: body.equipmentId,
        eventType: "INSPECTION",
        description: `Inspection result: ${body.result}. ${body.comments ?? ""}`,
        performedBy: user.name,
      },
    })

    // 4. Add photos (within the same transaction)
    if (body.photos && Array.isArray(body.photos)) {
      for (const p of body.photos) {
        await tx.inspectionPhoto.create({
          data: {
            inspectionId: insp.id,
            imageUrl: p.imageUrl,
            type: p.type || "GENERAL",
            caption: p.caption,
          },
        })
      }
    }

    return insp
  })

  // Audit log (outside transaction — must not break the main operation)
  await audit({
    userId: user.id,
    userRole: user.role,
    action: "CREATE",
    entityType: "Inspection",
    entityId: inspection.id,
    after: { result: body.result, equipmentId: body.equipmentId, visitId: body.visitId },
  })

  return ok(inspection, 201)
}
