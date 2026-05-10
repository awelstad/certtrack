'use server'

import { cookies } from 'next/headers'

export async function setJobFilter(jobId: string | null) {
  const store = await cookies()
  if (jobId) {
    store.set('selected_job_id', jobId, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  } else {
    store.delete('selected_job_id')
  }
}
