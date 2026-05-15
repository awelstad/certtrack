import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClearworkMark } from '@/components/ui/ClearworkMark'
import { PublicEquipmentInspectForm } from '@/components/equipment/PublicEquipmentInspectForm'
import { parseChecklistTemplate } from '@/lib/equipment'
import { ArrowLeft, Wrench } from 'lucide-react'

export default async function PublicInspectPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params
  const admin = createAdminClient()

  const { data: equipment } = await admin
    .from('equipment')
    .select('id, name, make, model, status, organization_id, equipment_type_id, equipment_types(name)')
    .eq('public_id', publicId)
    .single()

  if (!equipment) notFound()

  const { data: org } = await admin
    .from('organizations')
    .select('name, logo_url, brand_color')
    .eq('id', equipment.organization_id)
    .single()

  // Fetch system templates + org templates for this equipment type
  const typeId = equipment.equipment_type_id
  const [{ data: systemTemplates }, { data: orgTemplates }] = await Promise.all([
    admin
      .from('equipment_inspection_templates')
      .select('id, title, checklist_items')
      .is('organization_id', null)
      .or(typeId ? `equipment_type_id.is.null,equipment_type_id.eq.${typeId}` : 'equipment_type_id.is.null')
      .order('title'),
    admin
      .from('equipment_inspection_templates')
      .select('id, title, checklist_items')
      .eq('organization_id', equipment.organization_id)
      .or(typeId ? `equipment_type_id.is.null,equipment_type_id.eq.${typeId}` : 'equipment_type_id.is.null')
      .order('title'),
  ])

  const templates = [...(systemTemplates ?? []), ...(orgTemplates ?? [])].map((t) => ({
    id: t.id,
    title: t.title,
    checklist_items: parseChecklistTemplate(t.checklist_items),
  }))

  const brandColor = org?.brand_color ?? '#0f172a'
  const eqType = equipment.equipment_types as unknown as { name: string } | null

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

      <div className="mx-auto max-w-md px-4 py-6">
        <div className="mb-4">
          <Link
            href={`/eq/${publicId}`}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Equipment
          </Link>
        </div>

        {/* Equipment summary card */}
        <div className="mb-5 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${equipment.status === 'out_of_service' ? 'bg-red-50 border border-red-200' : 'bg-slate-100'}`}>
            <Wrench className={`h-6 w-6 ${equipment.status === 'out_of_service' ? 'text-red-500' : 'text-slate-500'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{equipment.name}</p>
            {eqType && <p className="text-sm text-slate-500">{eqType.name}</p>}
            {(equipment.make || equipment.model) && (
              <p className="text-xs text-slate-400">{[equipment.make, equipment.model].filter(Boolean).join(' ')}</p>
            )}
          </div>
        </div>

        <h1 className="mb-5 text-lg font-bold text-slate-900">New Inspection</h1>

        {templates.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center shadow-sm">
            <p className="text-sm text-slate-500">No inspection templates are set up for this equipment.</p>
            <p className="mt-1 text-xs text-slate-400">Contact your administrator to add a template.</p>
          </div>
        ) : (
          <PublicEquipmentInspectForm
            equipmentId={equipment.id}
            publicId={publicId}
            templates={templates}
          />
        )}
      </div>
    </div>
  )
}
