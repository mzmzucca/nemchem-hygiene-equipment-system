import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

/**
 * GET /api/inspections
 * List inspections. INSPECTOR role sees only their own. Query filters supported.
 */
export async function GET(req: Request) {
  const user = await requireAuthOrDemo()
  const { searchParams } = new URL(req.url)

  const status = searchParams.get("status") || undefined
  const locationId = searchParams.get("locationId") || undefined
  const inspectorId = searchParams.get("inspectorId") || undefined
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const scoped: Record<string, unknown> =
    user.role === "INSPECTOR" ? { inspectorId: user.id } : {}

  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (from) dateFilter.gte = new Date(from)
  if (to) dateFilter.lte = new Date(to)

  const where = {
    ...scoped,
    ...(status ? { status } : {}),
    ...(locationId ? { locationId } : {}),
    ...(inspectorId ? { inspectorId } : {}),
    ...(from || to ? { scheduledDate: dateFilter } : {}),
  }

  const inspections = await db.inspection.findMany({
    where,
    include: {
      location: { select: { id: true, name: true, code: true } },
      inspector: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
      _count: { select: { items: true, photos: true, capas: true, defects: true } },
    },
    orderBy: { scheduledDate: "desc" },
    take: 200,
  })

  return ok(inspections)
}

/**
 * POST /api/inspections
 * Create an inspection. Requires inspections:create.
 */
export async function POST(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "inspections:create")) {
    return err("Insufficient permissions: inspections:create required", 403)
  }

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const { templateId, locationId, inspectorId, title, scheduledDate } = body as {
    templateId?: string
    locationId?: string
    inspectorId?: string | null
    title?: string
    scheduledDate?: string
  }

  if (!templateId || !locationId || !title || !scheduledDate) {
    return err("Missing required fields: templateId, locationId, title, scheduledDate", 400)
  }

  const inspection = await db.inspection.create({
    data: {
      templateId,
      locationId,
      createdById: user.id,
      inspectorId: inspectorId || null,
      title,
      scheduledDate: new Date(scheduledDate),
      status: inspectorId ? "ASSIGNED" : "PENDING",
    },
    include: {
      location: true,
      template: { include: { items: true } },
    },
  })

  // Initialize InspectionItem rows for each template item
  if (inspection.template.items.length) {
    await db.inspectionItem.createMany({
      data: inspection.template.items.map((it) => ({
        inspectionId: inspection.id,
        templateItemId: it.id,
      })),
    })
  }

  // Initial history record
  await db.inspectionHistory.create({
    data: {
      inspectionId: inspection.id,
      fromStatus: null,
      toStatus: inspection.status,
      userId: user.id,
      comments: "Inspection created",
    },
  })

  // If assigned, send notification to inspector
  if (inspectorId) {
    await db.notification.create({
      data: {
        userId: inspectorId,
        type: "INSPECTION_ASSIGNED",
        title: "New inspection assigned",
        message: `You have been assigned: ${title}`,
        relatedId: inspection.id,
      },
    })
  }

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "CREATE",
    entityType: "Inspection",
    entityId: inspection.id,
    after: { title, templateId, locationId, inspectorId, scheduledDate },
  })

  return ok(inspection, 201)
}
