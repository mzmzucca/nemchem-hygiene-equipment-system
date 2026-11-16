import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"

interface RouteCtx {
  params: Promise<{ id: string }>
}

/**
 * GET /api/templates/:id
 * Template with all items (including category).
 */
export async function GET(_req: Request, { params }: RouteCtx) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "templates:view")) {
    return err("Insufficient permissions: templates:view required", 403)
  }

  const { id } = await params
  const template = await db.inspectionTemplate.findUnique({
    where: { id },
    include: {
      items: {
        include: { category: true },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { inspections: true } },
    },
  })

  if (!template) return err("Template not found", 404)
  return ok(template)
}

/**
 * PUT /api/templates/:id
 * Update template metadata and items. Requires templates:manage.
 * Replaces all items if `items` is supplied.
 */
export async function PUT(req: Request, { params }: RouteCtx) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "templates:manage")) {
    return err("Insufficient permissions: templates:manage required", 403)
  }

  const { id } = await params
  const existing = await db.inspectionTemplate.findUnique({ where: { id } })
  if (!existing) return err("Template not found", 404)

  const body = await req.json().catch(() => null)
  if (!body) return err("Invalid JSON body", 400)

  const { name, description, isActive, items } = body as {
    name?: string
    description?: string
    isActive?: boolean
    items?: Array<Record<string, unknown>>
  }

  const updated = await db.$transaction(async (tx) => {
    const tpl = await tx.inspectionTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    })

    if (Array.isArray(items)) {
      // Replace items wholesale
      await tx.templateItem.deleteMany({ where: { templateId: id } })
      if (items.length > 0) {
        await tx.templateItem.createMany({
          data: items.map((it: Record<string, unknown>, idx: number) => ({
            templateId: id,
            categoryId: String(it.categoryId),
            question: String(it.question ?? ""),
            description: (it.description as string) ?? null,
            scoringMethod: (it.scoringMethod as string) ?? "COMPLIANCE",
            weight: typeof it.weight === "number" ? it.weight : 1.0,
            mandatory: typeof it.mandatory === "boolean" ? it.mandatory : true,
            photoRequired: typeof it.photoRequired === "boolean" ? it.photoRequired : false,
            sortOrder: typeof it.sortOrder === "number" ? it.sortOrder : idx,
          })),
        })
      }
    }

    return tx.inspectionTemplate.findUnique({
      where: { id },
      include: { items: { include: { category: true }, orderBy: { sortOrder: "asc" } } },
    })
  })

  await audit({
    userId: user.id,
    userRole: user.role,
    action: "UPDATE",
    entityType: "Template",
    entityId: id,
    before: existing,
    after: updated,
  })

  return ok(updated)
}

/**
 * DELETE /api/templates/:id
 */
export async function DELETE(_req: Request, { params }: RouteCtx) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "templates:manage")) {
    return err("Insufficient permissions: templates:manage required", 403)
  }

  const { id } = await params
  const existing = await db.inspectionTemplate.findUnique({ where: { id } })
  if (!existing) return err("Template not found", 404)

  // Refuse hard delete if inspections already exist for this template
  const usage = await db.inspection.count({ where: { templateId: id } })
  if (usage > 0) {
    // Soft delete — mark inactive
    const archived = await db.inspectionTemplate.update({
      where: { id },
      data: { isActive: false },
    })
    await audit({
      userId: user.id,
      userRole: user.role,
      action: "DELETE",
      entityType: "Template",
      entityId: id,
      reason: `Archived (soft) — ${usage} inspections reference this template`,
    })
    return ok({ archived: true, id: archived.id })
  }

  await db.inspectionTemplate.delete({ where: { id } })
  await audit({
    userId: user.id,
    userRole: user.role,
    action: "DELETE",
    entityType: "Template",
    entityId: id,
  })
  return ok({ deleted: true, id })
}
