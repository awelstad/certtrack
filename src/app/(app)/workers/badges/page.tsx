import { headers } from 'next/headers'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BulkBadgePrint } from '@/components/workers/BulkBadgePrint'
import { ArrowLeft } from 'lucide-react'

export default async function WorkerBadgesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile!.organization_id
  const cookieStore = await cookies()
  const selectedJobId = cookieStore.get('selected_job_id')?.value ?? null

  let scopedWorkerIds: string[] | null = null
  let selectedJobName: string | null = null

  if (selectedJobId) {
    const [{ data: jobWorkers }, { data: jobRow }] = await Promise.all([
      supabase.from('job_workers').select('worker_id').eq('job_id', selectedJobId),
      supabase.from('jobs').select('name').eq('id', selectedJobId).single(),
    ])
    scopedWorkerIds = (jobWorkers ?? []).map((jw) => jw.worker_id)
    selectedJobName = jobRow?.name ?? null
  }

  let workers: { id: string; public_id: string; first_name: string; last_name: string; trade: string | null; employer: string | null; status: string }[] = []

  if (scopedWorkerIds !== null && scopedWorkerIds.length === 0) {
    workers = []
  } else {
    const query = supabase
      .from('workers')
      .select('id, public_id, first_name, last_name, trade, employer, status')
      .eq('organization_id', orgId)
      .eq('status', 'active')
      .order('last_name')

    const { data } = scopedWorkerIds
      ? await query.in('id', scopedWorkerIds)
      : await query

    workers = data ?? []
  }

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3 print:hidden">
        <Link href="/workers" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Workers
        </Link>
      </div>
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-slate-900">Print Badges</h1>
        <p className="mt-1 text-sm text-slate-500">
          {selectedJobName
            ? `Showing workers assigned to ${selectedJobName}.`
            : 'Select workers, then click Print. Each badge includes a QR code linked to their live certification profile.'}
        </p>
      </div>

      <BulkBadgePrint workers={workers} host={host} />
    </div>
  )
}
