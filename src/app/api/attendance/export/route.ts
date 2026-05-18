import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  if (!profile) return new NextResponse('Profile not found', { status: 404 })

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  const from  = searchParams.get('from')
  const to    = searchParams.get('to')

  if (!jobId || !from || !to) {
    return new NextResponse('Missing jobId, from, or to', { status: 400 })
  }

  // Verify job belongs to this org
  const { data: job } = await supabase
    .from('jobs')
    .select('id, name')
    .eq('id', jobId)
    .eq('organization_id', profile.organization_id)
    .single()
  if (!job) return new NextResponse('Job not found', { status: 404 })

  const fromIso = `${from}T00:00:00.000Z`
  const toIso   = `${to}T23:59:59.999Z`

  const { data: events } = await supabase
    .from('site_attendance')
    .select('worker_id, event, scanned_at, workers(first_name, last_name, trade, employer)')
    .eq('job_id', jobId)
    .gte('scanned_at', fromIso)
    .lte('scanned_at', toIso)
    .order('scanned_at', { ascending: true })

  if (!events) return new NextResponse('No data', { status: 500 })

  type EventRow = {
    worker_id: string
    event: 'check_in' | 'check_out'
    scanned_at: string
    workers: { first_name: string; last_name: string; trade: string | null; employer: string | null } | null
  }

  const rows = events as unknown as EventRow[]

  // Group events by worker then by date, pair check_in → check_out
  type PairedRow = {
    workerName: string
    trade: string
    employer: string
    date: string
    checkIn: string
    checkOut: string
    hours: number
  }

  const paired: PairedRow[] = []

  // Group by worker_id
  const byWorker = new Map<string, EventRow[]>()
  for (const e of rows) {
    if (!byWorker.has(e.worker_id)) byWorker.set(e.worker_id, [])
    byWorker.get(e.worker_id)!.push(e)
  }

  for (const [, workerEvents] of byWorker) {
    const w = workerEvents[0].workers
    const workerName = w ? `${w.first_name} ${w.last_name}` : 'Unknown'
    const trade      = w?.trade    ?? ''
    const employer   = w?.employer ?? ''

    // Walk events in order, pairing check_in → next check_out
    let pendingIn: EventRow | null = null
    for (const e of workerEvents) {
      if (e.event === 'check_in') {
        pendingIn = e
      } else if (e.event === 'check_out' && pendingIn) {
        const inDate  = new Date(pendingIn.scanned_at)
        const outDate = new Date(e.scanned_at)
        const ms      = outDate.getTime() - inDate.getTime()
        const hours   = Math.round((ms / 3600000) * 100) / 100

        const fmt = (d: Date) =>
          d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

        paired.push({
          workerName,
          trade,
          employer,
          date:     inDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
          checkIn:  fmt(inDate),
          checkOut: fmt(outDate),
          hours,
        })
        pendingIn = null
      }
    }
    // Unpaired check_in (still on site)
    if (pendingIn) {
      const inDate = new Date(pendingIn.scanned_at)
      paired.push({
        workerName,
        trade,
        employer,
        date:     inDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        checkIn:  inDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        checkOut: '(still on site)',
        hours:    0,
      })
    }
  }

  // Sort by date then worker name
  paired.sort((a, b) => a.date.localeCompare(b.date) || a.workerName.localeCompare(b.workerName))

  const escape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }

  const headers = ['Worker Name', 'Trade', 'Employer', 'Date', 'Check In', 'Check Out', 'Hours']
  const csvRows = [
    headers.join(','),
    ...paired.map((r) =>
      [r.workerName, r.trade, r.employer, r.date, r.checkIn, r.checkOut, r.hours]
        .map(escape)
        .join(',')
    ),
  ]

  const filename = `attendance_${job.name.replace(/\s+/g, '_')}_${from}_to_${to}.csv`

  return new NextResponse(csvRows.join('\r\n'), {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
