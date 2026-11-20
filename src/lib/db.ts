import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Resolve the SQLite database URL for every hosting context:
 * - absolute/external DATABASE_URL: used as-is;
 * - relative file: URL (e.g. "file:./db/custom.db"): resolved against cwd,
 *   but when that file does not exist the prisma/ copy is used instead
 *   (Vercel/Netlify bundles keep the seeded DB at prisma/db/custom.db);
 * - unset: the bundled seeded database (prisma/db/custom.db).
 */
function resolveDatabaseUrl(): string {
  const bundled = `file:${path.join(process.cwd(), 'prisma', 'db', 'custom.db')}`
  const env = process.env.DATABASE_URL
  if (!env) return bundled
  if (env.startsWith('file:')) {
    const raw = env.slice('file:'.length)
    if (raw && !path.isAbsolute(raw)) {
      const cwdRelative = path.join(process.cwd(), raw)
      const prismaRelative = path.join(process.cwd(), 'prisma', raw)
      if (!fs.existsSync(cwdRelative) && fs.existsSync(prismaRelative)) {
        return `file:${prismaRelative}`
      }
      return `file:${cwdRelative}`
    }
  }
  return env
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