import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { EquipmentInspectionEditForm } from '@/components/equipment/EquipmentInspectionEditForm'
import { parseChecklist } from '@/lib/equipment'
import { ArrowLeft } from 'lucide-react'

export default async function InspectionEditPage({
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
    .select('id, inspection_date, inspector_name, inspector_signature, notes, results, equipment_inspection_templates(title)')
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

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link
          href={`/equipment/${id}/inspections/${inspectionId}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Inspection
        </Link>
      </div>

      <h1 className="mb-1 text-lg font-bold text-slate-900">Edit Inspection</h1>
      <p className="mb-6 text-sm text-slate-500">{equipment.name}</p>

      <EquipmentInspectionEditForm
        inspectionId={inspectionId}
        equipmentId={id}
        templateTitle={template?.title ?? null}
        initialItems={items}
        initialInspectorName={inspection.inspector_name}
        initialInspectorSignature={inspection.inspector_signature ?? null}
        initialInspectionDate={inspection.inspection_date}
        initialNotes={inspection.notes ?? ''}
      />
    </div>
  )
}
