import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { ShieldCheck, ArrowLeft, ChevronRight } from 'lucide-react'

export default async function ToolboxTemplatesPage() {
  const supabase = await createClient()

  const { data: templates } = await supabase
    .from('toolbox_talk_templates')
    .select('id, title, topic')
    .order('topic')
    .order('title')

  // Group by topic
  const grouped = new Map<string, typeof templates>()
  for (const t of templates ?? []) {
    const key = t.topic ?? 'General'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(t)
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/toolbox" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Toolbox Talks
      </Link>
      <PageHeader
        title="Talk Templates"
        description={`${templates?.length ?? 0} ready-to-use safety talks — click any to start a new talk from it.`}
      />

      <div className="space-y-6">
        {[...grouped.entries()].map(([topic, items]) => (
          <div key={topic}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{topic}</h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <ul className="divide-y divide-slate-100">
                {items!.map(t => (
                  <li key={t.id}>
                    <Link
                      href={`/toolbox/new?template=${t.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50">
                        <ShieldCheck className="h-4 w-4 text-orange-500" />
                      </div>
                      <p className="flex-1 text-sm font-medium text-slate-900">{t.title}</p>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
