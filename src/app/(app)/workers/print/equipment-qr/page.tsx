import { headers } from 'next/headers'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EquipmentQrPrint } from '@/components/equipment/EquipmentQrPrint'
import { ArrowLeft } from 'lucide-react'

export default async function EquipmentQrPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const orgId = profile!.organization_id
  const cookieStore = await cookies()
  const selectedJobId = cookieStore.get('selected_job_id')?.value ?? null

  let selectedJobName: string | null = null
  if (selectedJobId) {
    const { data: jobRow } = await supabase.from('jobs').select('name').eq('id', selectedJobId).single()
    selectedJobName = jobRow?.name ?? null
  }

  type Equipment = { id: string; public_id: string; name: string; make: string | null; model: string | null; company_asset_number: string | null }

  let query = supabase
    .from('equipment')
    .select('id, public_id, name, make, model, company_asset_number')
    .eq('organization_id', orgId)
    .neq('status', 'retired')
    .order('name')

  if (selectedJobId) {
    query = query.eq('job_id', selectedJobId)
  }

  const { data } = await query
  const equipment: Equipment[] = data ?? []

  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3 print:hidden">
        <Link href="/workers" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Workers
        </Link>
      </div>
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-slate-900">Equipment QR Labels</h1>
        <p className="mt-1 text-sm text-slate-500">
          {selectedJobName
            ? `Showing equipment on ${selectedJobName}.`
            : '3″ × 3″ Avery labels — select equipment, then click Print. Each label includes a QR code linked to the equipment record.'}
        </p>
      </div>

      <EquipmentQrPrint equipment={equipment} host={host} />
    </div>
  )
}
