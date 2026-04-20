# Real-Time Scanner Prototype - Key User Flows

## Overview
This document outlines interactive prototypes for the 5 most critical user flows in the redesigned real-time scanner. Each flow includes step-by-step interactions, screen transitions, and validation points.

## Flow 1: Quick Scan Session

### User Goal
Start a scan session with minimal configuration using a preset.

### Persona
Active Trader (Alex) - wants to quickly identify trading opportunities

### Flow Steps

#### Step 1: Dashboard Quick Action
1. **Starting Point**: ScannerDashboard component
2. **Interaction**: Click "Quick Scan" button in header
3. **Validation**: User authenticated, backend available
4. **Transition**: Modal overlay with preset selection

#### Step 2: Preset Selection
1. **Screen**: QuickScanModal component
2. **Elements**:
   - Preset cards (3-5 most used presets)
   - "Browse All Presets" link
   - Cancel button
3. **Interaction**: Click on "Momentum Scanner" preset card
4. **Validation**: Preset exists and is valid
5. **Transition**: Progress to session configuration

#### Step 3: Session Configuration
1. **Screen**: QuickSessionConfig component (simplified)
2. **Elements**:
   - Session name field (auto-generated: "Momentum Scan - {timestamp}")
   - Symbol count display (e.g., "Scanning 250 symbols")
   - Estimated time display (e.g., "~45 seconds")
   - Start Scan button
   - Advanced Options toggle
3. **Interaction**: Click "Start Scan" button
4. **Validation**: All required fields populated
5. **Transition**: Redirect to SessionMonitor with new session ID

#### Step 4: Real-time Monitoring
1. **Screen**: SessionMonitor component
2. **Initial State**:
   - Progress bar at 0%
   - Status: "Initializing"
   - Time remaining: "Calculating..."
3. **Real-time Updates**:
   - Progress bar animates as chunks complete
   - Opportunities found counter increments
   - Time remaining updates dynamically
4. **Completion**: Auto-redirect to ResultsView when complete

### Interactive Elements
- **Progress Visualization**: Animated progress bar with chunk status
- **Live Metrics**: Real-time processing rate, opportunities found
- **Cancel Option**: Prominent cancel button with confirmation
- **Notifications**: Toast notification when scan completes

### Success Criteria
- Time from dashboard click to scan start: < 3 seconds
- Clear progress feedback throughout
- Automatic results display upon completion

## Flow 2: Custom Batch Scan Configuration

### User Goal
Configure a detailed batch scan with custom parameters for quantitative analysis.

### Persona
Quantitative Analyst (Jamie) - needs precise control for strategy testing

### Flow Steps

#### Step 1: Initiate Custom Scan
1. **Starting Point**: ScannerDashboard component
2. **Interaction**: Click "Create Custom Scan" button
3. **Transition**: Full-screen SessionCreationWizard component

#### Step 2: Scope Configuration (Wizard Step 1)
1. **Screen**: ScopeSelection step
2. **Elements**:
   - Scope type selector (Preset/Watchlist/Custom)
   - Watchlist dropdown (populated from user's watchlists)
   - Custom symbols textarea with validation
   - Symbol count indicator with warnings (>500 symbols)
   - Next button (disabled until valid scope selected)
3. **Interaction**:
   - Select "Watchlist" scope type
   - Choose "Tech Stocks" watchlist (85 symbols)
   - Click "Next"
4. **Validation**: At least one symbol selected, within limits

#### Step 3: Signal Configuration (Wizard Step 2)
1. **Screen**: SignalConfiguration step
2. **Elements**:
   - Signal toggles (RSI, EMA, MACD, Volume, Price Change)
   - Parameter sliders for each active signal
   - Signal weight distribution visualization
   - Signal preview with sample data
   - Back/Next buttons
3. **Interaction**:
   - Enable RSI (period: 14, oversold: 30, overbought: 70)
   - Enable EMA (fast: 12, slow: 26)
   - Adjust signal weights (RSI: 40%, EMA: 60%)
   - Click "Next"
4. **Validation**: At least one signal enabled, valid parameters

#### Step 4: Ranking & Filtering (Wizard Step 3)
1. **Screen**: RankingConfiguration step
2. **Elements**:
   - Weight sliders for ranking factors
   - Minimum confidence threshold slider
   - Maximum results limit input
   - Sector/market cap filters
   - Estimated results preview
   - Back/Next buttons
3. **Interaction**:
   - Set confidence threshold to 70%
   - Limit results to top 50
   - Filter by "Technology" sector
   - Click "Next"
4. **Validation**: Valid ranking configuration

#### Step 5: Review & Launch (Wizard Step 4)
1. **Screen**: ReviewAndLaunch step
2. **Elements**:
   - Configuration summary (read-only)
   - Estimated time calculation
   - Session name input
   - Save as preset checkbox
   - Launch Scan button
3. **Interaction**:
   - Review configuration summary
   - Name session: "Tech Momentum Analysis"
   - Check "Save as preset"
   - Click "Launch Scan"
4. **Validation**: Session name provided
5. **Transition**: Redirect to SessionMonitor

### Interactive Elements
- **Real-time Validation**: Immediate feedback on invalid inputs
- **Configuration Preview**: Live preview of expected results
- **Progress Saving**: Auto-save between wizard steps
- **Preset Creation**: Option to save configuration as reusable preset

### Success Criteria
- Clear progression through configuration steps
- Immediate validation feedback
- Ability to save complex configurations as presets
- Accurate time estimation

## Flow 3: Real-time Progress Monitoring

### User Goal
Monitor active scan sessions and intervene if needed.

### Persona
Portfolio Manager (Taylor) - managing multiple concurrent scans

### Flow Steps

#### Step 1: Dashboard Overview
1. **Starting Point**: ScannerDashboard component
2. **Elements**:
   - Active sessions list (cards)
   - Each card shows: session name, progress, time remaining
   - Color-coded status indicators
3. **Interaction**: Click on "Large Cap Value Scan" session card
4. **Transition**: Navigate to SessionMonitor for that session

#### Step 2: Detailed Monitoring
1. **Screen**: SessionMonitor component
2. **Initial View**:
   - Large progress bar (45% complete)
   - Chunk status grid (12/25 chunks complete)
   - Real-time metrics panel
   - Live log feed
3. **Interactive Elements**:
   - **Pause/Resume**: Button to temporarily pause processing
   - **Cancel**: Red button with confirmation dialog
   - **Expand Logs**: Toggle to show detailed processing logs
   - **Chunk Details**: Click on chunk to see symbols and status
4. **Real-time Updates**:
   - Progress bar animates smoothly
   - Chunk status updates color (gray→blue→green)
   - Metrics update every 2 seconds
   - Log feed auto-scrolls with new entries

#### Step 3: Intervention Scenario
1. **Situation**: User notices high error rate in logs
2. **Interaction**:
   - Click "Pause" button
   - Review error logs in expanded view
   - Determine issue: API rate limiting
3. **Decision Points**:
   - **Option A**: Adjust configuration and resume
     - Click "Configuration" tab
     - Increase delay between requests
     - Click "Resume"
   - **Option B**: Cancel and restart with different parameters
     - Click "Cancel"
     - Confirm cancellation
     - Return to dashboard

#### Step 4: Multi-session Management
1. **Scenario**: User has 3 active sessions
2. **Dashboard View**:
   - All sessions visible in compact cards
   - Aggregate progress indicator
   - Warning badges for sessions with issues
3. **Interaction**:
   - Click warning badge on "Small Cap Growth" session
   - Quick view modal shows issue details
   - Option to cancel problematic session without leaving dashboard

### Interactive Elements
- **Real-time Visualization**: Animated progress indicators
- **Interactive Controls**: Pause, resume, cancel with confirmation
- **Detail Drill-down**: Expandable sections for logs and metrics
- **Multi-session Management**: Dashboard-level controls

### Success Criteria
- Real-time updates with < 2 second latency
- Clear visual indicators of session health
- Easy intervention controls
- Minimal disruption when managing multiple sessions

## Flow 4: Results Analysis & Filtering

### User Goal
Analyze scan results, filter opportunities, and take action.

### Persona
Active Trader (Alex) - needs to quickly identify actionable opportunities

### Flow Steps

#### Step 1: Results Overview
1. **Starting Point**: ResultsView component (auto-navigated after scan completion)
2. **Initial View**:
   - Results table with top 50 opportunities
   - Default sort by confidence score (descending)
   - Summary statistics header
3. **Initial Interaction**: Scan table for high-confidence opportunities

#### Step 2: Interactive Filtering
1. **Filter Panel** (left sidebar):
   - Confidence slider (currently 0-100)
   - Signal type checkboxes (all selected)
   - Sector dropdown (all sectors)
   - Market cap range slider
2. **Interaction Sequence**:
   - Drag confidence slider to 75-100
   - Deselect "Volume Spike" signal type
   - Select "Technology" sector
   - Set market cap to $10B+
3. **Real-time Response**:
   - Results table updates immediately
   - Result count updates (e.g., "12 of 250 opportunities")
   - Loading indicator during filter application

#### Step 3: Detailed Analysis
1. **Row Interaction**: Click on "AAPL" row
2. **Detail Panel** (slides in from right):
   - Signal visualization (RSI: 72.5, EMA crossover detected)
   - Score breakdown chart
   - Historical price chart (interactive)
   - Action buttons (Add to Watchlist, Create Alert, View Details)
3. **Further Analysis**:
   - Hover over signal visualization for tooltip details
   - Click historical chart to view different timeframes
   - Click "View Details" for full company analysis

#### Step 4: Action Taking
1. **Action Options**:
   - **Add to Watchlist**: Dropdown with user's watchlists
   - **Create Alert**: Modal for setting price/condition alerts
   - **Export**: Button to export selection to CSV/JSON
   - **Compare**: Select multiple rows for comparison view
2. **Interaction**:
   - Click "Add to Watchlist" on AAPL row
   - Select "Tech Opportunities" watchlist
   - Success toast notification appears
   - Row highlights briefly to confirm action

#### Step 5: Comparison View
1. **Scenario**: User wants to compare top 3 opportunities
2. **Interaction**:
   - Check checkboxes on AAPL, MSFT, NVDA rows
   - Click "Compare Selected" button
3. **Comparison View**:
   - Side-by-side comparison cards
   - Key metrics comparison table
   - Visual comparison charts
   - "Back to Results" button

### Interactive Elements
- **Real-time Filtering**: Immediate results update
- **Detail Drill-down**: Expandable row details
- **Multi-select Actions**: Batch operations on selected rows
- **Visual Comparison**: Side-by-side analysis tools

### Success Criteria
- Filter response time < 500ms
- Clear visual feedback for all interactions
- Easy navigation between overview and detail views
- Efficient batch operations

## Flow 5: Preset Management & Reuse

### User Goal
Create, organize, and reuse scan configurations.

### Persona
Quantitative Analyst (Jamie) - builds and refines scanning strategies

### Flow Steps

#### Step 1: Access Preset Manager
1. **Starting Point**: Anywhere in scanner interface
2. **Access Points**:
   - Dashboard "Manage Presets" button
   - SessionCreationWizard "Save as Preset" option
   - Navigation menu "Presets" item
3. **Interaction**: Click navigation menu "Presets"
4. **Transition**: ScannerPresetManager component

#### Step 2: Browse & Search Presets
1. **Initial View**:
   - Grid of preset cards
   - Search bar at top
   - Category filters sidebar
   - Sort options dropdown
2. **Interaction**:
   - Type "momentum" in search bar
   - Results filter to show momentum-related presets
   - Click on "Large Cap Momentum" preset card

#### Step 3: Preset Preview & Edit
1. **Preset Detail View**:
   - Configuration summary (read-only)
   - Usage statistics (times used, success rate)
   - Last used timestamp
   - Action buttons (Use, Duplicate, Edit, Delete)
2. **Interaction**:
   - Click "Duplicate" button
   - Auto-navigate to duplicate editing mode

#### Step 4: Create/Edit Preset
1. **Editing Interface**:
   - Same as SessionCreationWizard but for preset configuration
   - Additional fields: preset name, description, category, tags
   - Preview of what the preset configures
2. **Interaction**:
   - Change name to "Large Cap Momentum v2"
   - Adjust RSI parameters (change oversold to 25)
   - Add tag "aggressive"
   - Click "Save Preset"
3. **Validation**: Preset name unique, valid configuration

#### Step 5: Organize Presets
1. **Organization Features**:
   - Drag-and-drop to reorder presets
   - Category creation and assignment
   - Bulk operations (select multiple, assign category)
   - Import/export functionality
2. **Interaction**:
   - Drag "Large Cap Momentum v2" to "Momentum Strategies" category
   - Create new category "Sector Rotation"
   - Select 3 presets, assign to new category

#### Step 6: Quick Application
1. **From Dashboard**:
   - Hover over preset card
   - "Quick Apply" button appears
   - Click to start scan with preset configuration
2. **From Session Creation**:
   - Preset dropdown with search
   - Recent presets section
   - Favorite presets (starred)

### Interactive Elements
- **Search & Filter**: Real-time preset filtering
- **Drag-and-drop**: Visual organization
- **Quick Apply**: One-click preset usage
- **Import/Export**: Configuration sharing

### Success Criteria
- Intuitive preset organization
- Quick access to frequently used presets
- Easy duplication and modification
- Efficient bulk operations

## Prototype Implementation Approach

### Low-Fidelity Prototype (Phase 1)
1. **Interactive Wireframes** using Figma/Framer
2. **Click-through flows** for key user journeys
3. **Basic animations** for transitions
4. **User testing** with target personas

### Medium-Fidelity Prototype (Phase 2)
1. **Functional React components** with mock data
2. **Realistic interactions** and state management
3. **API integration stubs** for backend simulation
4. **Performance testing** with realistic data volumes

### High-Fidelity Prototype (Phase 3)
1. **Full integration** with backend API
2. **Real data** from actual scanning sessions
3. **Performance optimization** for production
4. **Accessibility compliance** testing

### Prototyping Tools Recommended
1. **Figma**: For design and interactive prototypes
2. **Storybook**: For component development and testing
3. **React Testing Library**: For interaction testing
4. **Cypress**: For end-to-end flow testing

## Validation Points for Each Flow

### Flow 1 (Quick Scan)
- Time from click to scan start < 3s
- Clear progress indication throughout
- Automatic results display

### Flow 2 (Custom Configuration)
- Intuitive wizard progression
- Immediate validation feedback
- Accurate time estimation

### Flow 3 (Progress Monitoring)
- Real-time updates with < 2s latency
- Clear session health indicators
- Easy intervention controls

### Flow 4 (Results Analysis)
- Filter response time < 500ms
- Clear visual feedback
- Efficient batch operations

### Flow 5 (Preset Management)
- Intuitive organization
- Quick access to frequent presets
- Easy modification

## Next Steps for Prototype Development

1. **Create interactive wireframes** for all 5 flows
2. **Develop component stubs** with mock data
3. **Implement key interactions** (filtering, sorting, progress updates)
4. **Conduct usability testing** with target users
5. **Iterate based on feedback** before full implementation

---
*This prototype specification provides detailed interaction patterns for the most critical user flows, ensuring the redesigned scanner UI meets user needs for efficiency, clarity, and control.*