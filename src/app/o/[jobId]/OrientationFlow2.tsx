'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, XCircle, PlayCircle, ShieldCheck } from 'lucide-react'
import {
  completeWorkerProfile,
  saveOrientationProgress,
  completeOrientationWithPass,
} from '@/app/actions/orientationAuth'
import type { QuizQuestion } from '@/app/actions/jobOrientation'

// ── Types ─────────────────────────────────────────────────────────────────────

type Orientation = {
  id: string
  job_id: string
  organization_id: string
  title: string
  description: string | null
  video_url: string | null
  passing_score: number
  questions: QuizQuestion[]
}

type Profile = {
  full_name: string | null
  worker_number: string | null
  phone: string | null
}

type ExistingSession = {
  step: string
  answers: Record<string, number>
  employer: string
  employerType: string
}

type ExistingPass = {
  passId: string
  workerName: string
  employer: string
  completedAt: string
  score: number
}

type Props = {
  orientation: Orientation
  profile: Profile | null
  userEmail: string
  userMeta: { full_name?: string; phone?: string }
  orgId: string
  orgName: string
  logoUrl: string | null
  brandColor: string
  jobName: string
  jobLocation: string | null
  subNames: string[]
  requiredCertNames: string[]
  existingSession: ExistingSession | null
  existingPass: ExistingPass | null
}

type Step = 'profile_setup' | 'confirm_job' | 'employer' | 'cert_warning' | 'video' | 'quiz' | 'result' | 'pass'

function getEmbedUrl(raw: string | null): string | null {
  if (!raw) return null
  const ytMatch = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  return raw
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrientationFlow2({
  orientation,
  profile,
  userEmail,
  userMeta,
  orgId,
  orgName,
  logoUrl,
  brandColor,
  jobName,
  jobLocation,
  subNames,
  requiredCertNames,
  existingSession,
  existingPass,
}: Props) {
  const hasQuiz = orientation.questions.length > 0
  const embedUrl = getEmbedUrl(orientation.video_url)

  function deriveInitialStep(): Step {
    if (existingPass) return 'pass'
    if (!profile) return 'profile_setup'
    const saved = existingSession?.step as Step | undefined
    if (saved && saved !== 'pass') return saved
    return 'confirm_job'
  }

  const [step, setStep] = useState<Step>(deriveInitialStep)
  const [workerName, setWorkerName] = useState(profile?.full_name ?? userMeta.full_name ?? '')
  const [workerNumber, setWorkerNumber] = useState(profile?.worker_number ?? '')
  const [employer, setEmployer] = useState(existingSession?.employer ?? '')
  const [employerType, setEmployerType] = useState(existingSession?.employerType ?? '')
  const [customEmployer, setCustomEmployer] = useState('')
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    orientation.questions.map((_, i) => existingSession?.answers?.[i] ?? null)
  )
  const [score, setScore] = useState<number | null>(null)
  const [passed, setPassed] = useState<boolean | null>(null)
  const [passId, setPassId] = useState<string | null>(existingPass?.passId ?? null)
  const [finalEmployer, setFinalEmployer] = useState(existingPass?.employer ?? '')
  const [completedAt, setCompletedAt] = useState(existingPass?.completedAt ?? '')
  const [completedScore, setCompletedScore] = useState(existingPass?.score ?? 0)
  const [completedName, setCompletedName] = useState(existingPass?.workerName ?? '')

  // Profile setup form state
  const [profileName, setProfileName] = useState(userMeta.full_name ?? '')
  const [profilePhone, setProfilePhone] = useState(userMeta.phone ?? '')

  const [error, setError] = useState('')
  const [quizError, setQuizError] = useState('')
  const [pending, startTransition] = useTransition()

  // ── Profile setup ────────────────────────────────────────────────────────────

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!profileName.trim()) { setError('Please enter your full name.'); return }
    startTransition(async () => {
      const result = await completeWorkerProfile({ orgId })
      if (result.error) { setError(result.error); return }
      setWorkerName(result.fullName ?? profileName.trim())
      setWorkerNumber(result.workerNumber ?? '')
      setStep('confirm_job')
    })
  }

  // ── Employer selection ───────────────────────────────────────────────────────

  const employerOptions = [
    { label: orgName, value: orgName, type: 'gc' },
    ...subNames.map((n) => ({ label: n, value: n, type: 'sub' })),
    { label: 'Other (not listed)', value: 'other', type: 'other' },
  ]

  function handleEmployerConfirm() {
    const resolvedEmployer = employerType === 'other' ? customEmployer.trim() : employer
    if (!resolvedEmployer) { setError('Please select or enter your employer.'); return }
    setError('')
    startTransition(async () => {
      await saveOrientationProgress({
        orientationId: orientation.id,
        jobId: orientation.job_id,
        organizationId: orientation.organization_id,
        step: requiredCertNames.length > 0 ? 'cert_warning' : embedUrl ? 'video' : hasQuiz ? 'quiz' : 'done',
        employer: resolvedEmployer,
        employerType: employerType,
      })
      setEmployer(resolvedEmployer)
      if (requiredCertNames.length > 0) setStep('cert_warning')
      else if (embedUrl) setStep('video')
      else if (hasQuiz) setStep('quiz')
      else handleNoQuizComplete(resolvedEmployer, employerType)
    })
  }

  function handleNoQuizComplete(emp: string, empType: string) {
    startTransition(async () => {
      const result = await completeOrientationWithPass({
        orientationId: orientation.id,
        jobId: orientation.job_id,
        organizationId: orientation.organization_id,
        workerName: workerName,
        workerEmail: userEmail,
        employer: emp,
        employerType: empType,
        score: 100,
        passed: true,
        answers: [],
      })
      if (result.error) { setError(result.error); return }
      setPassId(result.passId ?? null)
      setFinalEmployer(emp)
      setCompletedAt(new Date().toISOString())
      setCompletedScore(100)
      setCompletedName(workerName)
      setStep('pass')
    })
  }

  // ── Quiz ─────────────────────────────────────────────────────────────────────

  function selectAnswer(qIdx: number, optIdx: number) {
    setAnswers((prev) => {
      const next = [...prev]
      next[qIdx] = optIdx
      return next
    })
  }

  function handleSubmitQuiz() {
    if (answers.some((a) => a === null)) {
      setQuizError('Please answer all questions before submitting.')
      return
    }
    setQuizError('')

    const correct = orientation.questions.filter((q, i) => answers[i] === q.correct).length
    const pct = Math.round((correct / orientation.questions.length) * 100)
    const didPass = pct >= orientation.passing_score

    setScore(pct)
    setPassed(didPass)
    setStep('result')

    const answerNums = answers as number[]
    startTransition(async () => {
      const result = await completeOrientationWithPass({
        orientationId: orientation.id,
        jobId: orientation.job_id,
        organizationId: orientation.organization_id,
        workerName: workerName,
        workerEmail: userEmail,
        employer: employer,
        employerType: employerType,
        score: pct,
        passed: didPass,
        answers: answerNums,
      })
      if (result.passId) {
        setPassId(result.passId)
        setFinalEmployer(employer)
        setCompletedAt(new Date().toISOString())
        setCompletedScore(pct)
        setCompletedName(workerName)
      }
    })
  }

  function handleRetry() {
    setAnswers(orientation.questions.map(() => null))
    setScore(null)
    setPassed(null)
    setQuizError('')
    setStep('quiz')
  }

  function advanceFromResult() {
    setStep('pass')
  }

  // ── Save step on video continue ───────────────────────────────────────────────

  function handleVideoNext() {
    startTransition(async () => {
      await saveOrientationProgress({
        orientationId: orientation.id,
        jobId: orientation.job_id,
        organizationId: orientation.organization_id,
        step: hasQuiz ? 'quiz' : 'done',
        employer: employer,
        employerType: employerType,
      })
    })
    if (hasQuiz) setStep('quiz')
    else handleNoQuizComplete(employer, employerType)
  }

  // ── Render steps ─────────────────────────────────────────────────────────────

  /* Profile Setup */
  if (step === 'profile_setup') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
              <svg className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-900">Complete Your Profile</h1>
            <p className="mt-1 text-sm text-slate-500">This is a one-time setup for {jobName}</p>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="First Last"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone Number</label>
              <input
                type="tel"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="(555) 555-5555"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {pending ? 'Saving…' : 'Continue →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  /* Confirm Job */
  if (step === 'confirm_job') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-900">Confirm Job Site</h1>
            <p className="mt-1 text-sm text-slate-500">Hi {workerName.split(' ')[0]}, please confirm you&apos;re checking in for:</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-lg font-bold text-slate-900">{jobName}</p>
            {jobLocation && <p className="mt-1 text-sm text-slate-500">{jobLocation}</p>}
            {workerNumber && (
              <p className="mt-3 text-xs text-slate-400">
                Worker ID: <span className="font-mono font-semibold text-slate-600">{workerNumber}</span>
              </p>
            )}
          </div>

          <button
            onClick={() => setStep('employer')}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Yes, that&apos;s my job site →
          </button>
        </div>
      </div>
    )
  }

  /* Employer Selection */
  if (step === 'employer') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-5">
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-900">Who do you work for?</h1>
            <p className="mt-1 text-sm text-slate-500">Select your employer on this job site</p>
          </div>

          <div className="space-y-2">
            {employerOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  if (opt.type === 'other') {
                    setEmployer('')
                    setEmployerType('other')
                  } else {
                    setEmployer(opt.value)
                    setEmployerType(opt.type)
                  }
                }}
                className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
                  (opt.type === 'other' ? employerType === 'other' : employer === opt.value)
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="mr-2">{opt.type === 'gc' ? '🏢' : opt.type === 'sub' ? '🔧' : '✏️'}</span>
                {opt.label}
                {opt.type === 'gc' && <span className="ml-2 text-xs text-slate-400">(General Contractor)</span>}
              </button>
            ))}
          </div>

          {employerType === 'other' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Employer name</label>
              <input
                type="text"
                value={customEmployer}
                onChange={(e) => setCustomEmployer(e.target.value)}
                placeholder="Your company name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <button
            onClick={handleEmployerConfirm}
            disabled={pending || (!employer && !(employerType === 'other' && customEmployer.trim()))}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {pending ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      </div>
    )
  }

  /* Cert Warning */
  if (step === 'cert_warning') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.997L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.35 16.003c-.77 1.33.192 2.997 1.732 2.997z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-900">Certifications Required</h1>
            <p className="mt-1 text-sm text-slate-500">This job site requires the following certifications:</p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
            {requiredCertNames.map((name) => (
              <div key={name} className="flex items-center gap-2 text-sm text-amber-800">
                <ShieldCheck className="h-4 w-4 shrink-0 text-amber-500" />
                {name}
              </div>
            ))}
          </div>

          <p className="text-sm text-slate-500 text-center">
            You can complete orientation now, but you&apos;ll need to upload these certifications to your profile to be fully cleared for this site.
          </p>

          <button
            onClick={() => {
              if (embedUrl) setStep('video')
              else if (hasQuiz) setStep('quiz')
              else handleNoQuizComplete(employer, employerType)
            }}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Got it, Continue Orientation →
          </button>
        </div>
      </div>
    )
  }

  /* Video */
  if (step === 'video' && embedUrl) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 space-y-6">
        <div className="w-full max-w-3xl">
          <h2 className="mb-4 text-center text-lg font-semibold text-white">{orientation.title}</h2>
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl">
            <iframe
              src={embedUrl}
              className="absolute inset-0 h-full w-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleVideoNext}
              disabled={pending}
              className="rounded-xl bg-orange-500 px-8 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {hasQuiz ? 'Continue to Quiz →' : 'Complete Orientation →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* Quiz */
  if (step === 'quiz') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-xl space-y-5 py-8">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900">Safety Quiz</h2>
            <p className="text-sm text-slate-500 mt-1">
              Answer all questions · Pass at {orientation.passing_score}%
            </p>
          </div>

          {orientation.questions.map((q, qi) => (
            <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <p className="text-sm font-semibold text-slate-900">
                <span className="text-orange-500 mr-1">{qi + 1}.</span> {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => selectAnswer(qi, oi)}
                    className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                      answers[qi] === oi
                        ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {quizError && <p className="text-center text-sm text-red-500">{quizError}</p>}

          <button
            onClick={handleSubmitQuiz}
            disabled={pending}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {pending ? 'Submitting…' : 'Submit Quiz'}
          </button>
        </div>
      </div>
    )
  }

  /* Result */
  if (step === 'result') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center space-y-5">
          {passed ? (
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          ) : (
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
          )}
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{passed ? 'You Passed!' : 'Not Quite'}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Score: <span className="font-bold text-slate-800">{score}%</span> · Required: {orientation.passing_score}%
            </p>
          </div>
          {!passed && (
            <button
              onClick={handleRetry}
              className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              Retry Quiz
            </button>
          )}
          {passed && (
            <button
              onClick={advanceFromResult}
              disabled={pending}
              className="w-full rounded-xl bg-green-500 py-3 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {pending ? 'Generating pass…' : 'View My Pass →'}
            </button>
          )}
        </div>
      </div>
    )
  }

  /* Pass Certificate */
  const displayPassId = passId
  const displayName = completedName || workerName
  const displayDate = completedAt
    ? new Date(completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Pass card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-green-500 px-6 py-4 text-center">
            <CheckCircle className="mx-auto h-10 w-10 text-white mb-2" />
            <h2 className="text-xl font-bold text-white">Orientation Complete</h2>
            <p className="text-green-100 text-sm mt-1">{jobName}</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Name</p>
                <p className="font-semibold text-slate-900">{displayName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Employer</p>
                <p className="font-semibold text-slate-900">{finalEmployer || employer}</p>
              </div>
              {workerNumber && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Worker ID</p>
                  <p className="font-mono font-semibold text-slate-900">{workerNumber}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Score</p>
                <p className="font-semibold text-slate-900">{completedScore || score || 100}%</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Date</p>
                <p className="font-semibold text-slate-900">{displayDate}</p>
              </div>
            </div>

            {displayPassId && (
              <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4 text-center">
                <p className="text-xs text-orange-600 uppercase tracking-widest mb-1">Pass ID</p>
                <p className="font-mono text-2xl font-black text-orange-500 tracking-widest">{displayPassId}</p>
                <p className="text-xs text-orange-600 mt-2">Show this to your site safety manager</p>
              </div>
            )}

            {requiredCertNames.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Still needed for full clearance:</p>
                {requiredCertNames.map((n) => (
                  <p key={n} className="text-xs text-amber-600">• {n}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-100 rounded-xl p-4 text-center">
          <PlayCircle className="mx-auto h-5 w-5 text-slate-400 mb-1" />
          <p className="text-xs text-slate-500">
            A copy of this pass has been sent to <span className="font-semibold">{userEmail}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
