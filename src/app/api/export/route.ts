import { db } from "@/lib/db"
import { toCSV, csvResponse } from "@/lib/csv"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"
import { NextResponse } from "next/server"

/**
 * GET /api/export?type=inspections|locations|users
 * Exports the requested data set as a downloadable CSV file.
 * Requires reports:export capability.
 */
export async function GET(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "reports:export")) {
    return NextResponse.json(
      { error: "Insufficient permissions: reports:export required" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "inspections"

  if (type === "inspections") {
    const rows = await db.inspection.findMany({
      include: {
        location: { select: { name: true, code: true } },
        inspector: { select: { name: true, email: true } },
        template: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { scheduledDate: "desc" },
      take: 1000,
    })
    const csv = toCSV(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        location: r.location?.name ?? "",
        locationCode: r.location?.code ?? "",
        template: r.template?.name ?? "",
        inspector: r.inspector?.name ?? "",
        inspectorEmail: r.inspector?.email ?? "",
        createdBy: r.createdBy?.name ?? "",
        status: r.status,
        scheduledDate: r.scheduledDate.toISOString(),
        completedDate: r.completedDate?.toISOString() ?? "",
        compliance: r.compliancePercent ?? "",
        score: r.overallScore ?? "",
        declineReason: r.declineReason ?? "",
        reviewComments: r.reviewComments ?? "",
      })),
      [
        { key: "id", label: "ID" },
        { key: "title", label: "Title" },
        { key: "location", label: "Location" },
        { key: "locationCode", label: "Location Code" },
        { key: "template", label: "Template" },
        { key: "inspector", label: "Inspector" },
        { key: "inspectorEmail", label: "Inspector Email" },
        { key: "createdBy", label: "Created By" },
        { key: "status", label: "Status" },
        { key: "scheduledDate", label: "Scheduled Date" },
        { key: "completedDate", label: "Completed Date" },
        { key: "compliance", label: "Compliance %" },
        { key: "score", label: "Score" },
        { key: "declineReason", label: "Decline Reason" },
        { key: "reviewComments", label: "Review Comments" },
      ]
    )

    await audit({
      userId: user.id,
      userRole: user.role,
      action: "EXPORT",
      entityType: "Inspection",
      after: { count: rows.length },
    })
    return csvResponse("inspections.csv", csv)
  }

  if (type === "locations") {
    const rows = await db.location.findMany({
      include: {
        supervisor: { select: { name: true, email: true } },
        _count: { select: { inspections: true, capas: true, defects: true } },
      },
      orderBy: { name: "asc" },
    })
    const csv = toCSV(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        type: r.facilityType,
        address: r.address ?? "",
        city: r.city ?? "",
        supervisor: r.supervisor?.name ?? "",
        supervisorEmail: r.supervisor?.email ?? "",
        status: r.status,
        inspections: r._count.inspections,
        capas: r._count.capas,
        defects: r._count.defects,
        gpsLat: r.gpsLat ?? "",
        gpsLng: r.gpsLng ?? "",
      })),
      [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "code", label: "Code" },
        { key: "type", label: "Facility Type" },
        { key: "address", label: "Address" },
        { key: "city", label: "City" },
        { key: "supervisor", label: "Supervisor" },
        { key: "supervisorEmail", label: "Supervisor Email" },
        { key: "status", label: "Status" },
        { key: "inspections", label: "Inspections" },
        { key: "capas", label: "Open CAPAs" },
        { key: "defects", label: "Defects" },
        { key: "gpsLat", label: "GPS Latitude" },
        { key: "gpsLng", label: "GPS Longitude" },
      ]
    )

    await audit({
      userId: user.id,
      userRole: user.role,
      action: "EXPORT",
      entityType: "Location",
      after: { count: rows.length },
    })
    return csvResponse("locations.csv", csv)
  }

  if (type === "users") {
    const rows = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        active: true,
        createdAt: true,
        _count: {
          select: {
            inspectionsCreated: true,
            inspectionsAssigned: true,
            capasAssigned: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })
    const csv = toCSV(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        role: r.role,
        phone: r.phone ?? "",
        active: r.active ? "Yes" : "No",
        created: r.createdAt.toISOString().split("T")[0],
        inspectionsCreated: r._count.inspectionsCreated,
        inspectionsAssigned: r._count.inspectionsAssigned,
        capasAssigned: r._count.capasAssigned,
      })),
      [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role" },
        { key: "phone", label: "Phone" },
        { key: "active", label: "Active" },
        { key: "created", label: "Created" },
        { key: "inspectionsCreated", label: "Inspections Created" },
        { key: "inspectionsAssigned", label: "Inspections Assigned" },
        { key: "capasAssigned", label: "CAPAs Assigned" },
      ]
    )

    await audit({
      userId: user.id,
      userRole: user.role,
      action: "EXPORT",
      entityType: "User",
      after: { count: rows.length },
    })
    return csvResponse("users.csv", csv)
  }

  return NextResponse.json(
    { error: "Unknown export type. Use inspections, locations, or users." },
    { status: 400 }
  )
}
