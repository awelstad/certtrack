import {
  LayoutDashboard, Users, Award, Briefcase, AlertTriangle,
  Wrench, BarChart2, BookOpen, ChevronRight, HardHat,
  CheckCircle2, ClipboardList, FileText, Shield,
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
      'Go to Jobs → New Job and create your first active job site.',
      'Go to Workers → Add Worker and add your crew members.',
      'Go to Certifications → Manage Types and create the cert types your jobs require (e.g. OSHA 10, Forklift, Fall Protection).',
      'Go to Jobs → select a job → Requirements and attach the cert types required for that job.',
      'Go to Jobs → select a job → Compliance to see which workers are cleared.',
    ],
  },
  {
    icon: LayoutDashboard,
    color: 'bg-slate-100 text-slate-600',
    title: 'Dashboard',
    href: '/dashboard',
    description: 'Your command center. Shows live counts across certifications, JHAs, and equipment at a glance.',
    tips: [
      'Red cards need immediate attention — expired certs or equipment out of service.',
      'Yellow cards are upcoming issues — certs expiring in 30 days, JHAs needing signatures.',
      'Every card is clickable and takes you directly to the relevant report or list.',
      'The critical alert banner at the top summarises the most urgent items.',
    ],
  },
  {
    icon: Users,
    color: 'bg-blue-100 text-blue-600',
    title: 'Workers',
    href: '/workers',
    description: 'Manage your workforce. Each worker gets a unique QR code badge that links to their public certification profile.',
    tips: [
      'Add Worker collects name, trade, employer, phone, and email.',
      'Each worker automatically gets a public QR code — print it for their badge.',
      'The QR page shows their cert status in real time so anyone can scan and verify.',
      'Worker status (Active / Inactive / Suspended) controls whether they appear in compliance reports.',
    ],
  },
  {
    icon: Award,
    color: 'bg-green-100 text-green-600',
    title: 'Certifications',
    href: '/certifications',
    description: 'Track every worker certification — upload documents, set expiry dates, and approve or reject submissions.',
    tips: [
      'Workers submit certs with a document upload; managers approve or reject from the Pending queue.',
      'Approved certs with an expiry date automatically turn red when expired.',
      'The Expiring Soon queue shows certs due within 30 days so you can chase renewals early.',
      'Rejected certs include a notes field — use it to tell the worker what was wrong.',
      'All approvals and rejections are logged in the audit trail on the cert detail page.',
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
      'The Compliance tab shows every worker on the job and their clearance status (green/yellow/red).',
      'Green = all required certs valid. Yellow = a cert expiring soon. Red = missing or expired cert.',
      'Workers can be on multiple jobs simultaneously.',
    ],
  },
  {
    icon: AlertTriangle,
    color: 'bg-yellow-100 text-yellow-700',
    title: 'JHA — Job Hazard Analysis',
    href: '/jha',
    description: 'Create, manage, and collect digital signatures for Job Hazard Analyses before work begins.',
    tips: [
      'Create a new JHA under JHA → New JHA, select the job, and fill in the work description and hazard steps.',
      'Set the JHA to Active when it\'s ready for workers to sign.',
      'Workers sign digitally on any device — their name, badge/ID, and signature are captured.',
      'Complete the JHA when all signatures are collected. Completed JHAs are locked and archived.',
      'Print or export any JHA to PDF from the JHA detail page.',
    ],
  },
  {
    icon: Wrench,
    color: 'bg-red-100 text-red-600',
    title: 'Equipment',
    href: '/equipment',
    description: 'Track equipment, run daily pre-use inspections using built-in checklists, and automatically tag equipment out of service on critical failures.',
    tips: [
      'Add equipment under Equipment → New and assign it to a job site.',
      'Inspect equipment using Equipment → [Item] → Inspect. Built-in templates cover scissor lifts, forklifts, harnesses, ladders, and more.',
      'Critical checklist failures (guardrails, emergency stop, fall anchors) automatically tag the equipment Out of Service.',
      'A passing re-inspection clears the Out of Service tag and returns the equipment to Active.',
      'Out-of-service equipment appears in the dashboard and reports as a critical issue.',
    ],
  },
  {
    icon: BarChart2,
    color: 'bg-indigo-100 text-indigo-600',
    title: 'Reports',
    href: '/reports',
    description: 'Six pre-built reports covering certifications, job compliance, JHAs, and equipment — all exportable to CSV or printable as PDF.',
    tips: [
      'Expired Certs — all approved certs that have passed their expiry date.',
      'Expiring Soon — certs due in the next 30, 60, or 90 days.',
      'Missing / Rejected — pending and rejected certs that need attention.',
      'Job Compliance — per-job worker clearance rates with a progress bar.',
      'JHA Report — all JHAs with signature counts; Attendance tab lists every individual signer.',
      'Equipment Report — all inspections, failed inspections, and out-of-service equipment.',
      'Use the Print button on any report for a clean PDF with your org branding.',
    ],
  },
  {
    icon: BookOpen,
    color: 'bg-teal-100 text-teal-600',
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
