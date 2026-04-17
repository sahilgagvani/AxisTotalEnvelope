import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { randomUUID } from "crypto"
import path from "path"

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ── Parse multipart form ──────────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File exceeds the 10 MB limit" },
      { status: 400 }
    )
  }

  // Basic MIME check — accept images only
  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are accepted" },
      { status: 400 }
    )
  }

  // ── Derive a safe filename ────────────────────────────────────────────────
  const originalExt = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")
    : "jpg"
  const safeExt  = originalExt || "jpg"
  const filename  = `${randomUUID()}.${safeExt}`

  // ── Write to public/uploads/ ──────────────────────────────────────────────
  const uploadDir = path.join(process.cwd(), "public", "uploads")
  await mkdir(uploadDir, { recursive: true }) // no-op if already exists

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  await writeFile(path.join(uploadDir, filename), buffer)

  return NextResponse.json({ url: `/uploads/${filename}` })
}
