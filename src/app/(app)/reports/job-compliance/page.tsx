import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ReportPrintHeader } from '@/components/reports/ReportPrintHeader'
import { ReportExportButtons } from '@/components/reports/ReportExportButtons'
import { ReportTable, Td } from '@/components/reports/ReportTable'
import { ArrowLeft } from 'lucide-react'
import { calculateWorkerJobStatus } from '@/lib/certifications'
import type { WorkerCertForJob } from '@/lib/certifications'
import type { CertStatus } from '@/lib/types'

const PRINT_STYLE = `
  @media print {
    aside,nav,header,.report-print-hide{display:none!important}
    main{padding:0!important;margin:0!important}
    .lg\\:pl-64{padding-left:0!important}
    body{background:white}
  }
  @page{margin:1.5cm}
`

function pct(n: number, d: number) {
  return d === 0 ? 100 : Math.round((n / d) * 100)
}

export default async function JobComplianceReport({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>
}) {
  const { job: jobFilter } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()
  const orgId = profile!.organization_id

  const { data: org } = await supabase.from('organizations').select('name, logo_url, brand_color').eq('id', orgId).single()

  let jobsQuery = supabase.from('jobs').select('id, name, status').eq('organization_id', orgId).eq('status', 'active').order('name')
  if (jobFilter) jobsQuery = supabase.from('jobs').select('id, name, status').eq('organization_id', orgId).eq('id', jobFilter)
  const { data: jobs } = await jobsQuery

  const { data: allJobs } = await supabase.from('jobs').select('id, name').eq('organization_id', orgId).eq('status', 'active').order('name')

  const jobIds = (jobs ?? []).map((j) => j.id)

  // Batch fetch all job_workers and job requirements
  const [{ data: allJobWorkers }, { data: allRequirements }, { data: allCertsRaw }] = await Promise.all([
    jobIds.length > 0
      ? supabase.from('job_workers').select('job_id, worker_id').in('job_id', jobIds)
      : Promise.resolve({ data: [] as { job_id: string; worker_id: string }[] }),
    jobIds.length > 0
      ? supabase.from('job_required_certifications').select('job_id, certification_type_id').in('job_id', jobIds)
      : Promise.resolve({ data: [] as { job_id: string; certification_type_id: string }[] }),
    supabase.from('worker_certifications')
      .select('worker_id, certification_type_id, status, expiry_date')
      .eq('organization_id', orgId),
  ])
  const allCerts = allCertsRaw as Array<{ worker_id: string; certification_type_id: string; status: string; expiry_date: string | null }> | null

  // Index data
  const reqsByJob = new Map<string, string[]>()
  for (const r of allRequirements ?? []) {
    if (!reqsByJob.has(r.job_id)) reqsByJob.set(r.job_id, [])
    reqsByJob.get(r.job_id)!.push(r.certification_type_id)
  }

  const workersByJob = new Map<string, string[]>()
  for (const jw of allJobWorkers ?? []) {
    if (!workersByJob.has(jw.job_id)) workersByJob.set(jw.job_id, [])
    workersByJob.get(jw.job_id)!.push(jw.worker_id)
  }

  const certsByWorker = new Map<string, WorkerCertForJob[]>()
  for (const c of (allCerts ?? []) as Array<{ worker_id: string; certification_type_id: string; status: string; expiry_date: string | null }>) {
    if (!certsByWorker.has(c.worker_id)) certsByWorker.set(c.worker_id, [])
    certsByWorker.get(c.worker_id)!.push({
      certification_type_id: c.certification_type_id,
      status: c.status as CertStatus,
      expiry_date: c.expiry_date,
    })
  }

  // Compute per-job stats
  const jobRows = (jobs ?? []).map((job) => {
    const reqTypeIds = reqsByJob.get(job.id) ?? []
    const workerIds  = workersByJob.get(job.id) ?? []
    let cleared = 0, expiring = 0, notCleared = 0

    for (const wid of workerIds) {
      const certs = certsByWorker.get(wid) ?? []
      const status = calculateWorkerJobStatus(reqTypeIds, certs)
      if (status === 'green')  cleared++
      else if (status === 'yellow') expiring++
      else notCleared++
    }

    const total = workerIds.length
    const clearPct = pct(cleared, total)

    return {
      Job:          job.name,
      Workers:      total,
      Cleared:      cleared,
      Expiring:     expiring,
      'Not Cleared':notCleared,
      '% Cleared':  `${clearPct}%`,
      _pct:         clearPct,
      _total:       total,
    }
  })

  const csvCols = [
    { header: 'Job',          key: 'Job' },
    { header: 'Total Workers',key: 'Workers' },
    { header: 'Cleared',      key: 'Cleared' },
    { header: 'Expiring Soon',key: 'Expiring' },
    { header: 'Not Cleared',  key: 'Not Cleared' },
    { header: '% Cleared',    key: '% Cleared' },
  ]

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl">
        <div className="report-print-hide mb-4 flex items-center justify-between">
          <Link href="/reports" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Reports
          </Link>
          <ReportExportButtons filename="job-compliance" csvRows={jobRows} csvColumns={csvCols} />
        </div>

        <ReportPrintHeader
          orgName={org?.name ?? 'Clearwork'}
          logoUrl={org?.logo_url}
          brandColor={org?.brand_color}
          title="Job Compliance Report"
          subtitle={`${jobRows.length} job${jobRows.length !== 1 ? 's' : ''}`}
        />

        {/* Job filter */}
        <form method="GET" className="report-print-hide mb-5 flex flex-wrap gap-3">
          <select
            name="job"
            defaultValue={jobFilter ?? ''}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All active jobs</option>
            {(allJobs ?? []).map((j) => (
              <option key={j.id} value={j.id}>{j.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
            Filter
          </button>
          {jobFilter && (
            <Link href="/reports/job-compliance" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Clear</Link>
          )}
        </form>

        <ReportTable
          columns={[
            { header: 'Job' },
            { header: 'Workers', className: 'text-right' },
            { header: 'Cleared', className: 'text-right' },
            { header: 'Expiring', className: 'text-right' },
            { header: 'Not Cleared', className: 'text-right' },
            { header: '% Cleared', className: 'text-right' },
            { header: 'Status' },
          ]}
          rowCount={jobRows.length}
          empty="No active jobs found."
        >
          {jobRows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <Td><span className="font-semibold text-slate-900">{r.Job}</span></Td>
              <Td className="text-right">{r.Workers}</Td>
              <Td className="text-right font-semibold text-green-700">{r.Cleared}</Td>
              <Td className="text-right font-semibold text-yellow-600">{r.Expiring}</Td>
              <Td className="text-right font-semibold text-red-700">{r['Not Cleared']}</Td>
              <Td className="text-right">
                <span className={`text-sm font-bold ${r._pct >= 90 ? 'text-green-700' : r._pct >= 70 ? 'text-yellow-600' : 'text-red-700'}`}>
                  {r['% Cleared']}
                </span>
              </Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${r._pct >= 90 ? 'bg-green-500' : r._pct >= 70 ? 'bg-yellow-400' : 'bg-red-500'}`}
                      style={{ width: `${r._pct}%` }}
                    />
                  </div>
                </div>
              </Td>
            </tr>
          ))}
        </ReportTable>

        {/* Summary */}
        {jobRows.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              { label: 'Total Workers',  value: jobRows.reduce((s, r) => s + r.Workers, 0), color: 'text-slate-900' },
              { label: 'Cleared',        value: jobRows.reduce((s, r) => s + r.Cleared, 0), color: 'text-green-700' },
              { label: 'Need Attention', value: jobRows.reduce((s, r) => s + r.Expiring + r['Not Cleared'], 0), color: 'text-red-700' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Generated by Clearwork · {new Date().toLocaleString()}
        </p>
      </div>
    </>
  )
}
