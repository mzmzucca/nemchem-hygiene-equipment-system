import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

/**
 * GET /api/capa
 * List CAPAs. INSPECTOR sees only those assigned to them.
 */
export async function GET(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "capa:view")) {
    return err("Insufficient permissions: capa:view required", 403)
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") || undefined
  const locationId = searchParams.get("locationId") || undefined
  const assignedToId = searchParams.get("assignedToId") || undefined

  const scoped = user.role === "INSPECTOR" ? { assignedToId: user.id } : {}

  const capas = await db.cAPA.findMany({
    where: {
      ...scoped,
      ...(status ? { status } : {}),
      ...(locationId ? { locationId } : {}),
      ...(assignedToId ? { assignedToId } : {}),
    },
    include: {
      inspection: { select: { id: true, title: true, status: true } },
      location: { select: { id: true, name: true, code: true } },
      category: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      _count: { select: { evidence: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return ok(capas)
}

/**
 * POST /api/capa
 * Create a CAPA. Requires capa:view. Inspectors cannot create CAPAs.
 */
export async function POST(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "capa:view")) {
    return err("Insufficient permissions: capa:view required", 403)
  }
  if (user.role === "INSPECTOR") {
    return err("Inspectors cannot create CAPAs", 403)
  }

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const { inspectionId, locationId, categoryId, title, description, severity, correctiveAction, assignedToId, targetDate } = body as Record<string, unknown>
  if (!title || !description) return err("Title and description are required", 400)

  const capa = await db.cAPA.create({
    data: {
      inspectionId: (inspectionId as string) || null,
      locationId: (locationId as string) || null,
      categoryId: (categoryId as string) || null,
      title: String(title),
      description: String(description),
      severity: (severity as string) ?? "MEDIUM",
      correctiveAction: (correctiveAction as string) ?? null,
      assignedToId: (assignedToId as string) || null,
      targetDate: targetDate ? new Date(targetDate as string) : null,
      status: (assignedToId ? "ASSIGNED" : "OPEN") as string,
    },
  })

  if (assignedToId) {
    await db.notification.create({
      data: {
        userId: String(assignedToId),
        type: "CAPA_ASSIGNED",
        title: "New CAPA assigned",
        message: `You have been assigned CAPA: ${title}`,
        relatedId: capa.id,
      },
    })
  }

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "CREATE",
    entityType: "CAPA",
    entityId: capa.id,
    after: capa,
  })

  return ok(capa, 201)
}
