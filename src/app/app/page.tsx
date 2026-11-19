"use client"

import { AppShell } from "@/components/app-shell"
import { useNav } from "@/lib/nav-store"
import { DashboardModule } from "@/components/modules/dashboard"
import { InspectionsModule } from "@/components/modules/inspections"
import { CapaModule } from "@/components/modules/capa"
import { DefectsModule } from "@/components/modules/defects"
import { AlertsModule } from "@/components/modules/alerts"
import { LocationsModule } from "@/components/modules/locations"
import { TemplatesModule } from "@/components/modules/templates"
import { UsersModule } from "@/components/modules/users"
import { AuditModule } from "@/components/modules/audit"
import { ReportsModule } from "@/components/modules/reports"
import { NotificationsModule } from "@/components/modules/notifications"
import { MessagesModule } from "@/components/modules/messages"
import { SettingsModule } from "@/components/modules/settings"
import { AgendaModule } from "@/components/modules/agenda"
import { MapModule } from "@/components/modules/map"
import { TeamModule } from "@/components/modules/team"
import { ActivityModule } from "@/components/modules/activity"
import { StandardsModule } from "@/components/modules/standards"
import { Footer } from "@/components/footer"
import { SignInGate } from "@/components/sign-in-gate"

export default function AppHome() {
  const view = useNav((s) => s.view)

  return (
    <SignInGate>
      <AppShell>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          {view === "dashboard" && <DashboardModule />}
          {view === "inspections" && <InspectionsModule />}
          {view === "agenda" && <AgendaModule />}
          {view === "capa" && <CapaModule />}
          {view === "defects" && <DefectsModule />}
          {view === "alerts" && <AlertsModule />}
          {view === "reports" && <ReportsModule />}
          {view === "activity" && <ActivityModule />}
          {view === "team" && <TeamModule />}
          {view === "map" && <MapModule />}
          {view === "locations" && <LocationsModule />}
          {view === "templates" && <TemplatesModule />}
          {view === "standards" && <StandardsModule />}
          {view === "users" && <UsersModule />}
          {view === "audit" && <AuditModule />}
          {view === "settings" && <SettingsModule />}
          {view === "notifications" && <NotificationsModule />}
          {view === "messages" && <MessagesModule />}
        </div>
        <Footer />
      </div>
    </AppShell>
    </SignInGate>
  )
}
