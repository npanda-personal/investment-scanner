# PostToolUse hook (Edit|Write): drops a marker when source code changes, so the Stop hook
# can enforce the Post-Work Protocol (/wrap-up) before the turn ends.
$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
$path = $payload.tool_input.file_path
if ($path) {
    $p = $path -replace '\\', '/'
    if ($p -match '/(backend|frontend)/src/') {
        $root = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }
        $marker = Join-Path $root '.claude\.pending-wrapup'
        if (-not (Test-Path $marker)) { New-Item -ItemType File -Path $marker | Out-Null }
    }
}
exit 0
