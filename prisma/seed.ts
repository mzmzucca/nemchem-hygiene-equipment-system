import { db } from "../src/lib/db"
import { hashPassword } from "../src/lib/password"

async function main() {
  console.log("🌱 Seeding database...")

  // Clean
  await db.systemSetting.deleteMany()
  await db.auditLog.deleteMany()
  await db.equipmentConsumptionRate.deleteMany()
  await db.technicianStock.deleteMany()
  await db.consumptionRecord.deleteMany()
  await db.stockMovement.deleteMany()
  await db.inspectionPhoto.deleteMany()
  await db.inspection.deleteMany()
  await db.batteryReplacement.deleteMany()
  await db.visit.deleteMany()
  await db.equipmentHistory.deleteMany()
  await db.equipment.deleteMany()
  await db.customerLocation.deleteMany()
  await db.contract.deleteMany()
  await db.customer.deleteMany()
  await db.product.deleteMany()
  await db.consumableCategory.deleteMany()
  await db.equipmentCategory.deleteMany()
  await db.user.deleteMany()

  const pw = (s: string) => hashPassword(s)

  // ===== USERS =====
  const admin = await db.user.create({
    data: {
      email: "admin@hygiene.co",
      name: "System Administrator",
      password: pw("admin123"),
      role: "ADMIN",
      phone: "+27 11 000 0001",
      active: true,
    },
  })
  const manager = await db.user.create({
    data: {
      email: "manager@hygiene.co",
      name: "Operations Manager",
      password: pw("manager123"),
      role: "MANAGER",
      phone: "+27 11 000 0002",
      active: true,
    },
  })
  const tech1 = await db.user.create({
    data: {
      email: "joao@hygiene.co",
      name: "João Macamo",
      password: pw("tech123"),
      role: "TECHNICIAN",
      phone: "+27 84 111 2222",
      active: true,
    },
  })
  const tech2 = await db.user.create({
    data: {
      email: "carlos@hygiene.co",
      name: "Carlos Mondlane",
      password: pw("tech123"),
      role: "TECHNICIAN",
      phone: "+27 84 333 4444",
      active: true,
    },
  })
  const tech3 = await db.user.create({
    data: {
      email: "ana@hygiene.co",
      name: "Ana Cossa",
      password: pw("tech123"),
      role: "TECHNICIAN",
      phone: "+27 84 555 6666",
      active: true,
    },
  })
  const technicians = [tech1, tech2, tech3]

  // ===== EQUIPMENT CATEGORIES =====
  const catAir = await db.equipmentCategory.create({ data: { name: "Air Freshener Dispenser", description: "Automatic air freshener dispensers", usesBatteries: true } })
  const catSoap = await db.equipmentCategory.create({ data: { name: "Soap Dispenser", description: "Soap dispensers for washrooms", usesBatteries: false } })
  const catSanitizer = await db.equipmentCategory.create({ data: { name: "Hand Sanitizer Dispenser", description: "Hand sanitizer dispensers", usesBatteries: true } })
  const catPaper = await db.equipmentCategory.create({ data: { name: "Paper Dispenser", description: "Paper towel and tissue dispensers", usesBatteries: false } })
  const catToilet = await db.equipmentCategory.create({ data: { name: "Toilet Hygiene Equipment", description: "Toilet seat sanitizers and hygiene equipment", usesBatteries: true } })
  const catOther = await db.equipmentCategory.create({ data: { name: "Other Hygiene Equipment", description: "Other hygiene equipment", usesBatteries: false } })

  // ===== CONSUMABLE CATEGORIES & PRODUCTS =====
  const ccAir = await db.consumableCategory.create({ data: { name: "Air Freshener Refills" } })
  const ccSoap = await db.consumableCategory.create({ data: { name: "Soap Refills" } })
  const ccSanitizer = await db.consumableCategory.create({ data: { name: "Hand Sanitizer" } })
  const ccPaper = await db.consumableCategory.create({ data: { name: "Paper Products" } })
  const ccBattery = await db.consumableCategory.create({ data: { name: "Batteries" } })
  const ccOther = await db.consumableCategory.create({ data: { name: "Other Consumables" } })

  const products = await db.product.createMany({
    data: [
      { name: "Mango Air Freshener Refill 300ml", categoryId: ccAir.id, sku: "AIR-MANGO-300", unitOfMeasurement: "unit", currentStock: 142, minimumStock: 40, maximumStock: 300, unitCost: 85, supplier: "Hygiene Supplies Ltd" },
      { name: "Citrus Air Freshener Refill 300ml", categoryId: ccAir.id, sku: "AIR-CITRUS-300", unitOfMeasurement: "unit", currentStock: 18, minimumStock: 40, maximumStock: 300, unitCost: 85, supplier: "Hygiene Supplies Ltd" },
      { name: "Lavender Air Freshener Refill 300ml", categoryId: ccAir.id, sku: "AIR-LAV-300", unitOfMeasurement: "unit", currentStock: 8, minimumStock: 40, maximumStock: 300, unitCost: 90, supplier: "Hygiene Supplies Ltd" },
      { name: "Liquid Hand Soap 1L Refill", categoryId: ccSoap.id, sku: "SOAP-1L-CLR", unitOfMeasurement: "unit", currentStock: 96, minimumStock: 30, maximumStock: 200, unitCost: 45, supplier: "CleanCo" },
      { name: "Antibacterial Soap 1L Refill", categoryId: ccSoap.id, sku: "SOAP-1L-ANTI", unitOfMeasurement: "unit", currentStock: 12, minimumStock: 30, maximumStock: 200, unitCost: 52, supplier: "CleanCo" },
      { name: "Hand Sanitizer Gel 500ml", categoryId: ccSanitizer.id, sku: "SAN-500-GEL", unitOfMeasurement: "unit", currentStock: 0, minimumStock: 25, maximumStock: 150, unitCost: 38, supplier: "MediSupplies" },
      { name: "Hand Sanitizer Gel 1L", categoryId: ccSanitizer.id, sku: "SAN-1L-GEL", unitOfMeasurement: "unit", currentStock: 64, minimumStock: 20, maximumStock: 120, unitCost: 65, supplier: "MediSupplies" },
      { name: "Paper Towel Roll 2-Ply (Box 6)", categoryId: ccPaper.id, sku: "PAP-TOWEL-6", unitOfMeasurement: "box", currentStock: 50, minimumStock: 15, maximumStock: 100, unitCost: 120, supplier: "PaperWorks" },
      { name: "Toilet Paper 2-Ply (Box 48)", categoryId: ccPaper.id, sku: "PAP-TP-48", unitOfMeasurement: "box", currentStock: 22, minimumStock: 15, maximumStock: 80, unitCost: 210, supplier: "PaperWorks" },
      { name: "Alkaline AA Battery (4-pack)", categoryId: ccBattery.id, sku: "BAT-AA-4", unitOfMeasurement: "pack", currentStock: 35, minimumStock: 20, maximumStock: 100, unitCost: 55, supplier: "PowerCell" },
      { name: "Alkaline C Battery (2-pack)", categoryId: ccBattery.id, sku: "BAT-C-2", unitOfMeasurement: "pack", currentStock: 5, minimumStock: 15, maximumStock: 80, unitCost: 70, supplier: "PowerCell" },
      { name: "Alkaline D Battery (2-pack)", categoryId: ccBattery.id, sku: "BAT-D-2", unitOfMeasurement: "pack", currentStock: 28, minimumStock: 15, maximumStock: 80, unitCost: 78, supplier: "PowerCell" },
    ],
  })

  // ===== CUSTOMERS & LOCATIONS =====
  const customersData = [
    { name: "Hotel Polana", code: "CUST-001", category: "HOTEL", address: "Av. Julius Nyerere 1380", city: "Maputo", contactPerson: "Filipe Couto", phone: "+27 21 424 0001", email: "fm@hotelpolana.co" },
    { name: "Restaurant Costa do Sol", code: "CUST-002", category: "RESTAURANT", address: "Marginal, Costa do Sol", city: "Maputo", contactPerson: "Isabel Marques", phone: "+27 21 424 0002", email: "isabel@costadosol.co" },
    { name: "Maputo Central Hospital", code: "CUST-003", category: "HOSPITAL", address: "Av. Eduardo Mondlane", city: "Maputo", contactPerson: "Dr. Hortencia Cuna", phone: "+27 21 424 0003", email: "hcuna@mch.gov" },
    { name: "Matola Business Park", code: "CUST-004", category: "OFFICE", address: "EN2, Matola", city: "Matola", contactPerson: "Rui Tembe", phone: "+27 21 424 0004", email: "rtembe@mbp.co" },
    { name: "Maputo Shopping Centre", code: "CUST-005", category: "SHOPPING_CENTRE", address: "Av. 24 de Julho", city: "Maputo", contactPerson: "Sandra Langa", phone: "+27 21 424 0005", email: "sandra@maputoshopping.co" },
    { name: "Radisson Blu Hotel", code: "CUST-006", category: "HOTEL", address: "Av. Marginal 6465", city: "Maputo", contactPerson: "Pedro Almeida", phone: "+27 21 424 0006", email: "pedro@radisson.co" },
    { name: "Piri Piri Grill House", code: "CUST-007", category: "RESTAURANT", address: "Av. Mao Tse Tung", city: "Maputo", contactPerson: "Lúcia Sumbana", phone: "+27 21 424 0007", email: "lucia@piripiri.co" },
    { name: "Clínica Cruz Azul", code: "CUST-008", category: "HOSPITAL", address: "Av. Agostinho Neto", city: "Maputo", contactPerson: "Dr. Manuel Banze", phone: "+27 21 424 0008", email: "banze@cruzazul.co" },
    { name: "Edificio BCI Sede", code: "CUST-009", category: "OFFICE", address: "Av. 25 de Setembro", city: "Maputo", contactPerson: "Tânia Mucavele", phone: "+27 21 424 0009", email: "tania@bci.co" },
    { name: "Garden Square Mall", code: "CUST-010", category: "SHOPPING_CENTRE", address: "Rua da Argélia", city: "Maputo", contactPerson: "Hélder Nhaca", phone: "+27 21 424 0010", email: "helder@gardensquare.co" },
  ]

  const customers = []
  for (const c of customersData) {
    customers.push(await db.customer.create({ data: c }))
  }

  // Locations for Hotel Polana (index 0)
  const locNames = ["Reception", "Restaurant", "Kitchen", "Ground Floor Restroom", "First Floor Restroom", "Second Floor Restroom", "Staff Toilets", "Pool Area"]
  const polanaLocs = []
  for (const ln of locNames) {
    polanaLocs.push(await db.customerLocation.create({ data: { customerId: customers[0].id, name: ln } }))
  }
  // generic locations for others
  const otherLocs: { customerId: string; name: string }[] = []
  const genericLocs = ["Main Entrance", "Restrooms", "Kitchen", "Reception"]
  for (let i = 1; i < customers.length; i++) {
    for (const ln of genericLocs) {
      const loc = await db.customerLocation.create({ data: { customerId: customers[i].id, name: ln } })
      otherLocs.push({ customerId: customers[i].id, name: ln })
    }
  }

  // ===== CONTRACTS =====
  const now = new Date()
  const contracts = []
  const contractData = [
    { custIdx: 0, type: "RENTAL", start: -380, end: 5, freq: "BIWEEKLY", techIdx: 0, fee: 4500 },
    { custIdx: 0, type: "FOL", start: -300, end: 65, freq: "MONTHLY", techIdx: 1, fee: 0 },
    { custIdx: 1, type: "RENTAL", start: -250, end: 115, freq: "WEEKLY", techIdx: 0, fee: 2800 },
    { custIdx: 2, type: "FOL", start: -400, end: -10, freq: "WEEKLY", techIdx: 2, fee: 0 }, // expired
    { custIdx: 3, type: "RENTAL", start: -200, end: 165, freq: "MONTHLY", techIdx: 1, fee: 3200 },
    { custIdx: 4, type: "FOL", start: -150, end: 215, freq: "BIWEEKLY", techIdx: 0, fee: 0 },
    { custIdx: 5, type: "RENTAL", start: -100, end: 265, freq: "WEEKLY", techIdx: 2, fee: 5200 },
    { custIdx: 6, type: "RENTAL", start: -60, end: 305, freq: "BIWEEKLY", techIdx: 1, fee: 1800 },
    { custIdx: 7, type: "FOL", start: -180, end: 18, freq: "MONTHLY", techIdx: 2, fee: 0 }, // approaching expiration
    { custIdx: 8, type: "RENTAL", start: -320, end: 45, freq: "MONTHLY", techIdx: 0, fee: 3900 },
    { custIdx: 9, type: "FOL", start: -140, end: 224, freq: "BIWEEKLY", techIdx: 1, fee: 0 },
  ]

  for (const cd of contractData) {
    const startDate = new Date(now); startDate.setDate(startDate.getDate() + cd.start)
    const endDate = new Date(now); endDate.setDate(endDate.getDate() + cd.end)
    let status = "ACTIVE"
    if (cd.end < 0) status = "EXPIRED"
    const c = await db.contract.create({
      data: {
        contractNumber: `CT-${String(contracts.length + 1).padStart(4, "0")}`,
        customerId: customers[cd.custIdx].id,
        type: cd.type,
        startDate,
        endDate,
        status,
        visitFrequency: cd.freq,
        technicianId: technicians[cd.techIdx].id,
        monthlyFee: cd.fee,
      },
    })
    contracts.push(c)
  }

  // ===== EQUIPMENT =====
  const eqCategories = [catAir, catSoap, catSanitizer, catPaper, catToilet, catOther]
  const brands = ["Initial", "Rentokil", "Tork", "Kimberly-Clark", "Vectair", "Jangro"]
  let serialCounter = 1000
  const allEquipment = []

  // For each contract, install some equipment
  for (let ci = 0; ci < contracts.length; ci++) {
    const contract = contracts[ci]
    const customer = customers[contractData[ci].custIdx]
    const numEq = 2 + Math.floor(Math.random() * 4) // 2-5 equipment per contract
    // get locations for this customer
    const locs = customer.id === customers[0].id ? polanaLocs : otherLocs.filter(o => o.customerId === customer.id)
    // We stored otherLocs as objects, need actual location records. Let me re-fetch.
    const customerLocRecords = await db.customerLocation.findMany({ where: { customerId: customer.id } })

    for (let e = 0; e < numEq; e++) {
      const cat = eqCategories[(ci + e) % eqCategories.length]
      const loc = customerLocRecords[e % customerLocRecords.length]
      const opStatuses = ["OPERATIONAL", "OPERATIONAL", "OPERATIONAL", "OPERATIONAL", "NOT_OPERATIONAL", "DAMAGED", "UNDER_MAINTENANCE", "NEEDS_REPLACEMENT"]
      const opStatus = opStatuses[Math.floor(Math.random() * opStatuses.length)]
      const installStatuses = ["CORRECTLY_INSTALLED", "CORRECTLY_INSTALLED", "CORRECTLY_INSTALLED", "INCORRECTLY_INSTALLED", "NEEDS_REPOSITIONING"]
      const batteryLevels = cat.usesBatteries ? ["FULL", "SEVENTY_FIVE", "FIFTY", "TWENTY_FIVE", "EMPTY"] : ["NA"]
      const bl = batteryLevels[Math.floor(Math.random() * batteryLevels.length)]

      const purchaseDate = new Date(now); purchaseDate.setDate(purchaseDate.getDate() - 400 - Math.floor(Math.random() * 300))
      const installationDate = new Date(now); installationDate.setDate(installationDate.getDate() - 300 - Math.floor(Math.random() * 200))
      const lastBatt = cat.usesBatteries ? new Date(now.getTime() - Math.floor(Math.random() * 60) * 86400000) : null

      const eq = await db.equipment.create({
        data: {
          name: `${cat.name} ${brands[e % brands.length]}`,
          categoryId: cat.id,
          brand: brands[e % brands.length],
          model: `M-${100 + e}`,
          serialNumber: `SN-${serialCounter++}`,
          purchaseDate,
          installationDate,
          customerId: customer.id,
          contractId: contract.id,
          locationId: loc?.id,
          batteryType: cat.usesBatteries ? (e % 3 === 0 ? "AA" : e % 3 === 1 ? "C" : "D") : null,
          operationalStatus: opStatus,
          installationStatus: installStatuses[Math.floor(Math.random() * installStatuses.length)],
          currentBatteryLevel: bl,
          lastBatteryReplacement: lastBatt,
          qrCode: `QR-${serialCounter}`,
        },
      })
      allEquipment.push(eq)

      // Equipment history
      await db.equipmentHistory.create({ data: { equipmentId: eq.id, eventType: "REGISTRATION", description: "Equipment registered in system", date: purchaseDate, performedBy: admin.name } })
      await db.equipmentHistory.create({ data: { equipmentId: eq.id, eventType: "INSTALLATION", description: `Installed at ${customer.name} - ${loc?.name}`, date: installationDate, performedBy: technicians[contractData[ci].techIdx].name } })
      await db.equipmentHistory.create({ data: { equipmentId: eq.id, eventType: "CUSTOMER_ASSIGNMENT", description: `Assigned to ${customer.name}`, date: installationDate } })
      await db.equipmentHistory.create({ data: { equipmentId: eq.id, eventType: "CONTRACT_ASSIGNMENT", description: `Linked to contract ${contract.contractNumber}`, date: installationDate } })
      if (cat.usesBatteries && lastBatt) {
        await db.equipmentHistory.create({ data: { equipmentId: eq.id, eventType: "BATTERY_REPLACEMENT", description: "Battery replaced during routine visit", date: lastBatt, performedBy: technicians[contractData[ci].techIdx].name } })
      }
    }
  }

  // ===== VISITS =====
  // Generate visits: past completed, current scheduled, future
  const visitTypes = ["INSPECTION", "MAINTENANCE", "INSPECTION", "INSPECTION", "REPLACEMENT"]
  for (let ci = 0; ci < contracts.length; ci++) {
    const contract = contracts[ci]
    const customer = customers[contractData[ci].custIdx]
    const tech = technicians[contractData[ci].techIdx]
    const freqDays = contract.visitFrequency === "DAILY" ? 1 : contract.visitFrequency === "WEEKLY" ? 7 : contract.visitFrequency === "BIWEEKLY" ? 14 : 30

    // 4 past visits
    for (let v = 4; v >= 1; v--) {
      const d = new Date(now); d.setDate(d.getDate() - v * freqDays)
      const completed = new Date(d)
      completed.setHours(completed.getHours() + 2)
      await db.visit.create({
        data: {
          customerId: customer.id,
          contractId: contract.id,
          scheduledDate: d,
          scheduledTime: "09:00",
          technicianId: tech.id,
          visitType: visitTypes[Math.floor(Math.random() * visitTypes.length)],
          status: "COMPLETED",
          completedAt: completed,
          notes: "Routine visit completed successfully.",
        },
      })
    }
    // 1 upcoming
    const up = new Date(now); up.setDate(up.getDate() + Math.floor(freqDays / 2) + 3)
    await db.visit.create({
      data: {
        customerId: customer.id,
        contractId: contract.id,
        scheduledDate: up,
        scheduledTime: "10:00",
        technicianId: tech.id,
        visitType: "INSPECTION",
        status: "SCHEDULED",
      },
    })
    // 1 overdue (for some contracts)
    if (ci % 3 === 0) {
      const od = new Date(now); od.setDate(od.getDate() - 5)
      await db.visit.create({
        data: {
          customerId: customer.id,
          contractId: contract.id,
          scheduledDate: od,
          scheduledTime: "11:00",
          technicianId: tech.id,
          visitType: "INSPECTION",
          status: "OVERDUE",
          notes: "Visit not completed on schedule.",
        },
      })
    }
  }

  // ===== INSPECTIONS (for some completed visits) =====
  const completedVisits = await db.visit.findMany({ where: { status: "COMPLETED" }, take: 10, include: { contract: true } })
  for (const v of completedVisits.slice(0, 8)) {
    const equipList = await db.equipment.findMany({ where: { contractId: v.contractId }, take: 3 })
    for (const eq of equipList) {
      const resultOptions = ["PASSED", "PASSED", "PASSED_WITH_OBSERVATIONS", "MAINTENANCE_REQUIRED", "FAILED", "REPLACEMENT_REQUIRED"]
      const res = resultOptions[Math.floor(Math.random() * resultOptions.length)]
      const cat = await db.equipmentCategory.findUnique({ where: { id: eq.categoryId } })
      const hasBattery = cat?.usesBatteries ?? false
      await db.inspection.create({
        data: {
          visitId: v.id,
          equipmentId: eq.id,
          technicianId: v.technicianId,
          equipmentPresent: Math.random() > 0.05,
          correctlyInstalled: Math.random() > 0.15,
          correctlyPositioned: Math.random() > 0.2,
          workingProperly: Math.random() > 0.15,
          equipmentClean: Math.random() > 0.25,
          batteryAvailable: hasBattery ? (Math.random() > 0.2 ? "YES" : "NO") : "N/A",
          batteryLevel: eq.currentBatteryLevel,
          batteryReplacementRequired: hasBattery && (eq.currentBatteryLevel === "EMPTY" || eq.currentBatteryLevel === "TWENTY_FIVE"),
          consumablesAvailable: Math.random() > 0.3,
          maintenanceRequired: res === "MAINTENANCE_REQUIRED",
          equipmentDamaged: res === "FAILED" || res === "REPLACEMENT_REQUIRED",
          result: res,
          comments: res === "PASSED" ? "All good." : "Requires attention.",
          inspectedAt: v.completedAt ?? v.scheduledDate,
        },
      })
    }
  }

  // ===== BATTERY REPLACEMENTS =====
  const batteryEquip = await db.equipment.findMany({ where: { batteryType: { not: null } }, take: 15, include: { contract: true } })
  for (const eq of batteryEquip.slice(0, 12)) {
    if (!eq.contractId) continue
    const contract = eq.contract
    const prevLevels = ["FIFTY", "TWENTY_FIVE", "EMPTY"]
    const prev = prevLevels[Math.floor(Math.random() * prevLevels.length)]
    const repDate = new Date(now.getTime() - Math.floor(Math.random() * 50) * 86400000)
    await db.batteryReplacement.create({
      data: {
        equipmentId: eq.id,
        customerId: eq.customerId,
        contractId: eq.contractId,
        previousLevel: prev,
        newLevel: "FULL",
        batteryType: eq.batteryType ?? "AA",
        quantityUsed: eq.batteryType === "AA" ? 4 : 2,
        replacementDate: repDate,
        technicianId: contract?.technicianId,
        notes: "Routine battery replacement.",
      },
    })
  }

  // ===== STOCK MOVEMENTS =====
  const allProducts = await db.product.findMany()
  for (const p of allProducts) {
    // entries
    await db.stockMovement.create({ data: { productId: p.id, quantity: p.currentStock + 20, movementType: "ENTRY", userId: manager.id, reference: "PO-" + p.sku, notes: "Initial stock" } })
    // exits
    await db.stockMovement.create({ data: { productId: p.id, quantity: Math.floor(p.currentStock * 0.3), movementType: "EXIT", userId: tech1.id, reference: "Allocation", notes: "Technician allocation" } })
  }

  // ===== CONSUMPTION RECORDS =====
  const consumableProducts = allProducts.filter(p => !p.name.includes("Battery"))
  const equipWithContracts = await db.equipment.findMany({ where: { contractId: { not: null } }, take: 20, include: { contract: true } })
  for (let i = 0; i < 40; i++) {
    const p = consumableProducts[i % consumableProducts.length]
    const eq = equipWithContracts[i % equipWithContracts.length]
    const d = new Date(now.getTime() - Math.floor(Math.random() * 30) * 86400000)
    await db.consumptionRecord.create({
      data: {
        productId: p.id,
        customerId: eq.customerId,
        contractId: eq.contractId,
        equipmentId: eq.id,
        technicianId: eq.contract?.technicianId,
        quantity: 1 + Math.floor(Math.random() * 3),
        date: d,
        notes: "Used during visit",
      },
    })
  }

  // ===== EQUIPMENT CONSUMPTION RATES =====
  const ratePairs = [
    { cat: catAir, prod: allProducts.find(p => p.sku === "AIR-MANGO-300")!, rate: 1.5 },
    { cat: catSoap, prod: allProducts.find(p => p.sku === "SOAP-1L-CLR")!, rate: 1.0 },
    { cat: catSanitizer, prod: allProducts.find(p => p.sku === "SAN-1L-GEL")!, rate: 0.8 },
    { cat: catPaper, prod: allProducts.find(p => p.sku === "PAP-TOWEL-6")!, rate: 1.2 },
    { cat: catToilet, prod: allProducts.find(p => p.sku === "AIR-LAV-300")!, rate: 1.0 },
  ]
  for (const rp of ratePairs) {
    if (rp.prod) {
      await db.equipmentConsumptionRate.create({ data: { categoryId: rp.cat.id, productId: rp.prod.id, averageConsumptionPerMonth: rp.rate } })
    }
  }

  // ===== TECHNICIAN STOCK =====
  for (const t of technicians) {
    for (const p of allProducts.slice(0, 6)) {
      await db.technicianStock.create({ data: { productId: p.id, technicianId: t.id, quantity: 5 + Math.floor(Math.random() * 10) } })
    }
  }

  // ===== SYSTEM SETTINGS =====
  await db.systemSetting.create({ data: { key: "BATTERY_WARNING_LEVEL", value: "FIFTY" } })
  await db.systemSetting.create({ data: { key: "BATTERY_CRITICAL_LEVEL", value: "TWENTY_FIVE" } })
  await db.systemSetting.create({ data: { key: "BATTERY_REPLACEMENT_LEVEL", value: "EMPTY" } })
  await db.systemSetting.create({ data: { key: "CONTRACT_EXPIRY_WARNING_DAYS", value: "30" } })

  console.log("✅ Seeding complete!")
  console.log(`   Users: ${await db.user.count()}`)
  console.log(`   Customers: ${await db.customer.count()}`)
  console.log(`   Contracts: ${await db.contract.count()}`)
  console.log(`   Equipment: ${await db.equipment.count()}`)
  console.log(`   Visits: ${await db.visit.count()}`)
  console.log(`   Inspections: ${await db.inspection.count()}`)
  console.log(`   Products: ${await db.product.count()}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
