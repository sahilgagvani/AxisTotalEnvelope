import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import PanelManagement from "./PanelManagement"

export const metadata: Metadata = {
  title: "Panel Management — AXIS Total Envelope",
}

export default async function AdminPanelsPage() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") redirect("/dashboard")
  return <PanelManagement />
}
