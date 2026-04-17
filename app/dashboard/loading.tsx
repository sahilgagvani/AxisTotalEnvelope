export default function DashboardLoading() {
  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-7 w-28 bg-gray-200 rounded animate-pulse mb-5" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
              <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
              <div className="h-4 w-1/2 bg-gray-200 rounded mb-5" />
              <div className="h-3 w-full bg-gray-200 rounded mb-1.5" />
              <div className="h-1.5 w-full bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
