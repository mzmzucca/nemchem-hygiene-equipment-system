"use client"

import { Suspense, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { ShieldCheck } from "lucide-react"
import { LoginButton } from "@/components/login-button"

/**
 * Client-side gate for the protected workspace (/app).
 *
 * - While the session is loading: neutral splash.
 * - Unauthenticated: renders a sign-in card that reuses the EXISTING
 *   LoginButton (dialog included) — no duplicated authentication logic.
 *   Auto-opens the dialog when arriving from the landing page (?signin=1).
 * - Authenticated: renders the workspace normally.
 *
 * Server-side API behaviour is unchanged (demo fallback preserved).
 */
export function SignInGate({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <GateInner>{children}</GateInner>
    </Suspense>
  )
}

function GateInner({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const searchParams = useSearchParams()
  const autoOpen = searchParams.get("signin") === "1"

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <ShieldCheck className="h-8 w-8 animate-pulse text-emerald-600" />
          <p className="text-sm">A carregar a plataforma…</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md rounded-2xl border bg-background shadow-sm p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
            <ShieldCheck className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold">Área reservada</h1>
            <p className="text-sm text-muted-foreground">
              Esta área é destinada a clientes e equipas NemChem. Autentique-se para continuar.
            </p>
          </div>
          <div className="flex justify-center">
            <LoginButton defaultOpen={autoOpen} />
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
