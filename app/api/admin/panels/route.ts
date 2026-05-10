import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { AssemblyType } from "@prisma/client"

function adminOnly() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// GET /api/admin/panels — list all panels (active + archived)
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return adminOnly()

  const panels = await prisma.panel.findMany({
    orderBy: [{ floor: "asc" }, { direction: "asc" }, { panelNumber: "asc" }],
    select: {
      id: true,
      panelIdentifier: true,
      floor: true,
      direction: true,
      panelNumber: true,
      heightMm: true,
      widthMm: true,
      diagonalMm: true,
      topOfBottomM: true,
      topOfTopM: true,
      openingCount: true,
      openingCallouts: true,
      assemblyType: true,
      isShearWall: true,
      finishes: true,
      drawingSheet: true,
      notes: true,
      status: true,
      archivedAt: true,
      createdAt: true,
      _count: { select: { inspectionRecords: true } },
    },
  })

  return NextResponse.json(panels)
}

// POST /api/admin/panels — create a new panel
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return adminOnly()

  const body = await req.json()
  const {
    panelIdentifier,
    floor,
    direction,
    panelNumber,
    heightMm,
    widthMm,
    diagonalMm,
    topOfBottomM,
    topOfTopM,
    openingCount,
    openingCallouts,
    assemblyType,
    isShearWall,
    finishes,
    drawingSheet,
    notes,
  } = body as {
    panelIdentifier: string
    floor: number
    direction: string
    panelNumber: number
    heightMm: number
    widthMm: number
    diagonalMm?: number | null
    topOfBottomM: number
    topOfTopM: number
    openingCount: number
    openingCallouts?: string | null
    assemblyType: AssemblyType
    isShearWall: boolean
    finishes?: string | null
    drawingSheet?: string | null
    notes?: string | null
  }

  if (
    !panelIdentifier ||
    floor == null ||
    !direction ||
    panelNumber == null ||
    heightMm == null ||
    widthMm == null ||
    topOfBottomM == null ||
    topOfTopM == null ||
    !assemblyType
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  if (!["EPS", "FRR"].includes(assemblyType)) {
    return NextResponse.json({ error: "Invalid assemblyType" }, { status: 400 })
  }

  const existing = await prisma.panel.findUnique({ where: { panelIdentifier } })
  if (existing) {
    return NextResponse.json({ error: "Panel identifier already exists" }, { status: 409 })
  }

  const panel = await prisma.panel.create({
    data: {
      panelIdentifier,
      floor,
      direction,
      panelNumber,
      heightMm,
      widthMm,
      diagonalMm: diagonalMm ?? null,
      topOfBottomM,
      topOfTopM,
      openingCount: openingCount ?? 0,
      openingCallouts: openingCallouts ?? null,
      assemblyType,
      isShearWall: isShearWall ?? false,
      finishes: finishes ?? null,
      drawingSheet: drawingSheet ?? null,
      notes: notes ?? null,
    },
  })

  return NextResponse.json(panel, { status: 201 })
}
