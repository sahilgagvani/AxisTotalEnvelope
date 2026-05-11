import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { AssemblyType } from "@prisma/client"

function adminOnly() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// PATCH /api/admin/panels/[id] — edit, archive, or reactivate a panel
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return adminOnly()

  const { id } = await params
  const body = await req.json()

  const panel = await prisma.panel.findUnique({ where: { id } })
  if (!panel) return NextResponse.json({ error: "Panel not found" }, { status: 404 })

  // Archive / reactivate shortcuts
  if (body.archive === true) {
    const updated = await prisma.panel.update({
      where: { id },
      data: { archivedAt: new Date() },
    })
    return NextResponse.json(updated)
  }

  if (body.reactivate === true) {
    const updated = await prisma.panel.update({
      where: { id },
      data: { archivedAt: null },
    })
    return NextResponse.json(updated)
  }

  // Field edit — check panelIdentifier uniqueness if it's changing
  if (body.panelIdentifier && body.panelIdentifier !== panel.panelIdentifier) {
    const conflict = await prisma.panel.findUnique({
      where: { panelIdentifier: body.panelIdentifier },
    })
    if (conflict) {
      return NextResponse.json({ error: "Panel identifier already exists" }, { status: 409 })
    }
  }

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
  } = body as Partial<{
    panelIdentifier: string
    floor: number
    direction: string
    panelNumber: number
    heightMm: number
    widthMm: number
    diagonalMm: number | null
    topOfBottomM: number
    topOfTopM: number
    openingCount: number
    openingCallouts: string | null
    assemblyType: AssemblyType
    isShearWall: boolean
    finishes: string | null
    drawingSheet: string | null
    notes: string | null
  }>

  const updated = await prisma.panel.update({
    where: { id },
    data: {
      ...(panelIdentifier !== undefined && { panelIdentifier }),
      ...(floor !== undefined && { floor }),
      ...(direction !== undefined && { direction }),
      ...(panelNumber !== undefined && { panelNumber }),
      ...(heightMm !== undefined && { heightMm }),
      ...(widthMm !== undefined && { widthMm }),
      ...(diagonalMm !== undefined && { diagonalMm }),
      ...(topOfBottomM !== undefined && { topOfBottomM }),
      ...(topOfTopM !== undefined && { topOfTopM }),
      ...(openingCount !== undefined && { openingCount }),
      ...(openingCallouts !== undefined && { openingCallouts }),
      ...(assemblyType !== undefined && { assemblyType }),
      ...(isShearWall !== undefined && { isShearWall }),
      ...(finishes !== undefined && { finishes }),
      ...(drawingSheet !== undefined && { drawingSheet }),
      ...(notes !== undefined && { notes }),
    },
  })

  return NextResponse.json(updated)
}
