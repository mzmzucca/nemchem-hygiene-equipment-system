"use client"

import { useSession } from "next-auth/react"
import { useMemo } from "react"
import {
  can as canFn,
  getCapabilities,
  getAllowedNav,
  ROLE_INFO,
  type Role,
  type Capability,
} from "@/lib/permissions"

/**
 * Provides role-based permission checks for the current authenticated user.
 *
 * Usage:
 *   const { can, role, allowedNav } = usePermissions()
 *   if (can("customers:create")) { ... }
 *   if (allowedNav.includes("customers")) { render nav item }
 */
export function usePermissions() {
  const { data: session, status } = useSession()

  const role: Role | undefined = (session?.user as any)?.role as Role | undefined

  const capabilities = useMemo(() => getCapabilities(role), [role])
  const allowedNav = useMemo(() => getAllowedNav(role), [role])
  const roleInfo = role ? ROLE_INFO[role] : null

  const can = (capability: Capability): boolean => canFn(role, capability)

  const isAuthenticated = status === "authenticated" && !!role
  // For the prototype: if not authenticated, treat as ADMIN so the app
  // remains functional. In production, require a real session.
  const effectiveRole: Role = role ?? "ADMIN"
  const effectiveAllowedNav = role ? allowedNav : getAllowedNav("ADMIN")

  return {
    role,
    effectiveRole,
    roleInfo,
    capabilities,
    allowedNav: effectiveAllowedNav,
    can: role ? can : (cap: Capability) => canFn("ADMIN", cap),
    isAuthenticated,
    isLoading: status === "loading",
  }
}
