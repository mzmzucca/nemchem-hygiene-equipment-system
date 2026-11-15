import { getServerSession } from "next-auth"
import { authOptions, type AppRole } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: AppRole
}

// Demo fallback user — used when no session exists so the prototype
// remains functional without login. In production, remove this fallback
// and enforce requireAuth() strictly.
const DEMO_USER: AuthUser = {
  id: "demo-admin",
  email: "admin@hygiene.co",
  name: "System Admin",
  role: "ADMIN",
}

/**
 * Returns the authenticated user for the current request, or null.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return {
    id: (session.user as any).id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: (session.user as any).role as AppRole,
  }
}

/**
 * Requires an authenticated session. Returns the user or a 401 response.
 * In production, use this to block unauthenticated access.
 */
export async function requireAuth(): Promise<AuthUser | NextResponse> {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  return user
}

/**
 * Requires an authenticated session, but falls back to a demo admin user
 * if no session exists. This keeps the prototype functional while the
 * auth infrastructure is fully wired. Swap to requireAuth() for production.
 */
export async function requireAuthOrDemo(): Promise<AuthUser> {
  const user = await getCurrentUser()
  return user ?? DEMO_USER
}

/**
 * Requires an authenticated session with one of the allowed roles.
 * Returns the user or a 401/403 response.
 */
export async function requireRole(...roles: AppRole[]): Promise<AuthUser | NextResponse> {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  if (!roles.includes(user.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions", required: roles, actual: user.role },
      { status: 403 }
    )
  }
  return user
}

/**
 * Requires auth AND that the technician can only access their own data.
 * Managers and Admins bypass the ownership check.
 */
export async function requireTechnicianOrManager(
  resourceTechnicianId?: string
): Promise<AuthUser | NextResponse> {
  const user = await requireAuth()
  if (user instanceof NextResponse) return user
  if (user.role === "ADMIN" || user.role === "MANAGER") return user
  if (user.role === "TECHNICIAN") {
    if (resourceTechnicianId && resourceTechnicianId !== user.id) {
      return NextResponse.json(
        { error: "You can only access your own assigned resources" },
        { status: 403 }
      )
    }
    return user
  }
  return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
}

/**
 * Logs an action to the append-only audit log.
 */
export async function audit(params: {
  userId?: string
  userRole?: string
  action: string
  entityType: string
  entityId?: string
  before?: unknown
  after?: unknown
  reason?: string
  ipAddress?: string
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        userRole: params.userRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: params.before ? JSON.stringify(params.before) : null,
        after: params.after ? JSON.stringify(params.after) : null,
        reason: params.reason,
        ipAddress: params.ipAddress,
      },
    })
  } catch (e) {
    // Audit logging must never break the main operation
    console.error("Audit log failed:", e)
  }
}
