'use client'

import { useActionState } from 'react'
import { updateJha } from '@/app/actions/jha'
import { JhaFormBuilder } from '@/components/jha/JhaFormBuilder'
import type { JhaFieldValues, JhaStep } from '@/lib/jha'

interface Job      { id: string; name: string }
interface Template { id: string; title: string; default_steps: JhaStep[]; default_ppe: string[] }

interface InitialValues {
  title: string
  workDescription: string
  workArea: string
  workDate: string
  jobId: string | null
  templateId: string | null
  fieldValues: JhaFieldValues
}

interface Props {
  jhaId: string
  initialValues: InitialValues
  jobs: Job[]
  templates: Template[]
}

export function JhaEditForm({ jhaId, initialValues, jobs, templates }: Props) {
  const [state, formAction, pending] = useActionState(updateJha, null)

  return (
    <JhaFormBuilder
      jhaId={jhaId}
      initialValues={initialValues}
      formAction={formAction}
      pending={pending}
      state={state}
      jobs={jobs}
      templates={templates}
    />
  )
}
