'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { setJobFilter } from '@/app/actions/filter'
import { Briefcase } from 'lucide-react'

interface Job { id: string; name: string }

export function JobFilterSelect({
  jobs,
  selectedJobId,
  variant = 'dark',
}: {
  jobs: Job[]
  selectedJobId: string | null
  variant?: 'dark' | 'light'
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value || null
    startTransition(async () => {
      await setJobFilter(value)
      router.refresh()
    })
  }

  const selectClass =
    variant === 'dark'
      ? 'w-full rounded-lg border border-slate-700 bg-slate-800 pl-8 pr-3 py-2 text-sm text-white appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-60'
      : 'w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm text-slate-900 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-60'

  const iconClass = variant === 'dark' ? 'text-slate-400' : 'text-slate-400'

  return (
    <div className="relative">
      <Briefcase className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${iconClass}`} />
      <select
        value={selectedJobId ?? ''}
        onChange={handleChange}
        disabled={pending}
        className={selectClass}
      >
        <option value="">All Jobs</option>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.name}
          </option>
        ))}
      </select>
    </div>
  )
}
