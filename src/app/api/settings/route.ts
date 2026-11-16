import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

/**
 * GET /api/settings
 * All settings as key-value object.
 */
export async function GET() {
  await requireAuthOrDemo()
  const rows = await db.systemSetting.findMany()
  const settings: Record<string, string> = {}
  for (const r of rows) settings[r.key] = r.value
  return ok(settings)
}

/**
 * PUT /api/settings
 * Upsert settings. Body: { key1: value1, key2: value2, ... }
 * Requires settings:manage.
 */
export async function PUT(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "settings:manage")) {
    return err("Insufficient permissions: settings:manage required", 403)
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") return err("Invalid JSON body", 400)

  const entries = Object.entries(body).filter(([k, v]) => typeof k === "string" && v !== undefined)
  if (entries.length === 0) return err("No settings provided", 400)

  await db.$transaction(
    entries.map(([key, value]) =>
      db.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
  )

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "UPDATE",
    entityType: "SystemSetting",
    after: Object.fromEntries(entries),
  })

  const all = await db.systemSetting.findMany()
  const settings: Record<string, string> = {}
  for (const r of all) settings[r.key] = r.value

  return ok(settings)
}
