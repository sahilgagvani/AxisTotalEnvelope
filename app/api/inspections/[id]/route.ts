import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import type { InspectionResult } from "@prisma/client"

const VALID_RESULTS = new Set<string>(["PASS", "FAIL", "NA"])

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "QC_INSPECTOR") {
    return NextResponse.json({ error: "Only inspectors can update records" }, { status: 403 })
  }
  const userId = session.user.id

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { result?: string; notes?: string; newPhotoUrls?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { result, notes, newPhotoUrls = [] } = body

  if (!result) {
    return NextResponse.json({ error: "result is required" }, { status: 400 })
  }
  if (!VALID_RESULTS.has(result)) {
    return NextResponse.json(
      { error: "result must be PASS, FAIL, or NA" },
      { status: 400 }
    )
  }
  // FAIL requires notes; photos are NOT required on edit (existing photos may already be attached)
  if (result === "FAIL" && !notes?.trim()) {
    return NextResponse.json(
      { error: "Notes are required when result is FAIL" },
      { status: 400 }
    )
  }

  // ── Fetch existing record ─────────────────────────────────────────────────
  const existing = await prisma.inspectionRecord.findUnique({
    where: { id },
    include: { panel: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Inspection record not found" }, { status: 404 })
  }

  // ── Archive check ─────────────────────────────────────────────────────────
  if (existing.panel.archivedAt) {
    return NextResponse.json({ error: "Panel is archived" }, { status: 403 })
  }

  // ── Capture previous state ────────────────────────────────────────────────
  const previousResult = existing.result as string
  const previousNotes  = existing.notes

  // ── Transactional update ──────────────────────────────────────────────────
  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.inspectionRecord.update({
      where: { id },
      data: {
        result: result as InspectionResult,
        notes:  notes?.trim() || null,
      },
    })

    // Attach any new photos
    if (newPhotoUrls.length > 0) {
      await tx.photo.createMany({
        data: newPhotoUrls.map((url: string) => ({
          url,
          inspectionRecordId: id,
          uploadedById:        userId,
        })),
      })
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        inspectionRecordId: id,
        userId,
        action:         "UPDATED",
        previousResult,
        newResult:      result,
        previousNotes,
        newNotes:       notes?.trim() || null,
      },
    })

    // Re-evaluate panel status after the edit
    // (an edit can't change the record count, but let's keep the logic consistent
    //  in case future edits delete/add records)
    const panelId = existing.panelId
    const [recordCount, stepCount] = await Promise.all([
      tx.inspectionRecord.count({ where: { panelId } }),
      tx.inspectionStep.count(),
    ])

    const newStatus =
      recordCount === 0       ? "NOT_STARTED"
      : recordCount === stepCount ? "COMPLETED"
      : "IN_PROGRESS"

    await tx.panel.update({
      where: { id: panelId },
      data:  { status: newStatus },
    })

    return record
  })

  return NextResponse.json(updated, { status: 200 })
}
