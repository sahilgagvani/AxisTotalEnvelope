import { auth } from "@/auth";
import { signOut } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">
            Axis Total Envelope
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session?.user?.name ?? session?.user?.email}
            </span>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {session?.user?.role}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Dashboard</h1>
        <p className="text-gray-500">
          Welcome back. Projects and panels will appear here.
        </p>
      </div>
    </main>
  );
}
