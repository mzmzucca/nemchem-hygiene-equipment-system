"use client"

import { create } from "zustand"
import type { ViewKey } from "@/lib/types"

interface NavState {
  view: ViewKey
  setView: (v: ViewKey) => void
  selectedInspectionId: string | null
  selectedLocationId: string | null
  selectedTemplateId: string | null
  selectedCapaId: string | null
  selectedUserId: string | null
  inspectMode: string | null // "create" | "inspect" | null
  selectInspection: (id: string | null) => void
  selectLocation: (id: string | null) => void
  selectTemplate: (id: string | null) => void
  selectCapa: (id: string | null) => void
  selectUser: (id: string | null) => void
  setInspectMode: (m: string | null) => void
  goToInspection: (id: string) => void
  goToLocation: (id: string) => void
  goToTemplate: (id: string) => void
  goToCapa: (id: string) => void
  goToUser: (id: string) => void
  goToInspect: (inspectionId: string) => void
  goToCreateInspection: () => void
}

export const useNav = create<NavState>((set) => ({
  view: "dashboard",
  setView: (v) => set({ view: v, selectedInspectionId: null, selectedLocationId: null, selectedTemplateId: null, selectedCapaId: null, selectedUserId: null, inspectMode: null }),
  selectedInspectionId: null,
  selectedLocationId: null,
  selectedTemplateId: null,
  selectedCapaId: null,
  selectedUserId: null,
  inspectMode: null,
  selectInspection: (id) => set({ selectedInspectionId: id }),
  selectLocation: (id) => set({ selectedLocationId: id }),
  selectTemplate: (id) => set({ selectedTemplateId: id }),
  selectCapa: (id) => set({ selectedCapaId: id }),
  selectUser: (id) => set({ selectedUserId: id }),
  setInspectMode: (m) => set({ inspectMode: m }),
  goToInspection: (id) => set({ view: "inspections", selectedInspectionId: id, inspectMode: null }),
  goToLocation: (id) => set({ view: "locations", selectedLocationId: id }),
  goToTemplate: (id) => set({ view: "templates", selectedTemplateId: id }),
  goToCapa: (id) => set({ view: "capa", selectedCapaId: id }),
  goToUser: (id) => set({ view: "users", selectedUserId: id }),
  goToInspect: (inspectionId) => set({ view: "inspections", selectedInspectionId: inspectionId, inspectMode: "inspect" }),
  goToCreateInspection: () => set({ view: "inspections", selectedInspectionId: null, inspectMode: "create" }),
}))
