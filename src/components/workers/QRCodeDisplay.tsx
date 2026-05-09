import { headers } from 'next/headers'
import { generateWorkerQrUrl } from '@/lib/certifications'

interface Props {
  publicId: string
  size?: number
}

export async function QRCodeDisplay({ publicId, size = 160 }: Props) {
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const workerUrl = generateWorkerQrUrl(publicId, host)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(workerUrl)}&margin=4&color=0f172a`

  return (
    <div className="flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrSrc}
        alt="Worker QR code"
        width={size}
        height={size}
        className="rounded-lg border border-slate-200"
      />
      <p className="text-xs text-slate-400">Scan to view profile</p>
    </div>
  )
}
