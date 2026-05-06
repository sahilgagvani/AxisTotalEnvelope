import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ panelId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { panelId } = await params
  const body = await req.json()
  const { drawingUrl } = body as { drawingUrl: string }

  const panel = await prisma.panel.update({
    where: { id: panelId },
    data: { drawingUrl },
  })

  return NextResponse.json(panel)
}
