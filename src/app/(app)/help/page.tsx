import {
  LayoutDashboard, Users, Award, Briefcase, AlertTriangle,
  Wrench, BarChart2, BookOpen, ChevronRight, HardHat,
  CheckCircle2, QrCode, Printer, Filter, Sparkles,
} from 'lucide-react'

type Section = {
  icon: React.ElementType
  color: string
  title: string
  href?: string
  description: string
  steps?: string[]
  tips?: string[]
}

const sections: Section[] = [
  {
    icon: HardHat,
    color: 'bg-orange-100 text-orange-600',
    title: 'Getting Started',
    description: 'Follow these steps the first time you log in to get your account set up.',
    steps: [
      'Go to Admin → Branding and upload your company logo and brand color.',
      'Go to Jobs → New Job and create your first active job site.',
      'Go to Workers → Add Worker and add your crew members.',
      'Go to Certifications → Manage Types and create the cert types your jobs require (e.g. OSHA 10, Forklift, Fall Protection).',
      'Go to Jobs → select a job → Requirements and attach the cert types required for that job.',
      'Go to Jobs → select a job → Compliance to see which workers are cleared.',
    ],
  },
  {
    icon: Filter,
    color: 'bg-slate-100 text-slate-600',
    title: 'Job Filter',
    description: 'The job selector at the top of the screen scopes the entire app to one job site. Switch to "All Jobs" to see everything across your organization.',
    tips: [
      'Select a job in the sidebar (desktop) or top bar (mobile) to filter by that job site.',
      'Workers, Dashboard stats, Badge printing, and Reports all update to reflect your selection.',
      'Your selection is remembered when you navigate between pages.',
      'Set it back to "All Jobs" any time to see the full picture.',
    ],
  },
  {
    icon: LayoutDashboard,
    color: 'bg-blue-100 text-blue-600',
    title: 'Dashboard',
    href: '/dashboard',
    description: 'Your command center. Shows live counts across certifications, JHAs, and equipment at a glance — scoped to whichever job is selected.',
    tips: [
      'Red cards need immediate attention — expired certs or equipment out of service.',
      'Yellow cards are upcoming issues — certs expiring in 30 days, JHAs needing signatures.',
      'Every card is clickable and takes you directly to the relevant report or list.',
      'The subtitle below your name shows which job is currently selected.',
    ],
  },
  {
    icon: Users,
    color: 'bg-violet-100 text-violet-600',
    title: 'Workers',
    href: '/workers',
    description: 'Manage your workforce. Each worker gets a unique QR code badge that links to their live certification profile — no login required for anyone scanning it.',
    tips: [
      'Add Worker collects name, trade, employer, phone, and email.',
      'The worker list shows a color-coded compliance badge for each person at a glance.',
      'Inactive or Suspended workers show a status badge and are excluded from compliance counts.',
      'Each worker detail page shows their full cert history, QR code, and QR scan log.',
      'The scan log tracks every time someone scanned a worker\'s QR — device type, IP, and timestamp.',
    ],
  },
  {
    icon: Award,
    color: 'bg-green-100 text-green-600',
    title: 'Certifications',
    href: '/certifications',
    description: 'Track every worker certification — upload documents, set expiry dates, and approve or reject submissions.',
    tips: [
      'When you upload a cert document, AI automatically reads it and pre-fills the cert type, issue date, and expiry date.',
      'AI-detected fields are highlighted in purple — always review them before saving.',
      'Managers approve or reject certs from the worker detail page. Rejected certs include a notes field.',
      'Approved certs with an expiry date automatically turn red when expired and yellow when expiring within 30 days.',
      'All approvals and rejections are logged in the audit trail on the cert detail page.',
    ],
  },
  {
    icon: Sparkles,
    color: 'bg-pink-100 text-pink-600',
    title: 'AI Cert Extraction',
    description: 'When uploading a certification document, Clearwork uses AI to read the file and automatically fill in the expiry date, issue date, and cert type.',
    tips: [
      'Supports images (JPG, PNG, WEBP) and PDF files.',
      'After the file uploads, AI reads it and highlights the pre-filled fields in purple with an "AI" badge.',
      'Always verify the AI-detected values — adjust anything that looks off before saving.',
      'If the AI can\'t confidently read a field, it leaves it blank for you to fill in manually.',
    ],
  },
  {
    icon: Briefcase,
    color: 'bg-purple-100 text-purple-600',
    title: 'Jobs',
    href: '/jobs',
    description: 'Create job sites, define which certifications are required, and track which workers are assigned and cleared.',
    tips: [
      'Add cert type requirements to a job under Jobs → [Job] → Requirements.',
      'The Compliance tab shows every worker on the job and their clearance status.',
      'Green = all required certs valid. Yellow = a cert expiring soon. Red = missing or expired cert.',
      'Workers can be assigned to multiple jobs simultaneously.',
    ],
  },
  {
    icon: AlertTriangle,
    color: 'bg-yellow-100 text-yellow-700',
    title: 'JHA — Job Hazard Analysis',
    href: '/jha',
    description: 'Create, manage, and collect digital signatures for Job Hazard Analyses. Workers sign from their phone via QR code — no login required.',
    tips: [
      'Create a new JHA under JHA → New JHA, or start from a saved template.',
      'Set the JHA to Active when it\'s ready for workers to sign.',
      'Share the QR code link so workers can sign on any phone without creating an account.',
      'Workers enter their name, optional ID, and draw their signature on the screen.',
      'Complete the JHA once all signatures are collected — it is then locked and archived.',
      'Export any JHA to a PDF from the JHA detail page.',
    ],
  },
  {
    icon: Wrench,
    color: 'bg-red-100 text-red-600',
    title: 'Equipment',
    href: '/equipment',
    description: 'Track equipment, run pre-use inspections using built-in checklists, and automatically flag equipment out of service on critical failures.',
    tips: [
      'Add equipment under Equipment → New and assign it to a job site.',
      'Inspect equipment using Equipment → [Item] → Inspect. Templates cover common equipment types.',
      'Critical checklist failures automatically tag the equipment Out of Service.',
      'A passing re-inspection clears the Out of Service tag and returns the equipment to Active.',
      'Out-of-service equipment is flagged on the dashboard and in reports.',
    ],
  },
  {
    icon: QrCode,
    color: 'bg-teal-100 text-teal-600',
    title: 'QR Codes & Badge Printing',
    description: 'Every worker has a unique QR code. Anyone on a job site can scan it to instantly see that worker\'s live compliance status — no app or login needed.',
    tips: [
      'The QR scan page shows the worker\'s name, trade, compliance status, and all approved certs.',
      'Each scan is logged — view the scan history from the worker\'s detail page.',
      'Print badge sheets for your whole crew under Workers → Print Badges.',
      'Badge printing respects the job filter — select a job first to print only that crew.',
      'Badges include the worker\'s name, trade, compliance status color, and QR code.',
    ],
  },
  {
    icon: BarChart2,
    color: 'bg-indigo-100 text-indigo-600',
    title: 'Reports',
    href: '/reports',
    description: 'Six pre-built reports covering certifications, job compliance, JHAs, and equipment — all printable as PDF.',
    tips: [
      'Expired Certs — all approved certs that have passed their expiry date.',
      'Expiring Soon — certs due in the next 30, 60, or 90 days.',
      'Missing / Rejected — pending and rejected certs that need attention.',
      'Job Compliance — per-job worker clearance rates with a breakdown by person.',
      'JHA Report — all JHAs with signature counts; Attendance tab lists every individual signer.',
      'Equipment Report — all inspections, failed items, and out-of-service equipment.',
      'Use the Print button on any report for a clean PDF with your org branding.',
    ],
  },
  {
    icon: Printer,
    color: 'bg-orange-100 text-orange-600',
    title: 'Badge Printing',
    href: '/workers/badges',
    description: 'Print a full sheet of QR code badges for your crew in one click. Select a job in the filter first to print only workers on that site.',
    tips: [
      'Go to Workers → Print Badges to open the print view.',
      'Each badge shows the worker\'s name, trade, compliance status, and QR code.',
      'Select a specific job in the top filter to print only that job\'s crew.',
      'Print directly from your browser — the layout is optimized for standard paper.',
    ],
  },
  {
    icon: BookOpen,
    color: 'bg-cyan-100 text-cyan-600',
    title: 'Orientations',
    href: '/orientations',
    description: 'Create site orientation documents that workers must read and sign before starting work.',
    tips: [
      'Create an orientation module with your site rules, safety policies, or welcome content.',
      'Workers sign the orientation digitally — their signature is stored against their worker record.',
      'Orientations can be linked to a specific job site or applied org-wide.',
    ],
  },
]

function SectionCard({ section }: { section: Section }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${section.color}`}>
          <section.icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-slate-900">{section.title}</h2>
          <p className="text-sm text-slate-500">{section.description}</p>
        </div>
        {section.href && (
          <a
            href={section.href}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-800"
          >
            Open <ChevronRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {section.steps && (
        <ol className="space-y-2">
          {section.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      )}

      {section.tips && (
        <ul className="space-y-2">
          {section.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Help & Guide</h1>
        <p className="mt-1 text-sm text-slate-500">
          How every part of Clearwork works — from first setup to daily use.
        </p>
      </div>

      <div className="space-y-5">
        {sections.map((section) => (
          <SectionCard key={section.title} section={section} />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        Clearwork · Built for field compliance teams
      </p>
    </div>
  )
}
