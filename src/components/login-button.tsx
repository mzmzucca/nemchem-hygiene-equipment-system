"use client"

import { useState } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogIn, LogOut, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

const DEMO_ACCOUNTS = [
  { email: "admin@hygiene.co", password: "admin123", role: "Admin", label: "Acesso total ao sistema" },
  { email: "sergio.zucca@nemchem.co", password: "ceo123", role: "CEO", label: "Visão executiva" },
  { email: "supervisor@hygiene.co", password: "super123", role: "Supervisor", label: "Gestão de operações" },
  { email: "joao@hygiene.co", password: "insp123", role: "Inspetor", label: "Inspecções de campo" },
]

export function LoginButton({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [pendingAccount, setPendingAccount] = useState<string | null>(null)

  const doLogin = async (mail: string, pass: string, isDemo: boolean) => {
    isDemo ? setPendingAccount(mail) : setLoading(true)
    const res = await signIn("credentials", { email: mail, password: pass, redirect: false })
    setPendingAccount(null)
    setLoading(false)
    if (res?.error) {
      toast.error("Credenciais inválidas — verifique o email e a senha.")
    } else {
      toast.success(`Sessão iniciada: ${mail}`)
      setOpen(false)
      setEmail("")
      setPassword("")
      router.push("/app")
      router.refresh()
    }
  }

  const handleLogin = () => doLogin(email, password, false)

  const handleDemo = (a: (typeof DEMO_ACCOUNTS)[number]) => doLogin(a.email, a.password, true)

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
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <LogIn className="h-4 w-4" />
        Entrar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Entrar no NemChem</DialogTitle>
            <DialogDescription>
              Autentique-se para inspecções de higiene, CAPA, gestão de equipas e relatórios de conformidade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@hygiene.co"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">
                Contas de demonstração — clique para entrar directamente:
              </p>
              {DEMO_ACCOUNTS.map((a) => (
                <div
                  key={a.email}
                  className="flex w-full items-center justify-between text-xs rounded px-1.5 py-1 hover:bg-muted transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => { setEmail(a.email); setPassword(a.password) }}
                    className="text-left flex-1 min-w-0"
                    title="Preencher campos manualmente"
                  >
                    <span className="font-mono">{a.email}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {a.role} · {a.label} · senha: <span className="font-mono">{a.password}</span>
                    </span>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2.5 text-xs shrink-0"
                    disabled={pendingAccount !== null || loading}
                    onClick={() => handleDemo(a)}
                  >
                    {pendingAccount === a.email ? "A entrar…" : "Entrar"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLogin} disabled={loading || pendingAccount !== null || !email || !password}>
              {loading ? "A entrar…" : "Entrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
