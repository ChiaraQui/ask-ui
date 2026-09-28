# ask-ui

A React front end for a typed question-answering API. Every answer comes back
with its own token count and dollar cost, so the price of a feature is visible
at the point of use rather than discovered on a monthly invoice.

Built during week 1 of an AI engineering bootcamp, September 2026.

## What it does

You ask a question. The API returns structured JSON — not a wall of text — and
the UI renders it:

```json
{
  "answer": {
    "answer": "Retrieval-Augmented Generation combines retrieval with generation…",
    "confidence": 0.95,
    "sources_needed": false
  },
  "tokens_used": 141,
  "model": "gpt-4o-mini",
  "latency_ms": 1324,
  "cost_usd": 0.000042
}
```

The point is `confidence`, `tokens_used` and `cost_usd`. A chatbot returns prose
a human reads. This returns a typed object other software can branch on, and
tells you what it cost to produce.

## Architecture

Two deployables:

| Part | Stack | Hosting |
|---|---|---|
| This front end | React 19, TypeScript, Vite, Tailwind v4 | local / static host |
| The API | FastAPI, Pydantic, OpenAI SDK | Render |

The API is a fork of the course's week-1 starter (see *Provenance* below). This
repository is the front end only; the two talk over HTTP and are deployed
independently.

## Decisions

The interesting part of a small project is what you chose and why.

**Default model: `gpt-4o-mini`, not `gpt-4o`.** Measured against the live
endpoint on the same question, same token count:

| Model | Tokens | Cost per call |
|---|---|---|
| `gpt-4o-mini` | 147 | **$0.000046** |
| `gpt-4o` | 147 | **$0.000765** |

Roughly 16×, with no meaningful quality difference on short factual questions.
On a $10 budget that is ~217,000 calls versus ~13,000. `gpt-4o` stays reachable
per-request via the `model` parameter, so the expensive option is a deliberate
choice rather than a silent default.

**No public live endpoint.** The API has no authentication, so its URL is
effectively a credential. Publishing it would expose an LLM proxy billed to my
OpenAI account — the risk is not only spend (bounded by a budget cap and
auto-recharge off) but account liability for whatever someone generates through
it. The deployment stays semi-private and the URL is not in this repository.

**CORS resolved before writing any front-end code.** The API originally sent no
`Access-Control-Allow-Origin` header, which does not affect a server-side caller
like Streamlit but blocks every browser request. Adding `CORSMiddleware` with an
explicit origin allowlist — rather than `*` — was a prerequisite, not a bug fix
after the fact.

**Errors are translated, not surfaced raw.** `src/api.ts` maps HTTP status codes
to messages a human can act on: 402 means the account is out of credit, 502
means the model's output failed schema validation twice and the guardrail
rejected it. A single generic "request failed" would hide the difference between
a billing problem and a model problem.

**Cold starts are handled as a UX case.** The API runs on a free tier that sleeps
after ~15 minutes idle, so a first request can take close to a minute. The client
allows 90 seconds and shows an explanation after 6, because an unexplained pause
is indistinguishable from a crash.

## Running it

```bash
npm install
cp .env.example .env.local     # point VITE_API_BASE_URL at your own API
npm run dev                    # http://localhost:5173
```

`VITE_API_BASE_URL` defaults to `http://127.0.0.1:8000`, so it works against a
local FastAPI instance with no configuration.

## Layout

```
src/
├── App.tsx                        # page, request state, results
├── api.ts                         # fetch wrapper, timeouts, error translation
├── types.ts                       # TypeScript mirror of the Pydantic models
├── lib/utils.ts                   # Tailwind class merge helper
└── components/ui/
    └── ask-nexus-input.tsx        # animated prompt input (see Provenance)
```

## Provenance

Being precise about what is mine:

- **The API** is a fork of the bootcamp's week-1 starter. My changes: the model
  default and its cost justification, CORS middleware with an origin allowlist,
  and a landing route so the base URL returns service information instead of a
  bare 404.
- **`ask-nexus-input.tsx`** is a community component from
  [21st.dev](https://21st.dev), adapted here: dark-mode support including a
  theme-aware particle colour (a canvas cannot read Tailwind variants), a
  `disabled` prop so a second request cannot be fired mid-flight, and
  domain-appropriate placeholder questions.
- **Everything else in `src/`** is mine.
- Written with AI assistance, reviewed and tested by me.

## Limitations

Known, not hidden:

- **No authentication.** Deliberate for a portfolio project, and the reason the
  endpoint is not published. It would be the first thing to add for real use.
- **No conversation history.** Each question is independent; there is no thread.
- **No retry on the client.** A cold-start timeout requires asking again.
- **Three hardcoded models.** The list mirrors the API's price table rather than
  being fetched from it, so the two can drift.
