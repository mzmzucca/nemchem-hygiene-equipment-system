"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogIn, LogOut, ShieldCheck } from "lucide-react"

/**
 * Topbar authentication button.
 *
 * - Authenticated: shows the user, role badge and a sign-out action
 *   (unchanged behaviour).
 * - Unauthenticated: navigates to the dedicated /login screen — the
 *   sign-in form itself lives there (no dialog duplicated here).
 */
export function LoginButton() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === "authenticated" && session?.user) {
    const role = (session.user as any).role
    return (
      <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <span className="hidden sm:inline">{session.user.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">{role}</span>
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={() => router.push("/login")} className="gap-2">
      <LogIn className="h-4 w-4" />
      Entrar
    </Button>
  )
}
