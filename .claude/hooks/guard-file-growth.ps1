# PreToolUse hook (Edit|Write): enforces the 500-line max on source files.
# Blocks net GROWTH past the limit only - shrinking or line-neutral edits are always
# allowed, so bug fixes and extractions on existing oversized files keep working
# (ratchet: files over the limit can only shrink).
# Owner bypass for an explicitly approved exception: $env:CLAUDE_ALLOW_LARGE_FILE = '1'
if ($env:CLAUDE_ALLOW_LARGE_FILE -eq '1') { exit 0 }

$LIMIT = 500
$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
$path = $payload.tool_input.file_path
if (-not $path) { exit 0 }
$p = $path -replace '\\', '/'
if ($p -notmatch '/(backend|frontend)/(src|tests)/') { exit 0 }
if ($p -notmatch '\.(ts|tsx|js|jsx)$') { exit 0 }

function Get-LineCount([string]$s) {
    if ([string]::IsNullOrEmpty($s)) { return 0 }
    return ($s -split "`n").Count
}

$current = 0
if (Test-Path $path) { $current = @([System.IO.File]::ReadAllLines($path)).Count }

$block = $false
$projected = $current
if ($payload.tool_name -eq 'Write') {
    $projected = Get-LineCount $payload.tool_input.content
    # allow full-file rewrites that shrink an already-oversized file
    if ($projected -gt $LIMIT -and $projected -ge $current) { $block = $true }
}
elseif ($payload.tool_name -eq 'Edit') {
    $delta = (Get-LineCount $payload.tool_input.new_string) - (Get-LineCount $payload.tool_input.old_string)
    $projected = $current + $delta
    if ($delta -gt 0 -and $projected -gt $LIMIT) { $block = $true }
}

if ($block) {
    [Console]::Error.WriteLine("BLOCKED: this would put $($p.Split('/')[-1]) at ~$projected lines (current $current, max $LIMIT). Source files over $LIMIT lines are shrink-only. Put the new code in a new cohesive file in the same module (one responsibility per file), or propose an extraction plan to the owner first. Shrinking edits are always allowed. Owner-approved exception: set CLAUDE_ALLOW_LARGE_FILE=1 for one call.")
    exit 2
}
exit 0
