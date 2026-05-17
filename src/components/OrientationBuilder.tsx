'use client'

import { useActionState, useState } from 'react'
import { upsertJobOrientation, type QuizQuestion } from '@/app/actions/jobOrientation'
import { PlusCircle, Trash2, GripVertical, CheckCircle } from 'lucide-react'

function makeQuestion(): QuizQuestion {
  return {
    id: crypto.randomUUID(),
    question: '',
    options: ['', '', '', ''],
    correct: 0,
  }
}

export function OrientationBuilder({
  jobId,
  initial,
}: {
  jobId: string
  initial?: {
    title: string
    description: string | null
    video_url: string | null
    passing_score: number
    questions: QuizQuestion[]
  }
}) {
  const [state, action, pending] = useActionState(upsertJobOrientation, null)
  const [questions, setQuestions] = useState<QuizQuestion[]>(initial?.questions ?? [])

  function addQuestion() {
    setQuestions((q) => [...q, makeQuestion()])
  }

  function removeQuestion(id: string) {
    setQuestions((q) => q.filter((x) => x.id !== id))
  }

  function updateQuestion(id: string, field: 'question', value: string): void
  function updateQuestion(id: string, field: 'correct', value: number): void
  function updateQuestion(id: string, field: 'option', value: string, optIdx: number): void
  function updateQuestion(id: string, field: string, value: string | number, optIdx?: number) {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== id) return q
        if (field === 'question') return { ...q, question: value as string }
        if (field === 'correct') return { ...q, correct: value as number }
        if (field === 'option') {
          const options = [...q.options] as [string, string, string, string]
          options[optIdx!] = value as string
          return { ...q, options }
        }
        return q
      })
    )
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="job_id" value={jobId} />
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />

      {/* Basic info */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-slate-900">Orientation Settings</h2>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input
            name="title"
            defaultValue={initial?.title ?? 'Site Safety Orientation'}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
          <textarea
            name="description"
            defaultValue={initial?.description ?? ''}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Video URL (YouTube or direct)</label>
          <input
            name="video_url"
            type="url"
            defaultValue={initial?.video_url ?? ''}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Passing Score (%)</label>
          <input
            name="passing_score"
            type="number"
            min={0}
            max={100}
            defaultValue={initial?.passing_score ?? 80}
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Quiz questions */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Quiz Questions</h2>
          <span className="text-xs text-slate-500">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
        </div>

        {questions.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            No questions yet. Add questions below to create a quiz.
          </p>
        )}

        <div className="space-y-4">
          {questions.map((q, qi) => (
            <div key={q.id} className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50">
              <div className="flex items-start gap-2">
                <GripVertical className="h-4 w-4 text-slate-400 mt-2 shrink-0" />
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Question {qi + 1}</label>
                  <input
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, 'question', e.target.value)}
                    placeholder="Enter your question..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="mt-1 p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="ml-6 space-y-2">
                <label className="block text-xs font-medium text-slate-600">Answer choices (click circle to mark correct)</label>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuestion(q.id, 'correct', oi)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        q.correct === oi
                          ? 'border-green-500 bg-green-500'
                          : 'border-slate-300 hover:border-green-400'
                      }`}
                    >
                      {q.correct === oi && <CheckCircle className="h-3 w-3 text-white" />}
                    </button>
                    <input
                      value={opt}
                      onChange={(e) => updateQuestion(q.id, 'option', e.target.value, oi)}
                      placeholder={`Option ${oi + 1}`}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-2 text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Add Question
        </button>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600">Orientation saved successfully.</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Saving…' : 'Save Orientation'}
        </button>
      </div>
    </form>
  )
}
