'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createCertType } from '@/app/actions/certifications'
import { ArrowLeft } from 'lucide-react'

export default function NewCertTypePage() {
  const router = useRouter()

  const [state, action, pending] = useActionState(
    async (prev: { error?: string; success?: boolean } | null, formData: FormData) => {
      const result = await createCertType(prev, formData)
      if (result.success) router.push('/certifications')
      return result
    },
    null
  )

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/certifications" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Certifications
        </Link>
      </div>

      <h1 className="mb-6 text-xl font-bold text-slate-900">New Certification Type</h1>

      <form action={action} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            placeholder="e.g. OSHA 10-Hour, First Aid / CPR"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
          <textarea
            name="description"
            rows={3}
            placeholder="Optional details about this certification"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Valid For (days)</label>
          <input
            name="validity_days"
            type="number"
            min={1}
            placeholder="Leave blank if it never expires"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          />
          <p className="mt-1 text-xs text-slate-400">e.g. 365 = 1 year, 730 = 2 years. Leave blank for no expiry.</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Document Required?</label>
          <select
            name="requires_document"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
          >
            <option value="false">No — workers can self-certify</option>
            <option value="true">Yes — workers must upload a document</option>
          </select>
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{state.error}</p>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {pending ? 'Creating…' : 'Create Certification Type'}
          </button>
          <Link href="/certifications" className="text-sm text-slate-500 hover:text-slate-900">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
