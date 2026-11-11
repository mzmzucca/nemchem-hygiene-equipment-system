import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

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

  const inspection = await db.inspection.create({
    data: {
      visitId: body.visitId,
      equipmentId: body.equipmentId,
      technicianId: body.technicianId || null,
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

  // Update equipment status based on inspection
  let newOpStatus = "OPERATIONAL"
  if (body.equipmentDamaged) newOpStatus = body.result === "REPLACEMENT_REQUIRED" ? "NEEDS_REPLACEMENT" : "DAMAGED"
  else if (body.maintenanceRequired) newOpStatus = "UNDER_MAINTENANCE"

  await db.equipment.update({
    where: { id: body.equipmentId },
    data: {
      operationalStatus: newOpStatus,
      currentBatteryLevel: body.batteryLevel ?? undefined,
      installationStatus: body.correctlyInstalled ? "CORRECTLY_INSTALLED" : "INCORRECTLY_INSTALLED",
    },
  })
  await db.equipmentHistory.create({
    data: {
      equipmentId: body.equipmentId,
      eventType: "INSPECTION",
      description: `Inspection result: ${body.result}. ${body.comments ?? ""}`,
    },
  })

  // Add photos
  if (body.photos && Array.isArray(body.photos)) {
    for (const p of body.photos) {
      await db.inspectionPhoto.create({
        data: {
          inspectionId: inspection.id,
          imageUrl: p.imageUrl,
          type: p.type || "GENERAL",
          caption: p.caption,
        },
      })
    }
  }

  // If battery replacement required, mark for it
  if (body.batteryReplacementRequired) {
    // just flag - actual replacement via battery endpoint
  }

  return ok(inspection, 201)
}
