import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import type { InspectionResult } from "@prisma/client"

const VALID_RESULTS = new Set<string>(["PASS", "FAIL", "NA"])

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "QC_INSPECTOR") {
    return NextResponse.json({ error: "Only inspectors can submit records" }, { status: 403 })
  }
  const userId = session.user.id

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    panelId?: string
    stepId?: string
    result?: string
    notes?: string
    photoUrls?: string[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { panelId, stepId, result, notes, photoUrls = [] } = body

  if (!panelId || !stepId || !result) {
    return NextResponse.json(
      { error: "panelId, stepId, and result are required" },
      { status: 400 }
    )
  }
  if (!VALID_RESULTS.has(result)) {
    return NextResponse.json(
      { error: "result must be PASS, FAIL, or NA" },
      { status: 400 }
    )
  }

  // Fail requires both notes and at least one photo
  if (result === "FAIL") {
    if (!notes?.trim()) {
      return NextResponse.json(
        { error: "Notes are required when result is FAIL" },
        { status: 400 }
      )
    }
    if (photoUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one photo is required when result is FAIL" },
        { status: 400 }
      )
    }
  }

  // ── Access control ────────────────────────────────────────────────────────
  const panel = await prisma.panel.findUnique({ where: { id: panelId } })
  if (!panel) {
    return NextResponse.json({ error: "Panel not found" }, { status: 404 })
  }

  const assignment = await prisma.projectAssignment.findUnique({
    where: { userId_projectId: { userId, projectId: panel.projectId } },
  })
  if (!assignment) {
    return NextResponse.json(
      { error: "You are not assigned to this project" },
      { status: 403 }
    )
  }

  // ── Duplicate check ───────────────────────────────────────────────────────
  const existing = await prisma.inspectionRecord.findUnique({
    where: { panelId_stepId: { panelId, stepId } },
  })
  if (existing) {
    return NextResponse.json(
      { error: "A record already exists for this panel and step" },
      { status: 409 }
    )
  }

  // ── Transactional write ───────────────────────────────────────────────────
  const record = await prisma.$transaction(async (tx) => {
    // Create the inspection record
    const created = await tx.inspectionRecord.create({
      data: {
        panelId,
        stepId,
        inspectorId: userId,
        result:       result as InspectionResult,
        notes:        notes?.trim() || null,
      },
      include: { step: true },
    })

    // Attach photos
    if (photoUrls.length > 0) {
      await tx.photo.createMany({
        data: photoUrls.map((url: string) => ({
          url,
          inspectionRecordId: created.id,
          uploadedById:        userId,
        })),
      })
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        inspectionRecordId: created.id,
        userId,
        action:     "CREATED",
        newResult:  result,
        newNotes:   notes?.trim() || null,
      },
    })

    // Update panel status based on total record count after this insert
    const [recordCount, stepCount] = await Promise.all([
      tx.inspectionRecord.count({ where: { panelId } }),
      tx.inspectionStep.count(),
    ])

    if (recordCount === 1) {
      await tx.panel.update({
        where: { id: panelId },
        data:  { status: "IN_PROGRESS" },
      })
    } else if (recordCount === stepCount) {
      await tx.panel.update({
        where: { id: panelId },
        data:  { status: "COMPLETED" },
      })
    }

    return created
  })

  return NextResponse.json(record, { status: 201 })
}
