"use client"

import { useState, type ReactNode } from "react"
import { useTheme } from "next-themes"
import {
  LayoutDashboard, ClipboardCheck, CalendarDays, BarChart3, Bell,
  Mail, MapPin, Users2, Activity, AlertTriangle, ShieldCheck, Wrench,
  Users, MapPinned, FileSpreadsheet, Settings2, ScrollText, Cog,
  Menu, X, Sun, Moon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useNav } from "@/lib/nav-store"
import type { ViewKey } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { LoginButton } from "@/components/login-button"
import { RolesPermissionsButton } from "@/components/roles-permissions"
import { usePermissions } from "@/hooks/use-permissions"

const NAV_ITEMS: { key: ViewKey; label: string; icon: typeof LayoutDashboard; group: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Overview" },
  { key: "inspections", label: "Hygiene Inspections", icon: ClipboardCheck, group: "Core" },
  { key: "agenda", label: "Agenda / Schedule", icon: CalendarDays, group: "Core" },
  { key: "capa", label: "CAPA Management", icon: Wrench, group: "Core" },
  { key: "defects", label: "Defects / Non-compliance", icon: AlertTriangle, group: "Core" },
  { key: "alerts", label: "Hygiene Alerts", icon: Bell, group: "Core" },
  { key: "reports", label: "Reports Center", icon: BarChart3, group: "Analytics" },
  { key: "activity", label: "Activity Reports", icon: Activity, group: "Analytics" },
  { key: "team", label: "Team Performance", icon: Users2, group: "Analytics" },
  { key: "map", label: "Field Map", icon: MapPin, group: "Operations" },
  { key: "locations", label: "Locations / Facilities", icon: MapPinned, group: "Operations" },
  { key: "templates", label: "Inspection Templates", icon: FileSpreadsheet, group: "Admin" },
  { key: "standards", label: "Hygiene Standards", icon: ShieldCheck, group: "Admin" },
  { key: "users", label: "Users", icon: Users, group: "Admin" },
  { key: "audit", label: "Audit Logs", icon: ScrollText, group: "Admin" },
  { key: "settings", label: "Settings", icon: Cog, group: "Admin" },
  { key: "notifications", label: "Notifications", icon: Bell, group: "Comms" },
  { key: "messages", label: "Messages", icon: Mail, group: "Comms" },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { view, setView } = useNav()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { allowedNav } = usePermissions()

  const visibleItems = NAV_ITEMS.filter((n) => allowedNav.includes(n.key))
  const groups = Array.from(new Set(visibleItems.map((n) => n.group)))

  const handleNav = (k: ViewKey) => {
    setView(k)
    setMobileOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b bg-background px-4 h-14">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="h-9 w-9">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">NemChem</span>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </header>

      <div className="flex flex-1">
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
                <p className="font-bold leading-tight">NemChem</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Gestão de Higiene</p>
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
                  {visibleItems.filter((n) => n.group === g).map((item) => {
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

          <div className="border-t p-3 space-y-2">
            <RolesPermissionsButton />
            <div className="flex items-center justify-between gap-2">
              <LoginButton />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </aside>

        {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />}

        <main className="flex-1 min-w-0 flex flex-col">{children}</main>
      </div>
    </div>
  )
}
