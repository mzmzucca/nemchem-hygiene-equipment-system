# Hygiene Management System

> A comprehensive hygiene inspection, compliance monitoring, and corrective action platform — built for NemChem Moçambique with the same RBAC philosophy as [FIMS](https://github.com/mzmzucca/fims.git).

---

## Overview

This system enables the company to manage hygiene inspections across all locations, monitor compliance standards, identify non-compliance, track corrective actions (CAPA), and provide management with full visibility into hygiene performance.

### Four User Roles with Full RBAC

| Role | Purpose | Nav Items |
|------|---------|-----------|
| **ADMIN** | System administrator — full access | All 18 modules |
| **CEO** | Executive oversight — company-wide visibility | 9 modules |
| **SUPERVISOR** | Operational management — inspection operations | 15 modules |
| **INSPECTOR** | Field operations — own inspections only | 5 modules |

Permissions are enforced at three levels:
1. **Frontend** — nav items and action buttons filtered by role
2. **API** — role guards on every write endpoint
3. **Database** — inspector data scoping (own inspections/CAPAs only)

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | Prisma ORM (SQLite — migrate to PostgreSQL for production) |
| Auth | NextAuth.js v4 (credentials, JWT sessions, role-based) |
| Charts | Recharts |
| Icons | Lucide React |
| Image Processing | Sharp (photo compression) |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- A GitHub account

### Installation

```bash
# Clone
git clone https://github.com/mzmzucca/nemchem-hygiene-equipment-system.git
cd nemchem-hygiene-equipment-system

# Install dependencies
bun install     # or: npm install

# Set up environment
cp .env.example .env

# Create database and push schema
bun run db:push     # or: npx prisma db push

# Generate Prisma client
bun run db:generate     # or: npx prisma generate

# Seed with demo data
bun prisma/seed.ts     # or: npx tsx prisma/seed.ts

# Start the dev server
bun run dev     # or: npm run dev
```

Open **http://localhost:3000** in your browser.

> **Windows note:** If `npm run dev` fails with a `tee` error, edit `package.json` and change the `dev` script to just `"next dev -p 3000"` (remove `2>&1 | tee dev.log`).

---

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| `admin@hygiene.co` | `admin123` | Admin |
| `sergio.zucca@nemchem.co` | `ceo123` | CEO |
| `supervisor@hygiene.co` | `super123` | Supervisor |
| `joao@hygiene.co` | `insp123` | Inspector |

---

## Modules (18 total)

| Module | Admin | CEO | Supervisor | Inspector |
|--------|:-----:|:---:|:----------:|:---------:|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Hygiene Inspections | ✓ | ✓ | ✓ | ✓ |
| Agenda / Schedule | ✓ | — | ✓ | — |
| CAPA Management | ✓ | ✓ | ✓ | ✓ |
| Defects / Non-compliance | ✓ | ✓ | ✓ | — |
| Hygiene Alerts | ✓ | ✓ | ✓ | — |
| Reports Center | ✓ | ✓ | ✓ | — |
| Activity Reports | ✓ | ✓ | ✓ | — |
| Team Performance | ✓ | — | ✓ | — |
| Field Map | ✓ | — | ✓ | — |
| Locations / Facilities | ✓ | — | ✓ | — |
| Inspection Templates | ✓ | — | — | — |
| Hygiene Standards | ✓ | — | ✓ | — |
| Users | ✓ | — | — | — |
| Audit Logs | ✓ | ✓ | ✓ | — |
| Settings | ✓ | — | — | — |
| Notifications | ✓ | ✓ | ✓ | ✓ |
| Messages | ✓ | ✓ | ✓ | ✓ |

---

## Inspection Workflow

The core inspection lifecycle supports 11 statuses:

```
PENDING → ASSIGNED → ACCEPTED/DECLINED → IN_PROGRESS → DRAFT
→ SUBMITTED → UNDER_REVIEW → APPROVED/RETURNED → CLOSED
```

Key business rules enforced:
- **Self-approval prevention** — you cannot approve your own inspection
- **Decline requires a reason** — declining an assignment is logged with justification
- **Return requires review comments** — corrections must include instructions
- **Only Admin can reopen** closed inspections
- **Every transition is audited** — status changes logged with user, timestamp, comments

---

## Key Features

### Hygiene Scoring & Compliance
- Per-item scoring: Compliant / Partially Compliant / Non-Compliant / Not Applicable
- Automatic compliance percentage calculation (N/A excluded)
- Category and location-level compliance rollup
- Configurable severity levels: Critical / High / Medium / Low

### CAPA (Corrective & Preventive Actions)
- Auto-created from critical non-compliances during inspection submission
- Full lifecycle: Open → Assigned → In Progress → Submitted for Verification → Closed
- Evidence upload with photo compression
- Overdue tracking with automatic alerts

### Inspection Templates
- Admin-managed customizable templates with checklist items
- 12 hygiene categories (Personal Hygiene, Handwashing, Kitchen, Pest Control, etc.)
- Configurable scoring method, weight, mandatory flag, photo requirement

### Audit Trail
- Append-only audit log for every correction, status change, and sensitive operation
- Before/after JSON snapshots with user ID, role, and timestamp

### Reports & Export
- 11 report types (daily, weekly, monthly, location, inspector, category, etc.)
- CSV export for inspections, locations, and users
- Date range and multi-filter support

---

## Branding

This system uses NemChem Moçambique's corporate identity:
- **Logo:** `assets/nemchem_logo.png`
- **Colours:** Navy blue (`#1B2A6B`) and royal blue (`#2A3BB0`)
- Same visual language as the FIMS platform for company-wide consistency

---

## Project Structure

```
├── prisma/
│   ├── schema.prisma          # 17 models (users, locations, inspections, CAPA, etc.)
│   └── seed.ts                # Demo data (7 users, 6 locations, 25 inspections)
├── src/
│   ├── app/
│   │   ├── page.tsx           # Single-page app entry
│   │   └── api/               # 21 REST endpoints with RBAC
│   ├── components/
│   │   ├── app-shell.tsx      # Role-filtered sidebar navigation
│   │   ├── modules/           # 18 feature modules + 4 dashboards
│   │   ├── login-button.tsx   # NextAuth login dialog
│   │   └── roles-permissions.tsx  # Permission matrix viewer
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config (4 roles)
│   │   ├── auth-guard.ts      # requireAuth, requireRole, audit()
│   │   ├── permissions.ts     # 60+ capabilities × 4 roles matrix
│   │   ├── password.ts        # scrypt hashing
│   │   └── types.ts           # TypeScript interfaces
│   └── hooks/
│       ├── use-api.ts         # React Query data hooks
│       └── use-permissions.ts # Client-side capability checker
├── assets/
│   └── nemchem_logo.png
└── package.json
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start dev server (port 3000) |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema to database |
| `bun run db:generate` | Generate Prisma client |
| `bun prisma/seed.ts` | Seed demo data |

---

## Classification

**Confidential — NemChem Moçambique Internal System**

---

© NemChem Moçambique. All rights reserved.
