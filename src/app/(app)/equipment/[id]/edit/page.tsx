import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { EquipmentEditForm } from './EquipmentEditForm'
import { ArrowLeft } from 'lucide-react'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function EquipmentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (!profile || !MANAGER_ROLES.includes(profile.role as Role)) notFound()

  const { data: equipment } = await supabase
    .from('equipment')
    .select('id, name, equipment_type_id, make, model, serial_number, company_asset_number, year, job_id, assigned_worker_id, photo_url, notes, status')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!equipment) notFound()

  const [{ data: equipmentTypes }, { data: jobs }, { data: workers }] = await Promise.all([
    supabase.from('equipment_types').select('id, name, category').order('category').order('name'),
    supabase.from('jobs').select('id, name').eq('organization_id', profile.organization_id).eq('status', 'active').order('name'),
    supabase.from('workers').select('id, first_name, last_name').eq('organization_id', profile.organization_id).eq('status', 'active').order('last_name'),
  ])

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4">
        <Link href={`/equipment/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Equipment
        </Link>
      </div>
      <PageHeader title="Edit Equipment" description="Update equipment details and assignment." />
      <div className="max-w-2xl">
        <EquipmentEditForm
          equipmentId={id}
          equipmentTypes={equipmentTypes ?? []}
          jobs={jobs ?? []}
          workers={workers ?? []}
          initialValues={{
            name:               equipment.name,
            equipmentTypeId:    equipment.equipment_type_id ?? '',
            make:               equipment.make ?? '',
            model:              equipment.model ?? '',
            serialNumber:       equipment.serial_number ?? '',
            companyAssetNumber: equipment.company_asset_number ?? '',
            year:               equipment.year?.toString() ?? '',
            jobId:              equipment.job_id ?? '',
            assignedWorkerId:   equipment.assigned_worker_id ?? '',
            photoUrl:           equipment.photo_url ?? '',
            notes:              equipment.notes ?? '',
            status:             equipment.status,
          }}
        />
      </div>
    </div>
  )
}
