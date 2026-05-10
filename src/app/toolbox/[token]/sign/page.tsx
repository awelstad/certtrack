import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { SignForm } from './SignForm'
import { HardHat, ShieldCheck, CalendarDays, User } from 'lucide-react'
import { ClearworkMark } from '@/components/ui/ClearworkMark'

export default async function PublicToolboxSignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: talk } = await admin
    .from('toolbox_talks')
    .select('id, title, topic, content, talk_date, conducted_by, status, organization_id, jobs(name)')
    .eq('public_token', token)
    .single()

  if (!talk) notFound()

  const { data: org } = await admin
    .from('organizations')
    .select('name, logo_url, brand_color')
    .eq('id', talk.organization_id)
    .single()

  const brandColor = org?.brand_color ?? '#0f172a'
  const job = talk.jobs as unknown as { name: string } | null
  const sigCount = await admin
    .from('toolbox_talk_signatures')
    .select('id', { count: 'exact', head: true })
    .eq('talk_id', talk.id)
  const count = sigCount.count ?? 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Branding header */}
      <div className="px-5 py-3.5" style={{ backgroundColor: brandColor }}>
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {org?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.name} className="h-8 w-auto max-w-[100px] object-contain" />
          ) : (
            <ClearworkMark size={28} />
          )}
          <span className="font-semibold text-white">{org?.name ?? 'Clearwork'}</span>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-5 px-4 py-6">
        {/* Talk summary card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50">
              <ShieldCheck className="h-5 w-5 text-orange-500" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-slate-900">{talk.title}</h1>
              {talk.topic && <p className="text-sm text-slate-500">{talk.topic}</p>}
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(talk.talk_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                {job && <span>{job.name}</span>}
                {talk.conducted_by && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" /> {talk.conducted_by}
                  </span>
                )}
              </div>
            </div>
          </div>

          {count > 0 && (
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              {count} worker{count !== 1 ? 's' : ''} have already signed this talk.
            </div>
          )}
        </div>

        {/* Content */}
        {talk.content && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Read Before Signing</h2>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {talk.content}
            </div>
          </div>
        )}

        {/* Sign form */}
        <SignForm token={token} />

        <p className="text-center text-xs text-slate-400">Powered by Clearwork · Field Safety Platform</p>
      </div>
    </div>
  )
}
