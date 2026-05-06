/**
 * One-time script: upload shop drawing PDFs to Vercel Blob and save URLs to DB.
 *
 * Usage:
 *   1. Put all PDFs in a folder (e.g. ./prisma/drawings/)
 *   2. Run:  BLOB_READ_WRITE_TOKEN="..." DATABASE_URL="..." npx ts-node --skip-project scripts/upload-drawings.ts ./prisma/drawings
 */

import { put } from "@vercel/blob"
import { PrismaClient } from "@prisma/client"
import fs from "fs"
import path from "path"

const prisma = new PrismaClient()

const drawingsDir = process.argv[2]
if (!drawingsDir) {
  console.error("Usage: npx ts-node --skip-project scripts/upload-drawings.ts <path-to-pdf-folder>")
  process.exit(1)
}

async function main() {
  const files = fs.readdirSync(drawingsDir).filter((f) => f.endsWith(".pdf"))
  console.log(`Found ${files.length} PDF(s) in ${drawingsDir}\n`)

  for (const filename of files) {
    const panelIdentifier = path.basename(filename, ".pdf") // e.g. "1N-123"
    const filePath = path.join(drawingsDir, filename)

    const panel = await prisma.panel.findUnique({ where: { panelIdentifier } })
    if (!panel) {
      console.warn(`⚠️  No panel found for identifier "${panelIdentifier}" — skipping`)
      continue
    }

    const buffer = fs.readFileSync(filePath)
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: "application/pdf",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      allowOverwrite: true,
    })

    await prisma.panel.update({
      where: { id: panel.id },
      data: { drawingUrl: blob.url },
    })

    console.log(`✅ ${panelIdentifier} → ${blob.url}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
