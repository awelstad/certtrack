'use client'

import { useState } from 'react'
import { submitOrientationCompletion } from '@/app/actions/jobOrientation'
import type { QuizQuestion } from '@/app/actions/jobOrientation'
import { CheckCircle, XCircle, PlayCircle } from 'lucide-react'

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

function getEmbedUrl(raw: string | null): string | null {
  if (!raw) return null
  // YouTube watch URL
  const ytMatch = raw.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  // Already an embed URL or direct video
  return raw
}

type Step = 'welcome' | 'video' | 'quiz' | 'result' | 'done'

export function OrientationFlow({ orientation }: { orientation: Orientation }) {
  const [step, setStep] = useState<Step>('welcome')
  const [workerName, setWorkerName] = useState('')
  const [nameError, setNameError] = useState('')
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => orientation.questions.map(() => null)
  )
  const [score, setScore] = useState<number | null>(null)
  const [passed, setPassed] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const embedUrl = getEmbedUrl(orientation.video_url)
  const hasQuiz = orientation.questions.length > 0

  function handleStart() {
    if (!workerName.trim()) {
      setNameError('Please enter your name to continue.')
      return
    }
    setNameError('')
    setStep(embedUrl ? 'video' : hasQuiz ? 'quiz' : 'done')
    if (!embedUrl && !hasQuiz) {
      handleComplete([], 100, true)
    }
  }

  function handleVideoNext() {
    setStep(hasQuiz ? 'quiz' : 'done')
    if (!hasQuiz) handleComplete([], 100, true)
  }

  function selectAnswer(qIdx: number, optIdx: number) {
    setAnswers((prev) => {
      const next = [...prev]
      next[qIdx] = optIdx
      return next
    })
  }

  function handleSubmitQuiz() {
    const allAnswered = answers.every((a) => a !== null)
    if (!allAnswered) {
      setSubmitError('Please answer all questions before submitting.')
      return
    }
    setSubmitError('')

    const correct = orientation.questions.filter((q, i) => answers[i] === q.correct).length
    const pct = Math.round((correct / orientation.questions.length) * 100)
    const didPass = pct >= orientation.passing_score

    setScore(pct)
    setPassed(didPass)
    setStep('result')
    handleComplete(answers as number[], pct, didPass)
  }

  async function handleComplete(ans: number[], s: number, p: boolean) {
    setSubmitting(true)
    await submitOrientationCompletion({
      orientationId: orientation.id,
      jobId: orientation.job_id,
      organizationId: orientation.organization_id,
      workerName: workerName.trim(),
      score: s,
      passed: p,
      answers: ans,
    })
    setSubmitting(false)
    if (step !== 'result') setStep('done')
  }

  function handleRetry() {
    setAnswers(orientation.questions.map(() => null))
    setScore(null)
    setPassed(null)
    setStep('quiz')
  }

  /* ── Welcome ── */
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-50">
              <svg className="h-7 w-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{orientation.title}</h1>
            {orientation.description && (
              <p className="mt-2 text-sm text-slate-500">{orientation.description}</p>
            )}
          </div>

          <div className="space-y-3">
            {embedUrl && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
                <PlayCircle className="h-4 w-4 shrink-0" />
                Watch a safety video
              </div>
            )}
            {hasQuiz && (
              <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-4 py-2.5 text-sm text-orange-700">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Complete a {orientation.questions.length}-question quiz (pass at {orientation.passing_score}%)
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your full name</label>
            <input
              type="text"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              placeholder="First Last"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {nameError && <p className="mt-1 text-xs text-red-500">{nameError}</p>}
          </div>

          <button
            onClick={handleStart}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Begin Orientation
          </button>
        </div>
      </div>
    )
  }

  /* ── Video ── */
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
              className="rounded-xl bg-orange-500 px-8 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              {hasQuiz ? 'Continue to Quiz →' : 'Complete Orientation →'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Quiz ── */
  if (step === 'quiz') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-xl space-y-5">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900">Safety Quiz</h2>
            <p className="text-sm text-slate-500 mt-1">Answer all questions · Passing score: {orientation.passing_score}%</p>
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

          {submitError && <p className="text-center text-sm text-red-500">{submitError}</p>}

          <button
            onClick={handleSubmitQuiz}
            disabled={submitting}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit Quiz'}
          </button>
        </div>
      </div>
    )
  }

  /* ── Result ── */
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
            <p className="mt-1 text-slate-500 text-sm">
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
              onClick={() => setStep('done')}
              className="w-full rounded-xl bg-green-500 py-3 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
            >
              Finish →
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ── Done ── */
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h2 className="text-2xl font-bold text-slate-900">Orientation Complete</h2>
        <p className="text-slate-500 text-sm">
          Thank you, <span className="font-semibold text-slate-800">{workerName}</span>. Your completion has been recorded.
        </p>
        <p className="text-xs text-slate-400">You may close this page.</p>
      </div>
    </div>
  )
}
