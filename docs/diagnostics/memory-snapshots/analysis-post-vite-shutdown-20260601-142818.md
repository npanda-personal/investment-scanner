# Post-Vite-Shutdown Memory Analysis - 20260601-142818

## Snapshot Files

- Current summary: post-vite-shutdown-20260601-142818-summary.json
- Current processes: post-vite-shutdown-20260601-142818-processes.csv
- Baseline: baseline-20260601-110758-*
- Previous follow-up: followup-20260601-140840-*

## System Memory

| Comparison | Used MB | Used % | Delta MB | Delta percentage points |
|---|---:|---:|---:|---:|
| Baseline 20260601-110758 | 10159.72 | 62.9 | 0 | 0 |
| Follow-up 20260601-140840 | 12081.49 | 74.8 | 1921.77 | 11.9 |
| Current post-Vite-shutdown | 11031.07 | 68.3 | 871.35 from baseline / -1050.42 from previous | 5.4 from baseline / -6.5 from previous |

## Local App Port Check

No listeners were found on common local app/dev ports: 3000, 3001, 3002, 3003, 5173, 5174, 5175, 5176.

## Node / Vite / Esbuild Check

No investment-scanner Vite/esbuild process stack was found in the current command-line scan.

## Current Top Private Memory Excluding Chrome And vmmemWSL

| PID | Process | Private MB | Working Set MB |
|---:|---|---:|---:|
| 19284 | Code | 570.37 | 474.43 |
| 7144 | mysqld | 555.02 | 60.77 |
| 19124 | Code | 548.8 | 410.28 |
| 5964 | endpointprotection | 393.06 | 216.83 |
| 6976 | explorer | 365.16 | 292.11 |
| 18688 | Code | 331.63 | 294.46 |
| 1824 | dwm | 250.57 | 144.11 |
| 18480 | Code | 225.96 | 208.28 |
| 4116 | SysInfoCap | 204.83 | 117.84 |
| 20404 | codex | 175.69 | 196.38 |
| 9608 | msedgewebview2 | 173.52 | 6.43 |
| 6316 | mongod | 164.68 | 50.96 |
| 13944 | msedgewebview2 | 154.61 | 2.27 |
| 12088 | com.docker.backend | 150.48 | 153.16 |
| 1528 | Docker Desktop | 134.75 | 130.04 |
| 6704 | Code | 130.57 | 157.18 |
| 4264 | Taskmgr | 129.46 | 179.85 |
| 17016 | SystemSettings | 125.87 | 2.09 |
| 19292 | Code | 124.56 | 107.96 |
| 12608 | StartMenuExperienceHost | 116.01 | 190.67 |

## Growth From Baseline Excluding Chrome And vmmemWSL

| Process | Count Delta | Private Delta MB | Current Private MB | Working Set Delta MB |
|---|---:|---:|---:|---:|
| Code | 2 | 626.33 | 2279.02 | 194.84 |
| explorer | 0 | 172.9 | 365.16 | 53.92 |
| OneDrive.Sync.Service | 1 | 85.38 | 85.38 | 15.36 |
| node | 1 | 82.25 | 82.25 | 47.73 |
| dwm | 0 | 65.74 | 250.57 | -13.89 |
| Video.UI | 1 | 55.43 | 55.43 | 2.44 |
| ShellExperienceHost | 1 | 54.99 | 54.99 | 84.13 |
| codex | 0 | 46.72 | 175.69 | 25.63 |
| endpointprotection | 0 | 42.83 | 393.06 | -44.72 |
| msedgewebview2 | 0 | 41.31 | 661.41 | -95.37 |
| svchost | -1 | 28.27 | 512.94 | -18.93 |
| Taskmgr | 0 | 17.93 | 129.46 | -4.74 |
| bash | 4 | 17.64 | 17.64 | 37.7 |
| Docker Desktop | 0 | 10.34 | 390.12 | -105.3 |
| com.docker.backend | 0 | 8.38 | 226.14 | -7.66 |

## Growth From Baseline Excluding Chrome, Brave, Edge, And vmmemWSL

| Process | Count Delta | Private Delta MB | Current Private MB | Working Set Delta MB |
|---|---:|---:|---:|---:|
| Code | 2 | 626.33 | 2279.02 | 194.84 |
| explorer | 0 | 172.9 | 365.16 | 53.92 |
| OneDrive.Sync.Service | 1 | 85.38 | 85.38 | 15.36 |
| node | 1 | 82.25 | 82.25 | 47.73 |
| dwm | 0 | 65.74 | 250.57 | -13.89 |
| Video.UI | 1 | 55.43 | 55.43 | 2.44 |
| ShellExperienceHost | 1 | 54.99 | 54.99 | 84.13 |
| codex | 0 | 46.72 | 175.69 | 25.63 |
| endpointprotection | 0 | 42.83 | 393.06 | -44.72 |
| msedgewebview2 | 0 | 41.31 | 661.41 | -95.37 |
| svchost | -1 | 28.27 | 512.94 | -18.93 |
| Taskmgr | 0 | 17.93 | 129.46 | -4.74 |
| bash | 4 | 17.64 | 17.64 | 37.7 |
| Docker Desktop | 0 | 10.34 | 390.12 | -105.3 |
| com.docker.backend | 0 | 8.38 | 226.14 | -7.66 |

## Reduction Since 14:08 Follow-Up Excluding Chrome And vmmemWSL

| Process | Count Delta | Private Delta MB | Current Private MB | Working Set Delta MB |
|---|---:|---:|---:|---:|
| brave | -10 | -820.33 | 0 | -639.68 |
| node | -4 | -632.29 | 82.25 | -400.2 |
| esbuild | -2 | -62.41 | 0 | -40.31 |
| docker | -1 | -50.7 | 0 | -20.36 |
| git | -8 | -22.06 | 7.87 | -53.46 |
| cmd | -5 | -21.86 | 0 | -29.69 |
| svchost | -2 | -12.91 | 512.94 | -31.64 |
| conhost | -4 | -6.59 | 11.88 | -35.97 |
| explorer | 0 | -4.5 | 365.16 | -4.44 |
| fs_netprot_nativehost_64 | -1 | -1.55 | 0 | -9.67 |
| WmiPrvSE | 0 | -1.23 | 8.95 | -1.59 |
| msedgewebview2 | 0 | -0.79 | 661.41 | -8.59 |
| msrdc | 0 | -0.73 | 89.36 | 0.15 |
| HPPrintScanDoctorService | 0 | -0.52 | 3.7 | -0.23 |
| Widgets | 0 | -0.48 | 14.01 | -2.27 |

## Interpretation

The Vite shutdown is reflected if the local app ports and frontend node/esbuild process stack are absent or materially reduced. For attribution, private memory deltas are more useful than working set deltas because working set includes shared/resident pages and can change after OS trimming.
