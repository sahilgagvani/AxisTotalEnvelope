import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

function adminOnly() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// GET /api/users — list all non-admin users (active + soft-deleted)
export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return adminOnly()

  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      quickLogin: true,
      deletedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(users)
}

// POST /api/users — create a new user (engineer or inspector only)
export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return adminOnly()

  const body = await req.json()
  const { username, name, role, pin, quickLogin } = body

  if (!username || !name || !role || !pin) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }
  if (!["QC_INSPECTOR", "ENGINEER"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { username } })
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 })
  }

  const hashedPin = await bcrypt.hash(pin, 10)

  const user = await prisma.user.create({
    data: {
      username,
      name,
      role,
      pin: hashedPin,
      quickLogin: quickLogin ?? false,
    },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      quickLogin: true,
      deletedAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
