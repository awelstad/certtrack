import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, QrCode, Users, Pencil } from 'lucide-react'

export default async function OrientationPage({
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

  const { data: orientation } = await supabase
    .from('job_orientations')
    .select('id, title, video_url, passing_score, questions')
    .eq('job_id', id)
    .single()

  const { count: completionCount } = await supabase
    .from('orientation_completions')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', id)

  const hdrs = await headers()
  const host = hdrs.get('host') ?? 'localhost:3000'
  const proto = host.startsWith('localhost') ? 'http' : 'https'
  const publicUrl = `${proto}://${host}/o/${id}`
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}`

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/jobs/${id}`}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          {job.name}
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Site Orientation</h1>
        <Link
          href={`/jobs/${id}/orientation/edit`}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          {orientation ? 'Edit Orientation' : 'Set Up Orientation'}
        </Link>
      </div>

      {!orientation ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <QrCode className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">No orientation set up yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Create an orientation with a video and quiz, then print the QR code for workers.
          </p>
          <Link
            href={`/jobs/${id}/orientation/edit`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Set Up Orientation
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* QR code panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-orange-500" />
              <h2 className="font-semibold text-slate-900">Worker QR Code</h2>
            </div>
            <p className="text-sm text-slate-500">
              Print and post this QR code on site. Workers scan to complete the orientation.
            </p>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="Orientation QR code"
              className="mx-auto h-56 w-56 rounded-lg border border-slate-100"
            />

            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 break-all">
              {publicUrl}
            </div>

            <a
              href={qrUrl}
              download={`orientation-qr-${id}.png`}
              className="block w-full rounded-lg border border-slate-200 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Download QR Code
            </a>
          </div>

          {/* Stats + summary */}
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <h2 className="font-semibold text-slate-900">{orientation.title}</h2>
              <div className="space-y-1.5 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Questions</span>
                  <span className="font-medium text-slate-900">
                    {Array.isArray(orientation.questions) ? orientation.questions.length : 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Passing score</span>
                  <span className="font-medium text-slate-900">{orientation.passing_score}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Video</span>
                  <span className="font-medium text-slate-900">{orientation.video_url ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            <Link
              href={`/jobs/${id}/orientation/completions`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Completions</p>
                  <p className="text-sm text-slate-500">View all worker completions</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{completionCount ?? 0}</div>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
