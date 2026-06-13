# PreToolUse hook (Edit|Write): blocks direct edits to the cross-cutting-owned Prisma schema.
$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
$path = $payload.tool_input.file_path
if ($path -and (($path -replace '\\', '/') -match 'backend/prisma/schema\.prisma$')) {
    [Console]::Error.WriteLine('BLOCKED: backend/prisma/schema.prisma is cross-cutting-owned (AGENTS.md lane rules). Get explicit owner approval for the schema change first; the owner can then approve a one-off bypass of this hook.')
    exit 2
}
exit 0
