import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

/**
 * GET /api/locations
 * List locations with inspection/capa/defect counts.
 */
export async function GET() {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "locations:view")) {
    return err("Insufficient permissions: locations:view required", 403)
  }

  const locations = await db.location.findMany({
    include: {
      supervisor: { select: { id: true, name: true, email: true } },
      _count: { select: { inspections: true, capas: true, defects: true } },
    },
    orderBy: { name: "asc" },
  })

  return ok(locations)
}

/**
 * POST /api/locations
 * Create a location. Requires locations:manage.
 */
export async function POST(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "locations:manage")) {
    return err("Insufficient permissions: locations:manage required", 403)
  }

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const { name, code, address, city, gpsLat, gpsLng, facilityType, supervisorId, status } = body as Record<string, unknown>
  if (!name || !code) return err("Name and code are required", 400)

  const dup = await db.location.findUnique({ where: { code: String(code) } })
  if (dup) return err("A location with this code already exists", 409)

  const location = await db.location.create({
    data: {
      name: String(name),
      code: String(code),
      address: (address as string) ?? null,
      city: (city as string) ?? null,
      gpsLat: typeof gpsLat === "number" ? gpsLat : null,
      gpsLng: typeof gpsLng === "number" ? gpsLng : null,
      facilityType: (facilityType as string) ?? "OTHER",
      supervisorId: (supervisorId as string) || null,
      status: (status as string) ?? "ACTIVE",
    },
  })

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "CREATE",
    entityType: "Location",
    entityId: location.id,
    after: location,
  })

  return ok(location, 201)
}
