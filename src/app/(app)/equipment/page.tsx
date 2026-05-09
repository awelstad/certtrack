import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { EquipmentStatusBadge } from '@/components/equipment/EquipmentStatusBadge'
import { Wrench, ChevronRight, Plus, AlertTriangle, ClipboardList } from 'lucide-react'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function EquipmentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const isManager = MANAGER_ROLES.includes(profile!.role as Role)

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, name, make, model, status, last_inspection_at, equipment_types(name), jobs(name)')
    .eq('organization_id', profile!.organization_id)
    .order('created_at', { ascending: false })

  const ooCount = (equipment ?? []).filter((e) => e.status === 'out_of_service').length

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Equipment"
        description="Track equipment, inspections, and job assignments."
        action={
          <div className="flex items-center gap-2">
            {isManager && (
              <Link
                href="/equipment/templates"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <ClipboardList className="h-4 w-4" />
                Templates
              </Link>
            )}
            <Link
              href="/equipment/new"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Add Equipment
            </Link>
          </div>
        }
      />

      {/* Out-of-service alert */}
      {ooCount > 0 && (
        <Link
          href="/equipment/out-of-service"
          className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 transition-colors hover:bg-red-100"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="flex-1 text-sm font-semibold text-red-800">
            {ooCount} piece{ooCount !== 1 ? 's' : ''} of equipment {ooCount !== 1 ? 'are' : 'is'} out of service
          </p>
          <ChevronRight className="h-4 w-4 text-red-500" />
        </Link>
      )}

      {!equipment?.length ? (
        <EmptyState
          icon={Wrench}
          title="No equipment yet"
          description="Add equipment to track inspections, assign to job sites, and generate QR codes."
          action={
            <Link
              href="/equipment/new"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
            >
              <Plus className="h-4 w-4" />
              Add Equipment
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {equipment.map((e) => {
              const eqType = e.equipment_types as unknown as { name: string } | null
              const job    = e.jobs as unknown as { name: string } | null
              const makeModel = [e.make, e.model].filter(Boolean).join(' ')
              return (
                <li key={e.id}>
                  <Link
                    href={`/equipment/${e.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className={[
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      e.status === 'out_of_service' ? 'bg-red-50 border border-red-200' : 'bg-slate-100',
                    ].join(' ')}>
                      {e.status === 'out_of_service'
                        ? <AlertTriangle className="h-5 w-5 text-red-500" />
                        : <Wrench className="h-5 w-5 text-slate-600" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{e.name}</p>
                      <p className="truncate text-sm text-slate-500">
                        {eqType?.name ?? makeModel ?? '—'}
                        {job?.name && ` · ${job.name}`}
                      </p>
                      {e.last_inspection_at && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Inspected {new Date(e.last_inspection_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <EquipmentStatusBadge status={e.status} />
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
