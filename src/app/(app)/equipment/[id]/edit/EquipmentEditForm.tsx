'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateEquipment } from '@/app/actions/equipment'
import { EquipmentForm } from '@/components/equipment/EquipmentForm'

interface EquipmentType { id: string; name: string; category: string }
interface Job { id: string; name: string }
interface Worker { id: string; first_name: string; last_name: string }

interface Props {
  equipmentId: string
  equipmentTypes: EquipmentType[]
  jobs: Job[]
  workers: Worker[]
  initialValues: {
    name: string
    equipmentTypeId: string
    make: string
    model: string
    serialNumber: string
    companyAssetNumber: string
    year: string
    jobId: string
    assignedWorkerId: string
    photoUrl: string
    notes: string
    status: string
  }
}

export function EquipmentEditForm({ equipmentId, equipmentTypes, jobs, workers, initialValues }: Props) {
  const [state, formAction, pending] = useActionState(updateEquipment, null)
  const router = useRouter()

  useEffect(() => {
    if (state && !state.error) router.push(`/equipment/${equipmentId}`)
  }, [state, router, equipmentId])

  return (
    <EquipmentForm
      formAction={formAction}
      pending={pending}
      state={state}
      equipmentTypes={equipmentTypes}
      jobs={jobs}
      workers={workers}
      equipmentId={equipmentId}
      initialValues={initialValues}
    />
  )
}
