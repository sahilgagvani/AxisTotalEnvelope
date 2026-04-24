import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import QrScanButton from "@/components/QrScanButton"

export const metadata: Metadata = {
  title: "Projects — AXIS Total Envelope",
}

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id
  const role = session?.user?.role
  const name = session?.user?.name
  const isAdmin = role === "ADMIN"

  const projects = await prisma.project.findMany({
    where: isAdmin ? undefined : { assignments: { some: { userId } } },
    include: {
      panels: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-5">
          {isAdmin ? "Projects" : "Your Projects"}
        </h1>

        {projects.length === 0 ? (
          <p className="text-gray-500 text-sm">
            {isAdmin
              ? "No projects yet."
              : "No projects assigned. Contact your administrator."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const total = project.panels.length
              const completed = project.panels.filter(
                (p) => p.status === "COMPLETED"
              ).length
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0

              return (
                <Link key={project.id} href={`/projects/${project.id}`} className="block">
                  <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition-all min-h-[88px]">
                    <h2 className="font-semibold text-gray-900 mb-0.5 text-base">
                      {project.name}
                    </h2>
                    {project.clientName && (
                      <p className="text-sm text-gray-500 mb-3">
                        {project.clientName}
                      </p>
                    )}

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                        <span>
                          {completed} / {total} panel{total !== 1 ? "s" : ""} completed
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Greeting + QR scan */}
        <div className="flex flex-col items-center gap-4 mt-16">
          {name && (
            <p className="text-2xl font-semibold text-gray-700">
              Welcome back, <span className="text-gray-900">{name}</span>
            </p>
          )}
          {!isAdmin && <QrScanButton />}
        </div>
      </div>
    </main>
  )
}
