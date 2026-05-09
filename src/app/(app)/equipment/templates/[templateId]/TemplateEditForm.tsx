'use client'

import { useActionState } from 'react'
import { updateInspectionTemplate } from '@/app/actions/equipment'
import { InspectionTemplateBuilder } from '@/components/equipment/InspectionTemplateBuilder'
import type { ChecklistTemplateItem } from '@/lib/equipment'

interface EquipmentType { id: string; name: string; category: string }

interface Props {
  templateId: string
  equipmentTypes: EquipmentType[]
  initialValues: {
    title: string
    description: string
    equipmentTypeId: string
    items: ChecklistTemplateItem[]
  }
}

export function TemplateEditForm({ templateId, equipmentTypes, initialValues }: Props) {
  const [state, formAction, pending] = useActionState(updateInspectionTemplate, null)

  return (
    <InspectionTemplateBuilder
      templateId={templateId}
      formAction={formAction}
      pending={pending}
      state={state}
      equipmentTypes={equipmentTypes}
      initialValues={initialValues}
    />
  )
}
