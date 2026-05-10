import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ReportPrintHeader } from '@/components/reports/ReportPrintHeader'
import { ReportExportButtons } from '@/components/reports/ReportExportButtons'
import { ReportTable, Td } from '@/components/reports/ReportTable'
import { ArrowLeft } from 'lucide-react'
import { daysUntilExpiry } from '@/lib/types'

const PRINT_STYLE = `
  @media print {
    aside,nav,header,.report-print-hide{display:none!important}
    main{padding:0!important;margin:0!important}
    .lg\\:pl-64{padding-left:0!important}
    body{background:white}
  }
  @page{margin:1.5cm}
`

export default async function ExpiredCertsReport({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; type?: string }>
}) {
  const { job: jobFilter, type: typeFilter } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()
  const orgId = profile!.organization_id
  const today = new Date().toISOString().split('T')[0]

  const { data: org } = await supabase.from('organizations').select('name, logo_url, brand_color').eq('id', orgId).single()
  const { data: jobs } = await supabase.from('jobs').select('id, name').eq('organization_id', orgId).eq('status', 'active').order('name')
  const { data: certTypes } = await supabase.from('certification_types').select('id, name').eq('organization_id', orgId).order('name')

  let query = supabase
    .from('worker_certifications')
    .select('id, expiry_date, status, workers(id, first_name, last_name, trade, employer), certification_types(id, name)')
    .eq('organization_id', orgId)
    .eq('status', 'approved')
    .lt('expiry_date', today)
    .order('expiry_date', { ascending: true })

  if (typeFilter) query = query.eq('certification_type_id', typeFilter)

  const { data: certs } = await query

  // Map workers to jobs via job_workers
  const workerIds = [...new Set((certs ?? []).map((c) => {
    const w = c.workers as unknown as { id: string } | null
    return w?.id
  }).filter(Boolean) as string[])]

  let workerJobMap = new Map<string, string>()
  if (workerIds.length > 0) {
    const { data: jws } = await supabase
      .from('job_workers')
      .select('worker_id, jobs(id, name)')
      .in('worker_id', workerIds)
    for (const jw of jws ?? []) {
      const j = jw.jobs as unknown as { id: string; name: string } | null
      if (j) workerJobMap.set(jw.worker_id, j.name)
    }
  }

  const rows = (certs ?? []).filter((c) => {
    if (!jobFilter) return true
    const w = c.workers as unknown as { id: string } | null
    return w && workerJobMap.has(w.id)
  }).map((c) => {
    const w = c.workers as unknown as { id: string; first_name: string; last_name: string; trade: string | null; employer: string | null } | null
    const ct = c.certification_types as unknown as { name: string } | null
    const days = c.expiry_date ? Math.abs(daysUntilExpiry(c.expiry_date)) : 0
    const jobName = w ? (workerJobMap.get(w.id) ?? '—') : '—'
    return {
      Worker: w ? `${w.first_name} ${w.last_name}` : '—',
      Trade: w?.trade ?? '—',
      Employer: w?.employer ?? '—',
      Certification: ct?.name ?? '—',
      'Expiry Date': c.expiry_date ? new Date(c.expiry_date).toLocaleDateString() : '—',
      'Days Expired': days,
      'Job Site': jobName,
    }
  })

  const csvCols = [
    { header: 'Worker',       key: 'Worker' },
    { header: 'Trade',        key: 'Trade' },
    { header: 'Employer',     key: 'Employer' },
    { header: 'Certification',key: 'Certification' },
    { header: 'Expiry Date',  key: 'Expiry Date' },
    { header: 'Days Expired', key: 'Days Expired' },
    { header: 'Job Site',     key: 'Job Site' },
  ]

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl">
        {/* Nav */}
        <div className="report-print-hide mb-4 flex items-center justify-between">
          <Link href="/reports" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Reports
          </Link>
          <ReportExportButtons filename="expired-certifications" csvRows={rows} csvColumns={csvCols} />
        </div>

        <ReportPrintHeader
          orgName={org?.name ?? 'Clearwork'}
          logoUrl={org?.logo_url}
          brandColor={org?.brand_color}
          title="Expired Certifications"
          subtitle={`${rows.length} record${rows.length !== 1 ? 's' : ''}`}
        />

        {/* Filters */}
        <form method="GET" className="report-print-hide mb-5 flex flex-wrap gap-3">
          <select
            name="type"
            defaultValue={typeFilter ?? ''}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">All cert types</option>
            {(certTypes ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
            Filter
          </button>
          {(typeFilter) && (
            <Link href="/reports/expired" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Clear
            </Link>
          )}
        </form>

        <ReportTable
          columns={[
            { header: 'Worker' },
            { header: 'Trade' },
            { header: 'Employer' },
            { header: 'Certification' },
            { header: 'Expired' },
            { header: 'Days Ago' },
            { header: 'Job Site' },
          ]}
          rowCount={rows.length}
          empty="No expired certifications found."
        >
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <Td><span className="font-medium text-slate-900">{r.Worker}</span></Td>
              <Td>{r.Trade}</Td>
              <Td>{r.Employer}</Td>
              <Td>{r.Certification}</Td>
              <Td>
                <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-medium text-red-700">
                  {r['Expiry Date']}
                </span>
              </Td>
              <Td className="font-semibold text-red-700">{r['Days Expired']}d</Td>
              <Td>{r['Job Site']}</Td>
            </tr>
          ))}
        </ReportTable>

        <p className="mt-6 text-center text-xs text-slate-400">
          Generated by Clearwork · {new Date().toLocaleString()}
        </p>
      </div>
    </>
  )
}
