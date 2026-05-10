import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EquipmentInspectionStatusBadge } from '@/components/equipment/EquipmentInspectionStatusBadge'
import { EquipmentInspectionPdfExportButton } from '@/components/equipment/EquipmentInspectionPdfExportButton'
import { parseChecklist } from '@/lib/equipment'
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, AlertTriangle } from 'lucide-react'

const resultIcon = {
  pass: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  fail: <XCircle className="h-4 w-4 text-red-500" />,
  na:   <MinusCircle className="h-4 w-4 text-slate-400" />,
}

const resultLabel = { pass: 'Pass', fail: 'Fail', na: 'N/A' }

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string; inspectionId: string }>
}) {
  const { id, inspectionId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const { data: inspection } = await supabase
    .from('equipment_inspections')
    .select('id, inspection_date, status, inspector_name, inspector_signature, notes, results, created_at, equipment_inspection_templates(title)')
    .eq('id', inspectionId)
    .eq('equipment_id', id)
    .eq('organization_id', profile!.organization_id)
    .single()

  if (!inspection) notFound()

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, name')
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)
    .single()

  if (!equipment) notFound()

  const items = parseChecklist(inspection.results)
  const template = inspection.equipment_inspection_templates as unknown as { title: string } | null

  const passCount = items.filter((i) => i.result === 'pass').length
  const failCount = items.filter((i) => i.result === 'fail').length
  const naCount   = items.filter((i) => i.result === 'na').length

  return (
    <>
      <style>{`
        @media print {
          aside, nav, header, .equipment-print-hide { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .lg\\:pl-64 { padding-left: 0 !important; }
          body { background: white; }
        }
        @page { margin: 1.5cm; }
      `}</style>

      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-3xl">
        <div className="equipment-print-hide mb-4 flex items-center justify-between">
          <Link href={`/equipment/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Equipment
          </Link>
          <EquipmentInspectionPdfExportButton equipmentId={id} />
        </div>

        {/* Header */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Equipment Inspection</p>
              <h1 className="mt-1 text-lg font-bold text-slate-900">{equipment.name}</h1>
              {template && <p className="text-sm text-slate-500">{template.title}</p>}
            </div>
            <EquipmentInspectionStatusBadge status={inspection.status} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Date</p>
              <p className="text-slate-900">{new Date(inspection.inspection_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Inspector</p>
              <p className="text-slate-900">{inspection.inspector_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Pass</p>
              <p className="font-semibold text-green-700">{passCount}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Fail</p>
              <p className="font-semibold text-red-700">{failCount}</p>
            </div>
          </div>
        </div>

        {/* Checklist results */}
        {items.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Checklist Results ({items.length} items)
              </h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id} className="px-5 py-3">
                  <div className="flex items-start gap-3">
                    {resultIcon[item.result as keyof typeof resultIcon] ?? <MinusCircle className="h-4 w-4 text-slate-300" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-900">{item.label}</p>
                        {item.is_critical && (
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" aria-label="Critical item" />
                        )}
                      </div>
                      {item.result === 'fail' && item.note && (
                        <p className="mt-0.5 text-xs text-red-600">{item.note}</p>
                      )}
                    </div>
                    <span className={[
                      'shrink-0 text-xs font-semibold',
                      item.result === 'pass' ? 'text-green-700' :
                      item.result === 'fail' ? 'text-red-700' : 'text-slate-400',
                    ].join(' ')}>
                      {resultLabel[item.result as keyof typeof resultLabel] ?? '—'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes */}
        {inspection.notes && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500">Notes</h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{inspection.notes}</p>
          </div>
        )}

        {/* Signature */}
        {inspection.inspector_signature && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Inspector Signature</h2>
            <p className="mb-2 text-sm font-medium text-slate-900">{inspection.inspector_name}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={inspection.inspector_signature}
              alt="Inspector signature"
              className="h-16 w-full max-w-xs object-contain border-t border-slate-200 pt-2"
            />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Generated by Clearwork · {new Date().toLocaleString()}
        </p>
      </div>
    </>
  )
}
