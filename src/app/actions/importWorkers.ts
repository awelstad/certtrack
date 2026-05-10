'use server'

import { createClient } from '@/lib/supabase/server'

export type ImportRow = {
  first_name: string
  last_name: string
  trade: string
  employer: string
  email: string
  phone: string
  status: string
}

export type ImportResult = {
  imported: number
  failed: number
  errors: string[]
}

const VALID_STATUSES = ['active', 'inactive', 'suspended']

export async function importWorkers(rows: ImportRow[]): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imported: 0, failed: rows.length, errors: ['Unauthorized'] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { imported: 0, failed: rows.length, errors: ['Profile not found'] }

  const orgId = profile.organization_id
  const errors: string[] = []
  let imported = 0
  let failed = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // 1-indexed, +1 for header row

    if (!row.first_name.trim()) {
      errors.push(`Row ${rowNum}: First name is required`)
      failed++
      continue
    }
    if (!row.last_name.trim()) {
      errors.push(`Row ${rowNum}: Last name is required`)
      failed++
      continue
    }

    const status = row.status.trim().toLowerCase() || 'active'
    if (!VALID_STATUSES.includes(status)) {
      errors.push(`Row ${rowNum}: Invalid status "${row.status}" (use active, inactive, or suspended)`)
      failed++
      continue
    }

    const { error } = await supabase.from('workers').insert({
      organization_id: orgId,
      first_name: row.first_name.trim(),
      last_name: row.last_name.trim(),
      trade: row.trade.trim() || null,
      employer: row.employer.trim() || null,
      email: row.email.trim() || null,
      phone: row.phone.trim() || null,
      status,
    })

    if (error) {
      errors.push(`Row ${rowNum} (${row.first_name} ${row.last_name}): ${error.message}`)
      failed++
    } else {
      imported++
    }
  }

  return { imported, failed, errors }
}
