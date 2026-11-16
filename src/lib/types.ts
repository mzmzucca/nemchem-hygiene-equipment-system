// Shared types for the Hygiene Management System

export type ViewKey =
  | "dashboard" | "inspections" | "agenda" | "reports" | "notifications"
  | "messages" | "map" | "team" | "activity" | "alerts" | "capa" | "defects"
  | "users" | "locations" | "templates" | "standards" | "audit" | "settings"

export interface User {
  id: string
  email: string
  name: string
  role: string
  phone?: string
  active: boolean
  avatar?: string
}

export interface Location {
  id: string
  name: string
  code: string
  address?: string
  city?: string
  gpsLat?: number
  gpsLng?: number
  facilityType: string
  supervisorId?: string
  status: string
  supervisor?: User
  inspections?: Inspection[]
  _count?: { inspections: number; capas: number; defects: number }
}

export interface HygieneCategory {
  id: string
  name: string
  description?: string
  sortOrder: number
  _count?: { items: number; capas: number; defects: number }
}

export interface InspectionTemplate {
  id: string
  name: string
  description?: string
  isActive: boolean
  items?: TemplateItem[]
  _count?: { items: number; inspections: number }
}

export interface TemplateItem {
  id: string
  templateId: string
  categoryId: string
  question: string
  description?: string
  scoringMethod: string
  weight: number
  mandatory: boolean
  photoRequired: boolean
  sortOrder: number
  category?: HygieneCategory
}

export interface Inspection {
  id: string
  templateId: string
  locationId: string
  inspectorId?: string
  createdById: string
  title: string
  scheduledDate: string
  completedDate?: string
  status: string
  declineReason?: string
  reviewComments?: string
  correctionNotes?: string
  overallScore?: number
  compliancePercent?: number
  createdAt: string
  template?: InspectionTemplate
  location?: Location
  inspector?: User
  createdBy?: User
  items?: InspectionItem[]
  history?: InspectionHistory[]
  photos?: InspectionPhoto[]
  capas?: CAPA[]
  _count?: { items: number; history: number; photos: number; capas: number }
}

export interface InspectionItem {
  id: string
  inspectionId: string
  templateItemId: string
  response?: string
  score?: number
  comments?: string
  correctiveRecommendation?: string
  severity?: string
  templateItem?: TemplateItem
  photos?: InspectionPhoto[]
}

export interface InspectionPhoto {
  id: string
  inspectionId: string
  itemId?: string
  imageUrl: string
  caption?: string
  type: string
  isInternal: boolean
}

export interface InspectionHistory {
  id: string
  inspectionId: string
  fromStatus?: string
  toStatus: string
  userId?: string
  comments?: string
  timestamp: string
  user?: User
}

export interface CAPA {
  id: string
  inspectionId?: string
  locationId?: string
  categoryId?: string
  title: string
  description: string
  severity: string
  correctiveAction?: string
  assignedToId?: string
  targetDate?: string
  status: string
  verificationComments?: string
  closureDate?: string
  createdAt: string
  inspection?: Inspection
  location?: Location
  category?: HygieneCategory
  assignedTo?: User
  closedBy?: User
  evidence?: CapaEvidence[]
}

export interface CapaEvidence {
  id: string
  capaId: string
  imageUrl: string
  caption?: string
}

export interface Defect {
  id: string
  inspectionId?: string
  locationId?: string
  categoryId?: string
  title: string
  description: string
  severity: string
  responsiblePerson?: string
  resolutionDeadline?: string
  status: string
  resolvedAt?: string
  resolutionNotes?: string
  createdAt: string
  location?: Location
  category?: HygieneCategory
}

export interface Alert {
  id: string
  type: string
  severity: string
  inspectionId?: string
  locationId?: string
  title: string
  message: string
  status: string
  resolvedById?: string
  resolvedAt?: string
  createdAt: string
  location?: Location
  inspection?: Inspection
}

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  relatedId?: string
  createdAt: string
}

export interface Message {
  id: string
  fromUserId: string
  toUserId: string
  subject: string
  body: string
  read: boolean
  createdAt: string
  sender?: User
  recipient?: User
}

export interface Announcement {
  id: string
  createdById: string
  title: string
  body: string
  audience: string
  createdAt: string
  createdBy?: User
}

export interface AuditLog {
  id: string
  userId?: string
  userRole?: string
  action: string
  entityType: string
  entityId?: string
  before?: string
  after?: string
  reason?: string
  createdAt: string
}

export interface DashboardData {
  kpis: {
    total: number
    completed: number
    pending: number
    awaitingReview: number
    inProgress: number
    overdue: number
    avgCompliance: number
    criticalViolations: number
    openCapas: number
    overdueCapas: number
  }
  complianceTrend: { month: string; compliance: number }[]
  locationPerformance: { name: string; compliance: number; inspections: number }[]
  categoryPerformance: { name: string; avgScore: number; violations: number }[]
  inspectorLeaderboard: { name: string; completed: number; avgScore: number }[]
  recentActivity: { id: string; action: string; entity: string; user: string; time: string }[]
  statusBreakdown: { status: string; count: number }[]
}
