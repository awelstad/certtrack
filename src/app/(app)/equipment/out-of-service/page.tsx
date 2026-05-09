import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { AlertTriangle, ChevronRight, Wrench } from 'lucide-react'

export default async function OutOfServicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, name, make, model, last_inspection_at, equipment_types(name), jobs(name)')
    .eq('organization_id', profile!.organization_id)
    .eq('status', 'out_of_service')
    .order('last_inspection_at', { ascending: false })

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Out of Service Equipment"
        description="Equipment marked out of service due to critical inspection failures."
      />

      {!equipment?.length ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <Wrench className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-800 font-medium">No equipment is currently out of service.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-3">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-sm font-semibold text-red-700">{equipment.length} piece{equipment.length !== 1 ? 's' : ''} out of service</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {equipment.map((e) => {
              const eqType = e.equipment_types as unknown as { name: string } | null
              const job    = e.jobs as unknown as { name: string } | null
              return (
                <li key={e.id}>
                  <Link
                    href={`/equipment/${e.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 border border-red-200">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{e.name}</p>
                      <p className="truncate text-sm text-slate-500">
                        {eqType?.name ?? ([e.make, e.model].filter(Boolean).join(' ') || '—')}
                        {job?.name && ` · ${job.name}`}
                      </p>
                      {e.last_inspection_at && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Failed {new Date(e.last_inspection_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
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
