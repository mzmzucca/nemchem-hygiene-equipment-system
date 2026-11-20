import { NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"

/**
 * TEMPORARY diagnostic route (remove after the database-path issue is fixed).
 * Reports where the runtime looks for the bundled SQLite database and what
 * actually exists in the serverless bundle.
 */
export async function GET() {
  const cwd = process.cwd()
  const candidates = [
    path.join(cwd, "prisma", "db", "custom.db"),
    path.join(cwd, "..", "prisma", "db", "custom.db"),
    path.join(cwd, "..", "..", "prisma", "db", "custom.db"),
    path.join(cwd, "db", "custom.db"),
    path.join(cwd, ".next", "standalone", "prisma", "db", "custom.db"),
  ]
  let prismaDir: string[] | null = null
  try {
    prismaDir = fs.readdirSync(path.join(cwd, "prisma"))
  } catch {
    prismaDir = null
  }
  let taskRoot: string[] | null = null
  try {
    taskRoot = fs.readdirSync(cwd).slice(0, 40)
  } catch {
    taskRoot = null
  }
  return NextResponse.json({
    cwd,
    envUrlSet: Boolean(process.env.DATABASE_URL),
    prismaDir,
    taskRoot,
    candidates: candidates.map((p) => ({ p: p.replace(cwd, "."), exists: fs.existsSync(p) })),
  })
}
