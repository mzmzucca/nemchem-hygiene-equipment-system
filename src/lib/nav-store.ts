"use client"

import { create } from "zustand"
import type { ViewKey } from "@/lib/types"

interface NavState {
  view: ViewKey
  setView: (v: ViewKey) => void
  // detail selection
  selectedCustomerId: string | null
  selectedContractId: string | null
  selectedEquipmentId: string | null
  selectedVisitId: string | null
  selectedProductId: string | null
  selectedBatteryId: string | null
  // inspection context (visit to inspect)
  inspectVisitId: string | null
  selectCustomer: (id: string | null) => void
  selectContract: (id: string | null) => void
  selectEquipment: (id: string | null) => void
  selectVisit: (id: string | null) => void
  selectProduct: (id: string | null) => void
  selectBattery: (id: string | null) => void
  setInspectVisit: (id: string | null) => void
  // go to customer
  goToCustomer: (id: string) => void
  goToContract: (id: string) => void
  goToEquipment: (id: string) => void
  goToVisit: (id: string) => void
  goToProduct: (id: string) => void
  goToInspect: (visitId: string) => void
}

export const useNav = create<NavState>((set) => ({
  view: "dashboard",
  setView: (v) => set({ view: v, selectedCustomerId: null, selectedContractId: null, selectedEquipmentId: null, selectedVisitId: null, selectedProductId: null, selectedBatteryId: null, inspectVisitId: null }),
  selectedCustomerId: null,
  selectedContractId: null,
  selectedEquipmentId: null,
  selectedVisitId: null,
  selectedProductId: null,
  selectedBatteryId: null,
  inspectVisitId: null,
  selectCustomer: (id) => set({ selectedCustomerId: id }),
  selectContract: (id) => set({ selectedContractId: id }),
  selectEquipment: (id) => set({ selectedEquipmentId: id }),
  selectVisit: (id) => set({ selectedVisitId: id }),
  selectProduct: (id) => set({ selectedProductId: id }),
  selectBattery: (id) => set({ selectedBatteryId: id }),
  setInspectVisit: (id) => set({ inspectVisitId: id }),
  goToCustomer: (id) => set({ view: "customers", selectedCustomerId: id, selectedContractId: null }),
  goToContract: (id) => set({ view: "contracts", selectedContractId: id }),
  goToEquipment: (id) => set({ view: "equipment", selectedEquipmentId: id }),
  goToVisit: (id) => set({ view: "visits", selectedVisitId: id }),
  goToProduct: (id) => set({ view: "consumables", selectedProductId: id }),
  goToInspect: (visitId) => set({ view: "inspections", inspectVisitId: visitId }),
}))
