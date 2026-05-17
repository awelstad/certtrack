'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { signOut } from '@/app/actions/auth'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/types'
import {
  LayoutDashboard,
  Users,
  Award,
  Briefcase,
  AlertTriangle,
  Wrench,
  Settings,
  LogOut,
  ChevronRight,
  HelpCircle,
  Building2,
  ShieldCheck,
  Smartphone,
  Upload,
  HardHat,
  ScanLine,
  UserCheck,
  BookOpen,
} from 'lucide-react'
import { JobFilterSelect } from './JobFilterSelect'
import { OrgSwitcher } from './OrgSwitcher'
import { ClearworkMark } from '@/components/ui/ClearworkMark'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/workers',      label: 'Workers',        icon: Users },
  { href: '/certifications', label: 'Certifications', icon: Award },
  { href: '/jobs',         label: 'Jobs',           icon: Briefcase },
  { href: '/jha',          label: 'JHA',            icon: AlertTriangle },
  { href: '/equipment',    label: 'Equipment',      icon: Wrench },
  { href: '/toolbox',      label: 'Toolbox Talks',  icon: ShieldCheck },
  { href: '/kiosk',        label: 'Site Kiosk',     icon: ScanLine },
  { href: '/attendance',   label: 'Attendance',     icon: UserCheck },
]

const settingsItems: NavItem[] = [
  { href: '/admin/branding', label: 'General Settings', icon: Settings },
  { href: '/workers/import', label: 'Import Workers',   icon: Upload },
  { href: '/admin/install',  label: 'Install App',      icon: Smartphone },
  { href: '/help',           label: 'Help & Guide',     icon: HelpCircle },
  { href: '/admin/guide',    label: 'Setup Guide',      icon: BookOpen },
]

const settingsRoots = settingsItems.map(i => i.href)

const adminRoles: Role[] = ['owner', 'admin']

const subNavItems: NavItem[] = [
  { href: '/sub-portal', label: 'My Workers', icon: HardHat },
]

type Props = {
  profile: {
    full_name: string
    role: Role
    avatar_url: string | null
    is_platform_admin: boolean
  }
  jobs: { id: string; name: string }[]
  selectedJobId: string | null
  org: { name: string; logo_url: string | null }
  allOrgs?: { id: string; name: string }[]
  activeOrgId?: string | null
}

export function Sidebar({ profile, jobs, selectedJobId, org, allOrgs, activeOrgId }: Props) {
  const pathname = usePathname()
  const isAdmin = adminRoles.includes(profile.role)

  const settingsActive = settingsRoots.some(r => pathname.startsWith(r))
  const [settingsOpen, setSettingsOpen] = useState(settingsActive)

  // Keep submenu open if navigating to a settings route
  useEffect(() => {
    if (settingsActive) setSettingsOpen(true)
  }, [settingsActive])

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const linkClass = (active: boolean) =>
    cn(
      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
      active
        ? 'bg-orange-500 text-white'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    )

  const iconClass = (active: boolean) =>
    cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-slate-500 group-hover:text-white')

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-slate-900 lg:flex">
      {/* Clearwork brand */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-slate-800 px-4">
        <ClearworkMark size={28} />
        <span className="text-base font-bold text-white tracking-tight">Clearwork</span>
      </div>

      {/* Org branding */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
        {org.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.logo_url}
            alt={org.name}
            className="h-7 w-7 shrink-0 rounded object-contain bg-white p-0.5"
          />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-700 text-xs font-bold text-white">
            {org.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="truncate text-sm font-medium text-slate-300">{org.name}</span>
      </div>

      {/* Platform admin org switcher */}
      {profile.is_platform_admin && allOrgs && allOrgs.length > 0 && (
        <OrgSwitcher
          orgs={allOrgs}
          isSwitched={!!activeOrgId}
          currentOrgName={org.name}
        />
      )}

      {/* Job filter */}
      {jobs.length > 0 && (
        <div className="border-b border-slate-800 px-3 py-2.5">
          <JobFilterSelect jobs={jobs} selectedJobId={selectedJobId} variant="dark" />
        </div>
      )}

      {/* Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {(profile.role === 'subcontractor_admin' ? subNavItems : navItems).map((item) => {
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link href={item.href} className={linkClass(active)}>
                  <item.icon className={iconClass(active)} />
                  {item.label}
                  {active && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60" />}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Settings submenu — admin only */}
        {isAdmin && (
          <div className="mt-6">
            <button
              onClick={() => setSettingsOpen(o => !o)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                settingsActive
                  ? 'text-orange-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Settings className={cn('h-4 w-4 shrink-0', settingsActive ? 'text-orange-400' : 'text-slate-500 group-hover:text-white')} />
              <span>Settings</span>
              <ChevronRight
                className={cn(
                  'ml-auto h-3.5 w-3.5 transition-transform duration-200',
                  settingsOpen ? 'rotate-90' : ''
                )}
              />
            </button>

            {settingsOpen && (
              <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-slate-800 pl-3">
                {settingsItems.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <li key={item.href}>
                      <Link href={item.href} className={linkClass(active)}>
                        <item.icon className={iconClass(active)} />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}

        {/* Platform super-admin section */}
        {profile.is_platform_admin && (
          <div className="mt-6">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
              Platform
            </p>
            <ul className="space-y-0.5">
              {[{ href: '/super-admin', label: 'Organizations', icon: Building2 }].map((item) => {
                const active = isActive(item.href)
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={linkClass(active)}>
                      <item.icon className={iconClass(active)} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* User + Sign Out */}
      <div className="shrink-0 border-t border-slate-800 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
            <p className="truncate text-xs text-slate-400 capitalize">
              {profile.role.replace('_', ' ')}
            </p>
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
