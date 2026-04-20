# Real-Time Scanner UI Redesign - UX Design Plan

## Executive Summary
This document outlines the UX/UI redesign of the Investment Scanner's real-time scanner module, aligning with the new backend architecture that supports batch scanning, signal detection, ranking engine, and session-based progress tracking.

## 1. Current State Analysis

### Existing Scanner UI (`frontend/src/components/Scanner/index.tsx`)
- **Primary Function**: Rule-based scanning with condition builder
- **Key Components**:
  - Scanner rule list with CRUD operations
  - Condition builder with dual-mode (visual/text) input
  - Scan scope selector (watchlist/preset/custom)
  - Scan logs table
  - Manual trigger buttons

### Limitations:
1. No real-time progress tracking
2. No batch scanning visualization
3. No signal detection visualization
4. No ranking/score display
5. No session management
6. Limited dashboard capabilities

### New Backend Architecture
The new real-time scanner backend provides:
- **Session-based scanning** with progress tracking
- **Batch processing** with chunking and rate limiting
- **Signal detection** (RSI, EMA, MACD, Volume, Price change)
- **Ranking engine** with configurable weights
- **Hybrid storage** (Redis + PostgreSQL + memory fallback)
- **API endpoints** for:
  - Starting scan sessions
  - Checking progress
  - Retrieving results
  - Managing presets/configurations
  - Dashboard data

## 2. User Personas

### Persona 1: Active Trader (Alex)
- **Goals**: Identify short-term trading opportunities quickly
- **Needs**: Real-time scanning, visual signal detection, ranking by confidence
- **Pain Points**: Slow scanning, no progress visibility, manual result filtering

### Persona 2: Quantitative Analyst (Jamie)
- **Goals**: Backtest scanning strategies, analyze signal effectiveness
- **Needs**: Batch scanning, historical performance, statistical analysis
- **Pain Points**: Lack of batch processing, no performance metrics

### Persona 3: Portfolio Manager (Morgan)
- **Goals**: Monitor portfolio for risk/rebalance opportunities
- **Needs**: Dashboard overview, alerting, multi-symbol scanning
- **Pain Points**: No consolidated view, manual monitoring required

## 3. Use Cases

### Primary Use Cases:
1. **Quick Scan**: User wants to scan a preset (e.g., S&P 500) for RSI oversold conditions
2. **Custom Batch Scan**: User defines custom symbols, signals, and ranking preferences
3. **Progress Monitoring**: User monitors active scan sessions in real-time
4. **Result Analysis**: User reviews ranked opportunities with signal breakdowns
5. **Dashboard Overview**: User sees scanning activity, performance metrics, top signals

### Secondary Use Cases:
1. **Preset Management**: Create/edit scan presets for frequent use
2. **Signal Configuration**: Customize signal detection parameters
3. **Ranking Configuration**: Adjust scoring weights for different factors
4. **Historical Review**: Analyze past scan sessions and results
5. **Export Results**: Export opportunities to watchlist or CSV

## 4. Information Architecture

### Main Navigation Structure:
```
Scanner Dashboard (Primary View)
├── Quick Scan Panel
├── Active Sessions
├── Recent Results
└── Performance Metrics

Scan Sessions
├── New Session Wizard
├── Active Sessions (Real-time)
├── Completed Sessions
└── Session Details

Scan Presets
├── Preset Library
├── Create/Edit Preset
└── Preset Performance

Signal Library
├── Available Signals
├── Signal Configuration
└── Signal Performance

Ranking Configuration
├── Weight Management
├── Scoring Preview
└── Historical Effectiveness

Settings
├── Scanner Configuration
├── Notification Settings
└── Data Sources
```

## 5. User Flows

### Flow 1: Quick Scan
```
1. User lands on Scanner Dashboard
2. Clicks "Quick Scan" button
3. Selects preset (e.g., "Oversold Stocks")
4. Clicks "Start Scan"
5. Redirected to Session Monitor with progress bar
6. Views real-time progress and estimated completion
7. Automatically shown results when complete
8. Can filter/sort ranked opportunities
```

### Flow 2: Custom Batch Scan
```
1. User navigates to "New Session"
2. Configures scan scope (preset/watchlist/custom)
3. Selects signals to detect (RSI, EMA, etc.)
4. Adjusts ranking weights if desired
5. Clicks "Start Batch Scan"
6. Monitors progress with chunk-by-chunk updates
7. Reviews detailed results with signal breakdowns
8. Saves configuration as preset for future use
```

### Flow 3: Results Analysis
```
1. User views completed session
2. Sees ranked list of opportunities
3. Expands opportunity for detailed signal breakdown
4. Filters by score range or signal type
5. Sorts by different criteria (score, volume, change)
6. Exports selected opportunities to watchlist
7. Views historical performance of similar signals
```

## 6. Wireframes & Component Structure

### Primary Views:

#### 6.1 Scanner Dashboard
```
+---------------------------------------------------+
| Scanner Dashboard                         [New]  |
+---------------------------------------------------+
| [Quick Scan Panel]                               |
| ┌─────────────────────────────────────────────┐ |
| │ Preset: [S&P 500 Oversold ▼]                │ |
| │ Signals: RSI<30, Volume Spike               │ |
| │                    [Start Quick Scan]       │ |
| └─────────────────────────────────────────────┘ |
|                                                 |
| [Active Sessions]        [Recent Results]       |
| ┌─────────────────┐     ┌─────────────────┐    |
| │ Session A: 45%  │     │ AAPL: 92 score  │    |
| │ Session B: 12%  │     │ MSFT: 87 score  │    |
| │                 │     │ GOOGL: 81 score │    |
| └─────────────────┘     └─────────────────┘    |
|                                                 |
| [Performance Metrics]                           |
| ┌─────────────────────────────────────────────┐ |
| │ Today: 12 scans, 45 signals, 78% accuracy  │ |
| │ This week: 89 scans, 312 signals           │ |
| │ Top Signal: RSI Oversold (42%)             │ |
| └─────────────────────────────────────────────┘ |
+---------------------------------------------------+
```

#### 6.2 Session Monitor
```
+---------------------------------------------------+
| Scan Session: S&P 500 Technical Scan      [Stop] |
+---------------------------------------------------+
| Progress: 65% (325/500 symbols)                  |
| ETA: 2m 15s                                      |
| ┌─────────────────────────────────────────────┐ |
| │ ████████████████████░░░░░░░░░░░░░░░░░░░░░░░ │ |
| └─────────────────────────────────────────────┘ |
|                                                 |
| [Current Chunk: AAPL, MSFT, GOOGL, AMZN, TSLA]  |
|                                                 |
| [Signal Detection]      [Performance]           |
| ┌─────────────────┐     ┌─────────────────┐    |
| │ RSI: 28 found   │     │ Avg time: 450ms │    |
| │ EMA: 15 found   │     │ Cache hit: 68%  │    |
| │ MACD: 9 found   │     │ Errors: 0       │    |
| │ Volume: 42 found│     │                 │    |
| └─────────────────┘     └─────────────────┘    |
|                                                 |
| [Live Results Preview]                          |
| ┌─────────────────────────────────────────────┐ |
| │ 1. NVDA: 94 score (RSI+EMA+Volume)         │ |
| │ 2. AMD: 88 score (RSI+MACD)                │ |
| │ 3. TSLA: 82 score (Volume+Price)           │ |
| └─────────────────────────────────────────────┘ |
+---------------------------------------------------+
```

#### 6.3 Results View
```
+---------------------------------------------------+
| Results: S&P 500 Technical Scan           [Export]|
+---------------------------------------------------+
| Filters: Score >70, Signals: RSI+EMA      [Sort]  |
| ┌─────────────────────────────────────────────┐  |
| │ 1. NVDA - 94 score                          │  |
| │    Price: $950.42 (+3.2%) Vol: 45.2M       │  |
| │    ┌─RSI: 28 (Oversold)                    │  |
| │    ├─EMA: Bullish Crossover (strength: 0.8)│  |
| │    └─Volume: 2.4x average                  │  |
| │    [Add to Watchlist] [View Chart]         │  |
| │                                            │  |
| │ 2. AMD - 88 score                          │  |
| │    Price: $182.15 (+1.8%) Vol: 28.7M      │  |
| │    ┌─RSI: 32 (Near Oversold)              │  |
| │    └─MACD: Bullish (strength: 0.7)        │  |
| │    [Add to Watchlist] [View Chart]        │  |
| │                                            │  |
| │ 3. TSLA - 82 score                         │  |
| │    Price: $245.30 (-0.5%) Vol: 112.4M     │  |
| │    ┌─Volume: 3.1x average                 │  |
| │    └─Price: Support bounce                │  |
| │    [Add to Watchlist] [View Chart]        │  |
| └─────────────────────────────────────────────┘  |
+---------------------------------------------------+
```

## 7. Component Library

### Core Components:
1. **ProgressTracker**: Real-time progress bar with ETA and chunk info
2. **SignalBadge**: Visual indicator for signal type and strength
3. **ScoreCard**: Opportunity card with score breakdown
4. **SessionCard**: Compact session status display
5. **QuickScanPanel**: Preset-based quick action panel
6. **BatchConfigWizard**: Multi-step configuration wizard
7. **ResultsGrid**: Filterable, sortable results table
8. **DashboardMetrics**: Performance KPI cards
9. **SignalVisualizer**: Chart-based signal detection display
10. **RankingConfigurator**: Weight adjustment interface

## 8. Visual Design & Interaction Patterns

### Design System Alignment:
- **Typography**: Consistent with existing Material-UI implementation
- **Color Palette**:
  - Primary: Blue (trust, technology)
  - Success: Green (positive signals)
  - Warning: Orange (caution signals)
  - Error: Red (negative signals)
  - Neutral: Gray (backgrounds, borders)
- **Spacing**: 8px grid system
- **Icons**: Material Icons with custom scanner-specific additions

### Interaction Patterns:
1. **Real-time Updates**: WebSocket connections for live progress
2. **Progressive Disclosure**: Advanced options hidden by default
3. **Inline Validation**: Immediate feedback on configuration
4. **Multi-select Filtering**: Chip-based filter selection
5. **Drag-and-drop**: For ranking weight adjustments
6. **Keyboard Navigation**: Full keyboard support for power users
7. **Responsive Design**: Mobile-friendly with collapsible panels

## 9. Frontend-Backend Integration

### API Service Layer:
```typescript
// New services to complement existing scannerService.ts
- realTimeScannerService.ts
  - startScanSession()
  - getScanProgress()
  - getScanResults()
  - getDashboardData()
  - getSignalDefinitions()
  - getScanPresets()
  - getScannerConfig()

- webSocketService.ts
  - connectToScannerUpdates()
  - subscribeToSession()
  - unsubscribeFromSession()
```

### Data Flow:
1. **Configuration →** POST `/api/real-time-scanner/scan/start`
2. **Progress Updates ←** WebSocket or polling GET `/api/real-time-scanner/scan/{id}/progress`
3. **Results Retrieval →** GET `/api/real-time-scanner/scan/{id}/results`
4. **Dashboard Data →** GET `/api/real-time-scanner/dashboard`

### State Management:
- **React Context** for global scanner state
- **useReducer** for complex session state
- **React Query** for API data caching
- **Zustand** for lightweight global state (if needed)

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. Create new React components structure
2. Implement API service layer for real-time scanner
3. Build basic dashboard layout
4. Create progress tracking components

### Phase 2: Core Features (Week 3-4)
1. Implement session creation wizard
2. Build real-time progress monitoring
3. Create results display with filtering/sorting
4. Add signal visualization components

### Phase 3: Enhanced UX (Week 5-6)
1. Implement WebSocket integration for live updates
2. Add advanced filtering and ranking configuration
3. Create preset management interface
4. Build comprehensive dashboard metrics

### Phase 4: Polish & Testing (Week 7-8)
1. User testing and feedback incorporation
2. Performance optimization
3. Accessibility improvements
4. Comprehensive testing suite

## 11. Success Metrics

### Quantitative:
- Time to first scan result reduced by 50%
- User engagement (sessions per user) increased by 30%
- Error rate in scan configuration reduced by 75%
- Average session completion time visibility improved

### Qualitative:
- User satisfaction score (post-implementation survey)
- Reduced support tickets for scanning issues
- Positive feedback on real-time progress tracking
- Increased usage of batch scanning features

## 12. Next Steps

1. **Review this plan** with stakeholders
2. **Create detailed component specifications**
3. **Develop prototype** for key user flows
4. **Implement Phase 1** components
5. **Conduct usability testing** with target users

---

*This UX design plan provides a comprehensive roadmap for redesigning the scanner UI to leverage the new real-time scanner architecture, focusing on usability, performance, and actionable insights for investment professionals.*