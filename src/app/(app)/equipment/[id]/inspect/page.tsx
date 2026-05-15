import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { EquipmentStatusBadge } from '@/components/equipment/EquipmentStatusBadge'
import { EquipmentInspectForm } from '@/components/equipment/EquipmentInspectForm'
import { parseChecklistTemplate } from '@/lib/equipment'
import { ArrowLeft, Wrench } from 'lucide-react'

export default async function EquipmentInspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, full_name')
    .eq('id', user!.id)
    .single()

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, name, status, equipment_type_id, equipment_types(name)')
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)
    .single()

  if (!equipment) notFound()

  // Read assigned template — column added in migration 015; fall back gracefully
  let assignedTemplateId: string | null = null
  try {
    const { data: tRow } = await supabase
      .from('equipment')
      .select('inspection_template_id')
      .eq('id', id)
      .single()
    assignedTemplateId = (tRow as { inspection_template_id?: string | null })?.inspection_template_id ?? null
  } catch { /* migration 015 not yet run */ }

  let templates: { id: string; title: string; checklist_items: ReturnType<typeof parseChecklistTemplate> }[]

  const admin = createAdminClient()
  if (assignedTemplateId) {
    // Use only the assigned template — admin bypasses RLS for system templates
    const { data: t } = await admin
      .from('equipment_inspection_templates')
      .select('id, title, checklist_items')
      .eq('id', assignedTemplateId)
      .single()
    templates = t ? [{ id: t.id, title: t.title, checklist_items: parseChecklistTemplate(t.checklist_items) }] : []
  } else {
    // Fall back to type-matched templates (system + org)
    const typeId = equipment.equipment_type_id
    const typeFilter = typeId
      ? `equipment_type_id.is.null,equipment_type_id.eq.${typeId}`
      : 'equipment_type_id.is.null'
    const [{ data: sysTemplates }, { data: orgTemplates }] = await Promise.all([
      admin
        .from('equipment_inspection_templates')
        .select('id, title, checklist_items')
        .is('organization_id', null)
        .or(typeFilter)
        .order('title'),
      supabase
        .from('equipment_inspection_templates')
        .select('id, title, checklist_items')
        .eq('organization_id', profile!.organization_id)
        .or(typeFilter)
        .order('title'),
    ])
    templates = [...(sysTemplates ?? []), ...(orgTemplates ?? [])].map((t) => ({
      id: t.id,
      title: t.title,
      checklist_items: parseChecklistTemplate(t.checklist_items),
    }))
  }

  const eqType = equipment.equipment_types as unknown as { name: string } | null

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link href={`/equipment/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Equipment
        </Link>
      </div>

      {/* Equipment summary */}
      <div className="mb-6 flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">
          <Wrench className="h-6 w-6 text-slate-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{equipment.name}</p>
          {eqType && <p className="text-sm text-slate-500">{eqType.name}</p>}
        </div>
        <EquipmentStatusBadge status={equipment.status} />
      </div>

      <h1 className="mb-6 text-lg font-bold text-slate-900">New Inspection</h1>

      <EquipmentInspectForm
        equipmentId={id}
        templates={templates}
        initialInspectorName={profile!.full_name ?? ''}
      />
    </div>
  )
}
