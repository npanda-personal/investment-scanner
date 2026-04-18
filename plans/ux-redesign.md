# Investment Scanner & Backtest Module – UX Redesign Specification

## Objective
Overhaul the user interface of the scanner and backtest modules to maximize business value and user adoption by significantly improving usability, efficiency, and clarity.

### Core Problems Addressed
1. **Condition Builder** – Replace error‑prone manual JSON entry with an intuitive, guided visual builder.
2. **Scan Scope** – Eliminate the limitation of scanning only a user’s watchlist; provide clear options for scanning the complete stock database, custom watchlists, or screener‑based universes.

## 1. Holistic Screen Audit

### Current State
**Scanner Configuration Screen** (`/scanner`)
- Simple form with free‑text JSON field for condition.
- Limited scan scope (only a single watchlist).
- No visual feedback, no validation, no guidance.

**Backtest Configuration Screen** (`/backtester`)
- Similar JSON‑based condition entry.
- Additional fields for date range, initial capital, etc.
- Results presented in a table with numeric metrics.

**Common Shortcomings**
- Steep learning curve – users must know JSON syntax and the exact structure of the condition language.
- High risk of syntax errors leading to failed scans/backtests.
- Inability to easily combine multiple conditions with AND/OR logic.
- No visual preview of the constructed rule.
- Scan universe is constrained to a single watchlist, limiting discovery.

## 2. User Scenarios

### A. Novice User – First Simple Scan
- Goal: Create a basic scan for “RSI > 70” without writing any JSON.
- Expectation: Dropdown selection of indicator, operator, and numeric input.

### B. Power User – Complex Multi‑Condition Strategy
- Goal: Build a strategy with nested AND/OR logic, e.g., “(RSI < 30 AND volume > 1M) OR (MACD histogram > 0)”.
- Expectation: Ability to add groups, drag‑and‑drop reordering, clear visual hierarchy.

### C. Reviewer – Analyzing Past Scan Results & Backtest Performance
- Goal: Quickly understand what a rule does and evaluate its historical performance.
- Expectation: Human‑readable rule summary, visual equity curve, performance metrics with tooltips.

## 3. Information Architecture

### Scanner Configuration Screen
**Primary Sections**
1. **Scan Scope** – Define the universe of symbols to scan.
2. **Condition Builder** – Visual rule construction.
3. **Schedule & Actions** – Scheduling options and target watchlist.
4. **Review & Run** – Summary and execution controls.

### Backtest Configuration Screen
**Primary Sections**
1. **Strategy Definition** – Reuse the same Condition Builder.
2. **Backtest Parameters** – Date range, initial capital, transaction costs.
3. **Performance Metrics & Visualization** – Results display.

**Consistency Principle**
The Condition Builder component must be identical in both screens, ensuring a seamless mental model across scanning and backtesting.

## 4. Visual Design – High‑Fidelity Mockup Descriptions

### 4.1 Scan Scope Selector
**Component**: Radio‑button group + supplementary controls.

**Options**:
- **Complete Stock Database** (default) – scans all symbols in the system.
- **My Watchlist** – dropdown to select one of the user’s watchlists.
- **Custom List** – multi‑select symbol picker with search/filter.

**Visual**: Card with clear iconography and short description of each option.

### 4.2 Condition Builder
**Component**: Interactive rule‑building canvas.

**Single Condition Row**:
```
[Indicator Dropdown]  [Operator Dropdown]  [Value Input]  [Remove Button]
```
- **Indicator Dropdown**: Categorized list (Momentum, Trend, Volatility, Volume) with search.
- **Operator Dropdown**: `>`, `>=`, `<`, `<=`, `==`, `!=`.
- **Value Input**: Number field with optional unit (%, $, etc.) and slider for quick adjustment.

**Logical Grouping**:
- “Add Condition” button inserts a new row.
- “Add Group” button creates a nested block (AND/OR) with its own set of rows.
- Groups can be collapsed/expanded for clarity.
- Drag‑and‑drop to reorder conditions/groups (optional v2 feature).

**Live Preview**:
- A human‑readable English sentence is generated in real‑time below the builder, e.g., “RSI is greater than 70 AND Volume is greater than 1,000,000”.

### 4.3 Schedule & Actions
**Scanner‑only section**:
- **Schedule**: Toggle between “Run once now”, “Real‑time”, “Scheduled”.
- If scheduled: Cron expression builder with preset choices (e.g., “Every 5 minutes”, “Daily at market open”).
- **Target Watchlist**: Dropdown to select where matched symbols will be added (or create new watchlist).

### 4.4 Review & Run Panel
**Scanner**:
- Summary card showing scan scope (# of symbols), condition (human‑readable), schedule.
- “Run Scan” button (primary action).

**Backtest**:
- Additional parameters: date range picker, initial capital input, transaction cost input.
- “Run Backtest” button.

### 4.5 Results Visualization
**Scanner Results**:
- Table of matched symbols with columns: Symbol, Last Price, Condition Met At, Actions (Add to Watchlist, View Chart).
- Ability to export to CSV.

**Backtest Results**:
- **Equity Curve** – line chart showing portfolio value over time.
- **Performance Metrics Grid** – Sharpe ratio, max drawdown, win rate, total return, etc. with color‑coded good/bad thresholds.
- **Trade Ledger** – expandable table of individual trades.
- **Download Report** button.

## 5. Design System Components

### Interactive Components
1. **Dropdown with Search** – used for indicator selection, watchlist selection.
2. **Condition Row** – compact horizontal layout with consistent spacing.
3. **Group Card** – bordered container with a header showing AND/OR toggle and collapse icon.
4. **Parameter Input** – numeric field with optional slider and unit label.
5. **Summary Card** – light‑gray background, rounded corners, typographic hierarchy.

### Typography & Colors
- **Font**: System stack (Inter, -apple‑system, BlinkMacSystemFont, Segoe UI, Roboto).
- **Primary Color**: `#0066FF` (blue) for primary actions and selected states.
- **Secondary Color**: `#6B7280` (gray) for borders and inactive elements.
- **Success**: `#10B981` (green) for positive metrics.
- **Warning**: `#F59E0B` (amber) for neutral metrics.
- **Error**: `#EF4444` (red) for negative metrics.

### Spacing & Layout
- **Grid**: 12‑column flexbox grid with 24px gutter.
- **Card Padding**: 24px.
- **Form Field Vertical Rhythm**: 16px between fields.

## 6. Key User Flows (Clickable Prototype)

### Flow 1: Creating a Simple Scan
1. User navigates to Scanner page.
2. Scan Scope defaults to “Complete Stock Database”.
3. Clicks “Add Condition”.
4. Selects “RSI” from indicator dropdown.
5. Selects “>” from operator dropdown.
6. Enters “70” in value field.
7. Sees live preview: “RSI is greater than 70”.
8. Clicks “Run Scan”.
9. Results table appears with matched symbols.

### Flow 2: Building a Complex Strategy for Backtesting
1. User navigates to Backtester page.
2. Clicks “Add Group” and selects “AND” as group operator.
3. Inside the group, adds two conditions: “RSI < 30” and “Volume > 1,000,000”.
4. Adds a second condition outside the group: “MACD histogram > 0” with “OR” operator.
5. Sets backtest date range (last 1 year) and initial capital ($10,000).
6. Clicks “Run Backtest”.
7. Views equity curve and performance metrics.

### Flow 3: Reviewing Past Scan Results
1. User goes to “Scan History” tab.
2. Sees list of previous scans with timestamp, condition, number of matches.
3. Clicks on a scan to expand details – see the exact condition and matched symbols.
4. Can re‑run the same scan with one click.

## 7. Implementation Roadmap

### Phase 1 – Core Condition Builder Component
- Create reusable `ConditionBuilder` React component with state management.
- Implement indicator dropdown, operator dropdown, numeric input.
- Generate JSON output compatible with existing backend API.

### Phase 2 – Scan Scope Selector
- Create `ScanScopeSelector` component with three options.
- Connect to backend to fetch watchlists and symbol database.

### Phase 3 – Scanner UI Integration
- Replace JSON textarea in `/scanner` with new ConditionBuilder and ScanScopeSelector.
- Update form submission to send the generated JSON.
- Add results table.

### Phase 4 – Backtest UI Integration
- Reuse ConditionBuilder in `/backtester`.
- Add backtest‑specific parameters (date range, capital, etc.).
- Enhance results visualization with charts and metrics grid.

### Phase 5 – Polish & Usability Testing
- Add keyboard shortcuts (e.g., Enter to add condition).
- Improve accessibility (ARIA labels, focus management).
- Conduct internal usability tests.

## 8. Success Metrics
- **Reduction in user errors** (measured by failed scan/backtest API calls).
- **Decreased time to create a working scan** (average time from page load to first successful run).
- **Increased frequency of user engagement** (number of scans/backtests per user per week).
- **Improved user satisfaction** (post‑release survey).

## 9. Deliverables
1. **This specification document** (`plans/ux‑redesign.md`).
2. **Component library** (Storybook‑like documentation) – to be created in `frontend/src/components/design-system`.
3. **High‑fidelity mockup screens** (as Figma‑style descriptions; actual mockups require graphic design tools beyond current scope).
4. **Clickable HTML prototype** (implemented as a standalone React app in the workspace) – to be built in `frontend/prototype`.

## Next Steps
1. Review this specification with stakeholders.
2. Upon approval, switch to **💻 Code mode** to begin implementation of Phase 1.