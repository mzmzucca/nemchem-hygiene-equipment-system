import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"

/**
 * POST /api/inspections/:id/photos
 * Persist an InspectionPhoto record. Body: { itemId?, imageUrl, caption?, type?, isInternal? }
 * Used by the inspection form to attach evidence photos after upload via /api/upload.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthOrDemo()
  const { id } = await params

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const { itemId, imageUrl, caption, type, isInternal } = body as {
    itemId?: string
    imageUrl?: string
    caption?: string
    type?: string
    isInternal?: boolean
  }

  if (!imageUrl) return err("imageUrl is required", 400)

  const inspection = await db.inspection.findUnique({ where: { id }, select: { id: true, inspectorId: true, createdById: true } })
  if (!inspection) return err("Inspection not found", 404)

  // Inspectors can only attach to their own inspections
  if (user.role === "INSPECTOR" && inspection.inspectorId !== user.id && inspection.createdById !== user.id) {
    return err("You can only attach photos to your own inspections", 403)
  }

  const photo = await db.inspectionPhoto.create({
    data: {
      inspectionId: id,
      itemId: itemId ?? null,
      imageUrl,
      caption: caption ?? null,
      type: type ?? "GENERAL",
      isInternal: isInternal ?? false,
    },
  })

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "CREATE",
    entityType: "InspectionPhoto",
    entityId: photo.id,
    after: { inspectionId: id, itemId, imageUrl },
  })

  return ok(photo, 201)
}
