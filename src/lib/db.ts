import { PrismaClient } from '@prisma/client'
import path from 'node:path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Absolute fallback for hosts where DATABASE_URL is not set (Netlify standalone
// server, Vercel serverless). The seeded database (prisma/db/custom.db) is
// traced into every function bundle via next.config outputFileTracingIncludes,
// and both runtimes start with cwd at the project root.
const fallbackUrl = `file:${path.join(process.cwd(), 'prisma', 'db', 'custom.db')}`

const dbClient = new PrismaClient({
  log: process.env.NODE_ENV !== 'production' ? ['query', 'warn', 'error'] : ['error'],
  datasources: {
    db: { url: process.env.DATABASE_URL ?? fallbackUrl },
  },
})

export const db = dbClient

if (process.env.NODE_ENV !== 'production') {
  // Reuse across hot reloads, but always replace if stale (missing newer models)
  const existing = globalForPrisma.prisma as unknown as { defect?: unknown } | undefined
  if (!existing || typeof existing.defect === 'undefined') {
    globalForPrisma.prisma = dbClient
  } else {
    // Reuse the existing client (already validated)
    ;(db as unknown as Record<string, unknown>)['_reusedFromGlobal'] = true
  }
}