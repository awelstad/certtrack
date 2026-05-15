import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClearworkMark } from '@/components/ui/ClearworkMark'
import Link from 'next/link'
import { Wrench, CheckCircle2, AlertTriangle, Clock, Calendar, CheckCircle, XCircle, MinusCircle, ClipboardList, Plus } from 'lucide-react'

type ChecklistItem = {
  id: string
  label: string
  is_critical: boolean
  result: 'pass' | 'fail' | 'na' | null
  note?: string | null
}

const STATUS_CONFIG = {
  active: {
    label: 'Active — Cleared for Use',
    icon: CheckCircle2,
    pill: 'bg-green-100 text-green-700 border border-green-200',
    icon_class: 'text-green-600',
  },
  out_of_service: {
    label: 'Out of Service — DO NOT USE',
    icon: AlertTriangle,
    pill: 'bg-red-100 text-red-700 border border-red-200',
    icon_class: 'text-red-600',
  },
  maintenance: {
    label: 'In Maintenance',
    icon: Clock,
    pill: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    icon_class: 'text-yellow-600',
  },
  retired: {
    label: 'Retired',
    icon: AlertTriangle,
    pill: 'bg-slate-100 text-slate-600 border border-slate-200',
    icon_class: 'text-slate-500',
  },
}

export default async function PublicEquipmentPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params
  const admin = createAdminClient()

  const { data: equipment } = await admin
    .from('equipment')
    .select(`
      id, name, make, model, year, serial_number, status,
      last_inspection_at, next_inspection_due, notes, organization_id,
      equipment_types(name, category),
      jobs(name)
    `)
    .eq('public_id', publicId)
    .single()

  if (!equipment) notFound()

  const { data: org } = await admin
    .from('organizations')
    .select('name, logo_url, brand_color')
    .eq('id', equipment.organization_id)
    .single()

  const { data: inspections } = await admin
    .from('equipment_inspections')
    .select('id, inspection_date, status, inspector_name, created_at, results')
    .eq('equipment_id', equipment.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const brandColor = org?.brand_color ?? '#0f172a'
  const eqType = equipment.equipment_types as unknown as { name: string; category: string } | null
  const job    = equipment.jobs as unknown as { name: string } | null
  const makeModel = [equipment.make, equipment.model].filter(Boolean).join(' ')

  const statusKey = (equipment.status ?? 'active') as keyof typeof STATUS_CONFIG
  const config = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.active
  const { Icon } = { Icon: config.icon }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Branding header */}
      <div className="px-5 py-3.5" style={{ backgroundColor: brandColor }}>
        <div className="mx-auto flex max-w-md items-center gap-3">
          {org?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.name} className="h-8 w-auto max-w-[100px] object-contain" />
          ) : (
            <ClearworkMark size={28} />
          )}
          <span className="font-semibold text-white">{org?.name ?? 'Clearwork'}</span>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-5 px-4 py-6">
        {/* Equipment identity card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${equipment.status === 'out_of_service' ? 'bg-red-50 border border-red-200' : 'bg-slate-100'}`}>
              <Wrench className={`h-7 w-7 ${equipment.status === 'out_of_service' ? 'text-red-500' : 'text-slate-500'}`} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{equipment.name}</h1>
              {eqType && <p className="text-sm text-slate-500">{eqType.category} · {eqType.name}</p>}
              {makeModel && <p className="text-sm text-slate-500">{makeModel}{equipment.year ? ` (${equipment.year})` : ''}</p>}
            </div>
          </div>

          {/* Status pill */}
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${config.pill}`}>
            <Icon className={`h-4 w-4 ${config.icon_class}`} />
            {config.label}
          </div>

          {/* Details */}
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
            {job && (
              <div className="flex justify-between">
                <span className="text-slate-500">Job Site</span>
                <span className="font-medium text-slate-900">{job.name}</span>
              </div>
            )}
            {equipment.serial_number && (
              <div className="flex justify-between">
                <span className="text-slate-500">Serial #</span>
                <span className="font-mono text-slate-900">{equipment.serial_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Last Inspected</span>
              <span className="font-medium text-slate-900">
                {equipment.last_inspection_at
                  ? new Date(equipment.last_inspection_at).toLocaleDateString()
                  : 'Never'}
              </span>
            </div>
            {equipment.next_inspection_due && (
              <div className="flex justify-between">
                <span className="text-slate-500">Next Inspection Due</span>
                <span className={`font-medium ${new Date(equipment.next_inspection_due) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                  {new Date(equipment.next_inspection_due).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {equipment.notes && (
            <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
              <strong>Note:</strong> {equipment.notes}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`/eq/${publicId}/inspect`}
            className="flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3.5 text-sm font-semibold text-orange-700 shadow-sm transition-colors hover:bg-orange-100"
          >
            <Plus className="h-4 w-4" />
            New Inspection
          </Link>
          <a
            href="#inspections"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ClipboardList className="h-4 w-4" />
            Past Inspections
          </a>
        </div>

        {/* Inspection history with full checklist */}
        {inspections && inspections.length > 0 && (
          <div id="inspections" className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              Recent Inspections
            </h2>
            {inspections.map((ins) => {
              const items = (ins.results ?? []) as ChecklistItem[]
              const fails = items.filter((i) => i.result === 'fail')
              const passes = items.filter((i) => i.result === 'pass')
              const nas = items.filter((i) => i.result === 'na')
              return (
                <div key={ins.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {/* Inspection header */}
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {new Date(ins.inspection_date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                      {ins.inspector_name && (
                        <p className="text-xs text-slate-500">{ins.inspector_name}</p>
                      )}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      ins.status === 'passed'
                        ? 'bg-green-100 text-green-700'
                        : ins.status === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {ins.status === 'passed' ? 'Passed' : ins.status === 'failed' ? 'Failed' : ins.status}
                    </span>
                  </div>

                  {/* Summary counts */}
                  {items.length > 0 && (
                    <div className="flex divide-x divide-slate-100 border-b border-slate-100 text-center text-xs">
                      <div className="flex-1 py-2">
                        <p className="font-semibold text-green-700">{passes.length}</p>
                        <p className="text-slate-400">Pass</p>
                      </div>
                      <div className="flex-1 py-2">
                        <p className="font-semibold text-red-700">{fails.length}</p>
                        <p className="text-slate-400">Fail</p>
                      </div>
                      <div className="flex-1 py-2">
                        <p className="font-semibold text-slate-500">{nas.length}</p>
                        <p className="text-slate-400">N/A</p>
                      </div>
                    </div>
                  )}

                  {/* Checklist items */}
                  {items.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <li key={item.id} className="flex items-start gap-3 px-5 py-3">
                          {item.result === 'pass' && <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />}
                          {item.result === 'fail' && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
                          {(item.result === 'na' || item.result === null) && <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${item.result === 'fail' ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                              {item.label}
                              {item.is_critical && item.result === 'fail' && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">CRITICAL</span>
                              )}
                            </p>
                            {item.note && (
                              <p className="mt-0.5 text-xs text-slate-500">{item.note}</p>
                            )}
                          </div>
                          <span className={`shrink-0 text-xs font-medium ${
                            item.result === 'pass' ? 'text-green-600' : item.result === 'fail' ? 'text-red-600' : 'text-slate-400'
                          }`}>
                            {item.result === 'pass' ? 'Pass' : item.result === 'fail' ? 'Fail' : 'N/A'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-5 py-3 text-sm text-slate-400">No checklist items recorded.</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-xs text-slate-400">
          Verified by Clearwork · Live status as of {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
