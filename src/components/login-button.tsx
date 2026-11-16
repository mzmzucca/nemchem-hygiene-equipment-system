"use client"

import { useState } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
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
  { email: "admin@hygiene.co", password: "admin123", role: "Admin", label: "Full system access" },
  { email: "sergio.zucca@nemchem.co", password: "ceo123", role: "CEO", label: "Executive oversight" },
  { email: "supervisor@hygiene.co", password: "super123", role: "Supervisor", label: "Operations mgmt" },
  { email: "joao@hygiene.co", password: "insp123", role: "Inspector", label: "Field inspections" },
]

export function LoginButton() {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      toast.error("Invalid credentials")
    } else {
      toast.success("Signed in successfully")
      setOpen(false)
      setEmail("")
      setPassword("")
    }
  }

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
        Sign in
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in to HygieneOps</DialogTitle>
            <DialogDescription>
              Authenticate to submit inspections, manage stock and access audit logs.
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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">Demo accounts</p>
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  onClick={() => {
                    setEmail(a.email)
                    setPassword(a.password)
                  }}
                  className="flex w-full items-center justify-between text-xs hover:bg-muted rounded px-1.5 py-1 transition-colors"
                >
                  <span className="font-mono">{a.email}</span>
                  <span className="text-muted-foreground">{a.role} · {a.label}</span>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogin} disabled={loading || !email || !password}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
