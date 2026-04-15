import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import NavBar from "@/components/NavBar"

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id
  const role = session?.user?.role

  const projects = await prisma.project.findMany({
    where:
      role === "ADMIN"
        ? undefined
        : { assignments: { some: { userId } } },
    include: {
      panels: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar name={session?.user?.name} role={role} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {role === "ADMIN" ? "Projects" : "Your Projects"}
        </h1>

        {projects.length === 0 ? (
          <p className="text-gray-500">No projects found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const total = project.panels.length
              const completed = project.panels.filter(
                (p) => p.status === "COMPLETED"
              ).length

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 hover:shadow-sm transition-all h-full">
                    <h2 className="font-semibold text-gray-900 mb-1">
                      {project.name}
                    </h2>
                    {project.clientName && (
                      <p className="text-sm text-gray-500 mb-3">
                        {project.clientName}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-gray-600 mt-auto">
                      <span>
                        {total} panel{total !== 1 ? "s" : ""}
                      </span>
                      <span className="text-gray-300">·</span>
                      <span>
                        {completed} of {total} completed
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
