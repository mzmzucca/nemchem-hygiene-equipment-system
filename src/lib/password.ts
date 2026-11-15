import { scryptSync, randomBytes, timingSafeEqual } from "crypto"

const SALT_LEN = 16
const KEY_LEN = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LEN).toString("hex")
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored || !stored.includes(":")) return false
  const [salt, hash] = stored.split(":")
  try {
    const test = scryptSync(password, salt, KEY_LEN)
    const target = Buffer.from(hash, "hex")
    return test.length === target.length && timingSafeEqual(test, target)
  } catch {
    return false
  }
}
