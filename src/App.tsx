import { useState } from 'react'
import Markdown from 'react-markdown'
import { AskNexusInput } from '@/components/ui/ask-nexus-input'
import { AskError, ask } from './api'
import { MODELS, type AskResponse, type Model } from './types'

const SLOW_AFTER_MS = 6000

export default function App() {
  const [model, setModel] = useState<Model>('gpt-4o-mini')
  const [asked, setAsked] = useState<string | null>(null)
  const [result, setResult] = useState<AskResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)

  async function handleAsk(question: string) {
    setLoading(true)
    setError(null)
    setResult(null)
    setAsked(question)
    setSlow(false)

    // A cold start looks like a hang, so say something before the user gives up.
    const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS)

    try {
      setResult(await ask(question, model))
    } catch (err) {
      setError(err instanceof AskError ? err.message : 'Something went wrong.')
    } finally {
      clearTimeout(slowTimer)
      setLoading(false)
      setSlow(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 sm:px-6">
        <AskNexusInput title="Ask" onSubmit={handleAsk} disabled={loading} />

        <div className="flex flex-col gap-6 pb-16">
          {asked && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              &ldquo;{asked}&rdquo;
            </p>
          )}

          {loading && <Pending slow={slow} />}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            >
              {error}
            </div>
          )}

          {result && <Result result={result} />}
        </div>

        <footer className="mt-auto flex items-center gap-3 border-t border-slate-200 py-4 text-xs text-slate-500 dark:border-slate-800">
          <label className="flex items-center gap-2">
            <span>Model</span>
            <select
              value={model}
              onChange={(event) => setModel(event.target.value as Model)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-xs outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-slate-400"
            >
              {MODELS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </footer>
      </div>
    </div>
  )
}

function Pending({ slow }: { slow: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-600"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      {slow && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Waking the service — this can take up to a minute on the free tier.
        </p>
      )}
    </div>
  )
}

function Result({ result }: { result: AskResponse }) {
  const { answer, tokens_used, model, latency_ms, cost_usd } = result

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 text-base leading-relaxed [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_li]:ml-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_strong]:font-semibold [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1 dark:[&_code]:bg-slate-800">
        <Markdown>{answer.answer}</Markdown>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge label="Confidence" value={`${Math.round(answer.confidence * 100)}%`} />
        <Badge label="Sources needed" value={answer.sources_needed ? 'yes' : 'no'} />
      </div>

      <dl className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-4 dark:border-slate-800">
        <Stat label="Tokens" value={tokens_used.toLocaleString()} />
        <Stat label="Cost" value={`$${cost_usd.toFixed(6)}`} />
        <Stat label="Latency" value={`${(latency_ms / 1000).toFixed(2)}s`} />
        <Stat label="Model" value={model} />
      </dl>
    </section>
  )
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {label}: {value}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-500">{label}</dt>
      <dd className="font-mono text-sm tabular-nums">{value}</dd>
    </div>
  )
}
