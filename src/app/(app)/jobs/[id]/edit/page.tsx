import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'
import { JobEditForm } from './JobEditForm'

const EDIT_ROLES: Role[] = ['platform_admin', 'owner', 'admin', 'pm', 'superintendent']

export default async function JobEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !EDIT_ROLES.includes(profile.role as Role)) notFound()

  const { data: job } = await supabase
    .from('jobs')
    .select('id, name, address, city, state, zip, status, start_date, end_date')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!job) notFound()

  return <JobEditForm job={job} />
}
