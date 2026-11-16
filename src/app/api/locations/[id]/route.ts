import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * GET /api/locations/:id
 */
export async function GET(_req: Request, { params }: RouteCtx) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "locations:view")) {
    return err("Insufficient permissions: locations:view required", 403)
  }

  const { id } = await params
  const location = await db.location.findUnique({
    where: { id },
    include: {
      supervisor: { select: { id: true, name: true, email: true } },
      inspections: {
        take: 50,
        orderBy: { scheduledDate: "desc" },
        select: { id: true, title: true, status: true, scheduledDate: true, compliancePercent: true },
      },
      _count: { select: { inspections: true, capas: true, defects: true } },
    },
  })

  if (!location) return err("Location not found", 404)
  return ok(location)
}

/**
 * PUT /api/locations/:id
 * Update a location. Requires locations:manage.
 */
export async function PUT(req: Request, { params }: RouteCtx) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "locations:manage")) {
    return err("Insufficient permissions: locations:manage required", 403)
  }

  const { id } = await params
  const existing = await db.location.findUnique({ where: { id } })
  if (!existing) return err("Location not found", 404)

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const { name, code, address, city, gpsLat, gpsLng, facilityType, supervisorId, status } = body as Record<string, unknown>

  if (code && code !== existing.code) {
    const dup = await db.location.findUnique({ where: { code: String(code) } })
    if (dup) return err("A location with this code already exists", 409)
  }

  const updated = await db.location.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: String(name) } : {}),
      ...(code !== undefined ? { code: String(code) } : {}),
      ...(address !== undefined ? { address: (address as string) || null } : {}),
      ...(city !== undefined ? { city: (city as string) || null } : {}),
      ...(gpsLat !== undefined ? { gpsLat: typeof gpsLat === "number" ? gpsLat : null } : {}),
      ...(gpsLng !== undefined ? { gpsLng: typeof gpsLng === "number" ? gpsLng : null } : {}),
      ...(facilityType !== undefined ? { facilityType: String(facilityType) } : {}),
      ...(supervisorId !== undefined ? { supervisorId: (supervisorId as string) || null } : {}),
      ...(status !== undefined ? { status: String(status) } : {}),
    },
  })

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "UPDATE",
    entityType: "Location",
    entityId: id,
    before: existing,
    after: updated,
  })

  return ok(updated)
}
