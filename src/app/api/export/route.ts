import { db } from "@/lib/db"
import { toCSV, csvResponse } from "@/lib/csv"
import { requireAuthOrDemo, audit } from "@/lib/auth-guard"
import { can } from "@/lib/permissions"
import { NextResponse } from "next/server"

/**
 * GET /api/export?type=customers|equipment|visits|consumption|products
 *
 * Exports the requested data set as a downloadable CSV file.
 * Requires export:any capability (ADMIN or MANAGER only).
 */
export async function GET(req: Request) {
  const user = await requireAuthOrDemo()
  if (!can(user.role, "export:any")) {
    return NextResponse.json(
      { error: "Insufficient permissions: exporting data requires MANAGER or ADMIN role" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "customers"

  switch (type) {
    case "customers": {
      const rows = await db.customer.findMany({
        include: { _count: { select: { contracts: true, equipment: true, visits: true } } },
        orderBy: { name: "asc" },
      })
      const csv = toCSV(
        rows.map((r) => ({
          code: r.code,
          name: r.name,
          category: r.category,
          city: r.city ?? "",
          contactPerson: r.contactPerson ?? "",
          phone: r.phone ?? "",
          email: r.email ?? "",
          status: r.status,
          contracts: r._count.contracts,
          equipment: r._count.equipment,
          visits: r._count.visits,
          registered: r.createdAt.toISOString().split("T")[0],
        })),
        [
          { key: "code", label: "Code" },
          { key: "name", label: "Name" },
          { key: "category", label: "Category" },
          { key: "city", label: "City" },
          { key: "contactPerson", label: "Contact Person" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "status", label: "Status" },
          { key: "contracts", label: "Contracts" },
          { key: "equipment", label: "Equipment" },
          { key: "visits", label: "Visits" },
          { key: "registered", label: "Registered" },
        ]
      )
      return csvResponse("nemchem-customers.csv", csv)
    }

    case "equipment": {
      const rows = await db.equipment.findMany({
        include: { category: true, customer: true, contract: true, location: true },
        orderBy: { serialNumber: "asc" },
      })
      const csv = toCSV(
        rows.map((r) => ({
          serial: r.serialNumber,
          name: r.name,
          category: r.category?.name ?? "",
          brand: r.brand ?? "",
          model: r.model ?? "",
          customer: r.customer?.name ?? "Unassigned",
          contract: r.contract?.contractNumber ?? "",
          location: r.location?.name ?? "",
          operationalStatus: r.operationalStatus,
          installationStatus: r.installationStatus,
          batteryLevel: r.currentBatteryLevel,
          batteryType: r.batteryType ?? "",
          installed: r.installationDate?.toISOString().split("T")[0] ?? "",
        })),
        [
          { key: "serial", label: "Serial Number" },
          { key: "name", label: "Name" },
          { key: "category", label: "Category" },
          { key: "brand", label: "Brand" },
          { key: "model", label: "Model" },
          { key: "customer", label: "Customer" },
          { key: "contract", label: "Contract" },
          { key: "location", label: "Location" },
          { key: "operationalStatus", label: "Operational Status" },
          { key: "installationStatus", label: "Installation Status" },
          { key: "batteryLevel", label: "Battery Level" },
          { key: "batteryType", label: "Battery Type" },
          { key: "installed", label: "Install Date" },
        ]
      )
      return csvResponse("nemchem-equipment.csv", csv)
    }

    case "visits": {
      const rows = await db.visit.findMany({
        include: { customer: true, contract: true, technician: true, _count: { select: { inspections: true } } },
        orderBy: { scheduledDate: "desc" },
      })
      const csv = toCSV(
        rows.map((r) => ({
          date: r.scheduledDate.toISOString().split("T")[0],
          time: r.scheduledTime ?? "",
          customer: r.customer?.name ?? "",
          contract: r.contract?.contractNumber ?? "",
          technician: r.technician?.name ?? "",
          type: r.visitType,
          status: r.status,
          inspections: r._count.inspections,
        })),
        [
          { key: "date", label: "Date" },
          { key: "time", label: "Time" },
          { key: "customer", label: "Customer" },
          { key: "contract", label: "Contract" },
          { key: "technician", label: "Technician" },
          { key: "type", label: "Visit Type" },
          { key: "status", label: "Status" },
          { key: "inspections", label: "Inspections" },
        ]
      )
      return csvResponse("nemchem-visits.csv", csv)
    }

    case "consumption": {
      const rows = await db.consumptionRecord.findMany({
        include: { product: true, customer: true, equipment: true, technician: true },
        orderBy: { date: "desc" },
        take: 1000,
      })
      const csv = toCSV(
        rows.map((r) => ({
          date: r.date.toISOString().split("T")[0],
          product: r.product?.name ?? "",
          customer: r.customer?.name ?? "",
          equipment: r.equipment?.serialNumber ?? "",
          technician: r.technician?.name ?? "",
          quantity: r.quantity,
          notes: r.notes ?? "",
        })),
        [
          { key: "date", label: "Date" },
          { key: "product", label: "Product" },
          { key: "customer", label: "Customer" },
          { key: "equipment", label: "Equipment" },
          { key: "technician", label: "Technician" },
          { key: "quantity", label: "Quantity" },
          { key: "notes", label: "Notes" },
        ]
      )
      return csvResponse("nemchem-consumption.csv", csv)
    }

    case "products": {
      const rows = await db.product.findMany({
        include: { category: true },
        orderBy: { name: "asc" },
      })
      const csv = toCSV(
        rows.map((r) => ({
          sku: r.sku,
          name: r.name,
          category: r.category?.name ?? "",
          unit: r.unitOfMeasurement,
          currentStock: r.currentStock,
          minimumStock: r.minimumStock,
          maximumStock: r.maximumStock,
          unitCost: r.unitCost,
          stockValue: r.currentStock * r.unitCost,
          supplier: r.supplier ?? "",
          status: r.status,
        })),
        [
          { key: "sku", label: "SKU" },
          { key: "name", label: "Name" },
          { key: "category", label: "Category" },
          { key: "unit", label: "Unit" },
          { key: "currentStock", label: "Current Stock" },
          { key: "minimumStock", label: "Min Stock" },
          { key: "maximumStock", label: "Max Stock" },
          { key: "unitCost", label: "Unit Cost" },
          { key: "stockValue", label: "Stock Value" },
          { key: "supplier", label: "Supplier" },
          { key: "status", label: "Status" },
        ]
      )
      return csvResponse("nemchem-products.csv", csv)
    }

    default:
      return new Response(JSON.stringify({ error: "Unknown export type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
  }
}
