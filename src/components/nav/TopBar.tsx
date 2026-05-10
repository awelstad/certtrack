'use client'

import Link from 'next/link'
import { HardHat } from 'lucide-react'
import type { Role } from '@/lib/types'
import { JobFilterSelect } from './JobFilterSelect'

type Props = {
  profile: {
    full_name: string
    role: Role
    avatar_url: string | null
  }
  jobs: { id: string; name: string }[]
  selectedJobId: string | null
}

export function TopBar({ profile, jobs, selectedJobId }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white lg:hidden">
      <div className="flex h-14 items-center gap-2 px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500">
            <HardHat className="h-4 w-4 text-white" />
          </div>
          <span className="hidden text-sm font-bold text-slate-900 sm:inline">Clearwork</span>
        </Link>

        {/* Job filter */}
        {jobs.length > 0 && (
          <div className="min-w-0 flex-1 px-1">
            <JobFilterSelect jobs={jobs} selectedJobId={selectedJobId} variant="light" />
          </div>
        )}

        {/* User avatar */}
        <div className="flex shrink-0 h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
          {profile.full_name.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
