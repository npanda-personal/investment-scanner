# Documentation & Security Rules

> Extracted verbatim from the original AGENTS.md constitution. Index of all topic files: [AGENTS.md](../../AGENTS.md)

# 28. Documentation Rules

Every backend module should maintain:

```text
{module}.md
```

Update docs when:

- routes change
- ownership changes
- persistence changes
- response shapes change
- calculations change
- strategy rules change
- signal contracts change
- workflow rules change
- batching behavior changes
- UX conventions change
- limitations are discovered

Use decision records for material changes.

Recommended docs:

```text
docs/architecture.md
docs/roadmap.md
docs/ux-ui-best-practices.md
docs/module-verification-register.md
```

---

# 29. Safety And Security Rules

Never commit or expose:

- `.env` files
- secrets
- tokens
- API keys
- database dumps
- private data
- credentials
- generated sensitive artifacts

Require explicit approval before:

- installing packages
- deleting many files
- changing migrations
- changing package manifests
- changing auth/subscription behavior
- running destructive commands
- accessing files outside repo
- pushing to remote
- adding external services

Forbidden unless explicitly approved:

- broker integrations
- real-money execution
- paid services
- cloud deployment
- production credentials
- external telemetry
- uncontrolled provider-heavy requests

---

