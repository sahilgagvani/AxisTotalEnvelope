import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

function adminOnly() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// PATCH /api/users/[id] — update name, role, pin, quickLogin, or reactivate
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return adminOnly()

  const { id } = await params
  const body = await req.json()
  const { name, role, pin, quickLogin, reactivate, email } = body

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (user.role === "ADMIN") return adminOnly()

  if (role && !["QC_INSPECTOR", "ENGINEER"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }
  if (pin !== undefined && !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 })
  }

  const effectiveRole = role ?? user.role
  if (effectiveRole === "ENGINEER" && email !== undefined) {
    if (!email) return NextResponse.json({ error: "Email is required for Engineers" }, { status: 400 })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }
    const emailTaken = await prisma.user.findFirst({ where: { email, NOT: { id } } })
    if (emailTaken) return NextResponse.json({ error: "Email already in use" }, { status: 409 })
  }

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (role !== undefined) data.role = role
  if (quickLogin !== undefined) data.quickLogin = quickLogin
  if (reactivate) data.deletedAt = null
  if (pin !== undefined) data.pin = await bcrypt.hash(pin, 10)
  if (email !== undefined) data.email = email || null

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      email: true,
      quickLogin: true,
      deletedAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json(updated)
}

// DELETE /api/users/[id]?hard=true — soft delete or hard delete
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") return adminOnly()

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const hard = searchParams.get("hard") === "true"

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (user.role === "ADMIN") return adminOnly()

  if (hard) {
    await prisma.user.delete({ where: { id } })
  } else {
    await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  return NextResponse.json({ ok: true })
}
