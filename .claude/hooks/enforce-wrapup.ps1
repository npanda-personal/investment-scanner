# Stop hook: if source code was edited this session (marker present), block ending the turn
# ONCE with a reminder to run the Post-Work Protocol. Deletes the marker before blocking,
# so it can never loop.
$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
if ($payload.stop_hook_active -eq $true) { exit 0 }
$root = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }
$marker = Join-Path $root '.claude\.pending-wrapup'
if (Test-Path $marker) {
    Remove-Item $marker -Force -Confirm:$false
    $out = @{
        decision = 'block'
        reason   = 'Post-Work Protocol not confirmed: source files were edited this session. Run /wrap-up: scoped QA pass; FOR SUBSTANTIAL CHANGES (multi-file / schema / data-mutation / cross-cutting / new-module / downstream-affecting) an independent code-reviewer pass AND a qa-verifier pass are REQUIRED before "done" - self tsc/jest is the developer self-check, NOT review or QA; /refresh-snapshots if snapshot-producing code changed; MANDATORY before done - shut down this session''s isolated FE/BE servers (by port; never the shared :3000/:5173/Docker) AND merge the worktree branch to dev then DELETE the worktree (NON-NEGOTIABLE: an open worktree is never allowed at done - if it cannot be merged, the task is pending, not done); Done Report with review + QA evidence - or state explicitly why a gate does not apply, then finish.'
    } | ConvertTo-Json -Compress
    Write-Output $out
}
exit 0
