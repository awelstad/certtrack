import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JhaPdfExportButton } from '@/components/jha/JhaPdfExportButton'
import { JhaStepHazardControlTable } from '@/components/jha/JhaStepHazardControlTable'
import { JhaAttendeeList } from '@/components/jha/JhaAttendeeList'
import { parseFieldValues } from '@/lib/jha'

export default async function JhaPdfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const { data: jha } = await supabase
    .from('jhas')
    .select('id, title, status, work_date, work_description, work_area, field_values, jobs(name)')
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)
    .single()

  if (!jha) notFound()

  const { data: signatures } = await supabase
    .from('jha_signatures')
    .select('id, printed_name, signature_data, worker_identifier, signed_at')
    .eq('jha_id', id)
    .order('signed_at', { ascending: true })

  const fv  = parseFieldValues(jha.field_values as Record<string, unknown> | null)
  const job = jha.jobs as unknown as { name: string } | null
  const brandColor = org?.brand_color ?? '#0f172a'

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          aside, nav, header, .jha-print-hide { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .lg\\:pl-64 { padding-left: 0 !important; }
          body { background: white; }
          .jha-pdf-page { padding: 0 !important; }
        }
        @page { margin: 1.5cm; }
      `}</style>

      <div className="jha-pdf-page px-4 py-6 sm:px-8 max-w-4xl mx-auto">
        {/* Export button */}
        <div className="jha-print-hide mb-6 flex justify-end">
          <JhaPdfExportButton jhaId={id} />
        </div>

        {/* Header */}
        <div
          className="flex items-center gap-3 rounded-xl px-5 py-4 mb-6"
          style={{ backgroundColor: brandColor }}
        >
          {org?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.name} className="h-8 w-auto max-w-[120px] object-contain" />
          ) : null}
          <div>
            <p className="text-xs font-medium text-white/70">{org?.name ?? 'CertTrack'}</p>
            <p className="text-lg font-bold text-white">{jha.title}</p>
          </div>
          <div className="ml-auto text-right text-xs text-white/70">
            <p>Job Hazard Analysis</p>
            <p>{jha.work_date ? new Date(jha.work_date).toLocaleDateString() : 'No date'}</p>
          </div>
        </div>

        {/* Job info table */}
        <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="w-1/3 bg-slate-50 px-4 py-2 font-medium text-slate-600">Job Site</td>
                <td className="px-4 py-2 text-slate-900">{job?.name ?? '—'}</td>
                <td className="w-1/3 bg-slate-50 px-4 py-2 font-medium text-slate-600">Date</td>
                <td className="px-4 py-2 text-slate-900">
                  {jha.work_date ? new Date(jha.work_date).toLocaleDateString() : '—'}
                </td>
              </tr>
              <tr>
                <td className="bg-slate-50 px-4 py-2 font-medium text-slate-600">Work Area</td>
                <td className="px-4 py-2 text-slate-900">{jha.work_area ?? '—'}</td>
                <td className="bg-slate-50 px-4 py-2 font-medium text-slate-600">Company</td>
                <td className="px-4 py-2 text-slate-900">{fv.company || '—'}</td>
              </tr>
              <tr>
                <td className="bg-slate-50 px-4 py-2 font-medium text-slate-600">Supervisor</td>
                <td className="px-4 py-2 text-slate-900">{fv.supervisor || '—'}</td>
                <td className="bg-slate-50 px-4 py-2 font-medium text-slate-600">Foreman</td>
                <td className="px-4 py-2 text-slate-900">{fv.foreman || '—'}</td>
              </tr>
              <tr>
                <td className="bg-slate-50 px-4 py-2 font-medium text-slate-600">Weather</td>
                <td className="px-4 py-2 text-slate-900">{fv.weather || '—'}</td>
                <td className="bg-slate-50 px-4 py-2 font-medium text-slate-600">Status</td>
                <td className="px-4 py-2 text-slate-900 capitalize">{jha.status}</td>
              </tr>
              {jha.work_description && (
                <tr>
                  <td className="bg-slate-50 px-4 py-2 font-medium text-slate-600">Work Activity</td>
                  <td className="px-4 py-2 text-slate-900" colSpan={3}>{jha.work_description}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Steps / Hazards / Controls */}
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Steps, Hazards &amp; Controls</h2>
          <JhaStepHazardControlTable steps={fv.steps} />
        </div>

        {/* PPE */}
        {fv.ppe.length > 0 && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Required PPE</h2>
            <div className="flex flex-wrap gap-2">
              {fv.ppe.map((item) => (
                <span key={item} className="rounded-full bg-orange-50 border border-orange-200 px-3 py-0.5 text-sm font-medium text-orange-700">
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tools */}
        {fv.tools && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500">Tools &amp; Equipment</h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{fv.tools}</p>
          </div>
        )}

        {/* Emergency */}
        {(fv.emergency_contact || fv.emergency_notes) && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-red-700">Emergency Information</h2>
            {fv.emergency_contact && <p className="text-sm font-semibold text-red-800">Contact: {fv.emergency_contact}</p>}
            {fv.emergency_notes && <p className="mt-1 text-sm text-red-700 whitespace-pre-wrap">{fv.emergency_notes}</p>}
          </div>
        )}

        {/* Notes */}
        {fv.notes && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500">Notes</h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{fv.notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">
            Attendee Signatures ({signatures?.length ?? 0})
          </h2>
          {signatures && signatures.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {signatures.map((sig) => (
                <div key={sig.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">{sig.printed_name}</p>
                  {sig.worker_identifier && (
                    <p className="text-xs text-slate-500">ID: {sig.worker_identifier}</p>
                  )}
                  <p className="mb-2 text-xs text-slate-400">{new Date(sig.signed_at).toLocaleString()}</p>
                  {sig.signature_data ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sig.signature_data}
                      alt="Signature"
                      className="h-12 w-full object-contain border-t border-slate-200 pt-2"
                    />
                  ) : (
                    <div className="h-12 border-t border-slate-200 flex items-center justify-center">
                      <p className="text-xs text-slate-300 italic">No signature captured</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-slate-400">No signatures recorded.</p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Generated by CertTrack · {new Date().toLocaleString()}
        </p>
      </div>
    </>
  )
}
