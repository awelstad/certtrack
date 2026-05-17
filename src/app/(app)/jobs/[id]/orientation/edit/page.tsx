import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft } from 'lucide-react'
import { OrientationBuilder } from '@/components/OrientationBuilder'
import type { QuizQuestion } from '@/app/actions/jobOrientation'

export default async function EditOrientationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  if (!profile || !['owner', 'admin', 'manager'].includes(profile.role)) notFound()

  const { data: job } = await supabase
    .from('jobs')
    .select('name')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()
  if (!job) notFound()

  const { data: orientation } = await supabase
    .from('job_orientations')
    .select('title, description, video_url, passing_score, questions')
    .eq('job_id', id)
    .single()

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/jobs/${id}/orientation`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orientation
        </Link>
      </div>

      <h1 className="mb-6 text-xl font-bold text-slate-900">
        {orientation ? 'Edit Orientation' : 'Set Up Orientation'} — {job.name}
      </h1>

      <OrientationBuilder
        jobId={id}
        initial={
          orientation
            ? {
                title: orientation.title,
                description: orientation.description,
                video_url: orientation.video_url,
                passing_score: orientation.passing_score,
                questions: (orientation.questions ?? []) as QuizQuestion[],
              }
            : undefined
        }
      />
    </div>
  )
}
