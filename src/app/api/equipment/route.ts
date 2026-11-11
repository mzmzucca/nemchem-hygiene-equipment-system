import { db } from "@/lib/db"
import { ok, err } from "@/lib/api"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const customerId = searchParams.get("customerId")
  const contractId = searchParams.get("contractId")
  const categoryId = searchParams.get("categoryId")
  const operationalStatus = searchParams.get("operationalStatus")
  const installationStatus = searchParams.get("installationStatus")
  const q = searchParams.get("q")

  const equipment = await db.equipment.findMany({
    where: {
      AND: [
        customerId ? { customerId } : {},
        contractId ? { contractId } : {},
        categoryId ? { categoryId } : {},
        operationalStatus ? { operationalStatus } : {},
        installationStatus ? { installationStatus } : {},
        q ? { OR: [{ name: { contains: q } }, { serialNumber: { contains: q } }, { brand: { contains: q } }] } : {},
      ],
    },
    include: {
      category: true,
      customer: true,
      contract: true,
      location: true,
    },
    orderBy: { createdAt: "desc" },
  })
  return ok(equipment)
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body.name || !body.serialNumber || !body.categoryId) {
    return err("Name, serial number and category are required")
  }
  const existing = await db.equipment.findUnique({ where: { serialNumber: body.serialNumber } })
  if (existing) return err("Serial number already exists")

  const equipment = await db.equipment.create({
    data: {
      name: body.name,
      categoryId: body.categoryId,
      brand: body.brand,
      model: body.model,
      serialNumber: body.serialNumber,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      installationDate: body.installationDate ? new Date(body.installationDate) : null,
      customerId: body.customerId || null,
      contractId: body.contractId || null,
      locationId: body.locationId || null,
      batteryType: body.batteryType || null,
      operationalStatus: body.operationalStatus || "OPERATIONAL",
      installationStatus: body.installationStatus || "INSTALLATION_PENDING",
      currentBatteryLevel: body.currentBatteryLevel || "UNKNOWN",
      notes: body.notes,
      qrCode: body.qrCode || `QR-${body.serialNumber}`,
    },
    include: { category: true, customer: true, contract: true, location: true },
  })

  await db.equipmentHistory.create({
    data: {
      equipmentId: equipment.id,
      eventType: "REGISTRATION",
      description: "Equipment registered in system",
      performedBy: "System",
    },
  })
  if (body.customerId) {
    const cust = await db.customer.findUnique({ where: { id: body.customerId } })
    await db.equipmentHistory.create({
      data: {
        equipmentId: equipment.id,
        eventType: "CUSTOMER_ASSIGNMENT",
        description: `Assigned to ${cust?.name ?? "customer"}`,
      },
    })
  }
  if (body.installationDate) {
    await db.equipmentHistory.create({
      data: {
        equipmentId: equipment.id,
        eventType: "INSTALLATION",
        description: "Equipment installed",
      },
    })
  }
  return ok(equipment, 201)
}
