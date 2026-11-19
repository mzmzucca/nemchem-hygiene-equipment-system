"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useLandingI18n } from "@/components/landing/landing-i18n"

/**
 * Authentication-aware landing CTA.
 *
 * Reuses the existing NextAuth session state — it does NOT implement any
 * authentication logic. Guests are sent to the existing sign-in dialog
 * (the /app route opens the LoginButton dialog when ?signin=1);
 * authenticated users go straight to the role-adaptive workspace.
 */
export function LandingAuthButton({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "lg" | "sm"
  className?: string
}) {
  const { status } = useSession()
  const { t } = useLandingI18n()

  const authenticated = status === "authenticated"
  const href = authenticated ? "/app" : "/app?signin=1"

  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link href={href}>{authenticated ? t("nav.perfil") : t("nav.entrar")}</Link>
    </Button>
  )
}
