# NemChem — Hygiene Equipment Management System

> A complete, production-ready **Hygiene Equipment Management, Inventory and Field Operations System** for NemChem Moçambique. Executive proposal prepared for **Sérgio Zucca, Chief Executive Officer**.

---

## Overview

This repository contains both the **application source code** and the **executive documentation** for a centralised platform that enables NemChem to manage all hygiene equipment installed at customer locations — including hotels, restaurants, hospitals, offices and other commercial establishments.

The system provides complete visibility into:

- Customers and their contracts (Rental & FOL)
- Equipment inventory, installation locations and operational conditions
- Technical visitation schedules and field inspections
- Battery levels and replacements
- Consumables, stock management and consumption tracking
- Equipment maintenance and lifecycle history
- Technician activities and operational reporting

---

## Repository Structure

```
.
├── README.md                          # This file
├── docs/                              # Executive documents
│   ├── NemChem_Executive_Proposal_Hygiene_Equipment_System.pdf    # Final executive document (13 pages)
│   ├── NemChem_Executive_Proposal_Hygiene_Equipment_System.docx   # Editable Word version
│   └── Apresentacao_Executiva_Sistema_Gestao_Equipamentos_Higiene.pptx  # Original presentation (Portuguese)
├── assets/
│   └── nemchem_logo.png               # NemChem Moçambique brand logo
│
├── prisma/
│   ├── schema.prisma                  # Database schema (16 models)
│   └── seed.ts                        # Seed script with realistic demo data
├── src/
│   ├── app/
│   │   ├── page.tsx                   # Main application entry (single-page app)
│   │   ├── layout.tsx                 # Root layout
│   │   ├── globals.css                # Global styles & theme
│   │   └── api/                       # REST API routes (19 endpoints)
│   │       ├── dashboard/
│   │       ├── customers/
│   │       ├── contracts/
│   │       ├── equipment/
│   │       ├── visits/
│   │       ├── inspections/
│   │       ├── batteries/
│   │       ├── products/
│   │       ├── stock-movements/
│   │       ├── consumption/
│   │       ├── technicians/
│   │       ├── settings/
│   │       └── ...
│   ├── components/
│   │   ├── app-shell.tsx              # Sidebar navigation + layout shell
│   │   ├── shared.tsx                 # Shared UI components (KPI cards, badges, etc.)
│   │   ├── providers.tsx              # Theme + React Query providers
│   │   ├── footer.tsx
│   │   ├── modules/                   # The 8 application modules
│   │   │   ├── dashboard.tsx
│   │   │   ├── customers.tsx
│   │   │   ├── contracts.tsx
│   │   │   ├── equipment.tsx
│   │   │   ├── visits.tsx
│   │   │   ├── inspections.tsx
│   │   │   ├── batteries.tsx
│   │   │   └── consumables.tsx
│   │   └── ui/                        # shadcn/ui component library
│   ├── lib/
│   │   ├── db.ts                      # Prisma client
│   │   ├── types.ts                   # TypeScript type definitions
│   │   ├── labels.ts                  # Label maps & color utilities
│   │   ├── nav-store.ts               # Zustand navigation store
│   │   └── api.ts                     # API helpers
│   └── hooks/
│       ├── use-api.ts                 # React Query data hooks
│       ├── use-toast.ts
│       └── use-mobile.ts
│
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── components.json                    # shadcn/ui config
├── .env.example                       # Environment variable template
└── .gitignore
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (New York) |
| Database | Prisma ORM (SQLite — migrate to PostgreSQL for production) |
| State | Zustand (client) + TanStack Query (server) |
| Charts | Recharts |
| Icons | Lucide React |
| Auth | NextAuth.js v4 (credentials provider, JWT sessions, role-based access) |
| Image Processing | Sharp (photo compression) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/) runtime
- A GitHub account (to clone this repo)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/mzmzucca/nemchem-hygiene-equipment-system.git
cd nemchem-hygiene-equipment-system

# 2. Install dependencies
bun install
# or: npm install

# 3. Set up environment variables
cp .env.example .env

# 4. Create the database and push the schema
bun run db:push

# 5. Seed the database with demo data
bun run prisma/seed.ts
```

### Running the Application

```bash
# Start the development server
bun run dev
# or: npm run dev
```

The application will be available at `http://localhost:3000`.

### Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start the development server (port 3000) |
| `bun run lint` | Run ESLint to check code quality |
| `bun run db:push` | Push Prisma schema to the database |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Create and apply a database migration |
| `bun run db:reset` | Reset the database (destructive) |

---

## Application Modules

The system is built as a single-page application with sidebar navigation across 8 interconnected modules:

| Module | Description |
|--------|-------------|
| **Dashboard** | 30+ KPIs and 7 live charts across all operational areas |
| **Customers** | Customer profiles with 7 tabs (contracts, equipment, visits, consumption, batteries, reports) |
| **Contracts** | Rental & FOL contract management with status transitions and auto-computed visit tracking |
| **Equipment** | Full asset lifecycle: registration, installation, inspections, maintenance, decommissioning |
| **Visits** | Monthly calendar + list views with automatic next-visit scheduling |
| **Inspections** | Mobile-friendly technician inspection workflow with 11-point checklist |
| **Batteries** | Battery level tracking, replacement workflow, and configurable threshold alerts |
| **Consumables** | Stock management with estimated vs actual consumption tracking |

---

## Database Schema

The system uses 17 interconnected Prisma models:

- **User** — System users (Admin, Manager, Technician roles) with hashed passwords
- **Customer** / **CustomerLocation** — Customer profiles and site locations
- **EquipmentCategory** / **Equipment** / **EquipmentHistory** — Asset management with full lifecycle
- **Contract** — Rental and FOL contracts
- **Visit** — Technical visit scheduling
- **Inspection** / **InspectionPhoto** — Field inspection records (immutable after submission; corrections via audit)
- **BatteryReplacement** — Battery replacement history
- **ConsumableCategory** / **Product** / **StockMovement** / **ConsumptionRecord** / **EquipmentConsumptionRate** / **TechnicianStock** — Inventory management
- **SystemSetting** — Configurable system parameters
- **AuditLog** — Append-only event log (corrections, status changes, sensitive operations)

---

## Authentication & Authorization

The system uses NextAuth.js v4 with a credentials provider and JWT sessions.

### Roles

| Role | Access |
|------|--------|
| **ADMIN** | Full access — configure users, settings, all modules |
| **MANAGER** | Operations — customers, contracts, schedule, validation, audit logs |
| **TECHNICIAN** | Field ops — assigned visits, inspections, stock allocation |

### Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@hygiene.co` | `admin123` | Admin |
| `manager@hygiene.co` | `manager123` | Manager |
| `joao@hygiene.co` | `tech123` | Technician |

Passwords are hashed using Node's `scrypt` (see `src/lib/password.ts`).

### API Guards

Write operations are protected by role-based guards in `src/lib/auth-guard.ts`:
- `requireAuth()` — requires a valid session (production)
- `requireAuthOrDemo()` — falls back to a demo admin user (prototype mode)
- `requireRole(...roles)` — requires specific roles
- `requireTechnicianOrManager(resourceTechId)` — ownership check for technicians

### Audit Log

Every correction, status change, and sensitive operation is recorded in the append-only `AuditLog` table with before/after snapshots. The audit trail is visible to MANAGER and ADMIN roles at `/api/audit`.

### Key Business Rules Enforced

- **Inspection submissions run in a database transaction** — if any step fails, the whole operation rolls back
- **Stock cannot go negative** via routine EXIT/ALLOCATION — rejected with a clear error; only explicit ADJUSTMENT can reconcile
- **Submitted inspections cannot be edited directly** — corrections require MANAGER/ADMIN role and a mandatory justification reason, logged to AuditLog
- **Cancelled visits never update the last completed visit** — only `status === "COMPLETED"` counts

---

## Executive Documentation

| File | Format | Language | Description |
|------|--------|----------|-------------|
| `NemChem_Executive_Proposal_Hygiene_Equipment_System.pdf` | PDF | English | Final CEO-ready executive proposal — translated, NemChem-branded (navy & white), 13 pages |
| `NemChem_Executive_Proposal_Hygiene_Equipment_System.docx` | Word | English | Editable version of the executive proposal |
| `Apresentacao_Executiva_Sistema_Gestao_Equipamentos_Higiene.pptx` | PowerPoint | Portuguese | Original 16-slide executive presentation |

### Document Structure (15 sections)

1. Executive Summary
2. Framing & Meeting Objective
3. The Operational Challenge
4. Proposed Vision
5. Operational Model — Technical Visit Cycle
6. Proposed Functional Modules
7. Asset Management
8. Consumables — Estimation, Real Consumption & Inventory
9. Governance — User Profiles & Responsibilities
10. Management Information — Key Indicators
11. Reference Architecture
12. Phased Implementation
13. Risks & Controls
14. Decisions to Be Taken
15. Proposed Next Steps

---

## Branding

This project uses NemChem's corporate identity:

- **Primary colour:** Navy blue (`#1B2A6B`) — matching the NemChem wordmark
- **Secondary colour:** Royal blue (`#2A3BB0`) — matching the logo swoosh accent
- **Background:** White
- **Logo:** NemChem Moçambique

---

## Demo Data

The seed script (`prisma/seed.ts`) populates the database with realistic demo data:

- 5 system users (1 admin, 1 manager, 3 technicians)
- 10 customers (hotels, restaurants, hospitals, offices, shopping centres)
- 11 contracts (Rental & FOL)
- 42 equipment items across 6 categories
- 59 technical visits
- 20 inspections
- 12 consumable products
- Battery replacements, stock movements, and consumption records

---

## Decision Requested

> Validate the proposed functional direction and authorise the discovery and detailed-specification stage.

---

## Classification

**Confidential — Internal Decision Document**

Prepared for: **Sérgio Zucca**, Chief Executive Officer, NemChem Moçambique

---

© NemChem Moçambique. All rights reserved.
