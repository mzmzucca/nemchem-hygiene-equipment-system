import { ok, err } from "@/lib/api"
import { requireAuthOrDemo as requireAuth, audit } from "@/lib/auth-guard"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"
import sharp from "sharp"

/**
 * POST /api/upload
 *
 * Accepts a multipart/form-data upload with a single "file" field
 * (image/jpeg, image/png, image/webp). Compresses and resizes the image
 * (max 1280px wide, JPEG quality 80) using sharp, saves it to
 * public/uploads/, and returns the public URL.
 *
 * Photos are associated with customer/contract/visit/equipment/inspection
 * via the inspection-photos endpoint — this endpoint only handles storage.
 */
export async function POST(req: Request) {
  const user = await requireAuth()

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return err("No file provided (expected multipart field 'file')", 400)

  // Validate type
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
  if (!allowed.includes(file.type)) {
    return err(`Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP`, 400)
  }

  // Validate size (max 10 MB before compression)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    return err("File too large (max 10 MB before compression)", 400)
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())

    // Compress: resize to max 1280px wide, convert to JPEG quality 80
    const compressed = await sharp(buffer)
      .resize({ width: 1280, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer()

    const filename = `${randomUUID()}.jpg`
    const uploadDir = join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })
    await writeFile(join(uploadDir, filename), compressed)

    const url = `/uploads/${filename}`

    await audit({
      userId: user.id,
      userRole: user.role,
      action: "CREATE",
      entityType: "Upload",
      entityId: filename,
      after: { url, originalSize: file.size, compressedSize: compressed.length },
    })

    return ok({ url, originalSize: file.size, compressedSize: compressed.length }, 201)
  } catch (e) {
    console.error("Upload failed:", e)
    return err("Failed to process image", 500)
  }
}
