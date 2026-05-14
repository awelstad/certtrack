import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { PwaInit } from '@/components/PwaInit'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Clearwork — Construction Compliance',
  description: 'Worker certification, JHA, and equipment compliance for construction teams.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="h-full antialiased">
        <PwaInit />
        {children}
      </body>
    </html>
  )
}
