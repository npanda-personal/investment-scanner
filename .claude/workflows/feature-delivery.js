export const meta = {
  name: 'feature-delivery',
  description: 'AGENTS.md delivery flow: architect design -> implement -> QA gates -> code review -> handoff report',
  whenToUse: 'Delivering a scoped feature through the constitutional pipeline. Pass args as { spec: "feature description", modules: ["target-module"] }.',
  phases: [
    { title: 'Design' },
    { title: 'Implement' },
    { title: 'QA' },
    { title: 'Review' },
  ],
}

if (!args || typeof args.spec !== 'string' || !args.spec.trim()) {
  throw new Error('Pass args as { spec: "feature description", modules: ["module-name", ...] }')
}
const modules = Array.isArray(args.modules) ? args.modules : []
const moduleNote = modules.length
  ? `Target module(s): ${modules.join(', ')}. Stay inside these boundaries; flag (do not make) any shared-file change needed.`
  : 'Identify the target module(s) first and stay inside their boundaries.'

phase('Design')
const design = await agent(
  `Design the implementation for this feature per docs/agents/architecture-standards.md. ${moduleNote}\n\nFeature spec:\n${args.spec}\n\nReturn: proposed contracts/types, files to create/modify per module, persistence impact (remember: db:push only, no migrations), risks, and a signoff checklist for the implementer.`,
  { label: 'architect-design', agentType: 'solution-architect', phase: 'Design' }
)

phase('Implement')
const implementation = await agent(
  `Implement this feature exactly per the architect design below. Validate with npx tsc --noEmit and relevant jest tests before finishing; report actual command output honestly.\n\nFeature spec:\n${args.spec}\n\n${moduleNote}\n\nArchitect design:\n${design}`,
  { label: 'implement', agentType: 'module-developer', phase: 'Implement', isolation: modules.length > 1 ? 'worktree' : undefined }
)

phase('QA')
const qa = await agent(
  `Verify the feature implemented below against its spec. Run real checks (typecheck, jest, targeted playwright spec if UI changed — one spec file per invocation, qa config). Reject if evidence is missing.\n\nFeature spec:\n${args.spec}\n\nImplementer report:\n${implementation}`,
  { label: 'qa-gates', agentType: 'qa-verifier', phase: 'QA' }
)

phase('Review')
const review = await agent(
  `Review the current diff (git diff) for the feature below. You are independent of the implementer.\n\nFeature spec:\n${args.spec}\n\nImplementer report:\n${implementation}\n\nQA verdict:\n${qa}`,
  { label: 'code-review', agentType: 'code-reviewer', phase: 'Review' }
)

return {
  spec: args.spec,
  modules,
  design,
  implementation,
  qaVerdict: qa,
  reviewVerdict: review,
  note: 'Owner acceptance still required after this pipeline (the agent must not self-approve). Run release-auditor before commit.',
}
