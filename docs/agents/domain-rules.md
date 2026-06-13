# AI Copilot, Auth, Subscription & Notifications Rules

> Extracted verbatim from the original AGENTS.md constitution. Index of all topic files: [AGENTS.md](../../AGENTS.md)

# 23. AI Copilot Rules

AI Investment Copilot must remain deterministic and cost-free by default.

Rules:

- No paid AI services.
- No hidden external LLM calls.
- No black-box recommendations.
- Show source modules and data gaps.
- Include research-support disclaimer.
- Use deterministic summaries from local data unless Product Owner explicitly approves otherwise.
- Do not duplicate strategy, signal, data quality, or portfolio logic owned by other modules.

---

# 24. Auth, Subscription, Notifications

## Auth

Authenticated user context is provided by `auth-identity`.

User-owned modules must filter by current user.

Legacy `userId = null` rows may be read only during documented migration or compatibility phases.

## Subscription

Subscription gates must stay centralized in `subscription-billing`.

Feature modules may call public subscription services but must not duplicate plan-limit logic.

Do not overbuild B2B/B2C subscription features during the local validation phase.

## Notifications

Notification delivery must remain free/local-friendly by default.

Paid delivery providers are not allowed.

External free providers must be optional, env-driven, and disabled unless explicitly configured.

---

