import { db } from "../src/lib/db"
import { hashPassword } from "../src/lib/password"

/**
 * Demo dataset for the Hygiene Management System (NemChem).
 *
 * Deterministic: uses a seeded PRNG so every build (local or Netlify)
 * produces the exact same demonstrative data.
 *
 * - 12 weeks of inspection history (score trend rises over time, so the
 *   dashboard compliance chart shows a realistic improvement curve)
 * - 10 upcoming scheduled inspections (agenda)
 * - CAPA / Defects / Alerts in every status, written in Portuguese (MZ)
 * - Messages, notifications, announcements, audit logs and system settings
 */

// Deterministic PRNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20261119)
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]
const jitter = (max: number) => Math.floor(rnd() * (2 * max + 1)) - max
const DAY = 86400000
const HOUR = 3600000

async function main() {
  console.log("🌱 Seeding Hygiene Management System (demo dataset)...")

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
  const now = new Date()

  // ===== USERS (4 roles — demo credentials) =====
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
  const supervisors = [supervisor1, supervisor2]
  const inspectors = [inspector1, inspector2, inspector3]

  // ===== LOCATIONS =====
  const locations = await Promise.all([
    db.location.create({ data: { name: "Hotel Polana", code: "LOC-001", address: "Av. Julius Nyerere 1380", city: "Maputo", gpsLat: -25.9655, gpsLng: 32.5832, facilityType: "HOTEL", supervisorId: supervisor1.id, status: "ACTIVE" } }),
    db.location.create({ data: { name: "Restaurant Costa do Sol", code: "LOC-002", address: "Marginal, Costa do Sol", city: "Maputo", gpsLat: -25.9592, gpsLng: 32.6032, facilityType: "RESTAURANT", supervisorId: supervisor1.id, status: "ACTIVE" } }),
    db.location.create({ data: { name: "Maputo Central Hospital", code: "LOC-003", address: "Av. Eduardo Mondlane", city: "Maputo", gpsLat: -25.9685, gpsLng: 32.5765, facilityType: "HOSPITAL", supervisorId: supervisor2.id, status: "ACTIVE" } }),
    db.location.create({ data: { name: "Matola Business Park", code: "LOC-004", address: "EN2, Matola", city: "Matola", gpsLat: -25.9336, gpsLng: 32.4583, facilityType: "OFFICE", supervisorId: supervisor2.id, status: "ACTIVE" } }),
    db.location.create({ data: { name: "Maputo Shopping Centre", code: "LOC-005", address: "Av. 24 de Julho", city: "Maputo", gpsLat: -25.9715, gpsLng: 32.5732, facilityType: "OTHER", supervisorId: supervisor1.id, status: "ACTIVE" } }),
    db.location.create({ data: { name: "Radisson Blu Hotel", code: "LOC-006", address: "Av. Marginal 6465", city: "Maputo", gpsLat: -25.9753, gpsLng: 32.6055, facilityType: "HOTEL", supervisorId: supervisor2.id, status: "ACTIVE" } }),

    // ===== NEMCHEM CLIENT PORTFOLIO (real registered clients — names as
    // supplied by the company; no addresses/GPS fabricated: left empty) =====
    db.location.create({ data: { name: "Bayport", code: "LOC-007", city: "Maputo", facilityType: "OFFICE", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Biofund", code: "LOC-008", city: "Maputo", facilityType: "OFFICE", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Broll S & C", code: "LOC-009", city: "Maputo", facilityType: "OFFICE", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Casino", code: "LOC-010", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Civitas", code: "LOC-011", city: "Maputo", facilityType: "OFFICE", status: "ACTIVE" } }),
    db.location.create({ data: { name: "C. Belga", code: "LOC-012", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "C. Belga Berreau", code: "LOC-013", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Comité Olímpico", code: "LOC-014", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Commotor GMS", code: "LOC-015", city: "Maputo", facilityType: "OFFICE", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Condomínio JN130", code: "LOC-016", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "EGPAF", code: "LOC-017", city: "Maputo", facilityType: "OFFICE", status: "ACTIVE" } }),
    db.location.create({ data: { name: "ExxonMobil", code: "LOC-018", city: "Maputo", facilityType: "OFFICE", status: "ACTIVE" } }),
    db.location.create({ data: { name: "FCDO", code: "LOC-019", city: "Maputo", facilityType: "OFFICE", status: "ACTIVE" } }),
    db.location.create({ data: { name: "GAPI", code: "LOC-020", city: "Maputo", facilityType: "OFFICE", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Gestão de Terminais K4", code: "LOC-021", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "GDA", code: "LOC-022", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Hollard Seguros", code: "LOC-023", city: "Maputo", facilityType: "OFFICE", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Karigani", code: "LOC-024", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Multi Choice", code: "LOC-025", city: "Maputo", facilityType: "OFFICE", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Pronova", code: "LOC-026", city: "Maputo", facilityType: "OFFICE", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Radisson", code: "LOC-027", city: "Maputo", facilityType: "HOTEL", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Shopping 24", code: "LOC-028", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Siemens", code: "LOC-029", city: "Maputo", facilityType: "OFFICE", status: "ACTIVE" } }),
    db.location.create({ data: { name: "SIP", code: "LOC-030", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Tec. Indus. Museu", code: "LOC-031", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Techvision Alto Maé", code: "LOC-032", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Techvision Import", code: "LOC-033", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Techvision Group", code: "LOC-034", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Torre Azul", code: "LOC-035", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Torre Indico", code: "LOC-036", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Torres Rani", code: "LOC-037", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Torres VBC-INSS", code: "LOC-038", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Xiluva", code: "LOC-039", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Zimpeto Square", code: "LOC-040", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Broll Acacia Estate", code: "LOC-041", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Jogabet", code: "LOC-042", city: "Maputo", facilityType: "OTHER", status: "ACTIVE" } }),
    db.location.create({ data: { name: "Multi Choice Maputo", code: "LOC-043", city: "Maputo", facilityType: "OFFICE", status: "ACTIVE" } }),
  ])

  // ===== HYGIENE CATEGORIES =====
  const categoryData = [
    { name: "Higiene Pessoal", description: "Asseio e apresentação dos colaboradores" },
    { name: "Estações de Lavagem das Mãos", description: "Postos de lavagem, sabão e desinfectante" },
    { name: "Limpeza e Desinfecção", description: "Limpeza geral das instalações" },
    { name: "Manipulação de Alimentos", description: "Práticas de preparação e manipulação de alimentos" },
    { name: "Higiene da Cozinha", description: "Equipamentos e superfícies da cozinha" },
    { name: "Limpeza de Equipamentos", description: "Manutenção e higiene dos equipamentos" },
    { name: "Gestão de Resíduos", description: "Recolha e destinação de resíduos" },
    { name: "Controlo de Pragas", description: "Prevenção e controlo de pragas" },
    { name: "Instalações Sanitárias", description: "Limpeza e abastecimento das casas de banho" },
    { name: "Qualidade da Água", description: "Qualidade e disponibilidade de água" },
    { name: "Armazenamento", description: "Condições e práticas de armazenamento" },
    { name: "Ambiente Geral", description: "Condições gerais do ambiente de trabalho" },
  ]
  const categories = []
  for (let i = 0; i < categoryData.length; i++) {
    categories.push(await db.hygieneCategory.create({ data: { ...categoryData[i], sortOrder: i } }))
  }

  // ===== INSPECTION TEMPLATES =====
  const template1 = await db.inspectionTemplate.create({
    data: { name: "Inspecção de Higiene Padrão", description: "Inspecção de higiene abrangendo todas as categorias", isActive: true },
  })
  const template2 = await db.inspectionTemplate.create({
    data: { name: "Verificação de Higiene da Cozinha", description: "Inspecção focada na cozinha e manipulação de alimentos", isActive: true },
  })
  const template3 = await db.inspectionTemplate.create({
    data: { name: "Verificação Rápida Sanitária", description: "Verificação rápida das instalações sanitárias", isActive: true },
  })

  const standardItems = [
    { cat: 0, q: "Os colaboradores usam uniformes limpos e mantêm asseio pessoal?" },
    { cat: 1, q: "Os postos de lavagem têm sabão e toalhas limpas?" },
    { cat: 2, q: "Todas as superfícies visivelmente limpas e desinfectadas?" },
    { cat: 3, q: "Os manipuladores de alimentos seguem os protocolos de higiene?" },
    { cat: 4, q: "Os equipamentos da cozinha limpos e desinfectados após uso?" },
    { cat: 5, q: "Os equipamentos estão bem mantidos e livres de contaminação?" },
    { cat: 6, q: "Os contentores de resíduos estão tapados e esvaziados regularmente?" },
    { cat: 7, q: "Sem sinais de actividade de pragas?" },
    { cat: 8, q: "As casas de banho limpas, abastecidas e funcionais?" },
    { cat: 9, q: "A qualidade da água testada e dentro dos padrões aceitáveis?" },
    { cat: 10, q: "As áreas de armazenamento organizadas e com temperatura controlada?" },
    { cat: 11, q: "O ambiente geral livre de riscos e detritos?" },
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

  const kitchenItems = [
    { cat: 3, q: "Os alimentos armazenados às temperaturas correctas?" },
    { cat: 4, q: "As superfícies de preparação desinfectadas entre usos?" },
    { cat: 4, q: "Os equipamentos (fogões, grelhas, fritadeiras) limpos diariamente?" },
    { cat: 5, q: "As unidades de refrigeração limpas e à temperatura correcta?" },
    { cat: 6, q: "Os resíduos alimentares eliminados correcta e prontamente?" },
    { cat: 7, q: "A cozinha está selada contra pragas?" },
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

  const washroomItems = [
    { cat: 8, q: "As retretes limpas e funcionais?" },
    { cat: 8, q: "Secadores de mãos ou toalhas disponíveis?" },
    { cat: 1, q: "Os dispensadores de sabão cheios?" },
    { cat: 8, q: "Os chãos limpos e secos?" },
    { cat: 6, q: "Contentores sanitários disponíveis e esvaziados?" },
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

  const t1Items = await db.templateItem.findMany({ where: { templateId: template1.id } })

  // ===== INSPECTIONS — 12 weeks of history + upcoming agenda =====
  // Locations with most activity (named flagship + top portfolio clients)
  const activeLocations = locations.slice(0, 24)
  // Quality tier per location (-6 .. +8) — some clients are stricter than others
  const tierOf = (idx: number) => ((idx * 7) % 15) - 6

  const approvedComments = [
    "Inspecção concluída satisfatoriamente. Bom nível de higiene mantido.",
    "Boas práticas observadas. Continuar com o nível actual.",
    "Padrões de higiene dentro do esperado. Aprovado.",
  ]
  const returnedComments = [
    "Fotografias em falta na área da cozinha. Refazer e reenviar.",
    "Faltam evidências fotográficas do armazenamento. Corrigir e reenviar.",
    "Item obrigatório sem resposta. Completar e reenviar para revisão.",
  ]

  const closedInspections: { id: string; locationId: string; score: number; week: number }[] = []

  for (let week = 25; week >= 1; week--) {
    const perWeek = 6
    for (let k = 0; k < perWeek; k++) {
      const idx = (week * 6 + k) % activeLocations.length
      const loc = activeLocations[idx]
      const insp = inspectors[(week + k) % inspectors.length]
      const sup = supervisors[(week + k) % supervisors.length]
      const tmpl = k % 3 === 0 ? template2 : k % 5 === 0 ? template3 : template1
      const scheduledDate = new Date(now.getTime() - week * 7 * DAY - k * DAY + jitter(6) * HOUR)
      const daysBack = Math.round((now.getTime() - scheduledDate.getTime()) / DAY)

      // Status: older inspections fully closed; recent ones mid-workflow
      let status: string
      if (daysBack > 21) status = k % 4 === 3 ? "APPROVED" : "CLOSED"
      else if (daysBack > 10) status = k % 5 === 0 ? "UNDER_REVIEW" : k % 5 === 1 ? "SUBMITTED" : k % 5 === 2 ? "APPROVED" : "CLOSED"
      else status = ["SUBMITTED", "UNDER_REVIEW", "RETURNED", "IN_PROGRESS", "ACCEPTED", "DECLINED", "DRAFT"][k % 7]

      const completed = ["SUBMITTED", "UNDER_REVIEW", "RETURNED", "APPROVED", "CLOSED"].includes(status)
      // Score trend: rises towards the present (week 1 is the most recent past week)
      const base = 62 + (25 - week) * 1.1
      const score = Math.max(52, Math.min(99, Math.round(base + tierOf(idx) + jitter(4))))
      const declined = status === "DECLINED"

      const inspection = await db.inspection.create({
        data: {
          templateId: tmpl.id,
          locationId: loc.id,
          inspectorId: declined || status === "PENDING" ? null : insp.id,
          createdById: sup.id,
          title: `Inspecção de Higiene — ${loc.name}`,
          scheduledDate,
          completedDate: completed ? new Date(scheduledDate.getTime() + 2 * HOUR + jitter(3) * HOUR) : null,
          status,
          declineReason: declined ? "Conflito de agenda com outra atribuição; reagendar para a semana seguinte." : null,
          reviewComments: status === "RETURNED" ? pick(returnedComments) : ["APPROVED", "CLOSED"].includes(status) ? pick(approvedComments) : null,
          correctionNotes: status === "RETURNED" ? "Necessárias fotografias mais claras da área de armazenamento." : null,
          overallScore: completed ? score : null,
          compliancePercent: completed ? score : null,
        },
      })

      // Inspection items for started inspections, derived from the score
      if (["IN_PROGRESS", "DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED", "APPROVED", "CLOSED"].includes(status)) {
        const tmplItems = tmpl.id === template1.id ? t1Items : await db.templateItem.findMany({ where: { templateId: tmpl.id } })
        const p = score / 100
        for (const ti of tmplItems) {
          const r = rnd()
          const resp = r < p ? "COMPLIANT" : r < p + 0.12 ? "PARTIALLY_COMPLIANT" : "NON_COMPLIANT"
          const isNon = resp === "NON_COMPLIANT"
          await db.inspectionItem.create({
            data: {
              inspectionId: inspection.id,
              templateItemId: ti.id,
              response: resp,
              score: resp === "COMPLIANT" ? 100 : resp === "PARTIALLY_COMPLIANT" ? 50 : resp === "NON_COMPLIANT" ? 0 : null,
              comments: isNon ? "Não-conformidade identificada durante a inspecção." : "",
              correctiveRecommendation: isNon ? "Acção correctiva imediata necessária." : null,
              severity: isNon ? (score < 70 ? "CRITICAL" : "HIGH") : null,
            },
          })
        }
      }

      // Workflow history
      const historyStatuses = ["PENDING"]
      if (status !== "PENDING") historyStatuses.push("ASSIGNED")
      if (["ACCEPTED", "DECLINED", "IN_PROGRESS", "DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED", "APPROVED", "CLOSED"].includes(status)) historyStatuses.push(declined ? "DECLINED" : "ACCEPTED")
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
            userId: h <= 1 ? sup.id : insp.id,
            comments: historyStatuses[h] === "RETURNED" ? "Necessita correcções" : historyStatuses[h] === "APPROVED" ? "Aprovado após revisão" : "",
            timestamp: new Date(scheduledDate.getTime() + h * 5 * HOUR),
          },
        })
      }

      if (["APPROVED", "CLOSED"].includes(status)) {
        closedInspections.push({ id: inspection.id, locationId: loc.id, score, week })
      }
    }
  }

  // Upcoming agenda (next 10 days)
  for (let d = 1; d <= 10; d++) {
    const loc = activeLocations[(d * 5 + 3) % activeLocations.length]
    const insp = inspectors[d % inspectors.length]
    const sup = supervisors[d % supervisors.length]
    const tmpl = d % 3 === 0 ? template2 : d % 4 === 0 ? template3 : template1
    const scheduledDate = new Date(now.getTime() + d * DAY + 8 * HOUR)
    const status = d % 2 === 0 ? "ASSIGNED" : "PENDING"
    await db.inspection.create({
      data: {
        templateId: tmpl.id,
        locationId: loc.id,
        inspectorId: status === "ASSIGNED" ? insp.id : null,
        createdById: sup.id,
        title: `Inspecção de Higiene — ${loc.name}`,
        scheduledDate,
        status,
      },
    })
  }

  // ===== CAPAs =====
  const capaSeed = [
    { cat: 7, sev: "CRITICAL", status: "OPEN", title: "Actividade de pragas detectada na copa" },
    { cat: 1, sev: "HIGH", status: "IN_PROGRESS", title: "Postos de lavagem sem sabão" },
    { cat: 8, sev: "MEDIUM", status: "SUBMITTED_FOR_VERIFICATION", title: "Casas de banho sem abastecimento de toalhas" },
    { cat: 4, sev: "HIGH", status: "ASSIGNED", title: "Fritadeira com resíduos acumulados" },
    { cat: 6, sev: "MEDIUM", status: "OVERDUE", title: "Contentores de resíduos sem tampa" },
    { cat: 3, sev: "CRITICAL", status: "IN_PROGRESS", title: "Manipuladores sem luvas na preparação" },
    { cat: 5, sev: "LOW", status: "CLOSED", title: "Arca frigorífica com borracha de vedação danificada" },
    { cat: 2, sev: "MEDIUM", status: "CLOSED", title: "Chão da cozinha com gordura acumulada" },
    { cat: 9, sev: "HIGH", status: "OPEN", title: "Reservatório de água sem certificado de análise" },
    { cat: 10, sev: "MEDIUM", status: "ASSIGNED", title: "Armazém com produtos fora da validade" },
    { cat: 7, sev: "HIGH", status: "SUBMITTED_FOR_VERIFICATION", title: "Ratos em zona de armazenamento exterior" },
    { cat: 0, sev: "LOW", status: "CANCELLED", title: "Colaboradores sem crachá (duplicado com CAPA #2)" },
    { cat: 11, sev: "MEDIUM", status: "OVERDUE", title: "Pátio de serviço com detritos acumulados" },
    { cat: 8, sev: "HIGH", status: "CLOSED", title: "Descarga sanitária com fugas" },
  ]
  for (let i = 0; i < capaSeed.length; i++) {
    const c = capaSeed[i]
    const loc = locations[i % locations.length]
    const insp = inspectors[i % inspectors.length]
    const link = closedInspections[i % Math.max(1, closedInspections.length)]
    const targetDate = new Date(now.getTime() + (i % 5 === 0 ? -12 : i - 6) * DAY)
    await db.cAPA.create({
      data: {
        inspectionId: link?.id,
        locationId: loc.id,
        categoryId: categories[c.cat].id,
        title: `${c.title} — ${loc.name}`,
        description: `Não-conformidade identificada em ${categoryData[c.cat].name} durante a inspecção de higiene em ${loc.name}. Requer acção correctiva imediata.`,
        severity: c.sev,
        correctiveAction: `Implementar protocolo melhorado de ${categoryData[c.cat].name.toLowerCase()} e formar os colaboradores locais.`,
        assignedToId: insp.id,
        targetDate,
        status: c.status,
        verificationComments: c.status === "CLOSED" ? "Acção correctiva verificada no local e concluída com sucesso." : null,
        closedById: c.status === "CLOSED" ? supervisor1.id : null,
        closureDate: c.status === "CLOSED" ? new Date(now.getTime() - (i + 1) * DAY) : null,
      },
    })
  }

  // ===== DEFECTS =====
  const defectSeed = [
    { cat: 1, sev: "HIGH", status: "OPEN", title: "Dispensador de sabão vazio nas casas de banho" },
    { cat: 7, sev: "CRITICAL", status: "ESCALATED", title: "Excrementos de roedores detectados no armazém" },
    { cat: 4, sev: "HIGH", status: "IN_PROGRESS", title: "Grelha do forno com carbonizada acumulada" },
    { cat: 2, sev: "MEDIUM", status: "RESOLVED", title: "Vidros da entrada com manchas e pó" },
    { cat: 6, sev: "HIGH", status: "OPEN", title: "Resíduos orgânicos sem recolha há 3 dias" },
    { cat: 3, sev: "CRITICAL", status: "IN_PROGRESS", title: "Alimentos preparados sem rotulagem de data" },
    { cat: 8, sev: "MEDIUM", status: "RESOLVED", title: "Casa de banho do 2º piso sem papel higiénico" },
    { cat: 5, sev: "MEDIUM", status: "OPEN", title: "Máquina de gelo com bolor interno" },
    { cat: 9, sev: "HIGH", status: "ESCALATED", title: "Água da torneira da cozinha com odor suspeito" },
    { cat: 10, sev: "LOW", status: "RESOLVED", title: "Produtos de limpeza guardados junto a alimentos" },
    { cat: 0, sev: "MEDIUM", status: "OPEN", title: "Colaborador sem rede de contenção de cabelo" },
    { cat: 11, sev: "LOW", status: "RESOLVED", title: "Entrada com folhas e detritos acumulados" },
  ]
  for (let i = 0; i < defectSeed.length; i++) {
    const d = defectSeed[i]
    const loc = locations[(i * 3 + 1) % locations.length]
    const link = closedInspections[(i * 2) % Math.max(1, closedInspections.length)]
    await db.defect.create({
      data: {
        inspectionId: link?.id,
        locationId: loc.id,
        categoryId: categories[d.cat].id,
        title: `${d.title} — ${loc.name}`,
        description: `Não-conformidade de ${categoryData[d.cat].name.toLowerCase()} identificada em ${loc.name}. Prazo de resolução conforme gravidade.`,
        severity: d.sev,
        responsiblePerson: inspectors[i % inspectors.length].name,
        resolutionDeadline: new Date(now.getTime() + (i % 4 === 0 ? -5 : i - 2) * DAY),
        status: d.status,
        resolvedAt: d.status === "RESOLVED" ? new Date(now.getTime() - (i + 2) * DAY) : null,
        resolutionNotes: d.status === "RESOLVED" ? "Resolvido através de acção correctiva e verificação no local." : null,
      },
    })
  }

  // ===== ALERTS =====
  const alertSeed = [
    { type: "CRITICAL_VIOLATION", sev: "CRITICAL", status: "OPEN", title: "Violação crítica de higiene detectada", message: "Posto de lavagem de mãos não funcional na cozinha principal — Hotel Polana." },
    { type: "LOW_SCORE", sev: "HIGH", status: "OPEN", title: "Pontuação baixa em inspecção", message: "Inspecção de higiene da cozinha em Restaurant Costa do Sol com 58% de conformidade." },
    { type: "OVERDUE_CAPA", sev: "HIGH", status: "OPEN", title: "Acção correctiva fora do prazo", message: "CAPA de Gestão de Resíduos está 5 dias acima do prazo de conclusão." },
    { type: "REPEATED_NON_COMPLIANCE", sev: "CRITICAL", status: "OPEN", title: "Não-conformidade recorrente", message: "Problemas de higiene nas casas de banho recorrentes em Maputo Central Hospital (3ª ocorrência)." },
    { type: "MISSED_INSPECTION", sev: "MEDIUM", status: "RESOLVED", title: "Inspecção agendada não realizada", message: "Inspecção em Matola Business Park não foi realizada na data marcada; reagendada." },
    { type: "DECLINING_COMPLIANCE", sev: "HIGH", status: "RESOLVED", title: "Tendência de conformidade em declínio", message: "Conformidade em Shopping 24 caiu 12% nas últimas 3 inspecções." },
    { type: "CRITICAL_VIOLATION", sev: "HIGH", status: "RESOLVED", title: "Contaminação cruzada detectada", message: "Câmara fria com alimentos crus e cozidos no mesmo nível — corrigido no dia seguinte." },
  ]
  for (let i = 0; i < alertSeed.length; i++) {
    const a = alertSeed[i]
    await db.alert.create({
      data: {
        type: a.type,
        severity: a.sev,
        locationId: locations[i % locations.length].id,
        title: a.title,
        message: a.message,
        status: a.status,
        resolvedById: a.status === "RESOLVED" ? supervisor1.id : null,
        resolvedAt: a.status === "RESOLVED" ? new Date(now.getTime() - (i + 1) * DAY) : null,
        createdAt: new Date(now.getTime() - (i + 1) * DAY - 6 * HOUR),
      },
    })
  }

  // ===== MESSAGES =====
  const msgSeed = [
    { from: supervisor1, to: inspector1, subject: "Atribuição — Hotel Polana (cozinha)", body: "João, por favor priorize a inspecção da cozinha do Hotel Polana esta semana. O cliente reportou odores na câmara fria." },
    { from: inspector1, to: supervisor1, subject: "Re: Atribuição — Hotel Polana (cozinha)", body: "Recebido. Vou agendar para quarta-feira de manhã e trago fotografias da câmara fria." },
    { from: supervisor2, to: inspector2, subject: "Fotografias em falta — Costa do Sol", body: "Paulo, a inspecção foi devolvida por faltarem fotografias da área de armazenamento. Reenvia após completar, por favor." },
    { from: inspector2, to: supervisor2, subject: "Re: Fotografias em falta — Costa do Sol", body: "Corrigido. Fotos adicionadas e inspecção reenviada para revisão." },
    { from: ceo, to: supervisor1, subject: "Relatório mensal — Maputo", body: "Preciso do relatório de conformidade de Novembro até sexta-feira, para apresentar à direcção da NemChem." },
    { from: admin, to: supervisor2, subject: "Nova conta criada", body: "A conta da Lúcia Sumbana (inspectora) já está activa. Atribuições podem começar imediatamente." },
    { from: inspector3, to: supervisor2, subject: "Acesso ao Maputo Central Hospital", body: "A segurança exige registo prévio de visitantes. Enviarei os nomes da equipa amanhã antes da inspecção." },
  ]
  for (let i = 0; i < msgSeed.length; i++) {
    const m = msgSeed[i]
    await db.message.create({
      data: { fromUserId: m.from.id, toUserId: m.to.id, subject: m.subject, body: m.body, read: i < 3, createdAt: new Date(now.getTime() - (msgSeed.length - i) * 7 * HOUR) },
    })
  }

  // ===== NOTIFICATIONS =====
  const notifSeed = [
    { user: inspector1, type: "INSPECTION_ASSIGNED", title: "Nova inspecção atribuída", message: "Inspecção de higiene atribuída: Hotel Polana (cozinha).", read: false, days: 0 },
    { user: inspector1, type: "INSPECTION_RETURNED", title: "Inspecção devolvida para correcções", message: "A sua inspecção foi devolvida. Revise e reenvie.", read: false, days: 2 },
    { user: inspector1, type: "CAPA_ASSIGNED", title: "CAPA atribuída a você", message: "Acção correctiva atribuída: Controlo de Pragas — Hollard Seguros.", read: true, days: 4 },
    { user: inspector2, type: "INSPECTION_ASSIGNED", title: "Nova inspecção atribuída", message: "Inspecção de higiene atribuída: Radisson Blu Hotel.", read: false, days: 1 },
    { user: inspector3, type: "INSPECTION_ASSIGNED", title: "Nova inspecção atribuída", message: "Inspecção de higiene atribuída: Maputo Central Hospital.", read: false, days: 1 },
    { user: supervisor1, type: "INSPECTION_SUBMITTED", title: "Inspecção submetida para revisão", message: "Uma inspecção aguarda a sua revisão (Restaurant Costa do Sol).", read: false, days: 0 },
    { user: supervisor2, type: "TASK_ACCEPTED", title: "Tarefa aceite", message: "João Macamo aceitou a inspecção do Hotel Polana.", read: true, days: 2 },
    { user: ceo, type: "ALERT", title: "Alerta crítico de higiene", message: "Violação crítica de higiene detectada — Hotel Polana.", read: false, days: 0 },
    { user: admin, type: "ANNOUNCEMENT", title: "Anúncio publicado", message: "A sua publicação foi distribuída a todos os utilizadores.", read: true, days: 3 },
  ]
  for (const n of notifSeed) {
    await db.notification.create({
      data: { userId: n.user.id, type: n.type, title: n.title, message: n.message, read: n.read, createdAt: new Date(now.getTime() - n.days * DAY - jitter(5) * HOUR) },
    })
  }

  // ===== ANNOUNCEMENTS =====
  await db.announcement.create({ data: { createdById: ceo.id, title: "Campanha de Conformidade de Higiene", body: "Todas as localizações devem atingir 90%+ de conformidade de higiene até ao fim do trimestre. Supervisores devem garantir que todas as inspecções são concluídas dentro do cronograma.", audience: "ALL" } })
  await db.announcement.create({ data: { createdById: admin.id, title: "Novo modelo de inspecção disponível", body: "O novo modelo 'Verificação de Higiene da Cozinha' está disponível. Use-o em todas as inspecções de cozinha a partir de agora.", audience: "SUPERVISOR" } })
  await db.announcement.create({ data: { createdById: supervisor1.id, title: "Reunião técnica semanal", body: "Reunião de coordenação dos inspectores todas as segundas-feiras às 08:30, escritório NemChem. Presença obrigatória.", audience: "INSPECTOR" } })

  // ===== AUDIT LOG =====
  const auditSeed: { role: string; user: { id: string }; action: string; entity: string; entityId?: string; reason?: string; days: number }[] = [
    { role: "SUPERVISOR", user: supervisor1, action: "CREATE", entity: "Inspection", days: 1 },
    { role: "INSPECTOR", user: inspector1, action: "STATUS_CHANGE", entity: "Inspection", reason: "PENDING → IN_PROGRESS", days: 1 },
    { role: "SUPERVISOR", user: supervisor1, action: "ASSIGN", entity: "Inspection", reason: "Atribuído a João Macamo", days: 2 },
    { role: "INSPECTOR", user: inspector2, action: "STATUS_CHANGE", entity: "Inspection", reason: "IN_PROGRESS → SUBMITTED", days: 3 },
    { role: "SUPERVISOR", user: supervisor2, action: "RETURN", entity: "Inspection", reason: "Fotografias em falta", days: 3 },
    { role: "SUPERVISOR", user: supervisor1, action: "APPROVE", entity: "Inspection", days: 5 },
    { role: "ADMIN", user: admin, action: "CREATE", entity: "User", reason: "Lúcia Sumbana (INSPECTOR)", days: 6 },
    { role: "SUPERVISOR", user: supervisor2, action: "CREATE", entity: "CAPA", days: 7 },
    { role: "CEO", user: ceo, action: "EXPORT", entity: "Report", reason: "Relatório executivo mensal", days: 8 },
    { role: "ADMIN", user: admin, action: "UPDATE", entity: "Location", reason: "Status ACTIVO confirmado", days: 9 },
  ]
  for (let i = 0; i < auditSeed.length; i++) {
    const a = auditSeed[i]
    await db.auditLog.create({
      data: {
        userId: a.user.id,
        userRole: a.role,
        action: a.action,
        entityType: a.entity,
        entityId: a.entity === "Inspection" ? closedInspections[i % Math.max(1, closedInspections.length)]?.id : undefined,
        reason: a.reason,
        ipAddress: `102.176.${10 + i}.${20 + i}`,
        createdAt: new Date(now.getTime() - a.days * DAY - jitter(6) * HOUR),
      },
    })
  }

  // ===== SYSTEM SETTINGS =====
  const settings: [string, string][] = [
    ["COMPANY_NAME", "NemChem Hygiene Services"],
    ["COMPANY_EMAIL", "geral@nemchem.co"],
    ["COMPLIANCE_THRESHOLD", "85"],
    ["CRITICAL_VIOLATION_THRESHOLD", "60"],
    ["CAPA_OVERDUE_DAYS", "7"],
    ["SELF_APPROVAL_PREVENTED", "true"],
    ["REPORT_FOOTER_NOTE", "Documento confidencial — uso interno NemChem"],
  ]
  for (const [key, value] of settings) {
    await db.systemSetting.create({ data: { key, value } })
  }

  console.log("✅ Seeding complete!")
  console.log(`   Users: ${await db.user.count()}`)
  console.log(`   Locations: ${await db.location.count()}`)
  console.log(`   Categories: ${await db.hygieneCategory.count()}`)
  console.log(`   Templates: ${await db.inspectionTemplate.count()} (items: ${await db.templateItem.count()})`)
  console.log(`   Inspections: ${await db.inspection.count()} (items: ${await db.inspectionItem.count()}, history: ${await db.inspectionHistory.count()})`)
  console.log(`   CAPAs: ${await db.cAPA.count()}`)
  console.log(`   Defects: ${await db.defect.count()}`)
  console.log(`   Alerts: ${await db.alert.count()}`)
  console.log(`   Messages: ${await db.message.count()}`)
  console.log(`   Notifications: ${await db.notification.count()}`)
  console.log(`   Announcements: ${await db.announcement.count()}`)
  console.log(`   Audit logs: ${await db.auditLog.count()}`)
  console.log(`   Settings: ${await db.systemSetting.count()}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })
