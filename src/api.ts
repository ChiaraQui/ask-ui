import type { AskResponse, Model } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

/** Render's free tier sleeps, so a cold start can take the better part of a minute. */
const TIMEOUT_MS = 90_000

export class AskError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
  }
}

export async function ask(question: string, model: Model): Promise<AskResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${BASE_URL}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, model }),
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AskError('The request timed out after 90 seconds. The service may be waking up — try again.')
    }
    // A CORS rejection also lands here, with no status to inspect.
    throw new AskError(`Could not reach the API at ${BASE_URL}. Check the service is running.`)
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new AskError(messageFor(response.status, detail), response.status)
  }

  return (await response.json()) as AskResponse
}

function messageFor(status: number, detail: string): string {
  switch (status) {
    case 401:
      return 'The API key was rejected. It may have expired or been revoked.'
    case 402:
      return 'The OpenAI account has no credit left.'
    case 422:
      return 'The question was rejected as invalid. Try rephrasing it.'
    case 429:
      return 'Rate limited by OpenAI. Wait a moment and try again.'
    case 500:
      return 'The service hit an unexpected error. Check the model name is valid.'
    case 502:
      return 'The model returned malformed output twice and the guardrail rejected it.'
    default:
      return detail ? `Request failed (${status}): ${detail}` : `Request failed with status ${status}.`
  }
}

export { BASE_URL }
