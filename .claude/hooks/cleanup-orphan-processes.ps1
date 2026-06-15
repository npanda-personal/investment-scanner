# SubagentStop / Stop hook: kill orphaned agent-spawned processes that pile up and
# spike RAM (Process Hygiene, CLAUDE.md). Targets the known offenders ONLY:
#   - Playwright browsers (headless_shell / anything under ms-playwright)
#   - jest workers (node processes running jest-worker / jest-cli)
#   - temp dev servers: node/esbuild/vite/tsx listening on a NON-default port
# It NEVER touches the shared stack (ports 3000 BE, 5173 FE, 5432 Postgres,
# 6379 Redis, 5050 pgAdmin) or their owning processes.
#
# Read-only safety: failures are swallowed so the hook can never block the agent.

$ErrorActionPreference = 'SilentlyContinue'
$killed = @()

# --- Build the protected PID set: anything owning a default-stack listener ---
$protectedPorts = @(3000, 5173, 5432, 6379, 5050)
$protected = New-Object System.Collections.Generic.HashSet[int]
foreach ($port in $protectedPorts) {
    try {
        Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop |
            ForEach-Object { [void]$protected.Add([int]$_.OwningProcess) }
    } catch {}
}

# --- 1) Playwright browsers — always safe to kill (test-only) ---
try {
    Get-CimInstance Win32_Process |
        Where-Object { $_.Name -match 'headless_shell' -or $_.ExecutablePath -match 'ms-playwright' } |
        ForEach-Object {
            if (-not $protected.Contains([int]$_.ProcessId)) {
                Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
                $killed += "playwright:$($_.ProcessId)"
            }
        }
} catch {}

# --- 2) jest workers — test-only, never part of the shared dev stack ---
try {
    Get-CimInstance Win32_Process |
        Where-Object { $_.Name -match 'node' -and $_.CommandLine -match 'jest-worker|jest-cli|jest\.js|\\.bin\\jest' } |
        ForEach-Object {
            if (-not $protected.Contains([int]$_.ProcessId)) {
                Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
                $killed += "jest:$($_.ProcessId)"
            }
        }
} catch {}

# --- 3) Temp dev servers on NON-default ports (node/esbuild/vite/tsx) ---
try {
    $devListeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $_.LocalPort -gt 1024 -and $protectedPorts -notcontains $_.LocalPort }
    foreach ($conn in $devListeners) {
        $owner = [int]$conn.OwningProcess
        if ($protected.Contains($owner)) { continue }
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $owner" -ErrorAction SilentlyContinue
        if ($proc -and ($proc.Name -match 'node' -or $proc.Name -match 'esbuild') -and
            ($proc.CommandLine -match 'vite|ts-node|tsx|esbuild|nodemon|src[\\/]index')) {
            Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
            $killed += "tempserver:$($conn.LocalPort):$owner"
        }
    }
} catch {}

if ($killed.Count -gt 0) {
    [Console]::Error.WriteLine("[cleanup-orphan-processes] killed: $($killed -join ', ')")
}
exit 0
