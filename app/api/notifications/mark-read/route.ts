import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/notifications/mark-read — mark all unread as read for current user
export async function PATCH() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.notification.updateMany({
    where: { recipientId: session.user.id, readAt: null },
    data:  { readAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
