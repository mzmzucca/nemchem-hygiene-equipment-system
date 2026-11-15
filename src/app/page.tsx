"use client"

import { AppShell } from "@/components/app-shell"
import { useNav } from "@/lib/nav-store"
import { DashboardModule } from "@/components/modules/dashboard"
import { AlertsModule } from "@/components/modules/alerts"
import { CustomersModule } from "@/components/modules/customers"
import { ContractsModule } from "@/components/modules/contracts"
import { EquipmentModule } from "@/components/modules/equipment"
import { VisitsModule } from "@/components/modules/visits"
import { InspectionsModule } from "@/components/modules/inspections"
import { BatteriesModule } from "@/components/modules/batteries"
import { ConsumablesModule } from "@/components/modules/consumables"
import { Footer } from "@/components/footer"

export default function Home() {
  const view = useNav((s) => s.view)

  return (
    <AppShell>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          {view === "dashboard" && <DashboardModule />}
          {view === "alerts" && <AlertsModule />}
          {view === "customers" && <CustomersModule />}
          {view === "contracts" && <ContractsModule />}
          {view === "equipment" && <EquipmentModule />}
          {view === "visits" && <VisitsModule />}
          {view === "inspections" && <InspectionsModule />}
          {view === "batteries" && <BatteriesModule />}
          {view === "consumables" && <ConsumablesModule />}
        </div>
        <Footer />
      </div>
    </AppShell>
  )
}
