import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Briefcase, ScanLine, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function KioskJobSelectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const { data: org } = await supabase
    .from('organizations')
    .select('name, logo_url, brand_color')
    .eq('id', profile!.organization_id)
    .single()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, name, address, city')
    .eq('organization_id', profile!.organization_id)
    .eq('status', 'active')
    .order('name')

  return (
    <div className="min-h-screen bg-slate-900 px-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {org?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logo_url} alt={org.name} className="h-8 object-contain" />
            ) : (
              <span className="text-lg font-bold text-white">{org?.name}</span>
            )}
          </div>
          <Link href="/jobs" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
        </div>

        <div className="mb-2 flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-orange-400" />
          <h1 className="text-2xl font-bold text-white">Site Kiosk</h1>
        </div>
        <p className="mb-8 text-slate-400">Select the job site to set up the check-in scanner.</p>

        {!jobs?.length ? (
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-8 text-center">
            <Briefcase className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-slate-400">No active jobs found.</p>
            <Link href="/jobs/new" className="mt-4 inline-block text-sm text-orange-400 hover:underline">
              Create a job
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => {
              const location = [job.address, job.city].filter(Boolean).join(', ')
              return (
                <li key={job.id}>
                  <Link
                    href={`/kiosk/${job.id}`}
                    className="flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-800 p-5 transition-colors hover:border-orange-500 hover:bg-slate-750 active:bg-slate-700"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
                      <Briefcase className="h-6 w-6 text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{job.name}</p>
                      {location && <p className="truncate text-sm text-slate-400">{location}</p>}
                    </div>
                    <ScanLine className="h-5 w-5 shrink-0 text-slate-500" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        <p className="mt-8 text-center text-xs text-slate-600">
          After selecting a job, hand the tablet to the site entrance. Workers scan their helmet QR code to check in and out.
        </p>
      </div>
    </div>
  )
}
