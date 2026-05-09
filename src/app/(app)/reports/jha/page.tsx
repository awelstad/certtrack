import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ReportPrintHeader } from '@/components/reports/ReportPrintHeader'
import { ReportExportButtons } from '@/components/reports/ReportExportButtons'
import { ReportTable, Td } from '@/components/reports/ReportTable'
import { JhaStatusBadge } from '@/components/jha/JhaStatusBadge'
import { ArrowLeft } from 'lucide-react'

const PRINT_STYLE = `
  @media print {
    aside,nav,header,.report-print-hide{display:none!important}
    main{padding:0!important;margin:0!important}
    .lg\\:pl-64{padding-left:0!important}
    body{background:white}
  }
  @page{margin:1.5cm}
`

const STATUS_OPTIONS = ['draft', 'active', 'completed', 'archived']

export default async function JhaReport({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; job?: string; from?: string; to?: string }>
}) {
  const { tab = 'jhas', status: statusFilter, job: jobFilter, from: fromFilter, to: toFilter } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()
  const orgId = profile!.organization_id

  const { data: org } = await supabase.from('organizations').select('name, logo_url, brand_color').eq('id', orgId).single()
  const { data: allJobs } = await supabase.from('jobs').select('id, name').eq('organization_id', orgId).order('name')

  // ── JHAs tab ─────────────────────────────────────────────────
  let jhasQuery = supabase
    .from('jhas')
    .select('id, title, status, work_date, jobs(name)')
    .eq('organization_id', orgId)
    .order('work_date', { ascending: false })

  if (statusFilter) jhasQuery = jhasQuery.eq('status', statusFilter)
  if (jobFilter)    jhasQuery = jhasQuery.eq('job_id', jobFilter)
  if (fromFilter)   jhasQuery = jhasQuery.gte('work_date', fromFilter)
  if (toFilter)     jhasQuery = jhasQuery.lte('work_date', toFilter)

  const { data: jhas } = await jhasQuery

  // Signature counts per JHA
  const jhaIds = (jhas ?? []).map((j) => j.id)
  const sigCountMap = new Map<string, number>()
  if (jhaIds.length > 0) {
    const { data: sigCounts } = await supabase
      .from('jha_signatures')
      .select('jha_id')
      .in('jha_id', jhaIds)
    for (const s of sigCounts ?? []) {
      sigCountMap.set(s.jha_id, (sigCountMap.get(s.jha_id) ?? 0) + 1)
    }
  }

  const jhaRows = (jhas ?? []).map((j) => {
    const job = j.jobs as unknown as { name: string } | null
    return {
      Title:      j.title,
      Job:        job?.name ?? '—',
      Date:       j.work_date ? new Date(j.work_date).toLocaleDateString() : '—',
      Status:     j.status,
      Signatures: sigCountMap.get(j.id) ?? 0,
      _id:        j.id,
      _status:    j.status,
    }
  })

  // ── Attendance tab ────────────────────────────────────────────
  let sigsQuery = supabase
    .from('jha_signatures')
    .select('id, printed_name, worker_identifier, signed_at, jha_id, jhas(title, work_date, jobs(name))')
    .eq('organization_id', orgId)
    .order('signed_at', { ascending: false })

  if (fromFilter) sigsQuery = sigsQuery.gte('signed_at', fromFilter)
  if (toFilter)   sigsQuery = sigsQuery.lte('signed_at', toFilter)

  const { data: sigs } = await sigsQuery

  const attendanceRows = (sigs ?? []).map((s) => {
    const jha = s.jhas as unknown as { title: string; work_date: string | null; jobs: { name: string } | null } | null
    const job = jha?.jobs as unknown as { name: string } | null
    return {
      'JHA Title':   jha?.title ?? '—',
      'Job Site':    job?.name ?? '—',
      'Work Date':   jha?.work_date ? new Date(jha.work_date).toLocaleDateString() : '—',
      'Signer Name': s.printed_name,
      'Badge/ID':    s.worker_identifier || '—',
      'Signed At':   new Date(s.signed_at).toLocaleString(),
    }
  })

  const jhasCsvCols = [
    { header: 'Title',      key: 'Title' },
    { header: 'Job',        key: 'Job' },
    { header: 'Date',       key: 'Date' },
    { header: 'Status',     key: 'Status' },
    { header: 'Signatures', key: 'Signatures' },
  ]
  const attCsvCols = [
    { header: 'JHA Title',   key: 'JHA Title' },
    { header: 'Job Site',    key: 'Job Site' },
    { header: 'Work Date',   key: 'Work Date' },
    { header: 'Signer Name', key: 'Signer Name' },
    { header: 'Badge/ID',    key: 'Badge/ID' },
    { header: 'Signed At',   key: 'Signed At' },
  ]

  const isAttendance = tab === 'attendance'

  function tabHref(t: string) {
    const sp = new URLSearchParams()
    sp.set('tab', t)
    if (statusFilter) sp.set('status', statusFilter)
    if (jobFilter)    sp.set('job', jobFilter)
    if (fromFilter)   sp.set('from', fromFilter)
    if (toFilter)     sp.set('to', toFilter)
    return `?${sp.toString()}`
  }

  function filterHref(extra: Record<string, string>) {
    const sp = new URLSearchParams()
    sp.set('tab', tab)
    if (statusFilter) sp.set('status', statusFilter)
    if (jobFilter)    sp.set('job', jobFilter)
    if (fromFilter)   sp.set('from', fromFilter)
    if (toFilter)     sp.set('to', toFilter)
    Object.entries(extra).forEach(([k, v]) => v ? sp.set(k, v) : sp.delete(k))
    return `?${sp.toString()}`
  }

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl">
        <div className="report-print-hide mb-4 flex items-center justify-between">
          <Link href="/reports" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Reports
          </Link>
          <ReportExportButtons
            filename={isAttendance ? 'jha-attendance' : 'jha-report'}
            csvRows={isAttendance ? attendanceRows : jhaRows}
            csvColumns={isAttendance ? attCsvCols : jhasCsvCols}
          />
        </div>

        <ReportPrintHeader
          orgName={org?.name ?? 'CertTrack'}
          logoUrl={org?.logo_url}
          brandColor={org?.brand_color}
          title={isAttendance ? 'JHA Attendance Report' : 'JHA Report'}
          subtitle={isAttendance
            ? `${attendanceRows.length} signature${attendanceRows.length !== 1 ? 's' : ''}`
            : `${jhaRows.length} JHA${jhaRows.length !== 1 ? 's' : ''}`
          }
        />

        {/* Tabs */}
        <div className="report-print-hide mb-5 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
          {[
            { key: 'jhas',       label: 'Signed JHAs' },
            { key: 'attendance', label: 'Attendance' },
          ].map((t) => (
            <Link
              key={t.key}
              href={tabHref(t.key)}
              className={[
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Filters */}
        <form method="GET" className="report-print-hide mb-5 flex flex-wrap gap-3">
          <input type="hidden" name="tab" value={tab} />
          {!isAttendance && (
            <>
              <select name="status" defaultValue={statusFilter ?? ''}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
              <select name="job" defaultValue={jobFilter ?? ''}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">All jobs</option>
                {(allJobs ?? []).map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </>
          )}
          <input type="date" name="from" defaultValue={fromFilter ?? ''}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <input type="date" name="to" defaultValue={toFilter ?? ''}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">Filter</button>
        </form>

        {/* JHAs table */}
        {!isAttendance && (
          <ReportTable
            columns={[
              { header: 'Title' },
              { header: 'Job' },
              { header: 'Date' },
              { header: 'Status' },
              { header: 'Signatures', className: 'text-right' },
            ]}
            rowCount={jhaRows.length}
            empty="No JHAs match these filters."
          >
            {jhaRows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/jha/${r._id}`} className="font-medium text-orange-600 hover:text-orange-800 hover:underline">
                    {r.Title}
                  </Link>
                </Td>
                <Td>{r.Job}</Td>
                <Td>{r.Date}</Td>
                <Td><JhaStatusBadge status={r._status} /></Td>
                <Td className="text-right font-semibold text-slate-700">{r.Signatures}</Td>
              </tr>
            ))}
          </ReportTable>
        )}

        {/* Attendance table */}
        {isAttendance && (
          <ReportTable
            columns={[
              { header: 'JHA Title' },
              { header: 'Job Site' },
              { header: 'Work Date' },
              { header: 'Signer Name' },
              { header: 'Badge / ID' },
              { header: 'Signed At' },
            ]}
            rowCount={attendanceRows.length}
            empty="No signatures match these filters."
          >
            {attendanceRows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <Td className="font-medium text-slate-900">{r['JHA Title']}</Td>
                <Td>{r['Job Site']}</Td>
                <Td>{r['Work Date']}</Td>
                <Td>{r['Signer Name']}</Td>
                <Td className="font-mono text-xs">{r['Badge/ID']}</Td>
                <Td className="text-slate-500">{r['Signed At']}</Td>
              </tr>
            ))}
          </ReportTable>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Generated by CertTrack · {new Date().toLocaleString()}
        </p>
      </div>
    </>
  )
}
