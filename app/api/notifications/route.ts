import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/notifications — current user's inbox
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const notifications = await prisma.notification.findMany({
    where: { recipientId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { name: true } },
      panel:  { select: { id: true, panelIdentifier: true } },
    },
  })

  return NextResponse.json(notifications)
}

// POST /api/notifications — send notifications (admin/inspector only)
export async function POST(req: Request) {
  const session = await auth()
  const role = session?.user?.role
  if (!session?.user?.id || (role !== "ADMIN" && role !== "QC_INSPECTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { panelId, recipientIds, message } = body as {
    panelId: string
    recipientIds: string[]
    message?: string
  }

  if (!panelId || !Array.isArray(recipientIds) || recipientIds.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const created = await prisma.$transaction(
    recipientIds.map((recipientId) =>
      prisma.notification.create({
        data: {
          recipientId,
          senderId: session.user.id,
          panelId,
          message: message?.trim() || null,
        },
      })
    )
  )

  return NextResponse.json(created, { status: 201 })
}
