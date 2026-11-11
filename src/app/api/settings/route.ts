import { db } from "@/lib/db"
import { ok } from "@/lib/api"

export async function GET() {
  const settings = await db.systemSetting.findMany()
  const obj: Record<string, string> = {}
  for (const s of settings) obj[s.key] = s.value
  return ok(obj)
}

export async function PUT(req: Request) {
  const body = await req.json()
  for (const [key, value] of Object.entries(body)) {
    await db.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  }
  return ok({ success: true })
}
