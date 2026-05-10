import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { data } = await supabase
    .from('jobs')
    .select('id, name')
    .eq('organization_id', profile!.organization_id)
    .eq('status', 'active')
    .order('name')

  return NextResponse.json(data ?? [])
}
