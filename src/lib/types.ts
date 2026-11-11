// Shared types for the frontend

export type ViewKey =
  | "dashboard"
  | "customers"
  | "contracts"
  | "equipment"
  | "visits"
  | "inspections"
  | "batteries"
  | "consumables"

export interface User {
  id: string
  email: string
  name: string
  role: string
  phone?: string
  active: boolean
}

export interface Customer {
  id: string
  name: string
  code: string
  category: string
  address?: string
  city?: string
  contactPerson?: string
  phone?: string
  email?: string
  notes?: string
  status: string
  createdAt: string
  locations?: CustomerLocation[]
  contracts?: Contract[]
  equipment?: Equipment[]
  visits?: Visit[]
  _count?: { contracts: number; equipment: number; visits: number }
}

export interface CustomerLocation {
  id: string
  customerId: string
  name: string
  floor?: string
  notes?: string
  _count?: { equipment: number }
}

export interface EquipmentCategory {
  id: string
  name: string
  description?: string
  usesBatteries: boolean
  _count?: { equipment: number }
}

export interface Equipment {
  id: string
  name: string
  categoryId: string
  brand?: string
  model?: string
  serialNumber: string
  purchaseDate?: string
  installationDate?: string
  customerId?: string
  contractId?: string
  locationId?: string
  batteryType?: string
  operationalStatus: string
  installationStatus: string
  currentBatteryLevel: string
  lastBatteryReplacement?: string
  notes?: string
  qrCode?: string
  createdAt: string
  category?: EquipmentCategory
  customer?: Customer
  contract?: Contract
  location?: CustomerLocation
  history?: EquipmentHistory[]
  inspections?: Inspection[]
  batteries?: BatteryReplacement[]
  consumption?: ConsumptionRecord[]
}

export interface EquipmentHistory {
  id: string
  equipmentId: string
  eventType: string
  description: string
  date: string
  performedBy?: string
  notes?: string
}

export interface Contract {
  id: string
  contractNumber: string
  customerId: string
  type: string
  startDate: string
  endDate: string
  status: string
  visitFrequency: string
  customDays?: number
  technicianId?: string
  monthlyFee: number
  notes?: string
  customer?: Customer
  technician?: User
  equipment?: Equipment[]
  visits?: Visit[]
  lastCompletedVisit?: Visit | null
  nextScheduledVisit?: Visit | null
  totalCompletedVisits?: number
  overdueVisits?: number
  installedMachines?: number
  _count?: { equipment: number; visits: number }
}

export interface Visit {
  id: string
  customerId: string
  contractId?: string
  scheduledDate: string
  scheduledTime?: string
  technicianId?: string
  visitType: string
  status: string
  notes?: string
  completedAt?: string
  customer?: Customer
  contract?: Contract
  technician?: User
  inspections?: Inspection[]
  consumption?: ConsumptionRecord[]
  batteries?: BatteryReplacement[]
  _count?: { inspections: number; consumption: number; batteries: number }
}

export interface Inspection {
  id: string
  visitId: string
  equipmentId: string
  technicianId?: string
  equipmentPresent: boolean
  correctlyInstalled: boolean
  correctlyPositioned: boolean
  workingProperly: boolean
  equipmentClean: boolean
  batteryAvailable: string
  batteryLevel: string
  batteryReplacementRequired: boolean
  consumablesAvailable: boolean
  maintenanceRequired: boolean
  equipmentDamaged: boolean
  result: string
  comments?: string
  inspectedAt: string
  equipment?: Equipment
  visit?: Visit
  technician?: User
  photos?: InspectionPhoto[]
}

export interface InspectionPhoto {
  id: string
  inspectionId: string
  imageUrl: string
  type: string
  caption?: string
}

export interface BatteryReplacement {
  id: string
  equipmentId: string
  customerId?: string
  contractId?: string
  visitId?: string
  previousLevel: string
  newLevel: string
  batteryType?: string
  quantityUsed: number
  replacementDate: string
  technicianId?: string
  notes?: string
  equipment?: Equipment
  customer?: Customer
  contract?: Contract
  visit?: Visit
  technician?: User
}

export interface ConsumableCategory {
  id: string
  name: string
  description?: string
  _count?: { products: number }
}

export interface Product {
  id: string
  name: string
  categoryId: string
  sku: string
  unitOfMeasurement: string
  currentStock: number
  minimumStock: number
  maximumStock: number
  unitCost: number
  supplier?: string
  status: string
  category?: ConsumableCategory
  movements?: StockMovement[]
  consumption?: ConsumptionRecord[]
  technicianStock?: { technician: User; quantity: number }[]
  _count?: { consumption: number }
}

export interface StockMovement {
  id: string
  productId: string
  quantity: number
  movementType: string
  date: string
  userId?: string
  reference?: string
  notes?: string
  product?: Product
  user?: User
}

export interface ConsumptionRecord {
  id: string
  productId: string
  customerId?: string
  contractId?: string
  equipmentId?: string
  visitId?: string
  technicianId?: string
  quantity: number
  date: string
  notes?: string
  product?: Product
  customer?: Customer
  contract?: Contract
  equipment?: Equipment
  visit?: Visit
  technician?: User
}

export interface DashboardData {
  kpis: {
    customers: { totalCustomers: number; activeCustomers: number }
    contracts: { totalActiveContracts: number; rentalContracts: number; folContracts: number; expiredContracts: number; approachingExpiration: number }
    equipment: { totalEquipment: number; installedEquipment: number; operational: number; nonOperational: number; damaged: number; underMaintenance: number; needsReplacement: number }
    visits: { totalVisitsMonth: number; completedVisits: number; scheduledVisits: number; pendingVisits: number; overdueVisits: number; upcomingVisits: number }
    batteries: { healthyBatteries: number; lowBatteries: number; needReplacement: number; batteryReplacementsMonth: number }
    consumables: { totalStock: number; estimatedMonthly: number; actualMonthly: number; lowStock: number; outOfStock: number }
  }
  charts: {
    monthlyVisits: { month: string; visits: number }[]
    equipmentStatusDist: { name: string; value: number }[]
    contractTypeDist: { name: string; value: number }[]
    monthlyConsumption: { month: string; consumption: number }[]
    equipByCustomerChart: { name: string; value: number }[]
    batteryReplacementsChart: { month: string; replacements: number }[]
    maintenanceOverview: { name: string; value: number }[]
  }
}
