'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createInspectionTemplate } from '@/app/actions/equipment'
import { InspectionTemplateBuilder } from '@/components/equipment/InspectionTemplateBuilder'

interface EquipmentType { id: string; name: string; category: string }

export function TemplateCreateForm({ equipmentTypes }: { equipmentTypes: EquipmentType[] }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createInspectionTemplate, null)

  useEffect(() => {
    if (state?.templateId) router.push(`/equipment/templates/${state.templateId}`)
  }, [state, router])

  return (
    <InspectionTemplateBuilder
      formAction={formAction}
      pending={pending}
      state={state}
      equipmentTypes={equipmentTypes}
    />
  )
}
