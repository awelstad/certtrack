'use client'

import { useActionState, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveCert } from '@/app/actions/certifications'
import { Upload, X, CheckCircle2, Loader2 } from 'lucide-react'

interface Props {
  workerId: string
  orgId: string
  certTypes: Array<{ id: string; name: string }>
  onClose: () => void
}

export function CertificationUploadForm({ workerId, orgId, certTypes, onClose }: Props) {
  const [state, formAction, pending] = useActionState(saveCert, null)
  const [documentPath, setDocumentPath] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  // Close on success
  useEffect(() => {
    if (state?.success) {
      setTimeout(onClose, 800)
    }
  }, [state?.success, onClose])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)
    setDocumentPath('')

    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${orgId}/${workerId}/${Date.now()}.${ext}`

    const { error } = await supabase.storage.from('cert-documents').upload(path, file)
    if (error) {
      setUploadError(error.message)
    } else {
      setDocumentPath(path)
      setFileName(file.name)
    }
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Upload Certification</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form action={formAction} className="space-y-5 p-6">
          <input type="hidden" name="workerId" value={workerId} />
          <input type="hidden" name="documentPath" value={documentPath} />

          {/* Cert type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Certification Type <span className="text-red-500">*</span>
            </label>
            <select
              name="certTypeId"
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select a type…</option>
              {certTypes.map((ct) => (
                <option key={ct.id} value={ct.id}>{ct.name}</option>
              ))}
            </select>
          </div>

          {/* File upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Document</label>
            <label className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
              documentPath
                ? 'border-green-300 bg-green-50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}>
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              ) : documentPath ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <Upload className="h-6 w-6 text-slate-400" />
              )}
              <span className="text-sm text-slate-500">
                {uploading ? 'Uploading…' : documentPath ? fileName : 'Click to upload PDF or image'}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,image/*"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
            {uploadError && (
              <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Issue Date</label>
              <input
                type="date"
                name="issueDate"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Expiry Date</label>
              <input
                type="date"
                name="expiryDate"
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              name="notes"
              rows={2}
              placeholder="Optional notes…"
              className="w-full resize-none rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
          )}
          {state?.success && (
            <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">Certification saved!</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || uploading}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Certification
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
