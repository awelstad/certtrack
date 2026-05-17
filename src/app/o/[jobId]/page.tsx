import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { OrientationFlow } from '@/components/OrientationFlow'
import type { QuizQuestion } from '@/app/actions/jobOrientation'

export const dynamic = 'force-dynamic'

export default async function PublicOrientationPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
  const admin = createAdminClient()

  const { data: orientation } = await admin
    .from('job_orientations')
    .select('id, job_id, organization_id, title, description, video_url, passing_score, questions')
    .eq('job_id', jobId)
    .single()

  if (!orientation) notFound()

  return (
    <OrientationFlow
      orientation={{
        ...orientation,
        questions: (orientation.questions ?? []) as QuizQuestion[],
      }}
    />
  )
}
