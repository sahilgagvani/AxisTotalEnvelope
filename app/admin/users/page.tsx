import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import UserManagement from "./UserManagement"

export const metadata: Metadata = {
  title: "User Management — AXIS Total Envelope",
}

export default async function AdminUsersPage() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") redirect("/dashboard")
  return <UserManagement />
}
