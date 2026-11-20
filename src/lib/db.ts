import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Resolve the SQLite database URL for every hosting context.
 *
 * This app is SQLite-only, so:
 * - a DATABASE_URL whose file actually exists is honoured (absolute or
 *   relative — relative URLs are resolved against cwd, then prisma/);
 * - anything else (unset, incompatible scheme, missing file) falls back
 *   to the bundled seeded database (prisma/db/custom.db), which next.config
 *   traces into every serverless function bundle.
 */
function resolveDatabaseUrl(): string {
  const bundled = `file:${path.join(process.cwd(), 'prisma', 'db', 'custom.db')}`
  const env = process.env.DATABASE_URL
  if (env && env.startsWith('file:')) {
    const raw = env.slice('file:'.length)
    const direct = raw && path.isAbsolute(raw) ? raw : undefined
    const candidates = direct
      ? [direct]
      : raw
        ? [path.join(process.cwd(), raw), path.join(process.cwd(), 'prisma', raw)]
        : []
    const existing = candidates.find((c) => fs.existsSync(c))
    if (existing) return `file:${existing}`
  }
  return bundled
}

const dbClient = new PrismaClient({
  log: process.env.NODE_ENV !== 'production' ? ['query', 'warn', 'error'] : ['error'],
  datasources: {
    db: { url: resolveDatabaseUrl() },
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