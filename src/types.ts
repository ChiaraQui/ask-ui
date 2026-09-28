/** Mirrors the AskResponse model in the FastAPI service. */
export type Answer = {
  answer: string
  confidence: number
  sources_needed: boolean
}

export type AskResponse = {
  answer: Answer
  tokens_used: number
  model: string
  latency_ms: number
  cost_usd: number
}

export const MODELS = ['gpt-4o-mini', 'gpt-4o', 'o3-mini'] as const

export type Model = (typeof MODELS)[number]
