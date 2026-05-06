import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/users/quick-login — public, returns users with quickLogin=true and not deleted
export async function GET() {
  const users = await prisma.user.findMany({
    where: { quickLogin: true, deletedAt: null },
    select: { id: true, username: true, name: true, role: true },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(users)
}
