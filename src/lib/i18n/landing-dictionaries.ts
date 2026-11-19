/**
 * Landing page translations — Portuguese (Mozambique, formal) and English.
 *
 * The landing page has its own lightweight i18n (see
 * src/components/landing/landing-i18n.tsx) because the internal
 * application is currently English-only and no project-wide i18n
 * solution is configured (next-intl is a dependency but unused).
 * Keys are flat dotted strings; Portuguese is the default language.
 */

export const landingDictionaries = {
  pt: {
    "meta.title": "NemChem — Sistema de Gestão de Equipamentos de Higiene",
    "meta.description":
      "Plataforma centralizada para acompanhar equipamentos, gerir inspecções, monitorizar intervenções e garantir maior controlo sobre as operações de higiene.",

    "a11y.skip": "Saltar para o conteúdo",
    "a11y.mainNav": "Navegação principal",
    "a11y.langBtn": "Seleccionar idioma",
    "a11y.langMenu": "Idioma",
    "a11y.menu": "Abrir menu de navegação",
    "a11y.mock": "Pré-visualização ilustrativa do painel da plataforma",
    "a11y.clients": "Lista de clientes",
    "a11y.brandHome": "NemChem — Início",

    "nav.inicio": "Início",
    "nav.sobre": "Sobre o Sistema",
    "nav.funcionalidades": "Funcionalidades",
    "nav.como": "Como Funciona",
    "nav.clientes": "Clientes",
    "nav.contactos": "Contactos",
    "nav.entrar": "Entrar",
    "nav.perfil": "Meu Perfil",

    "hero.badge": "Plataforma corporativa de gestão de higiene",
    "hero.h1mark": "Gestão Inteligente",
    "hero.h1rest": "de Equipamentos de Higiene.",
    "hero.lead":
      "Uma plataforma centralizada para acompanhar equipamentos, gerir inspecções, monitorizar intervenções e garantir maior controlo sobre as operações de higiene.",
    "hero.cta1": "Conhecer o Sistema",
    "hero.cta2": "Entrar na Plataforma",
    "hero.meta": "NemChem International · Soluções profissionais de higiene desde 1995",

    "mock.title": "Painel de Operações",
    "mock.pill": "Sistema activo",
    "mock.k1": "Equipamentos registados",
    "mock.k1d": "+12 este mês",
    "mock.k2": "Inspecções esta semana",
    "mock.k2d": "94% concluídas",
    "mock.k3": "Defeitos em seguimento",
    "mock.k3d": "3 novos",
    "mock.r1": "Dispensador de sabão · Bloco A",
    "mock.r1s": "Inspecção agendada há 2 dias",
    "mock.r2": "Secador de mãos · Recepção",
    "mock.r2s": "Verificação periódica pendente",
    "mock.r3": "Tapete sanitário · Entrada principal",
    "mock.r3s": "Intervenção de manutenção em curso",
    "mock.stOk": "Em ordem",
    "mock.stWarn": "A inspeccionar",
    "mock.stMaint": "Em manutenção",
    "mock.note": "Pré-visualização ilustrativa da plataforma — dados exemplificativos.",

    "sobre.eyebrow": "Sobre o Sistema",
    "sobre.title": "Toda a operação de higiene num só lugar",
    "sobre.p1":
      "O Sistema de Gestão de Equipamentos de Higiene da NemChem centraliza a gestão e a monitorização dos equipamentos que asseguram as condições de higiene das suas instalações. O que antes dependia de registos dispersos passa a ser acompanhado de forma digital, organizada e verificável.",
    "sobre.p2":
      "A plataforma apoia as operações da NemChem e dos seus clientes com processos digitais para inspecções, registo de condições, identificação de defeitos e acompanhamento de acções correctivas — mantendo equipas e gestão alinhadas sobre o estado real de cada equipamento.",
    "sobre.li1": "Gestão centralizada de equipamentos por local e cliente",
    "sobre.li2": "Inspecções digitais com histórico e registos completos",
    "sobre.li3": "Identificação de defeitos e acções correctivas (CAPA) até à resolução",
    "sobre.li4": "Monitorização de condições e intervenções de manutenção",
    "sobre.li5": "Relatórios de operação com visibilidade para a gestão",
    "sobre.li6": "Acesso controlado por perfis de utilizador e responsabilidade",
    "sobre.stat1": "Desde 1995 no sector de higiene",
    "sobre.stat2": "Presença em vários países de África",
    "sobre.cardTitle": "Porque escolher o Sistema NemChem?",
    "sobre.mb1": "Confiabilidade operacional",
    "sobre.mb1s": "Cada equipamento tem registo, histórico e responsável — decisões baseadas em factos, não em memórias.",
    "sobre.mb2": "Transformação digital simples",
    "sobre.mb2s": "Processos digitais que substituem papel e planilhas, sem complicar a rotina das equipas de campo.",
    "sobre.mb3": "Transparência total",
    "sobre.mb3s": "Relatórios e histórico partilhados entre equipas NemChem e clientes, com evidências das inspecções.",

    "feat.eyebrow": "Funcionalidades",
    "feat.title": "Tudo o que a operação precisa, num só sistema",
    "feat.lead":
      "Funcionalidades desenhadas para o dia-a-dia da gestão de equipamentos e operações de higiene — do registo inicial à visão executiva do estado das operações.",
    "feat.f1": "Gestão de Equipamentos",
    "feat.f1d": "Registo, organização e monitorização centralizada de todos os equipamentos, com localização e estado actualizados.",
    "feat.f2": "Inspecções Digitais",
    "feat.f2d": "Processos de inspecção estruturados com listas de verificação, pontuações e evidências fotográficas em cada visita.",
    "feat.f3": "Gestão de Defeitos e CAPA",
    "feat.f3d": "Identificação e registo de não conformidades, com acções correctivas acompanhadas até à resolução.",
    "feat.f4": "Agenda e Trabalho de Campo",
    "feat.f4d": "Atribuição de inspecções aos inspectores, agenda de visitas e mapa de campo das operações.",
    "feat.f5": "Relatórios e Análises",
    "feat.f5d": "Relatórios operacionais e indicadores de desempenho, prontos para apoio à decisão da gestão.",
    "feat.f6": "Gestão de Utilizadores",
    "feat.f6d": "Acesso controlado por perfis — administração, direcção, supervisão e inspecção de campo.",

    "how.eyebrow": "Como Funciona",
    "how.title": "Um fluxo de trabalho simples, do registo ao relatório",
    "how.lead":
      "Cinco passos que refletem o funcionamento da plataforma, da introdução do equipamento no sistema até à visibilidade dos resultados para a gestão.",
    "how.s1": "Registo de Equipamentos",
    "how.s1d": "Cada equipamento é registado na plataforma com a sua identificação, localização e características operacionais.",
    "how.s2": "Atribuição de Inspecções",
    "how.s2d": "As inspecções são agendadas e atribuídas aos inspectores responsáveis, conforme o plano definido.",
    "how.s3": "Execução da Inspecção",
    "how.s3d": "As equipas executam as inspecções em campo e registam as condições observadas em cada equipamento.",
    "how.s4": "Resultados e Evidências",
    "how.s4d": "Os resultados, pontuações e evidências são submetidos na plataforma, criando um histórico verificável.",
    "how.s5": "Monitorização e Relatórios",
    "how.s5d": "Defeitos, acções correctivas e indicadores são monitorizados e transformados em relatórios para a gestão.",

    "cli.eyebrow": "Clientes",
    "cli.title": "Empresas e instituições que confiam nos nossos serviços",
    "cli.lead":
      "A carteira de clientes da NemChem reúne empresas e instituições de diversos sectores — acompanhadas nas suas operações de higiene em Maputo e em todo o país.",
    "cli.note": "Lista parcial — a carteira completa de clientes está registada e gerida na plataforma.",
    "cli.error": "A carteira de clientes está registada e gerida na plataforma.",

    "con.eyebrow": "Contactos",
    "con.title": "Precisa de mais informações?",
    "con.lead":
      "Entre em contacto connosco para conhecer melhor as nossas soluções e descobrir como podemos apoiar a gestão dos seus equipamentos de higiene.",
    "con.email": "E-mail",
    "con.tel": "Telefone",
    "con.addr": "Endereço",
    "con.todo": "A configurar",
    "con.note": "Os dados de contacto oficiais serão activados nesta secção pela equipa NemChem.",
    "con.ctaTitle": "Já é cliente NemChem?",
    "con.ctaText": "Aceda à plataforma para acompanhar os seus equipamentos, inspecções e intervenções em tempo real.",
    "con.t1": "Área reservada a clientes e equipas NemChem",
    "con.t2": "Acesso seguro, conforme o perfil de cada utilizador",
    "con.t3": "Informação sempre actualizada sobre a sua operação",
    "con.ctaBtn": "Entrar na Plataforma",

    "foot.desc":
      "Sistema de Gestão de Equipamentos de Higiene da NemChem — uma plataforma centralizada para inspecções, manutenção e controlo operacional, ao serviço de empresas e instituições.",
    "foot.navTitle": "Navegação",
    "foot.platTitle": "Plataforma",
    "foot.support": "Suporte",
    "foot.contactTitle": "Contactos",
    "foot.rights": "Todos os direitos reservados.",
    "foot.tag": "Gestão inteligente de equipamentos de higiene",
  },

  en: {
    "meta.title": "NemChem — Hygiene Equipment Management System",
    "meta.description":
      "A centralised platform to track equipment, manage inspections, monitor interventions and ensure greater control over hygiene operations.",

    "a11y.skip": "Skip to content",
    "a11y.mainNav": "Main navigation",
    "a11y.langBtn": "Select language",
    "a11y.langMenu": "Language",
    "a11y.menu": "Open navigation menu",
    "a11y.mock": "Illustrative preview of the platform dashboard",
    "a11y.clients": "Client list",
    "a11y.brandHome": "NemChem — Home",

    "nav.inicio": "Home",
    "nav.sobre": "About the System",
    "nav.funcionalidades": "Features",
    "nav.como": "How It Works",
    "nav.clientes": "Clients",
    "nav.contactos": "Contact",
    "nav.entrar": "Sign In",
    "nav.perfil": "My Profile",

    "hero.badge": "Corporate hygiene management platform",
    "hero.h1mark": "Intelligent Hygiene",
    "hero.h1rest": "Equipment Management.",
    "hero.lead":
      "A centralised platform to track equipment, manage inspections, monitor interventions and ensure greater control over hygiene operations.",
    "hero.cta1": "Discover the System",
    "hero.cta2": "Sign In to the Platform",
    "hero.meta": "NemChem International · Professional hygiene solutions since 1995",

    "mock.title": "Operations Dashboard",
    "mock.pill": "System active",
    "mock.k1": "Registered equipment",
    "mock.k1d": "+12 this month",
    "mock.k2": "Inspections this week",
    "mock.k2d": "94% completed",
    "mock.k3": "Defects being followed up",
    "mock.k3d": "3 new",
    "mock.r1": "Soap dispenser · Block A",
    "mock.r1s": "Inspection scheduled 2 days ago",
    "mock.r2": "Hand dryer · Reception",
    "mock.r2s": "Periodic check pending",
    "mock.r3": "Sanitising mat · Main entrance",
    "mock.r3s": "Maintenance intervention in progress",
    "mock.stOk": "In order",
    "mock.stWarn": "Under inspection",
    "mock.stMaint": "Under maintenance",
    "mock.note": "Illustrative preview of the platform — sample data.",

    "sobre.eyebrow": "About the System",
    "sobre.title": "The entire hygiene operation in one place",
    "sobre.p1":
      "The NemChem Hygiene Equipment Management System centralises the management and monitoring of the equipment that ensures the hygiene conditions of your facilities. What once depended on scattered records is now tracked digitally, in an organised and verifiable way.",
    "sobre.p2":
      "The platform supports NemChem and its clients\u2019 operations with digital processes for inspections, condition records, defect identification and corrective action follow-up — keeping field teams and management aligned on the real state of every piece of equipment.",
    "sobre.li1": "Centralised equipment management by site and client",
    "sobre.li2": "Digital inspections with complete history and records",
    "sobre.li3": "Defect identification and corrective actions (CAPA) through to resolution",
    "sobre.li4": "Monitoring of conditions and maintenance interventions",
    "sobre.li5": "Operational reports with visibility for management",
    "sobre.li6": "Access controlled by user profiles and responsibilities",
    "sobre.stat1": "In the hygiene sector since 1995",
    "sobre.stat2": "Presence in several African countries",
    "sobre.cardTitle": "Why choose the NemChem System?",
    "sobre.mb1": "Operational reliability",
    "sobre.mb1s": "Every piece of equipment has a record, history and owner — decisions based on facts, not memory.",
    "sobre.mb2": "Simple digital transformation",
    "sobre.mb2s": "Digital processes that replace paper and spreadsheets without complicating field teams\u2019 routines.",
    "sobre.mb3": "Total transparency",
    "sobre.mb3s": "Reports and history shared between NemChem teams and clients, with inspection evidence.",

    "feat.eyebrow": "Features",
    "feat.title": "Everything the operation needs, in a single system",
    "feat.lead":
      "Features designed for the day-to-day management of hygiene equipment and operations — from initial registration to the executive view of operations.",
    "feat.f1": "Equipment Management",
    "feat.f1d": "Centralised registration, organisation and monitoring of all equipment, with up-to-date location and status.",
    "feat.f2": "Digital Inspections",
    "feat.f2d": "Structured inspection processes with checklists, scoring and photo evidence on every visit.",
    "feat.f3": "Defects & CAPA",
    "feat.f3d": "Identification and registration of non-compliance, with corrective actions tracked through to resolution.",
    "feat.f4": "Scheduling & Field Work",
    "feat.f4d": "Inspection assignment to inspectors, visit scheduling and a field map of operations.",
    "feat.f5": "Reports and Analytics",
    "feat.f5d": "Operational reports and performance indicators, ready to support management decisions.",
    "feat.f6": "User Management",
    "feat.f6d": "Access controlled by profile — administration, executive, supervision and field inspection.",

    "how.eyebrow": "How It Works",
    "how.title": "A simple workflow, from registration to reporting",
    "how.lead":
      "Five steps that reflect the platform\u2019s operation, from registering equipment in the system to making results visible to management.",
    "how.s1": "Equipment Registration",
    "how.s1d": "Each piece of equipment is registered on the platform with its identification, location and operational characteristics.",
    "how.s2": "Inspection Assignment",
    "how.s2d": "Inspections are scheduled and assigned to the responsible inspectors, according to the defined plan.",
    "how.s3": "Inspection Execution",
    "how.s3d": "Field teams carry out the inspections and record the conditions observed on each piece of equipment.",
    "how.s4": "Results and Evidence",
    "how.s4d": "Results, scores and evidence are submitted to the platform, creating a verifiable history.",
    "how.s5": "Monitoring and Reporting",
    "how.s5d": "Defects, corrective actions and indicators are monitored and turned into reports for management.",

    "cli.eyebrow": "Clients",
    "cli.title": "Companies and institutions that trust our services",
    "cli.lead":
      "NemChem\u2019s client portfolio brings together companies and institutions from many sectors — supported in their hygiene operations in Maputo and across the country.",
    "cli.note": "Partial list — the complete client portfolio is registered and managed on the platform.",
    "cli.error": "The client portfolio is registered and managed on the platform.",

    "con.eyebrow": "Contact",
    "con.title": "Need more information?",
    "con.lead":
      "Get in touch with us to learn more about our solutions and discover how we can support the management of your hygiene equipment.",
    "con.email": "E-mail",
    "con.tel": "Telephone",
    "con.addr": "Address",
    "con.todo": "To be configured",
    "con.note": "Official contact details will be activated in this section by the NemChem team.",
    "con.ctaTitle": "Already a NemChem client?",
    "con.ctaText": "Access the platform to track your equipment, inspections and interventions in real time.",
    "con.t1": "Reserved area for clients and NemChem teams",
    "con.t2": "Secure access, according to each user\u2019s profile",
    "con.t3": "Always up-to-date information on your operation",
    "con.ctaBtn": "Sign In to the Platform",

    "foot.desc":
      "The NemChem Hygiene Equipment Management System — a centralised platform for inspections, maintenance and operational control, serving companies and institutions.",
    "foot.navTitle": "Navigation",
    "foot.platTitle": "Platform",
    "foot.support": "Support",
    "foot.contactTitle": "Contact",
    "foot.rights": "All rights reserved.",
    "foot.tag": "Intelligent hygiene equipment management",
  },
} as const

export type LandingLang = keyof typeof landingDictionaries
export type LandingKey = keyof (typeof landingDictionaries)["pt"]

export const LANGUAGES: { code: LandingLang; label: string; short: string }[] = [
  { code: "pt", label: "Português", short: "PT" },
  { code: "en", label: "English", short: "EN" },
]
