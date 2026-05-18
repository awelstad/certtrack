'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { LogOut, Settings, Smartphone } from 'lucide-react'
import type { Role } from '@/lib/types'
import { JobFilterSelect } from './JobFilterSelect'
import { ClearworkMark } from '@/components/ui/ClearworkMark'
import { signOut } from '@/app/actions/auth'

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

const adminRoles: Role[] = ['platform_admin', 'owner', 'admin']

export function TopBar({ profile, jobs, selectedJobId, org }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isAdmin = adminRoles.includes(profile.role)

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

        {/* Avatar button + dropdown */}
        <div ref={ref} className="relative shrink-0">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 focus:outline-none"
            aria-label="Account menu"
          >
            {org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logo_url}
                alt={org.name}
                className="h-8 w-8 rounded object-contain border border-slate-200 bg-white p-0.5"
              />
            ) : (
              profile.full_name.charAt(0).toUpperCase()
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
              {/* User info */}
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-900 truncate">{profile.full_name}</p>
                <p className="text-xs text-slate-500 capitalize">{profile.role.replace('_', ' ')}</p>
              </div>

              {isAdmin && (
                <>
                  <Link
                    href="/admin/branding"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    Settings
                  </Link>
                  <Link
                    href="/admin/install"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Smartphone className="h-4 w-4 text-slate-400" />
                    Install App
                  </Link>
                </>
              )}

              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4 text-slate-400" />
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
