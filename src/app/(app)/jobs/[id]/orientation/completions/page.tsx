import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'

export default async function OrientationCompletionsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const { data: job } = await supabase
    .from('jobs')
    .select('name')
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)
    .single()
  if (!job) notFound()

  const { data: completions } = await supabase
    .from('orientation_completions')
    .select('id, worker_name, score, passed, completed_at')
    .eq('job_id', id)
    .order('completed_at', { ascending: false })

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/jobs/${id}/orientation`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orientation
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Orientation Completions — {job.name}</h1>
        <span className="text-sm text-slate-500">{completions?.length ?? 0} total</span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {!completions || completions.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-500">No completions yet. Share the QR code to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Worker</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Result</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {completions.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.worker_name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.score !== null ? `${c.score}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.passed ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <XCircle className="h-3.5 w-3.5" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(c.completed_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
