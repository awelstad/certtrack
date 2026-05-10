import { notFound } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { CompleteTalkButton } from './CompleteTalkButton'
import { ArrowLeft, ShieldCheck, Users, CalendarDays, User, Briefcase, QrCode } from 'lucide-react'
import type { Role } from '@/lib/types'

const MANAGER_ROLES: Role[] = ['owner', 'admin', 'pm', 'superintendent']

export default async function ToolboxTalkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user!.id)
    .single()

  const { data: talk } = await supabase
    .from('toolbox_talks')
    .select('*, jobs(name)')
    .eq('id', id)
    .eq('organization_id', profile!.organization_id)
    .single()

  if (!talk) notFound()

  const { data: signatures } = await supabase
    .from('toolbox_talk_signatures')
    .select('id, printed_name, worker_identifier, signed_at')
    .eq('talk_id', id)
    .order('signed_at', { ascending: true })

  const isManager = MANAGER_ROLES.includes(profile!.role as Role)
  const isCompleted = talk.status === 'completed'
  const job = talk.jobs as unknown as { name: string } | null

  const headersList = await headers()
  const host = headersList.get('host') ?? 'clearwork.app'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const signUrl = `${protocol}://${host}/toolbox/${talk.public_token}/sign`
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(signUrl)}&margin=6&color=0f172a`

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/toolbox" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Toolbox Talks
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isCompleted ? 'bg-green-50' : 'bg-orange-50'}`}>
            <ShieldCheck className={`h-5 w-5 ${isCompleted ? 'text-green-600' : 'text-orange-500'}`} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{talk.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(talk.talk_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              {job && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.name}</span>}
              {talk.conducted_by && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{talk.conducted_by}</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
            {isCompleted ? 'Completed' : 'Active'}
          </span>
          {isManager && !isCompleted && <CompleteTalkButton id={id} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left — content + signatures */}
        <div className="space-y-5 lg:col-span-2">
          {/* Talk content */}
          {talk.content && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-700">Talk Content</h2>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 font-mono">
                {talk.content}
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Users className="h-4 w-4 text-slate-400" />
                Signatures ({signatures?.length ?? 0})
              </h2>
            </div>
            {!signatures?.length ? (
              <p className="px-5 py-6 text-sm text-slate-400">No signatures yet. Share the QR code with your crew.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {signatures.map((sig, i) => (
                  <li key={sig.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{sig.printed_name}</p>
                      {sig.worker_identifier && (
                        <p className="text-xs text-slate-500">ID: {sig.worker_identifier}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-slate-400">
                      {new Date(sig.signed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right — QR code */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <QrCode className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-700">Sign-Off QR Code</h2>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl}
              alt="Sign QR Code"
              className="mx-auto h-48 w-48 rounded-lg"
            />
            <p className="mt-3 text-xs text-slate-500">Workers scan this to sign — no login needed</p>
            <a
              href={signUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block truncate text-xs text-orange-600 hover:text-orange-800"
            >
              {signUrl}
            </a>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">How to use</p>
            <p>1. Display QR code on screen or print it.</p>
            <p>2. Workers scan with their phone camera.</p>
            <p>3. They read the talk content and enter their name.</p>
            <p>4. Signatures appear here in real time.</p>
            <p>5. Mark Complete when everyone has signed.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
