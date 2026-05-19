import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/users/notify-list — all active users (admin/inspector only)
// Used to populate the Notify modal recipient picker.
export async function GET() {
  const session = await auth()
  const role = session?.user?.role
  if (!session?.user?.id || (role !== "ADMIN" && role !== "QC_INSPECTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    where:   { deletedAt: null },
    select:  { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  })

  // Exclude the requester from their own list
  const filtered = users.filter((u) => u.id !== session.user.id)

  return NextResponse.json(filtered)
}
