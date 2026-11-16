import { db } from "../src/lib/db"
import { hashPassword } from "../src/lib/password"

async function main() {
  console.log("🌱 Seeding Hygiene Management System...")

  // Clean all tables (order matters for foreign key constraints)
  await db.systemSetting.deleteMany()
  await db.auditLog.deleteMany()
  await db.announcement.deleteMany()
  await db.message.deleteMany()
  await db.notification.deleteMany()
  await db.alert.deleteMany()
  await db.defect.deleteMany()
  await db.capaEvidence.deleteMany()
  await db.cAPA.deleteMany()
  await db.inspectionPhoto.deleteMany()
  await db.inspectionItem.deleteMany()
  await db.inspectionHistory.deleteMany()
  await db.inspection.deleteMany()
  await db.templateItem.deleteMany()
  await db.inspectionTemplate.deleteMany()
  await db.hygieneCategory.deleteMany()
  await db.location.deleteMany()
  await db.user.deleteMany()

  const pw = (s: string) => hashPassword(s)

  // ===== USERS (4 roles) =====
  const admin = await db.user.create({
    data: { email: "admin@hygiene.co", name: "System Administrator", password: pw("admin123"), role: "ADMIN", phone: "+258 21 300 0001", active: true },
  })
  const ceo = await db.user.create({
    data: { email: "sergio.zucca@nemchem.co", name: "Sérgio Zucca", password: pw("ceo123"), role: "CEO", phone: "+258 84 100 0000", active: true },
  })
  const supervisor1 = await db.user.create({
    data: { email: "supervisor@hygiene.co", name: "Carlos Mondlane", password: pw("super123"), role: "SUPERVISOR", phone: "+258 84 222 3333", active: true },
  })
  const supervisor2 = await db.user.create({
    data: { email: "ana@hygiene.co", name: "Ana Cossa", password: pw("super123"), role: "SUPERVISOR", phone: "+258 84 444 5555", active: true },
  })
  const inspector1 = await db.user.create({
    data: { email: "joao@hygiene.co", name: "João Macamo", password: pw("insp123"), role: "INSPECTOR", phone: "+258 84 111 2222", active: true },
  })
  const inspector2 = await db.user.create({
    data: { email: "paulo@hygiene.co", name: "Paulo Tembe", password: pw("insp123"), role: "INSPECTOR", phone: "+258 84 333 4444", active: true },
  })
  const inspector3 = await db.user.create({
    data: { email: "lucia@hygiene.co", name: "Lúcia Sumbana", password: pw("insp123"), role: "INSPECTOR", phone: "+258 84 555 6666", active: true },
  })
  const inspectors = [inspector1, inspector2, inspector3]

  // ===== LOCATIONS =====
  const locations = await Promise.all([
    db.location.create({ data: { name: "Hotel Polana", code: "LOC-001", address: "Av. Julius Nyerere 1380", city: "Maputo", gpsLat: -25.9655, gpsLng: 32.5832, facilityType: "HOTEL", supervisorId: supervisor1.id, status: "ACTIVE" } }),
    db.location.create({ data: { name: "Restaurant Costa do Sol", code: "LOC-002", address: "Marginal, Costa do Sol", city: "Maputo", gpsLat: -25.9592, gpsLng: 32.6032, facilityType: "RESTAURANT", supervisorId: supervisor1.id, status: "ACTIVE" } }),
    db.location.create({ data: { name: "Maputo Central Hospital", code: "LOC-003", address: "Av. Eduardo Mondlane", city: "Maputo", gpsLat: -25.9685, gpsLng: 32.5765, facilityType: "HOSPITAL", supervisorId: supervisor2.id, status: "ACTIVE" } }),
    db.location.create({ data: { name: "Matola Business Park", code: "LOC-004", address: "EN2, Matola", city: "Matola", gpsLat: -25.9336, gpsLng: 32.4583, facilityType: "OFFICE", supervisorId: supervisor2.id, status: "ACTIVE" } }),
    db.location.create({ data: { name: "Maputo Shopping Centre", code: "LOC-005", address: "Av. 24 de Julho", city: "Maputo", gpsLat: -25.9715, gpsLng: 32.5732, facilityType: "OTHER", supervisorId: supervisor1.id, status: "ACTIVE" } }),
    db.location.create({ data: { name: "Radisson Blu Hotel", code: "LOC-006", address: "Av. Marginal 6465", city: "Maputo", gpsLat: -25.9753, gpsLng: 32.6055, facilityType: "HOTEL", supervisorId: supervisor2.id, status: "ACTIVE" } }),
  ])

  // ===== HYGIENE CATEGORIES =====
  const categoryData = [
    { name: "Personal Hygiene", description: "Staff personal cleanliness and grooming" },
    { name: "Handwashing Facilities", description: "Handwash stations, soap, sanitizers" },
    { name: "Cleaning and Sanitation", description: "General cleanliness of premises" },
    { name: "Food Handling Hygiene", description: "Food preparation and handling practices" },
    { name: "Kitchen Hygiene", description: "Kitchen equipment and surface cleanliness" },
    { name: "Equipment Cleanliness", description: "Equipment maintenance and hygiene" },
    { name: "Waste Management", description: "Waste disposal and bin management" },
    { name: "Pest Control", description: "Pest prevention and control measures" },
    { name: "Washrooms and Sanitary", description: "Restroom cleanliness and supplies" },
    { name: "Water Quality", description: "Water quality and availability" },
    { name: "Storage and Handling", description: "Storage conditions and practices" },
    { name: "General Environmental", description: "Overall environmental hygiene" },
  ]
  const categories = []
  for (let i = 0; i < categoryData.length; i++) {
    categories.push(await db.hygieneCategory.create({ data: { ...categoryData[i], sortOrder: i } }))
  }

  // ===== INSPECTION TEMPLATES =====
  const template1 = await db.inspectionTemplate.create({
    data: { name: "Standard Hygiene Inspection", description: "Comprehensive hygiene inspection covering all categories", isActive: true },
  })
  const template2 = await db.inspectionTemplate.create({
    data: { name: "Kitchen Hygiene Check", description: "Focused kitchen and food handling inspection", isActive: true },
  })
  const template3 = await db.inspectionTemplate.create({
    data: { name: "Quick Washroom Inspection", description: "Fast washroom and sanitary facility check", isActive: true },
  })

  // Template items for Standard Hygiene Inspection
  const standardItems = [
    { cat: 0, q: "Staff wearing clean uniforms and maintaining personal hygiene?" },
    { cat: 1, q: "Handwashing stations stocked with soap and clean towels?" },
    { cat: 2, q: "All surfaces visibly clean and sanitized?" },
    { cat: 3, q: "Food handlers following proper hygiene protocols?" },
    { cat: 4, q: "Kitchen equipment cleaned and sanitized after use?" },
    { cat: 5, q: "Equipment properly maintained and free from contamination?" },
    { cat: 6, q: "Waste bins covered and emptied regularly?" },
    { cat: 7, q: "No signs of pest activity detected?" },
    { cat: 8, q: "Washrooms clean, stocked, and functional?" },
    { cat: 9, q: "Water quality tested and within acceptable standards?" },
    { cat: 10, q: "Storage areas organized and temperature-controlled?" },
    { cat: 11, q: "General environment free from hazards and debris?" },
  ]
  for (let i = 0; i < standardItems.length; i++) {
    const item = standardItems[i]
    await db.templateItem.create({
      data: {
        templateId: template1.id,
        categoryId: categories[item.cat].id,
        question: item.q,
        scoringMethod: "COMPLIANCE",
        weight: 1.0,
        mandatory: true,
        photoRequired: i % 3 === 0,
        sortOrder: i,
      },
    })
  }

  // Kitchen template items
  const kitchenItems = [
    { cat: 3, q: "Food stored at correct temperatures?" },
    { cat: 4, q: "Food preparation surfaces sanitized between uses?" },
    { cat: 4, q: "Kitchen equipment (ovens, grills, fryers) cleaned daily?" },
    { cat: 5, q: "Refrigeration units clean and at correct temperature?" },
    { cat: 6, q: "Food waste disposed of correctly and promptly?" },
    { cat: 7, q: "Kitchen sealed against pests?" },
  ]
  for (let i = 0; i < kitchenItems.length; i++) {
    await db.templateItem.create({
      data: {
        templateId: template2.id,
        categoryId: categories[kitchenItems[i].cat].id,
        question: kitchenItems[i].q,
        scoringMethod: "COMPLIANCE",
        weight: 1.0,
        mandatory: true,
        photoRequired: true,
        sortOrder: i,
      },
    })
  }

  // Washroom template items
  const washroomItems = [
    { cat: 8, q: "Toilets clean and functional?" },
    { cat: 8, q: "Hand dryers or towels available?" },
    { cat: 1, q: "Soap dispensers filled?" },
    { cat: 8, q: "Floors clean and dry?" },
    { cat: 6, q: "Sanitary bins provided and emptied?" },
  ]
  for (let i = 0; i < washroomItems.length; i++) {
    await db.templateItem.create({
      data: {
        templateId: template3.id,
        categoryId: categories[washroomItems[i].cat].id,
        question: washroomItems[i].q,
        scoringMethod: "COMPLIANCE",
        weight: 1.0,
        mandatory: true,
        photoRequired: false,
        sortOrder: i,
      },
    })
  }

  // ===== INSPECTIONS =====
  const now = new Date()
  const statuses = ["PENDING", "ASSIGNED", "ACCEPTED", "DECLINED", "IN_PROGRESS", "DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED", "APPROVED", "CLOSED"]
  const responses = ["COMPLIANT", "PARTIALLY_COMPLIANT", "NON_COMPLIANT", "NOT_APPLICABLE"]
  const severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

  // Get template items for creating inspection items
  const t1Items = await db.templateItem.findMany({ where: { templateId: template1.id } })

  let inspectionCount = 0
  for (let i = 0; i < 25; i++) {
    const loc = locations[i % locations.length]
    const insp = inspectors[i % inspectors.length]
    const tmpl = i % 3 === 0 ? template2 : i % 5 === 0 ? template3 : template1
    const status = statuses[i % statuses.length]
    const scheduledDate = new Date(now.getTime() - (i - 12) * 86400000)
    const completedDate = ["APPROVED", "CLOSED", "RETURNED", "SUBMITTED", "UNDER_REVIEW"].includes(status) ? new Date(scheduledDate.getTime() + 2 * 3600000) : null

    // Calculate score for completed inspections
    let overallScore: number | null = null
    let compliance: number | null = null
    if (completedDate) {
      const score = 60 + Math.floor(Math.random() * 40) // 60-100
      overallScore = score
      compliance = score
    }

    const inspection = await db.inspection.create({
      data: {
        templateId: tmpl.id,
        locationId: loc.id,
        inspectorId: ["ASSIGNED", "ACCEPTED", "DECLINED", "IN_PROGRESS", "DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED", "APPROVED", "CLOSED"].includes(status) ? insp.id : null,
        createdById: i % 2 === 0 ? supervisor1.id : supervisor2.id,
        title: `Hygiene Inspection — ${loc.name}`,
        scheduledDate,
        completedDate,
        status,
        declineReason: status === "DECLINED" ? "Schedule conflict with another assignment" : null,
        reviewComments: status === "RETURNED" ? "Photos missing for kitchen area. Please retake and resubmit." : status === "APPROVED" ? "Inspection completed satisfactorily. Good hygiene standards maintained." : null,
        correctionNotes: status === "RETURNED" ? "Need clearer photos of food storage area." : null,
        overallScore,
        compliancePercent: compliance,
      },
    })
    inspectionCount++

    // Add inspection items (for inspections that have been started)
    if (["IN_PROGRESS", "DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED", "APPROVED", "CLOSED"].includes(status)) {
      const tmplItems = tmpl.id === template1.id ? t1Items : await db.templateItem.findMany({ where: { templateId: tmpl.id } })
      for (const ti of tmplItems) {
        const resp = responses[Math.floor(Math.random() * responses.length)]
        const isNonCompliant = resp === "NON_COMPLIANT"
        await db.inspectionItem.create({
          data: {
            inspectionId: inspection.id,
            templateItemId: ti.id,
            response: resp,
            score: resp === "COMPLIANT" ? 100 : resp === "PARTIALLY_COMPLIANT" ? 50 : resp === "NON_COMPLIANT" ? 0 : null,
            comments: isNonCompliant ? "Issue identified during inspection" : "",
            correctiveRecommendation: isNonCompliant ? "Immediate corrective action required" : null,
            severity: isNonCompliant ? severities[Math.floor(Math.random() * 2)] : null, // CRITICAL or HIGH for non-compliant
          },
        })
      }
    }

    // Add history
    const historyStatuses = ["PENDING"]
    if (status !== "PENDING") historyStatuses.push("ASSIGNED")
    if (["ACCEPTED", "DECLINED", "IN_PROGRESS", "DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED", "APPROVED", "CLOSED"].includes(status)) historyStatuses.push("ACCEPTED")
    if (["IN_PROGRESS", "DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED", "APPROVED", "CLOSED"].includes(status)) historyStatuses.push("IN_PROGRESS")
    if (["SUBMITTED", "UNDER_REVIEW", "RETURNED", "APPROVED", "CLOSED"].includes(status)) historyStatuses.push("SUBMITTED")
    if (["UNDER_REVIEW", "RETURNED", "APPROVED", "CLOSED"].includes(status)) historyStatuses.push("UNDER_REVIEW")
    if (["RETURNED", "APPROVED", "CLOSED"].includes(status)) historyStatuses.push(status === "RETURNED" ? "RETURNED" : "APPROVED")
    if (status === "CLOSED") historyStatuses.push("CLOSED")

    for (let h = 0; h < historyStatuses.length; h++) {
      await db.inspectionHistory.create({
        data: {
          inspectionId: inspection.id,
          fromStatus: h > 0 ? historyStatuses[h - 1] : null,
          toStatus: historyStatuses[h],
          userId: h === 0 ? supervisor1.id : h === 1 ? supervisor1.id : insp.id,
          comments: historyStatuses[h] === "RETURNED" ? "Needs corrections" : historyStatuses[h] === "APPROVED" ? "Approved after review" : "",
          timestamp: new Date(scheduledDate.getTime() + h * 3600000),
        },
      })
    }
  }

  // ===== CAPAs =====
  const capaStatuses = ["OPEN", "ASSIGNED", "IN_PROGRESS", "SUBMITTED_FOR_VERIFICATION", "CLOSED", "CANCELLED", "OVERDUE"]
  for (let i = 0; i < 10; i++) {
    const loc = locations[i % locations.length]
    const insp = inspectors[i % inspectors.length]
    const cat = categories[i % categories.length]
    const status = capaStatuses[i % capaStatuses.length]
    const targetDate = new Date(now.getTime() + (i - 5) * 86400000)

    await db.cAPA.create({
      data: {
        locationId: loc.id,
        categoryId: cat.id,
        title: `${cat.name} — Corrective Action #${i + 1}`,
        description: `Non-compliance identified in ${cat.name} at ${loc.name}. Immediate corrective action required.`,
        severity: severities[i % 4],
        correctiveAction: `Implement improved ${cat.name.toLowerCase()} protocols and retrain staff.`,
        assignedToId: insp.id,
        targetDate,
        status,
        verificationComments: status === "CLOSED" ? "Corrective action verified and completed." : null,
        closedById: status === "CLOSED" ? supervisor1.id : null,
        closureDate: status === "CLOSED" ? new Date(now.getTime() - 86400000) : null,
      },
    })
  }

  // ===== DEFECTS =====
  for (let i = 0; i < 8; i++) {
    const loc = locations[i % locations.length]
    const cat = categories[i % categories.length]
    await db.defect.create({
      data: {
        locationId: loc.id,
        categoryId: cat.id,
        title: `${cat.name} violation at ${loc.name}`,
        description: `Identified ${cat.name.toLowerCase()} non-compliance requiring attention.`,
        severity: severities[i % 4],
        responsiblePerson: inspectors[i % inspectors.length].name,
        resolutionDeadline: new Date(now.getTime() + (i - 3) * 86400000),
        status: i % 4 === 0 ? "OPEN" : i % 4 === 1 ? "IN_PROGRESS" : i % 4 === 2 ? "RESOLVED" : "ESCALATED",
        resolvedAt: i % 4 === 2 ? new Date(now.getTime() - 86400000) : null,
        resolutionNotes: i % 4 === 2 ? "Issue resolved through corrective action." : null,
      },
    })
  }

  // ===== ALERTS =====
  const alertTypes = [
    { type: "CRITICAL_VIOLATION", title: "Critical hygiene violation detected", message: "Non-compliant handwashing facility at Hotel Polana" },
    { type: "LOW_SCORE", title: "Low inspection score", message: "Kitchen hygiene inspection scored 62% at Restaurant Costa do Sol" },
    { type: "OVERDUE_CAPA", title: "Overdue corrective action", message: "CAPA #3 is past its target completion date" },
    { type: "REPEATED_NON_COMPLIANCE", title: "Repeated non-compliance", message: "Washroom hygiene issues recurring at Maputo Central Hospital" },
    { type: "MISSED_INSPECTION", title: "Missed scheduled inspection", message: "Inspection at Matola Business Park was not conducted" },
  ]
  for (let i = 0; i < alertTypes.length; i++) {
    const a = alertTypes[i]
    await db.alert.create({
      data: {
        type: a.type,
        severity: i % 2 === 0 ? "CRITICAL" : "HIGH",
        locationId: locations[i % locations.length].id,
        title: a.title,
        message: a.message,
        status: i < 3 ? "OPEN" : "RESOLVED",
        resolvedById: i >= 3 ? supervisor1.id : null,
        resolvedAt: i >= 3 ? new Date(now.getTime() - 86400000) : null,
      },
    })
  }

  // ===== NOTIFICATIONS =====
  for (const insp of inspectors) {
    await db.notification.create({ data: { userId: insp.id, type: "INSPECTION_ASSIGNED", title: "New inspection assigned", message: "You have been assigned a new hygiene inspection.", read: false } })
    await db.notification.create({ data: { userId: insp.id, type: "INSPECTION_RETURNED", title: "Inspection returned for corrections", message: "Your inspection was returned. Please review and resubmit.", read: false } })
    await db.notification.create({ data: { userId: insp.id, type: "CAPA_ASSIGNED", title: "CAPA assigned to you", message: "A corrective action has been assigned to you.", read: true } })
  }
  await db.notification.create({ data: { userId: supervisor1.id, type: "INSPECTION_SUBMITTED", title: "Inspection submitted for review", message: "An inspection is awaiting your review.", read: false } })
  await db.notification.create({ data: { userId: ceo.id, type: "ALERT", title: "Critical hygiene alert", message: "A critical hygiene violation has been flagged.", read: false } })

  // ===== ANNOUNCEMENTS =====
  await db.announcement.create({ data: { createdById: ceo.id, title: "Q4 Hygiene Compliance Drive", body: "All locations must achieve 90%+ hygiene compliance by end of quarter. Supervisors to ensure all inspections are completed on schedule.", audience: "ALL" } })
  await db.announcement.create({ data: { createdById: admin.id, title: "New Inspection Template Available", body: "A new Kitchen Hygiene Check template has been added. Please use it for all kitchen inspections going forward.", audience: "SUPERVISOR" } })

  // ===== SYSTEM SETTINGS =====
  await db.systemSetting.create({ data: { key: "COMPLIANCE_THRESHOLD", value: "85" } })
  await db.systemSetting.create({ data: { key: "CRITICAL_VIOLATION_THRESHOLD", value: "60" } })
  await db.systemSetting.create({ data: { key: "CAPA_OVERDUE_DAYS", value: "7" } })
  await db.systemSetting.create({ data: { key: "SELF_APPROVAL_PREVENTED", value: "true" } })

  console.log("✅ Seeding complete!")
  console.log(`   Users: ${await db.user.count()}`)
  console.log(`   Locations: ${await db.location.count()}`)
  console.log(`   Categories: ${await db.hygieneCategory.count()}`)
  console.log(`   Templates: ${await db.inspectionTemplate.count()}`)
  console.log(`   Inspections: ${await db.inspection.count()}`)
  console.log(`   CAPAs: ${await db.cAPA.count()}`)
  console.log(`   Defects: ${await db.defect.count()}`)
  console.log(`   Alerts: ${await db.alert.count()}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
