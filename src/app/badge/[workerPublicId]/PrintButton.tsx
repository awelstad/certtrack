'use client'

export function PrintButton() {
  return (
    <button
      className="badge-print-hide mb-6 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
      onClick={() => window.print()}
    >
      Print Badge
    </button>
  )
}
