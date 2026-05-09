import Link from 'next/link'
import { EquipmentInspectionStatusBadge } from './EquipmentInspectionStatusBadge'
import { ClipboardCheck } from 'lucide-react'

interface Inspection {
  id: string
  inspection_date: string
  status: string
  inspector_name: string
  created_at: string
}

interface Props {
  inspections: Inspection[]
  equipmentId: string
}

export function EquipmentInspectionHistory({ inspections, equipmentId }: Props) {
  if (!inspections.length) {
    return (
      <p className="py-6 text-center text-sm italic text-slate-400">No inspections recorded yet.</p>
    )
  }

  return (
    <ul className="divide-y divide-slate-100">
      {inspections.map((ins) => (
        <li key={ins.id}>
          <Link
            href={`/equipment/${equipmentId}/inspections/${ins.id}`}
            className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
              <ClipboardCheck className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">
                {new Date(ins.inspection_date).toLocaleDateString()}
              </p>
              <p className="text-xs text-slate-500">{ins.inspector_name}</p>
            </div>
            <EquipmentInspectionStatusBadge status={ins.status} />
          </Link>
        </li>
      ))}
    </ul>
  )
}
