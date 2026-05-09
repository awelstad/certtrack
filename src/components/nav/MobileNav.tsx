'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, Briefcase, AlertTriangle, Wrench } from 'lucide-react'

const items = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/workers', label: 'Workers', icon: Users },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/jha', label: 'JHA', icon: AlertTriangle },
  { href: '/equipment', label: 'Equipment', icon: Wrench },
]

export function MobileNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white lg:hidden">
      <ul className="flex h-16 items-stretch">
        {items.map((item) => {
          const active = isActive(item.href)
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  active ? 'text-orange-500' : 'text-slate-500'
                )}
              >
                <item.icon className={cn('h-5 w-5', active ? 'text-orange-500' : 'text-slate-400')} />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
