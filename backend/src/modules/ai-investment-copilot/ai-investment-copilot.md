# AI Investment Copilot

## Ownership

`ai-investment-copilot` owns deterministic plain-English summaries across existing product modules. It translates structured module output into concise research support narratives.

It is not an autonomous trading agent, broker execution tool, model-training system, prediction engine, or regulated financial advice feature.

## Cost-Free MVP Operation

The MVP uses:

1. Existing internal module data.
2. Deterministic templates and rule-based summaries.

No paid LLM provider is required. No OpenAI, Anthropic, Gemini, or other cloud provider is mandatory. Optional provider integration can be added later behind environment configuration, disabled by default, with deterministic fallback.

## Endpoints

Mounted under `/api/v1`:

| Endpoint | Purpose |
| --- | --- |
| `POST /copilot/stock-summary` | Summarize one instrument by `instrumentId` |
| `POST /copilot/portfolio-summary` | Summarize one portfolio by `portfolioId` |
| `POST /copilot/watchlist-summary` | Summarize one watchlist by `watchlistId` |
| `GET /copilot/market-brief` | Summarize market context and smart-money sector context |
| `GET /copilot/alert-digest` | Summarize unread and critical alert events |

## Response Shape

Each response returns:

- `title`
- `summary`
- `keyTakeaways[]`
- `bullishFactors[]`
- `bearishFactors[]`
- `riskFactors[]`
- `dataGaps[]`
- `suggestedNextReviews[]`
- `sourceModules[]`
- `generatedAt`
- `dataStatus`

## Source Modules

Stock summary may use:

- `stock-research-workbench`
- `signal-generation-engine`
- `smart-money-intelligence`
- `market-context-intelligence`

Portfolio summary may use:

- `portfolio-management`
- `portfolio-intelligence`
- `signal-generation-engine`

Watchlist summary may use:

- `watchlist-management`
- `signal-generation-engine`

Market brief may use:

- `market-context-intelligence`
- `smart-money-intelligence`

Alert digest uses:

- `alerts-monitoring`

Notifications Delivery may reuse deterministic market brief and alert digest summaries to compose local/email-log daily and weekly digests. Copilot remains the summary layer; Notifications Delivery owns preferences, delivery records, and provider behavior.

All cross-module access is through public module exports only.

## Safety Language Rules

Assistant output must avoid direct financial advice and certainty language.

The service uses research-support wording such as:

- review
- consider
- watch
- risk factor
- signal indicates
- data suggests

The service also sanitizes unsafe phrases such as:

- `buy now`
- `sell immediately`
- `guaranteed`
- `will definitely`

Every summary includes the disclaimer:

`For research support only, not financial advice.`

## Persistence

No Prisma model was added. Summaries are generated on demand.

## UX And Performance Behavior

- Copilot modes use tabs instead of button-based mode switching.
- Market brief, alert digest, and entity summaries are loaded only when the active tab action is requested.
- Stock, portfolio, and watchlist summaries use searchable selectors rather than raw IDs.

## Known Limitations

- Auth Identity now protects copilot routes. Copilot usage gates are tied to the authenticated user.
- Subscription Billing gates copilot summaries by daily plan limits and records summary usage.

- No open-ended autonomous chat.
- No mandatory LLM provider.
- No internet access or paid data dependency.
- Summaries are only as complete as source module data.
- Missing module data is reported in `dataGaps`.

## Verification

Expected verification commands:

- `npm run build` in `backend`
- `npm test -- ai-investment-copilot --runInBand` in `backend`
- `npm test -- --runInBand` in `backend`
- `npm run build` in `frontend`
