import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EquipmentInspectionStatusBadge } from '@/components/equipment/EquipmentInspectionStatusBadge'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'

export default async function EquipmentInspectionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, name')
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)
    .single()

  if (!equipment) notFound()

  const { data: inspections } = await supabase
    .from('equipment_inspections')
    .select('id, inspection_date, status, inspector_name, notes, created_at')
    .eq('equipment_id', id)
    .eq('organization_id', profile!.organization_id)
    .order('created_at', { ascending: false })

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link href={`/equipment/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to {equipment.name}
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">All Inspections</h1>
        <Link
          href={`/equipment/${id}/inspect`}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
        >
          <ClipboardCheck className="h-4 w-4" />
          New Inspection
        </Link>
      </div>

      {!inspections?.length ? (
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm italic text-slate-400">
          No inspections recorded yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {inspections.map((ins) => (
              <li key={ins.id}>
                <Link
                  href={`/equipment/${id}/inspections/${ins.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <ClipboardCheck className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {new Date(ins.inspection_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-slate-500">{ins.inspector_name}</p>
                    {ins.notes && (
                      <p className="truncate text-xs text-slate-400 mt-0.5">{ins.notes}</p>
                    )}
                  </div>
                  <EquipmentInspectionStatusBadge status={ins.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
