'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type QuizQuestion = {
  id: string
  question: string
  options: [string, string, string, string]
  correct: number
}

export type OrientationState = {
  error?: string
  success?: boolean
}

export async function upsertJobOrientation(
  _prev: OrientationState | null,
  formData: FormData
): Promise<OrientationState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found' }
  if (!['owner', 'admin', 'manager'].includes(profile.role)) return { error: 'Insufficient permissions' }

  const jobId = formData.get('job_id') as string
  const title = (formData.get('title') as string)?.trim() || 'Site Safety Orientation'
  const description = (formData.get('description') as string)?.trim() || null
  const videoUrl = (formData.get('video_url') as string)?.trim() || null
  const passingScore = parseInt(formData.get('passing_score') as string) || 80
  const questionsRaw = formData.get('questions') as string

  let questions: QuizQuestion[] = []
  try {
    questions = JSON.parse(questionsRaw || '[]')
  } catch {
    return { error: 'Invalid questions format' }
  }

  const { error } = await supabase
    .from('job_orientations')
    .upsert({
      organization_id: profile.organization_id,
      job_id: jobId,
      title,
      description,
      video_url: videoUrl,
      passing_score: passingScore,
      questions,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'job_id' })

  if (error) return { error: error.message }

  revalidatePath(`/jobs/${jobId}/orientation`)
  return { success: true }
}

export async function submitOrientationCompletion(data: {
  orientationId: string
  jobId: string
  organizationId: string
  workerName: string
  workerId?: string
  score: number
  passed: boolean
  answers: number[]
}) {
  const admin = createAdminClient()
  const { error } = await admin.from('orientation_completions').insert({
    orientation_id: data.orientationId,
    job_id: data.jobId,
    organization_id: data.organizationId,
    worker_name: data.workerName,
    worker_id: data.workerId || null,
    score: data.score,
    passed: data.passed,
    answers: data.answers,
  })
  if (error) return { error: error.message }
  return { success: true }
}
