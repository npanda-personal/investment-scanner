# Stop hook: enforce "merged to dev => worktree deleted".
# Blocks ending the turn if any worktree under .claude/worktrees/ has a branch
# that is ALREADY merged into dev but the worktree still exists — those must be
# removed. Worktrees whose branch is NOT yet merged are in-progress/parallel work
# and are left alone (no false positives).
# FAIL-OPEN: any error exits 0 so a bug can never trap the session.
# One-shot per stop-chain via stop_hook_active, mirroring enforce-wrapup.
try {
    $payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
    if ($payload.stop_hook_active -eq $true) { exit 0 }

    $root = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }
    Set-Location $root

    # dev must exist to compare against
    git rev-parse --verify --quiet dev *> $null
    if ($LASTEXITCODE -ne 0) { exit 0 }

    $lines = git worktree list --porcelain 2>$null
    if (-not $lines) { exit 0 }

    $merged = New-Object System.Collections.Generic.List[string]
    $curPath = $null
    foreach ($line in $lines) {
        if ($line -like 'worktree *') { $curPath = $line.Substring(9).Trim() }
        elseif ($line -like 'branch *') {
            $ref = $line.Substring(7).Trim()              # e.g. refs/heads/my-task
            $norm = $curPath -replace '\\', '/'
            if ($norm -match '/\.claude/worktrees/') {
                git merge-base --is-ancestor $ref dev 2>$null
                if ($LASTEXITCODE -eq 0) {
                    $branch = $ref -replace '^refs/heads/', ''
                    $merged.Add("$branch  ($curPath)")
                }
            }
        }
    }

    if ($merged.Count -gt 0) {
        $list = $merged -join '; '
        $out = @{
            decision = 'block'
            reason   = "Worktree(s) already merged into dev but NOT deleted: $list. MANDATORY rule: anything merged to dev has its worktree removed immediately. Run ExitWorktree (remove) or git worktree remove for each, then finish. Unmerged worktrees are fine - only merged-but-undeleted ones are blocked."
        } | ConvertTo-Json -Compress
        Write-Output $out
    }
}
catch { exit 0 }
exit 0
