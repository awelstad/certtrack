'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveCert } from '@/app/actions/certifications'
import { extractCertData } from '@/app/actions/extractCert'
import { Upload, X, CheckCircle2, Loader2, Sparkles } from 'lucide-react'

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
  const [extracting, setExtracting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  // Controlled date/certType fields so AI can pre-fill them
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [aiDetected, setAiDetected] = useState<{ issueDate: boolean; expiryDate: boolean; certName: boolean }>({
    issueDate: false, expiryDate: false, certName: false,
  })
  const certTypeSelectRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    if (state?.success) setTimeout(onClose, 800)
  }, [state?.success, onClose])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)
    setDocumentPath('')
    setAiDetected({ issueDate: false, expiryDate: false, certName: false })

    // Upload to storage
    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${orgId}/${workerId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('cert-documents').upload(path, file)
    if (error) {
      setUploadError(error.message)
      setUploading(false)
      return
    }
    setDocumentPath(path)
    setFileName(file.name)
    setUploading(false)

    // AI extraction — read file as base64 and send to Claude
    setExtracting(true)
    try {
      const base64 = await fileToBase64(file)
      const result = await extractCertData(base64, file.type)

      const detected = { issueDate: false, expiryDate: false, certName: false }

      if (result.issueDate) {
        setIssueDate(result.issueDate)
        detected.issueDate = true
      }
      if (result.expiryDate) {
        setExpiryDate(result.expiryDate)
        detected.expiryDate = true
      }
      if (result.certName && certTypeSelectRef.current) {
        // Try to match to a cert type by name (case-insensitive partial match)
        const lower = result.certName.toLowerCase()
        const match = certTypes.find((ct) =>
          ct.name.toLowerCase().includes(lower) || lower.includes(ct.name.toLowerCase())
        )
        if (match) {
          certTypeSelectRef.current.value = match.id
          detected.certName = true
        }
      }
      setAiDetected(detected)
    } catch {
      // Extraction failed silently — user fills manually
    } finally {
      setExtracting(false)
    }
  }

  const anyDetected = aiDetected.issueDate || aiDetected.expiryDate || aiDetected.certName

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
          <input type="hidden" name="issueDate" value={issueDate} />
          <input type="hidden" name="expiryDate" value={expiryDate} />

          {/* Cert type */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Certification Type <span className="text-red-500">*</span>
              </label>
              {aiDetected.certName && <AiBadge />}
            </div>
            <select
              ref={certTypeSelectRef}
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
              {uploading || extracting ? (
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              ) : documentPath ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <Upload className="h-6 w-6 text-slate-400" />
              )}
              <span className="text-sm text-slate-500">
                {uploading
                  ? 'Uploading…'
                  : extracting
                  ? 'Reading document with AI…'
                  : documentPath
                  ? fileName
                  : 'Click to upload PDF or image'}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,image/*"
                onChange={handleFileChange}
                disabled={uploading || extracting}
              />
            </label>
            {uploadError && (
              <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>
            )}
            {anyDetected && !extracting && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-violet-700">
                <Sparkles className="h-3.5 w-3.5" />
                AI detected fields below — review and adjust if needed.
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Issue Date</label>
                {aiDetected.issueDate && <AiBadge />}
              </div>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => { setIssueDate(e.target.value); setAiDetected((p) => ({ ...p, issueDate: false })) }}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  aiDetected.issueDate ? 'border-violet-300 bg-violet-50' : 'border-slate-200'
                }`}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Expiry Date</label>
                {aiDetected.expiryDate && <AiBadge />}
              </div>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => { setExpiryDate(e.target.value); setAiDetected((p) => ({ ...p, expiryDate: false })) }}
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  aiDetected.expiryDate ? 'border-violet-300 bg-violet-50' : 'border-slate-200'
                }`}
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
              disabled={pending || uploading || extracting}
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

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
      <Sparkles className="h-2.5 w-2.5" />
      AI
    </span>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
