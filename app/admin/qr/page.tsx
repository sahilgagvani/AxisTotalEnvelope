import { auth } from "@/auth"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import QrManagement from "./QrManagement"

export const metadata: Metadata = {
  title: "QR Management — AXIS Total Envelope",
}

export default async function AdminQrPage() {
  const session = await auth()
  if (session?.user?.role !== "ADMIN") redirect("/dashboard")
  return <QrManagement />
}
