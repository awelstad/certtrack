'use client'

import Link from 'next/link'
import { HardHat } from 'lucide-react'
import type { Role } from '@/lib/types'

type Props = {
  profile: {
    full_name: string
    role: Role
    avatar_url: string | null
  }
}

export function TopBar({ profile }: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500">
          <HardHat className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold text-slate-900">CertTrack</span>
      </Link>

      {/* User avatar */}
      <Link
        href="/workers"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700"
      >
        {profile.full_name.charAt(0).toUpperCase()}
      </Link>
    </header>
  )
}
