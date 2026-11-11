"use client"

import { useState, type ReactNode } from "react"
import { useTheme } from "next-themes"
import {
  LayoutDashboard,
  Users,
  FileText,
  Boxes,
  CalendarDays,
  ClipboardCheck,
  BatteryCharging,
  Package,
  ShieldCheck,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useNav } from "@/lib/nav-store"
import type { ViewKey } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { LoginButton } from "@/components/login-button"

const NAV_ITEMS: { key: ViewKey; label: string; icon: typeof LayoutDashboard; group: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { key: "customers", label: "Customers", icon: Users, group: "Operations" },
  { key: "contracts", label: "Contracts", icon: FileText, group: "Operations" },
  { key: "equipment", label: "Equipment", icon: Boxes, group: "Operations" },
  { key: "visits", label: "Visits & Schedule", icon: CalendarDays, group: "Field Ops" },
  { key: "inspections", label: "Inspections", icon: ClipboardCheck, group: "Field Ops" },
  { key: "batteries", label: "Batteries", icon: BatteryCharging, group: "Field Ops" },
  { key: "consumables", label: "Consumables & Stock", icon: Package, group: "Inventory" },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { view, setView } = useNav()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  const groups = Array.from(new Set(NAV_ITEMS.map((n) => n.group)))

  const handleNav = (k: ViewKey) => {
    setView(k)
    setMobileOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Top bar (mobile) */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b bg-background px-4 h-14">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="h-9 w-9">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">HygieneOps</span>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:sticky top-0 z-50 h-screen w-64 shrink-0 border-r bg-sidebar flex flex-col transition-transform lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold leading-tight">HygieneOps</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Field Operations Suite</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-4">
            {groups.map((g) => (
              <div key={g}>
                <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g}</p>
                <div className="space-y-1">
                  {NAV_ITEMS.filter((n) => n.group === g).map((item) => {
                    const Icon = item.icon
                    const active = view === item.key
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleNav(item.key)}
                        className={cn(
                          "w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors text-left",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t p-3">
            <div className="flex items-center justify-between gap-2">
              <LoginButton />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />}

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">{children}</main>
      </div>
    </div>
  )
}
