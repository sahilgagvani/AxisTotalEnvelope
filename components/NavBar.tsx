import { signOut } from "@/auth"

interface NavBarProps {
  name?: string | null
  role?: string | null
}

export default function NavBar({ name, role }: NavBarProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-900">Axis Total Envelope</span>
        <div className="flex items-center gap-4">
          {name && <span className="text-sm text-gray-600">{name}</span>}
          {role && (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {role}
            </span>
          )}
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button
              type="submit"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
