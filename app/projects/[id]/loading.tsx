export default function ProjectLoading() {
  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-5" />
        <div className="h-7 w-64 bg-gray-200 rounded animate-pulse mb-1" />
        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-6" />

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
              <div className="h-8 w-8 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>

        {/* Panel list skeleton */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-4 border-b border-gray-100 last:border-0 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-5 w-16 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
