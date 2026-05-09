'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createJha } from '@/app/actions/jha'
import { JhaFormBuilder } from '@/components/jha/JhaFormBuilder'
import { DEFAULT_JHA_FIELD_VALUES } from '@/lib/jha'
import type { JhaStep } from '@/lib/jha'

interface Job      { id: string; name: string }
interface Template { id: string; title: string; default_steps: JhaStep[]; default_ppe: string[] }

interface Props {
  jobs: Job[]
  templates: Template[]
}

export function JhaCreateForm({ jobs, templates }: Props) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createJha, null)

  useEffect(() => {
    if (state?.jhaId) router.push(`/jha/${state.jhaId}`)
  }, [state?.jhaId, router])

  return (
    <JhaFormBuilder
      initialValues={{
        title: '',
        workDescription: '',
        workArea: '',
        workDate: new Date().toISOString().split('T')[0],
        jobId: null,
        templateId: null,
        fieldValues: DEFAULT_JHA_FIELD_VALUES,
      }}
      formAction={formAction}
      pending={pending}
      state={state}
      jobs={jobs}
      templates={templates}
    />
  )
}
