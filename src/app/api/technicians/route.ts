import { db } from "@/lib/db"
import { ok } from "@/lib/api"

export async function GET() {
  const technicians = await db.user.findMany({
    where: { role: "TECHNICIAN", active: true },
    include: {
      _count: {
        select: { visitsAssigned: true, inspections: true, batteryReplacements: true },
      },
      technicianStock: { include: { product: true } },
    },
    orderBy: { name: "asc" },
  })
  return ok(technicians)
}
