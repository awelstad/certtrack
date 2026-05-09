import { redirect } from 'next/navigation'

// proxy.ts handles the actual redirect logic — this is a fallback
export default function RootPage() {
  redirect('/dashboard')
}
