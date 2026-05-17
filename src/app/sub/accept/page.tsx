import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { completeSubInvite } from '@/app/actions/subcontractors'

export default async function SubAcceptPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if they already have a profile (re-visit after accept)
  const { data: existing } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (existing?.role === 'subcontractor_admin') {
    redirect('/sub-portal')
  }

  const result = await completeSubInvite()

  if (result.error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-bold text-slate-900">Invite Error</h1>
          <p className="text-sm text-slate-600">{result.error}</p>
          <p className="text-xs text-slate-400">
            Contact your general contractor to resend the invite.
          </p>
        </div>
      </div>
    )
  }

  redirect('/sub-portal')
}
