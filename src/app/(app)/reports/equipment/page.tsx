import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ReportPrintHeader } from '@/components/reports/ReportPrintHeader'
import { ReportExportButtons } from '@/components/reports/ReportExportButtons'
import { ReportTable, Td } from '@/components/reports/ReportTable'
import { EquipmentStatusBadge } from '@/components/equipment/EquipmentStatusBadge'
import { EquipmentInspectionStatusBadge } from '@/components/equipment/EquipmentInspectionStatusBadge'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

const PRINT_STYLE = `
  @media print {
    aside,nav,header,.report-print-hide{display:none!important}
    main{padding:0!important;margin:0!important}
    .lg\\:pl-64{padding-left:0!important}
    body{background:white}
  }
  @page{margin:1.5cm}
`

export default async function EquipmentReport({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string; type?: string }>
}) {
  const { tab = 'inspections', from: fromFilter, to: toFilter, type: typeFilter } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()
  const orgId = profile!.organization_id

  const { data: org } = await supabase.from('organizations').select('name, logo_url, brand_color').eq('id', orgId).single()
  const { data: eqTypes } = await supabase.from('equipment_types').select('id, name').order('name')

  // ── All Inspections ───────────────────────────────────────────
  let insQuery = supabase
    .from('equipment_inspections')
    .select('id, inspection_date, status, inspector_name, equipment_id, equipment(name, equipment_types(name), jobs(name))')
    .eq('organization_id', orgId)
    .order('inspection_date', { ascending: false })

  if (fromFilter) insQuery = insQuery.gte('inspection_date', fromFilter)
  if (toFilter)   insQuery = insQuery.lte('inspection_date', toFilter)

  const { data: inspections } = await insQuery

  // ── Out of Service ────────────────────────────────────────────
  let oosQuery = supabase
    .from('equipment')
    .select('id, name, last_inspection_at, equipment_types(name), jobs(name)')
    .eq('organization_id', orgId)
    .eq('status', 'out_of_service')
    .order('last_inspection_at', { ascending: false })

  const { data: oosEquipment } = await oosQuery

  // Deduplicate failed inspections per equipment (most recent only)
  const seen = new Set<string>()
  const failedInspections = (inspections ?? []).filter((i) => {
    if (!['fail', 'out_of_service'].includes(i.status)) return false
    if (seen.has(i.equipment_id)) return false
    seen.add(i.equipment_id)
    return true
  })

  // Build rows
  const allRows = (inspections ?? []).map((i) => {
    const eq     = i.equipment as unknown as { name: string; equipment_types: { name: string } | null; jobs: { name: string } | null } | null
    const eqType = eq?.equipment_types as unknown as { name: string } | null
    const job    = eq?.jobs as unknown as { name: string } | null
    return {
      Equipment:      eq?.name ?? '—',
      Type:           eqType?.name ?? '—',
      'Inspection Date': i.inspection_date ? new Date(i.inspection_date).toLocaleDateString() : '—',
      Inspector:      i.inspector_name,
      Status:         i.status,
      'Job Site':     job?.name ?? '—',
      _id:            i.id,
      _equipmentId:   i.equipment_id,
      _status:        i.status,
    }
  })

  const failedRows = failedInspections.map((i) => {
    const eq     = i.equipment as unknown as { name: string; equipment_types: { name: string } | null; jobs: { name: string } | null } | null
    const eqType = eq?.equipment_types as unknown as { name: string } | null
    const job    = eq?.jobs as unknown as { name: string } | null
    return {
      Equipment:   eq?.name ?? '—',
      Type:        eqType?.name ?? '—',
      'Fail Date': i.inspection_date ? new Date(i.inspection_date).toLocaleDateString() : '—',
      Inspector:   i.inspector_name,
      Status:      i.status,
      'Job Site':  job?.name ?? '—',
      _id:         i.id,
      _equipmentId:i.equipment_id,
      _status:     i.status,
    }
  })

  const oosRows = (oosEquipment ?? []).map((e) => {
    const eqType = e.equipment_types as unknown as { name: string } | null
    const job    = e.jobs as unknown as { name: string } | null
    return {
      Equipment:    e.name,
      Type:         eqType?.name ?? '—',
      'OOS Since':  e.last_inspection_at ? new Date(e.last_inspection_at).toLocaleDateString() : '—',
      'Job Site':   job?.name ?? '—',
      _id:          e.id,
    }
  })

  function tabHref(t: string) {
    const sp = new URLSearchParams()
    sp.set('tab', t)
    if (fromFilter) sp.set('from', fromFilter)
    if (toFilter)   sp.set('to', toFilter)
    return `?${sp.toString()}`
  }

  const tabs = [
    { key: 'inspections', label: `All Inspections (${allRows.length})` },
    { key: 'failed',      label: `Failed (${failedRows.length})` },
    { key: 'oos',         label: `Out of Service (${oosRows.length})` },
  ]

  const isInspections = tab === 'inspections'
  const isFailed      = tab === 'failed'
  const isOos         = tab === 'oos'

  const currentRows = isInspections ? allRows : isFailed ? failedRows : oosRows
  const csvCols = isOos
    ? [
        { header: 'Equipment', key: 'Equipment' },
        { header: 'Type',      key: 'Type' },
        { header: 'OOS Since', key: 'OOS Since' },
        { header: 'Job Site',  key: 'Job Site' },
      ]
    : [
        { header: 'Equipment',       key: 'Equipment' },
        { header: 'Type',            key: 'Type' },
        { header: isOos ? 'OOS Since' : isFailed ? 'Fail Date' : 'Inspection Date', key: isOos ? 'OOS Since' : isFailed ? 'Fail Date' : 'Inspection Date' },
        { header: 'Inspector',       key: 'Inspector' },
        { header: 'Status',          key: 'Status' },
        { header: 'Job Site',        key: 'Job Site' },
      ]

  const reportTitle = isOos ? 'Out-of-Service Equipment' : isFailed ? 'Failed Inspections' : 'Equipment Inspection Report'

  return (
    <>
      <style>{PRINT_STYLE}</style>
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-6xl">
        <div className="report-print-hide mb-4 flex items-center justify-between">
          <Link href="/reports" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Reports
          </Link>
          <ReportExportButtons
            filename={`equipment-${tab}`}
            csvRows={currentRows}
            csvColumns={csvCols}
          />
        </div>

        <ReportPrintHeader
          orgName={org?.name ?? 'Clearwork'}
          logoUrl={org?.logo_url}
          brandColor={org?.brand_color}
          title={reportTitle}
          subtitle={`${currentRows.length} record${currentRows.length !== 1 ? 's' : ''}`}
        />

        {/* OOS alert */}
        {oosRows.length > 0 && (
          <div className="report-print-hide mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            <p className="text-sm font-semibold text-red-800">
              {oosRows.length} piece{oosRows.length !== 1 ? 's' : ''} of equipment currently out of service
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="report-print-hide mb-5 flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={tabHref(t.key)}
              className={[
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              ].join(' ')}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Date filters */}
        <form method="GET" className="report-print-hide mb-5 flex flex-wrap gap-3">
          <input type="hidden" name="tab" value={tab} />
          <input type="date" name="from" defaultValue={fromFilter ?? ''}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <input type="date" name="to" defaultValue={toFilter ?? ''}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          <button type="submit" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">Filter</button>
        </form>

        {/* Inspections table */}
        {(isInspections || isFailed) && (
          <ReportTable
            columns={[
              { header: 'Equipment' },
              { header: 'Type' },
              { header: isFailed ? 'Fail Date' : 'Date' },
              { header: 'Inspector' },
              { header: 'Status' },
              { header: 'Job Site' },
            ]}
            rowCount={currentRows.length}
            empty="No inspection records match these filters."
          >
            {(currentRows as typeof allRows).map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/equipment/${r._equipmentId}/inspections/${r._id}`}
                    className="font-medium text-orange-600 hover:underline">
                    {r.Equipment}
                  </Link>
                </Td>
                <Td>{r.Type}</Td>
                <Td>{(r as Record<string, unknown>)['Inspection Date'] as string ?? (r as Record<string, unknown>)['Fail Date'] as string}</Td>
                <Td>{r.Inspector}</Td>
                <Td><EquipmentInspectionStatusBadge status={r._status} /></Td>
                <Td>{r['Job Site']}</Td>
              </tr>
            ))}
          </ReportTable>
        )}

        {/* OOS table */}
        {isOos && (
          <ReportTable
            columns={[
              { header: 'Equipment' },
              { header: 'Type' },
              { header: 'Out of Service Since' },
              { header: 'Job Site' },
            ]}
            rowCount={oosRows.length}
            empty="No equipment is currently out of service."
          >
            {oosRows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/equipment/${r._id}`} className="font-medium text-orange-600 hover:underline">
                    {r.Equipment}
                  </Link>
                </Td>
                <Td>{r.Type}</Td>
                <Td>
                  <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-medium text-red-700">
                    {r['OOS Since']}
                  </span>
                </Td>
                <Td>{r['Job Site']}</Td>
              </tr>
            ))}
          </ReportTable>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Generated by Clearwork · {new Date().toLocaleString()}
        </p>
      </div>
    </>
  )
}
