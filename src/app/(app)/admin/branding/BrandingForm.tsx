'use client'

import { useActionState, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateBranding } from '@/app/actions/branding'
import { BrandingHeader } from '@/components/ui/BrandingHeader'
import { Building2, Loader2, Upload, CheckCircle2, X } from 'lucide-react'

const PRESET_COLORS = [
  { name: 'Slate',   hex: '#0f172a' },
  { name: 'Orange',  hex: '#f97316' },
  { name: 'Blue',    hex: '#2563eb' },
  { name: 'Green',   hex: '#16a34a' },
  { name: 'Red',     hex: '#dc2626' },
  { name: 'Purple',  hex: '#7c3aed' },
  { name: 'Teal',    hex: '#0d9488' },
  { name: 'Amber',   hex: '#d97706' },
]

interface Props {
  orgId: string
  initialName: string
  initialSlug: string
  initialLogoUrl: string | null
  initialBrandColor: string | null
}

export function BrandingForm({
  orgId,
  initialName,
  initialSlug,
  initialLogoUrl,
  initialBrandColor,
}: Props) {
  const [state, formAction, pending] = useActionState(updateBranding, null)

  const [name, setName]           = useState(initialName)
  const [logoUrl, setLogoUrl]     = useState<string | null>(initialLogoUrl)
  const [brandColor, setBrandColor] = useState(initialBrandColor ?? '#0f172a')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    const supabase = createClient()
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${orgId}/org-logo.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('worker-avatars')
      .upload(path, file, { upsert: true })

    if (uploadErr) {
      setUploadError(uploadErr.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('worker-avatars')
      .getPublicUrl(path)

    setLogoUrl(urlData.publicUrl)
    setUploading(false)
  }

  function handleRemoveLogo() {
    setLogoUrl(null)
  }

  return (
    <div className="max-w-xl space-y-6">

      {/* Live preview */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Badge Preview</h2>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <BrandingHeader orgName={name || 'Your Company'} logoUrl={logoUrl} brandColor={brandColor} />
          <div className="flex items-center gap-3 px-4 py-3 bg-white">
            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">JD</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">John Doe</p>
              <p className="text-xs text-slate-500">Ironworker · Acme Corp</p>
            </div>
            <span className="ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: brandColor, color: '#fff' }}>
              Cleared
            </span>
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">Company Logo</h2>
        <div className="flex items-start gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
            ) : (
              <Building2 className="h-8 w-8 text-slate-300" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex gap-2">
              <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 inline-flex items-center gap-2">
                {uploading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                  : logoUrl
                  ? <><Upload className="h-4 w-4" /> Replace</>
                  : <><Upload className="h-4 w-4" /> Upload Logo</>
                }
                <input
                  type="file"
                  className="hidden"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  disabled={uploading}
                />
              </label>
              {logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">PNG, SVG, or JPG · max 2 MB · shown on badges, QR pages, and reports</p>
            {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
          </div>
        </div>
      </div>

      {/* Details + color form */}
      <form action={formAction} className="space-y-6">
        <input type="hidden" name="logoUrl" value={logoUrl ?? ''} />
        <input type="hidden" name="brandColor" value={brandColor} />

        {/* Org name */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Organization Details</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Company Name
              </label>
              <input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Slug</label>
              <input
                readOnly
                defaultValue={initialSlug}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500"
              />
              <p className="mt-1 text-xs text-slate-400">Used in QR badge URLs — contact support to change.</p>
            </div>
          </div>
        </div>

        {/* Brand color */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Brand Color</h2>
          <p className="mb-4 text-xs text-slate-500">Applied to badge headers, QR pages, and report headers.</p>

          {/* Swatches */}
          <div className="mb-4 flex flex-wrap gap-2">
            {PRESET_COLORS.map((p) => (
              <button
                key={p.hex}
                type="button"
                title={p.name}
                onClick={() => setBrandColor(p.hex)}
                className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: p.hex,
                  borderColor: brandColor === p.hex ? '#fff' : p.hex,
                  boxShadow: brandColor === p.hex ? `0 0 0 3px ${p.hex}` : undefined,
                }}
              />
            ))}
          </div>

          {/* Custom picker */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 cursor-pointer hover:bg-slate-50">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent"
              />
              <span className="text-sm text-slate-700">Custom color</span>
            </label>
            <span className="font-mono text-sm text-slate-500">{brandColor}</span>
            {PRESET_COLORS.some(p => p.hex === brandColor) && (
              <span className="text-xs text-slate-400">
                {PRESET_COLORS.find(p => p.hex === brandColor)?.name}
              </span>
            )}
          </div>
        </div>

        {/* Branding usage notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Applied To</h2>
          <ul className="space-y-2 text-sm text-slate-600">
            {[
              'Worker badge header (/badge/[id])',
              'Public QR verification page (/qr/[id])',
              'Compliance report headers',
              'JHA document headers',
              'Equipment inspection headers',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}
