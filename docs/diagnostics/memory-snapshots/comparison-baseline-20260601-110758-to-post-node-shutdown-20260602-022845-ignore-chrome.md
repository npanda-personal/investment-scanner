# Memory Comparison - Ignore Chrome

Baseline: baseline-20260601-110758
Current: post-node-shutdown-20260602-022845

## System Memory

| Metric | Baseline | Current | Delta |
|---|---:|---:|---:|
| Used physical memory MB | 10159.72 | 12757.73 | 2598.01 |
| Used physical memory % | 62.9 | 78.99 | 16.09 |
| Process count | 272 | 303 | 31 |
| Node process count | 0 | 0 | 0 |

Chrome is excluded from the process-growth tables below. Current Chrome footprint, for reference only: count 7, private MB 687.06, working set MB 999.61.

## Largest Private Memory Growth Excluding Chrome

| Process | Count Delta | Baseline Private MB | Current Private MB | Private Delta MB | WS Delta MB |
|---|---:|---:|---:|---:|---:|
| Code | 5 | 1652.69 | 3881.01 | 2228.32 | -54.28 |
| codex | 0 | 128.97 | 620.47 | 491.5 | 139.26 |
| vmmemWSL | 0 | 1581.83 | 1815.1 | 233.27 | -858.96 |
| explorer | 0 | 192.26 | 355.79 | 163.53 | -60.19 |
| dwm | 0 | 184.83 | 317.21 | 132.38 | -52.07 |
| OneDrive.Sync.Service | 1 | 0 | 94.98 | 94.98 | 20.37 |
| endpointprotection | 0 | 350.23 | 435.95 | 85.72 | -76.44 |
| svchost | 2 | 484.67 | 562.38 | 77.71 | -948.06 |
| ShellExperienceHost | 1 | 0 | 73.13 | 73.13 | 0.01 |
| msedgewebview2 | 0 | 620.1 | 690.23 | 70.13 | -351.17 |
| Video.UI | 1 | 0 | 55.42 | 55.42 | 0.01 |
| Taskmgr | 0 | 111.53 | 147.95 | 36.42 | -63.79 |
| bash | 4 | 0 | 17.82 | 17.82 | 12.19 |
| OverlayHelper | 0 | 50.6 | 67.27 | 16.67 | -5.66 |
| com.docker.backend | 0 | 217.76 | 233.47 | 15.71 | -94.13 |
| OfficeClickToRun | 0 | 29.74 | 40.21 | 10.47 | -48.76 |
| TabTip | 0 | 49.13 | 58.31 | 9.18 | -50.42 |
| SecurityHealthService | 1 | 0 | 7.74 | 7.74 | 3.64 |
| RuntimeBroker | 1 | 30.36 | 37.84 | 7.48 | -143.17 |
| AdobeCollabSync | 0 | 30.39 | 35.68 | 5.29 | -40.18 |

## Largest Working Set Growth Excluding Chrome

| Process | Count Delta | Baseline WS MB | Current WS MB | WS Delta MB | Private Delta MB |
|---|---:|---:|---:|---:|---:|
| codex | 0 | 170.75 | 310.01 | 139.26 | 491.5 |
| Memory Compression | 0 | 299.14 | 411.13 | 111.99 | 4.36 |
| git | 4 | 53.32 | 86.26 | 32.94 | 4.64 |
| OneDrive.Sync.Service | 1 | 0 | 20.37 | 20.37 | 94.98 |
| SearchProtocolHost | 1 | 0 | 19.32 | 19.32 | 2.72 |
| smartscreen | 1 | 0 | 12.9 | 12.9 | 2.56 |
| bash | 4 | 0 | 12.19 | 12.19 | 17.82 |
| NgcIso | 1 | 0 | 4.41 | 4.41 | 1.29 |
| SecurityHealthService | 1 | 0 | 3.64 | 3.64 | 7.74 |
| AppVShNotify | 1 | 0 | 0.02 | 0.02 | 1.85 |
| Video.UI | 1 | 0 | 0.01 | 0.01 | 55.42 |
| ShellExperienceHost | 1 | 0 | 0.01 | 0.01 | 73.13 |
| Secure System | 0 | 61.85 | 61.85 | 0 | 0 |
| Idle | 0 | 0.01 | 0.01 | 0 | 0 |
| BraveCrashHandler64 | 0 | 1.05 | 0 | -1.05 | 0 |
| System | 0 | 4.01 | 2.95 | -1.06 | 0 |
| smss | 0 | 1.45 | 0.13 | -1.32 | 0 |
| BraveCrashHandler | 0 | 1.4 | 0 | -1.4 | 0.01 |
| LsaIso | 0 | 3.97 | 1.59 | -2.38 | 0.19 |
| SystemSettings | 0 | 2.98 | 0.01 | -2.97 | 5.02 |

## Current Top Private Memory Processes Excluding Chrome

| PID | Process | Private MB | Working Set MB |
|---:|---|---:|---:|
| 1848 | vmmemWSL | 1815.1 | 719.68 |
| 19284 | Code | 1216.16 | 489.16 |
| 19124 | Code | 885.66 | 617.3 |
| 20404 | codex | 620.47 | 310.01 |
| 7144 | mysqld | 555.02 | 1.54 |
| 18688 | Code | 455.89 | 323.64 |
| 5964 | endpointprotection | 435.95 | 185.11 |
| 6976 | explorer | 355.79 | 178 |
| 1824 | dwm | 317.21 | 105.93 |
| 18480 | Code | 281.76 | 170.38 |
| 1048 | Code | 251.45 | 189.84 |
| 4116 | SysInfoCap | 205.75 | 20.8 |
| 13944 | msedgewebview2 | 181.3 | 0.21 |
| 9608 | msedgewebview2 | 168.14 | 6 |
| 6316 | mongod | 164.64 | 25.97 |
| 12088 | com.docker.backend | 158.02 | 106.12 |
| 6704 | Code | 155.42 | 97.96 |
| 4264 | Taskmgr | 147.95 | 120.8 |
| 1528 | Docker Desktop | 134.4 | 35.42 |
| 19272 | Code | 132.82 | 50.95 |

## Largest Private Memory Reductions Excluding Chrome

| Process | Count Delta | Baseline Private MB | Current Private MB | Private Delta MB | WS Delta MB |
|---|---:|---:|---:|---:|---:|
| OmenCommandCenterBackground | -1 | 266.82 | 0 | -266.82 | -330.25 |
| PhoneExperienceHost | -1 | 84.18 | 0 | -84.18 | -165.51 |
| Docker Desktop | -1 | 379.78 | 296.42 | -83.36 | -452.35 |
| Registry | 0 | 21.23 | 11.17 | -10.06 | -11.49 |
| WmiPrvSE | 0 | 16.21 | 9.92 | -6.29 | -13.57 |
| BridgeCommunication | -1 | 5.75 | 0 | -5.75 | -32.63 |
| AppActions | 0 | 17.38 | 11.66 | -5.72 | -45.61 |
| OmenInstallMonitor | 0 | 35.25 | 33.02 | -2.23 | -3.61 |
| CrossDeviceService | 0 | 23.4 | 22.18 | -1.22 | -60.95 |
| AppHelperCap | 0 | 7.87 | 7.41 | -0.46 | -25.8 |
| wsl | 0 | 7.47 | 7.04 | -0.43 | -39.1 |
| wslhost | 0 | 9.22 | 8.8 | -0.42 | -44.67 |
| conhost | 0 | 12.31 | 11.9 | -0.41 | -65.68 |
| mongod | 0 | 164.9 | 164.64 | -0.26 | -31.64 |
| WidgetService | 0 | 5.39 | 5.23 | -0.16 | -28.61 |

## Notes

Private memory is the better attribution signal for process-specific growth. Working set can move because of OS trimming and shared resident pages. Total system memory still includes Chrome because Windows physical memory utilization cannot exclude a process group.
