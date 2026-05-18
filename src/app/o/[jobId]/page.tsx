import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { OrientationIdentityGate } from './OrientationIdentityGate'
import { OrientationFlow2 } from './OrientationFlow2'
import type { QuizQuestion } from '@/app/actions/jobOrientation'

export const dynamic = 'force-dynamic'

export default async function PublicOrientationPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId } = await params
  const admin = createAdminClient()

  // Fetch orientation + related data (no auth needed for this)
  const { data: orientation } = await admin
    .from('job_orientations')
    .select('id, job_id, organization_id, title, description, video_url, passing_score, questions')
    .eq('job_id', jobId)
    .single()

  if (!orientation) notFound()

  const [
    { data: job },
    { data: org },
    { data: subs },
    { data: reqCerts },
  ] = await Promise.all([
    admin.from('jobs').select('name, city, state').eq('id', jobId).single(),
    admin.from('organizations').select('name, logo_url, brand_color').eq('id', orientation.organization_id).single(),
    admin
      .from('subcontractor_invites')
      .select('company_name')
      .eq('job_id', jobId)
      .eq('organization_id', orientation.organization_id),
    admin
      .from('job_required_certifications')
      .select('certification_types(name)')
      .eq('job_id', jobId)
      .eq('organization_id', orientation.organization_id),
  ])

  const jobName = job?.name ?? 'Site Orientation'
  const jobLocation = [job?.city, job?.state].filter(Boolean).join(', ') || null
  const orgName = org?.name ?? 'Your Company'
  const logoUrl = org?.logo_url ?? null
  const brandColor = org?.brand_color ?? '#f97316'
  const subNames = (subs ?? []).map((s) => s.company_name)

  type CertRow = { certification_types: { name: string } | null }
  const certNames = ((reqCerts as unknown as CertRow[]) ?? [])
    .map((r) => r.certification_types?.name)
    .filter((n): n is string => Boolean(n))

  // Check auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <OrientationIdentityGate
        jobId={jobId}
        jobName={jobName}
        orgName={orgName}
        logoUrl={logoUrl}
        brandColor={brandColor}
        jobLocation={jobLocation}
      />
    )
  }

  // Fetch profile and session for authenticated user
  const [
    { data: profile },
    { data: existingSession },
    { data: existingPass },
  ] = await Promise.all([
    admin.from('profiles').select('full_name, worker_number, phone').eq('id', user.id).maybeSingle(),
    admin
      .from('orientation_sessions')
      .select('step, answers, employer, employer_type')
      .eq('worker_id', user.id)
      .eq('orientation_id', orientation.id)
      .maybeSingle(),
    admin
      .from('orientation_completions')
      .select('pass_id, worker_name, employer, completed_at, score')
      .eq('worker_profile_id', user.id)
      .eq('orientation_id', orientation.id)
      .eq('passed', true)
      .maybeSingle(),
  ])

  return (
    <OrientationFlow2
      orientation={{
        ...orientation,
        questions: (orientation.questions ?? []) as QuizQuestion[],
      }}
      profile={profile ?? null}
      userEmail={user.email ?? ''}
      userMeta={{
        full_name: (user.user_metadata?.full_name as string | undefined) ?? '',
        phone: (user.user_metadata?.phone as string | undefined) ?? '',
      }}
      orgId={orientation.organization_id}
      orgName={orgName}
      logoUrl={logoUrl}
      brandColor={brandColor}
      jobName={jobName}
      jobLocation={jobLocation}
      subNames={subNames}
      requiredCertNames={certNames}
      existingSession={
        existingSession
          ? {
              step: existingSession.step,
              answers: (existingSession.answers as Record<string, number>) ?? {},
              employer: existingSession.employer ?? '',
              employerType: existingSession.employer_type ?? '',
            }
          : null
      }
      existingPass={
        existingPass
          ? {
              passId: existingPass.pass_id ?? '',
              workerName: existingPass.worker_name,
              employer: existingPass.employer ?? '',
              completedAt: existingPass.completed_at,
              score: existingPass.score ?? 0,
            }
          : null
      }
    />
  )
}
