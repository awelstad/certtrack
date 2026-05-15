import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ReportPrintHeader } from '@/components/reports/ReportPrintHeader'
import { ReportExportButtons } from '@/components/reports/ReportExportButtons'
import { ReportTable, Td } from '@/components/reports/ReportTable'
import { ArrowLeft, Pencil } from 'lucide-react'

const PRINT_STYLE = `
  @media print {
    aside,nav,header,.report-print-hide{display:none!important}
    main{padding:0!important;margin:0!important}
    .lg\\:pl-64{padding-left:0!important}
    body{background:white}
  }
  @page{margin:1.5cm}
`

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:  { label: 'Pending Review', cls: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  rejected: { label: 'Rejected',       cls: 'bg-red-50 border-red-200 text-red-700' },
  expired:  { label: 'Expired',        cls: 'bg-red-50 border-red-200 text-red-700' },
}

export default async function MissingCertsReport({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: statusFilter } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()
  const orgId = profile!.organization_id

  const { data: org } = await supabase.from('organizations').select('name, logo_url, brand_color').eq('id', orgId).single()

  const statuses = statusFilter ? [statusFilter] : ['pending', 'rejected', 'expired']

  const { data: certs } = await supabase
    .from('worker_certifications')
    .select('id, status, expiry_date, notes, workers(id, first_name, last_name, trade, employer), certification_types(name)')
    .eq('organization_id', orgId)
    .in('status', statuses)
    .order('status')
    .order('workers(last_name)')

  const workerIds = [...new Set((certs ?? []).map((c) => {
    const w = c.workers as unknown as { id: string } | null
    return w?.id
  }).filter(Boolean) as string[])]

  let workerJobMap = new Map<string, string>()
  if (workerIds.length > 0) {
    const { data: jws } = await supabase
      .from('job_workers')
      .select('worker_id, jobs(name)')
      .in('worker_id', workerIds)
    for (const jw of jws ?? []) {
      const j = jw.jobs as unknown as { name: string } | null
      if (j) workerJobMap.set(jw.worker_id, j.name)
    }
  }

  const rows = (certs ?? []).map((c) => {
    const w = c.workers as unknown as { id: string; first_name: string; last_name: string; trade: string | null; employer: string | null } | null
    const ct = c.certification_types as unknown as { name: string } | null
    return {
      _workerId:     w?.id ?? null,
      _certId:       c.id,
      Worker:        w ? `${w.first_name} ${w.last_name}` : '—',
      Trade:         w?.trade ?? '—',
      Employer:      w?.employer ?? '—',
      Certification: ct?.name ?? '—',
      Status:        STATUS_CONFIG[c.status]?.label ?? c.status,
      'Job Site':    w ? (workerJobMap.get(w.id) ?? '—') : '—',
      Notes:         c.notes ?? '—',
      _status:       c.status,
    }
  })

  const csvCols = [
    { header: 'Worker',        key: 'Worker' },
    { header: 'Trade',         key: 'Trade' },
    { header: 'Employer',      key: 'Employer' },
    { header: 'Certification', key: 'Certification' },
    { header: 'Status',        key: 'Status' },
    { header: 'Job Site',      key: 'Job Site' },
    { header: 'Notes',         key: 'Notes' },
  ]

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl">
        <div className="report-print-hide mb-4 flex items-center justify-between">
          <Link href="/reports" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Reports
          </Link>
          <ReportExportButtons filename="missing-certifications" csvRows={rows} csvColumns={csvCols} />
        </div>

        <ReportPrintHeader
          orgName={org?.name ?? 'Clearwork'}
          logoUrl={org?.logo_url}
          brandColor={org?.brand_color}
          title="Missing / Incomplete Certifications"
          subtitle={`${rows.length} record${rows.length !== 1 ? 's' : ''}`}
        />

        {/* Status filter */}
        <div className="report-print-hide mb-5 flex gap-2">
          {[
            { v: '',         label: 'All' },
            { v: 'pending',  label: 'Pending' },
            { v: 'rejected', label: 'Rejected' },
            { v: 'expired',  label: 'Expired' },
          ].map((opt) => (
            <Link
              key={opt.v}
              href={opt.v ? `?status=${opt.v}` : '/reports/missing'}
              className={[
                'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                (statusFilter ?? '') === opt.v
                  ? 'border-orange-500 bg-orange-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              ].join(' ')}
            >
              {opt.label}
            </Link>
          ))}
        </div>

        <ReportTable
          columns={[
            { header: 'Worker' },
            { header: 'Trade' },
            { header: 'Employer' },
            { header: 'Certification' },
            { header: 'Status' },
            { header: 'Job Site' },
            { header: 'Notes' },
            { header: '' },
          ]}
          rowCount={rows.length}
          empty="No missing or incomplete certifications found."
        >
          {rows.map((r, i) => {
            const cfg = STATUS_CONFIG[r._status] ?? { label: r.Status, cls: 'bg-slate-50 border-slate-200 text-slate-600' }
            return (
              <tr key={i} className="hover:bg-slate-50">
                <Td>
                  {r._workerId ? (
                    <Link href={`/workers/${r._workerId}`} className="font-medium text-slate-900 hover:text-orange-600 hover:underline">
                      {r.Worker}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-900">{r.Worker}</span>
                  )}
                </Td>
                <Td>{r.Trade}</Td>
                <Td>{r.Employer}</Td>
                <Td>{r.Certification}</Td>
                <Td>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                </Td>
                <Td>{r['Job Site']}</Td>
                <Td className="max-w-xs truncate text-slate-500">{r.Notes}</Td>
                <Td>
                  {r._workerId && (
                    <Link
                      href={`/workers/${r._workerId}/certifications/${r._certId}`}
                      className="report-print-hide inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-orange-600"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Link>
                  )}
                </Td>
              </tr>
            )
          })}
        </ReportTable>

        <p className="mt-6 text-center text-xs text-slate-400">
          Generated by Clearwork · {new Date().toLocaleString()}
        </p>
      </div>
    </>
  )
}
