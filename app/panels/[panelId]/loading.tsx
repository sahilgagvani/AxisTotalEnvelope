export default function PanelLoading() {
  return (
    <main className="flex-1">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Header skeleton */}
        <div>
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-4" />
          <div className="h-7 w-40 bg-gray-200 rounded animate-pulse mb-5" />
          <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>
                <div className="h-3 w-16 bg-gray-200 rounded mb-1.5" />
                <div className="h-4 w-20 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Checklist skeleton */}
        <div>
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 border-b border-gray-100 last:border-0 animate-pulse">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-5 w-14 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
