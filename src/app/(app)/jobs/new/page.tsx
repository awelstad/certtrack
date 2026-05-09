import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NewJobForm } from './NewJobForm'

export default function NewJobPage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/jobs"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Jobs
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">New Job</h1>
      <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <NewJobForm />
      </div>
    </div>
  )
}
