import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EquipmentInspectionStatusBadge } from '@/components/equipment/EquipmentInspectionStatusBadge'
import { ChevronRight, ClipboardCheck } from 'lucide-react'

export default async function FailedInspectionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()

  // Get most recent inspection per equipment that is fail or out_of_service
  const { data: inspections } = await supabase
    .from('equipment_inspections')
    .select('id, inspection_date, status, inspector_name, equipment_id, equipment(name, status)')
    .eq('organization_id', profile!.organization_id)
    .in('status', ['fail', 'out_of_service'])
    .order('created_at', { ascending: false })
    .limit(50)

  // Deduplicate by equipment_id — show only the most recent failing inspection per equipment
  const seen = new Set<string>()
  const deduped = (inspections ?? []).filter((i) => {
    if (seen.has(i.equipment_id)) return false
    seen.add(i.equipment_id)
    return true
  })

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Failed Inspections"
        description="Equipment with open fail or out-of-service inspection results."
      />

      {!deduped.length ? (
        <p className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm italic text-slate-400">
          No failed inspections found.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {deduped.map((ins) => {
              const equipment = ins.equipment as unknown as { name: string; status: string } | null
              return (
                <li key={ins.id}>
                  <Link
                    href={`/equipment/${ins.equipment_id}/inspections/${ins.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <ClipboardCheck className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{equipment?.name ?? 'Equipment'}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(ins.inspection_date).toLocaleDateString()} · {ins.inspector_name}
                      </p>
                    </div>
                    <EquipmentInspectionStatusBadge status={ins.status} />
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
