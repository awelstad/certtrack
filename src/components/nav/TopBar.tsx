'use client'

import Link from 'next/link'
import type { Role } from '@/lib/types'
import { JobFilterSelect } from './JobFilterSelect'
import { ClearworkMark } from '@/components/ui/ClearworkMark'

type Props = {
  profile: {
    full_name: string
    role: Role
    avatar_url: string | null
  }
  jobs: { id: string; name: string }[]
  selectedJobId: string | null
  org: { name: string; logo_url: string | null }
}

export function TopBar({ profile, jobs, selectedJobId, org }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white lg:hidden">
      <div className="flex h-14 items-center gap-2 px-4">
        {/* Logo + org */}
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <ClearworkMark size={28} />
          <div className="hidden flex-col sm:flex">
            <span className="text-xs font-bold leading-none text-slate-900">Clearwork</span>
            <span className="mt-0.5 max-w-[120px] truncate text-[10px] leading-none text-slate-500">{org.name}</span>
          </div>
        </Link>

        {/* Job filter */}
        {jobs.length > 0 && (
          <div className="min-w-0 flex-1 px-1">
            <JobFilterSelect jobs={jobs} selectedJobId={selectedJobId} variant="light" />
          </div>
        )}

        {/* Org logo or user initial */}
        {org.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.logo_url}
            alt={org.name}
            className="h-8 w-8 shrink-0 rounded object-contain border border-slate-200 bg-white p-0.5"
          />
        ) : (
          <div className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  )
}
