export const meta = {
  name: 'module-audit',
  description: 'Audit backend modules across honesty/scope/consistency/data-quality lenses, adversarially verify findings',
  whenToUse: 'Recurring module audit sweeps (like the June-2026 honesty/consistency passes). Pass args as an array of module names, e.g. ["earnings-intelligence", "smart-money-intelligence"].',
  phases: [
    { title: 'Find', detail: 'four lenses per module in parallel' },
    { title: 'Verify', detail: 'adversarial check on every finding' },
  ],
}

// args: array of module directory names under backend/src/modules/
if (!Array.isArray(args) || args.length === 0) {
  throw new Error('Pass args as a non-empty array of module names, e.g. ["earnings-intelligence"]')
}

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'file', 'detail', 'severity'],
        properties: {
          title: { type: 'string' },
          file: { type: 'string', description: 'file:line reference' },
          detail: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['isReal', 'reason'],
  properties: {
    isReal: { type: 'boolean' },
    reason: { type: 'string' },
  },
}

const LENSES = [
  {
    key: 'honesty',
    prompt: (m) =>
      `Audit backend/src/modules/${m} (and its frontend surfaces if referenced) for HONESTY issues: UI/API text or computed values that overstate what the data actually supports — fabricated-looking defaults, placeholder values presented as real, labels claiming live data for stale/snapshot data, advice-style wording (this is a research-support app: no "buy now"/"price target"/"guaranteed"). Read the module code thoroughly. Report each issue with file:line.`,
  },
  {
    key: 'scope',
    prompt: (m) =>
      `Audit backend/src/modules/${m} for SCOPE issues: features that silently apply only to one market (IN vs US vs crypto) while presenting as universal, hardcoded NSE/BSE assumptions in shared paths, asset-type gaps, region/assetType params accepted but ignored. Report each with file:line.`,
  },
  {
    key: 'consistency',
    prompt: (m) =>
      `Audit backend/src/modules/${m} for CONSISTENCY issues: same concept computed/labeled differently across endpoints, types out of sync between .types.ts and actual payloads, controller/validation mismatches, module-boundary violations (deep imports bypassing other modules' index.ts, business logic in controllers/repositories). Report each with file:line.`,
  },
  {
    key: 'data-quality',
    prompt: (m) =>
      `Audit backend/src/modules/${m} for DATA-QUALITY issues: missing data-quality gating before downstream use, silent fallbacks on missing/stale data, division-by-zero or null-propagation in computed metrics, timestamps not surfaced to users, stale snapshot reads presented as current. Report each with file:line.`,
  },
]

const results = await pipeline(
  args,
  (mod) =>
    parallel(
      LENSES.map((lens) => () =>
        agent(lens.prompt(mod), {
          label: `find:${mod}:${lens.key}`,
          phase: 'Find',
          schema: FINDINGS_SCHEMA,
          model: 'sonnet',
        }).then((r) => (r ? r.findings.map((f) => ({ ...f, module: mod, lens: lens.key })) : []))
      )
    ),
  (lensResults, mod) => {
    const findings = lensResults.filter(Boolean).flat()
    log(`${mod}: ${findings.length} raw findings`)
    return parallel(
      findings.map((f) => () =>
        agent(
          `Adversarially verify this audit finding in backend/src/modules/${f.module}. Try to REFUTE it by reading the actual code at ${f.file}. Finding: "${f.title}" — ${f.detail}. It is only real if the code genuinely has this problem today (not hypothetical, not already mitigated elsewhere). Default to isReal=false if uncertain.`,
          { label: `verify:${f.module}:${f.title.slice(0, 40)}`, phase: 'Verify', schema: VERDICT_SCHEMA, model: 'sonnet' }
        ).then((v) => ({ ...f, verdict: v }))
      )
    )
  }
)

const confirmed = results
  .filter(Boolean)
  .flat()
  .filter(Boolean)
  .filter((f) => f.verdict && f.verdict.isReal)

log(`Confirmed ${confirmed.length} findings across ${args.length} module(s)`)
return {
  modules: args,
  confirmed: confirmed.map(({ verdict, ...f }) => ({ ...f, verifiedBecause: verdict.reason })),
}
