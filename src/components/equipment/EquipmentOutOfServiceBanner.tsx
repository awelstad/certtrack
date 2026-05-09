import { AlertTriangle } from 'lucide-react'

export function EquipmentOutOfServiceBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
      <div>
        <p className="font-semibold text-red-800">Equipment Out of Service</p>
        <p className="mt-0.5 text-sm text-red-700">
          This equipment has been flagged as out of service due to a failed critical inspection item.
          Do not use until repaired and re-inspected.
        </p>
      </div>
    </div>
  )
}
