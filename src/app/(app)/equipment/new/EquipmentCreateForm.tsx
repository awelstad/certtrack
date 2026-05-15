'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createEquipment } from '@/app/actions/equipment'
import { EquipmentForm } from '@/components/equipment/EquipmentForm'

interface EquipmentType { id: string; name: string; category: string }
interface Job { id: string; name: string }
interface Worker { id: string; first_name: string; last_name: string }

interface InspectionTemplate { id: string; title: string }

interface Props {
  equipmentTypes: EquipmentType[]
  jobs: Job[]
  workers: Worker[]
  inspectionTemplates: InspectionTemplate[]
}

export function EquipmentCreateForm({ equipmentTypes, jobs, workers, inspectionTemplates }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createEquipment, null)

  useEffect(() => {
    if (state?.equipmentId) router.push(`/equipment/${state.equipmentId}`)
  }, [state, router])

  return (
    <EquipmentForm
      formAction={formAction}
      pending={pending}
      state={state}
      equipmentTypes={equipmentTypes}
      jobs={jobs}
      workers={workers}
      inspectionTemplates={inspectionTemplates}
    />
  )
}
