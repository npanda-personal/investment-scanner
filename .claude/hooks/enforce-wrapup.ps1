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
        reason   = 'Post-Work Protocol not confirmed: source files were edited this session. Run /wrap-up (scoped QA pass; /refresh-snapshots if snapshot-producing code changed; stop processes you spawned, never the default FE/BE/Docker; Done Report with proof) - or state explicitly why it does not apply, then finish.'
    } | ConvertTo-Json -Compress
    Write-Output $out
}
exit 0
