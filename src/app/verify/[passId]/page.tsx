import { createAdminClient } from '@/lib/supabase/admin'
import { CheckCircle, XCircle, ShieldCheck, ShieldAlert } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function VerifyPassPage({
  params,
}: {
  params: Promise<{ passId: string }>
}) {
  const { passId } = await params
  const admin = createAdminClient()

  const { data: completion } = await admin
    .from('orientation_completions')
    .select(`
      pass_id,
      worker_name,
      worker_email,
      employer,
      score,
      passed,
      completed_at,
      worker_profile_id,
      job_id,
      organization_id
    `)
    .eq('pass_id', passId.toUpperCase())
    .eq('passed', true)
    .maybeSingle()

  // Fetch related names in parallel if completion found
  let jobName: string | null = null
  let workerNumber: string | null = null
  let certWarnings: string[] = []

  if (completion) {
    const [jobRes, profileRes, reqCertRes] = await Promise.all([
      admin.from('jobs').select('name').eq('id', completion.job_id).single(),
      completion.worker_profile_id
        ? admin.from('profiles').select('worker_number').eq('id', completion.worker_profile_id).single()
        : Promise.resolve({ data: null }),
      admin
        .from('job_required_certifications')
        .select('certification_types(name)')
        .eq('job_id', completion.job_id)
        .eq('organization_id', completion.organization_id),
    ])

    jobName = jobRes.data?.name ?? null
    workerNumber = profileRes.data?.worker_number ?? null

    type CertRow = { certification_types: { name: string } | null }
    certWarnings = (reqCertRes.data as CertRow[] ?? [])
      .map((r) => r.certification_types?.name)
      .filter((n): n is string => Boolean(n))
  }

  const completedDate = completion
    ? new Date(completion.completed_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const completedTime = completion
    ? new Date(completion.completed_at).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header bar */}
        <div className="text-center mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Clearwork Pass Verification</p>
        </div>

        {completion ? (
          <>
            {/* Valid pass card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-green-500 px-6 py-5 text-center">
                <ShieldCheck className="mx-auto h-12 w-12 text-white mb-2" />
                <h1 className="text-2xl font-bold text-white">VALID PASS</h1>
                <p className="text-green-100 text-sm mt-1 font-mono tracking-widest">{passId.toUpperCase()}</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Worker</p>
                    <p className="font-semibold text-slate-900">{completion.worker_name}</p>
                  </div>
                  {workerNumber && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Worker ID</p>
                      <p className="font-mono font-semibold text-slate-900">{workerNumber}</p>
                    </div>
                  )}
                  {completion.employer && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Employer</p>
                      <p className="font-semibold text-slate-900">{completion.employer}</p>
                    </div>
                  )}
                  {jobName && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Job Site</p>
                      <p className="font-semibold text-slate-900">{jobName}</p>
                    </div>
                  )}
                  {completion.score !== null && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Quiz Score</p>
                      <p className="font-semibold text-slate-900">{completion.score}%</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Completed</p>
                    <p className="font-semibold text-slate-900">{completedDate}</p>
                    <p className="text-xs text-slate-500">{completedTime}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3">
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
                  <p className="text-sm font-medium text-green-700">Worker has passed site orientation</p>
                </div>

                {certWarnings.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Required certs not yet on file:</p>
                    {certWarnings.map((n) => (
                      <p key={n} className="text-xs text-amber-600">• {n}</p>
                    ))}
                    <p className="text-xs text-amber-600 mt-1">Worker should upload these to be fully cleared.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Invalid / not found */
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-red-500 px-6 py-5 text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-white mb-2" />
              <h1 className="text-2xl font-bold text-white">INVALID PASS</h1>
              <p className="text-red-100 text-sm mt-1 font-mono tracking-widest">{passId.toUpperCase()}</p>
            </div>

            <div className="p-6 space-y-4 text-center">
              <XCircle className="mx-auto h-10 w-10 text-red-400" />
              <div>
                <p className="font-semibold text-slate-900">No record found</p>
                <p className="mt-1 text-sm text-slate-500">
                  This pass ID does not match any completed orientation in the system. Check the ID and try again.
                </p>
              </div>
              <p className="text-xs text-slate-400">
                Pass IDs are formatted like <span className="font-mono font-semibold">ORI-XXXX-XXXX</span>
              </p>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400">
          Verified by Clearwork · clearwork.io
        </p>
      </div>
    </div>
  )
}
