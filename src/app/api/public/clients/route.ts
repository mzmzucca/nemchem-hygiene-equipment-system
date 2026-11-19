import { NextResponse } from "next/server"
import { db } from "@/lib/db"

/**
 * PUBLIC endpoint — client portfolio for the landing page.
 *
 * Returns ONLY the names (and facility type) of ACTIVE locations/sites
 * registered in the system. No ids, addresses, GPS coordinates,
 * supervisors, inspection records or any other private data are exposed.
 *
 * The landing page (src/components/landing) consumes this endpoint, so the
 * client list always mirrors what is actually registered — a single source
 * of truth (the Location table), never a duplicated client database.
 */
export async function GET() {
  try {
    const locations = await db.location.findMany({
      where: { status: "ACTIVE" },
      select: { name: true, facilityType: true },
      orderBy: { createdAt: "asc" },
    })

    // Deduplicate by name (multiple sites may belong to the same client)
    const seen = new Set<string>()
    const clients = [] as { name: string; facilityType: string }[]
    for (const loc of locations) {
      const key = loc.name.trim().toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      clients.push({ name: loc.name, facilityType: loc.facilityType })
    }

    return NextResponse.json({ clients })
  } catch (error) {
    console.error("Public clients endpoint failed:", error)
    return NextResponse.json({ clients: [] }, { status: 200 })
  }
}
