import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

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
