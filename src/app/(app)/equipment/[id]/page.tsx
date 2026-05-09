import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EquipmentStatusBadge } from '@/components/equipment/EquipmentStatusBadge'
import { EquipmentOutOfServiceBanner } from '@/components/equipment/EquipmentOutOfServiceBanner'
import { EquipmentInspectionHistory } from '@/components/equipment/EquipmentInspectionHistory'
import { ArrowLeft, ClipboardCheck, Pencil, Wrench, Calendar, Hash, Building2 } from 'lucide-react'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const { data: equipment } = await supabase
    .from('equipment')
    .select(`
      id, name, make, model, serial_number, company_asset_number, year,
      status, photo_url, notes, last_inspection_at, next_inspection_due,
      equipment_types(name, category),
      jobs(name),
      workers!assigned_worker_id(first_name, last_name)
    `)
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)
    .single()

  if (!equipment) notFound()

  const { data: inspections } = await supabase
    .from('equipment_inspections')
    .select('id, inspection_date, status, inspector_name, created_at')
    .eq('equipment_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const isManager = MANAGER_ROLES.includes(profile!.role as Role)
  const eqType = equipment.equipment_types as unknown as { name: string; category: string } | null
  const job    = equipment.jobs as unknown as { name: string } | null
  const worker = equipment.workers as unknown as { first_name: string; last_name: string } | null

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link href="/equipment" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Equipment
        </Link>
      </div>

      {equipment.status === 'out_of_service' && <EquipmentOutOfServiceBanner />}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {equipment.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={equipment.photo_url}
              alt={equipment.name}
              className="h-16 w-16 rounded-xl object-cover border border-slate-200"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <Wrench className="h-8 w-8 text-slate-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">{equipment.name}</h1>
              <EquipmentStatusBadge status={equipment.status} />
            </div>
            {eqType && (
              <p className="mt-0.5 text-sm text-slate-500">{eqType.category} · {eqType.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/equipment/${id}/inspect`}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600"
          >
            <ClipboardCheck className="h-4 w-4" />
            Inspect
          </Link>
          {isManager && (
            <Link
              href={`/equipment/${id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="w-1/3 bg-slate-50 px-4 py-2.5 font-medium text-slate-600">
                <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Make / Model</span>
              </td>
              <td className="px-4 py-2.5 text-slate-900">
                {[equipment.make, equipment.model].filter(Boolean).join(' ') || '—'}
              </td>
              <td className="w-1/3 bg-slate-50 px-4 py-2.5 font-medium text-slate-600">Year</td>
              <td className="px-4 py-2.5 text-slate-900">{equipment.year ?? '—'}</td>
            </tr>
            <tr>
              <td className="bg-slate-50 px-4 py-2.5 font-medium text-slate-600">
                <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> Serial #</span>
              </td>
              <td className="px-4 py-2.5 text-slate-900 font-mono text-xs">{equipment.serial_number || '—'}</td>
              <td className="bg-slate-50 px-4 py-2.5 font-medium text-slate-600">Asset #</td>
              <td className="px-4 py-2.5 text-slate-900 font-mono text-xs">{equipment.company_asset_number || '—'}</td>
            </tr>
            <tr>
              <td className="bg-slate-50 px-4 py-2.5 font-medium text-slate-600">Job Site</td>
              <td className="px-4 py-2.5 text-slate-900">{job?.name || '—'}</td>
              <td className="bg-slate-50 px-4 py-2.5 font-medium text-slate-600">Assigned To</td>
              <td className="px-4 py-2.5 text-slate-900">
                {worker ? `${worker.first_name} ${worker.last_name}` : '—'}
              </td>
            </tr>
            <tr>
              <td className="bg-slate-50 px-4 py-2.5 font-medium text-slate-600">
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Last Inspected</span>
              </td>
              <td className="px-4 py-2.5 text-slate-900">
                {equipment.last_inspection_at
                  ? new Date(equipment.last_inspection_at).toLocaleDateString()
                  : '—'}
              </td>
              <td className="bg-slate-50 px-4 py-2.5 font-medium text-slate-600">Next Due</td>
              <td className="px-4 py-2.5 text-slate-900">
                {equipment.next_inspection_due
                  ? new Date(equipment.next_inspection_due).toLocaleDateString()
                  : '—'}
              </td>
            </tr>
            {equipment.notes && (
              <tr>
                <td className="bg-slate-50 px-4 py-2.5 font-medium text-slate-600">Notes</td>
                <td className="px-4 py-2.5 text-slate-700" colSpan={3}>{equipment.notes}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Inspection history */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-700">
            Inspection History ({inspections?.length ?? 0})
          </h2>
          <Link
            href={`/equipment/${id}/inspections`}
            className="text-xs text-orange-600 hover:text-orange-800 font-medium"
          >
            View all
          </Link>
        </div>
        <EquipmentInspectionHistory
          inspections={inspections ?? []}
          equipmentId={id}
        />
      </div>
    </div>
  )
}
