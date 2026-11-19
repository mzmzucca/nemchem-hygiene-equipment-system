import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// In development, the global singleton can become stale after `prisma generate`
// (e.g. new models added to the schema won't be present on the cached instance).
// Always create a fresh client in dev mode to guarantee access to all models.
const dbClient = new PrismaClient({
  log: process.env.NODE_ENV !== 'production' ? ['query', 'warn', 'error'] : ['error'],
  // Fallback for environments where DATABASE_URL is not set (e.g. Netlify
  // runtime). Prisma resolves the relative path against prisma/schema.prisma,
  // which is bundled together with the seeded database (see netlify.toml).
  datasources: {
    db: { url: process.env.DATABASE_URL ?? 'file:./db/custom.db' },
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