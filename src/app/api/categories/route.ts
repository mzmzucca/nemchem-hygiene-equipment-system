import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

/**
 * GET /api/categories
 * List hygiene categories.
 */
export async function GET() {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "categories:view")) {
    return err("Insufficient permissions: categories:view required", 403)
  }

  const categories = await db.hygieneCategory.findMany({
    include: {
      _count: { select: { items: true, capas: true, defects: true } },
    },
    orderBy: { sortOrder: "asc" },
  })
  return ok(categories)
}

/**
 * POST /api/categories
 */
export async function POST(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "categories:manage")) {
    return err("Insufficient permissions: categories:manage required", 403)
  }

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)
  const { name, description, sortOrder } = body as Record<string, unknown>
  if (!name) return err("Name is required", 400)

  const category = await db.hygieneCategory.create({
    data: {
      name: String(name),
      description: (description as string) ?? null,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    },
  })

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "CREATE",
    entityType: "Category",
    entityId: category.id,
    after: category,
  })
  return ok(category, 201)
}
