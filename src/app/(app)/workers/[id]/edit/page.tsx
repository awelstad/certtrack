import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'
import { WorkerEditForm } from './WorkerEditForm'

const EDIT_ROLES: Role[] = ['platform_admin', 'owner', 'admin', 'pm', 'superintendent']

export default async function WorkerEditPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: worker } = await supabase
    .from('workers')
    .select('id, first_name, last_name, email, phone, trade, employer, status')
    .eq('id', id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!worker) notFound()

  return <WorkerEditForm worker={worker} />
}
