import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

/**
 * GET /api/templates
 * List inspection templates with items (include category) and _count.
 */
export async function GET() {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "templates:view")) {
    return err("Insufficient permissions: templates:view required", 403)
  }

  const templates = await db.inspectionTemplate.findMany({
    include: {
      items: {
        include: { category: { select: { id: true, name: true } } },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { inspections: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return ok(templates)
}

/**
 * POST /api/templates
 * Create a template with items. Requires templates:manage.
 */
export async function POST(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "templates:manage")) {
    return err("Insufficient permissions: templates:manage required", 403)
  }

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const { name, description, isActive, items } = body as {
    name?: string
    description?: string
    isActive?: boolean
    items?: Array<{
      categoryId: string
      question: string
      description?: string
      scoringMethod?: string
      weight?: number
      mandatory?: boolean
      photoRequired?: boolean
      sortOrder?: number
    }>
  }

  if (!name) return err("Template name is required", 400)

  const template = await db.$transaction(async (tx) => {
    const tpl = await tx.inspectionTemplate.create({
      data: {
        name,
        description: description ?? null,
        isActive: isActive ?? true,
      },
    })

    if (items && Array.isArray(items) && items.length > 0) {
      await tx.templateItem.createMany({
        data: items.map((it, idx) => ({
          templateId: tpl.id,
          categoryId: it.categoryId,
          question: it.question,
          description: it.description ?? null,
          scoringMethod: it.scoringMethod ?? "COMPLIANCE",
          weight: typeof it.weight === "number" ? it.weight : 1.0,
          mandatory: it.mandatory ?? true,
          photoRequired: it.photoRequired ?? false,
          sortOrder: it.sortOrder ?? idx,
        })),
      })
    }

    return tx.inspectionTemplate.findUnique({
      where: { id: tpl.id },
      include: { items: { include: { category: true }, orderBy: { sortOrder: "asc" } } },
    })
  })

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "CREATE",
    entityType: "Template",
    entityId: template?.id,
    after: { name, itemsCount: items?.length ?? 0 },
  })

  return ok(template, 201)
}
