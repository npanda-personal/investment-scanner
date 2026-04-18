# High‑Fidelity Mockup Descriptions

## 1. Scanner Configuration Screen

### Layout
- **Header**: “Create a New Scan” with back navigation.
- **Two‑column layout** (left: configuration, right: preview/summary) on desktop; single column on mobile.

### Section A – Scan Scope
- **Title**: “Scan Scope”
- **Radio‑card selection** (three options):
  1. **Complete Stock Database** – selected by default, icon: globe.
  2. **My Watchlist** – with a dropdown to select a specific watchlist.
  3. **Custom List** – with a multi‑select symbol picker and CSV upload button.
- **Helper text**: “The scanner will evaluate your condition against every symbol in the selected universe.”

### Section B – Condition Builder
- **Title**: “Define Your Rule”
- **Visual condition canvas**:
  - **Add Condition** button (primary) – adds a new row.
  - **Add Group** button (secondary) – creates a nested AND/OR block.
- **Each condition row**:
  - **Indicator dropdown** (width: 40%) – categorized list with search.
  - **Operator dropdown** (width: 20%) – `>`, `>=`, `<`, `<=`, `==`, `!=`.
  - **Value input** (width: 20%) – numeric field with step‑buttons and optional slider.
  - **Remove button** (trash icon) – removes the row.
- **Group block**:
  - Left border colored blue, slight indentation.
  - Header with operator toggle (AND/OR) and collapse/expand chevron.
  - Contains its own set of condition rows.
- **Live preview** below the canvas: human‑readable sentence (e.g., “RSI is greater than 70 AND Volume is greater than 1,000,000”).

### Section C – Schedule & Actions
- **Title**: “Schedule & Actions”
- **Schedule toggle**: “Run once now” / “Real‑time” / “Scheduled”.
  - If scheduled: cron expression builder with preset choices.
- **Target watchlist dropdown**: where matched symbols will be added.
- **Buttons**: “Save Rule” (secondary), “Run Scan” (primary).

### Section D – Summary Card (Right Column)
- **Scan scope summary**: number of symbols, selected universe.
- **Condition summary**: human‑readable rule.
- **Schedule summary**: next run time.
- **Quick actions**: “Edit”, “Duplicate”, “Delete”.

---

## 2. Backtest Configuration Screen

### Layout
- **Header**: “Strategy Backtester”
- **Single‑column layout** with a results pane that appears after running.

### Section A – Strategy Definition
- **Reuses the exact same Condition Builder component** as the scanner screen.
- **Additional parameters** below the builder:
  - **Date range**: start/end date pickers with preset buttons (“1M”, “3M”, “1Y”, “YTD”).
  - **Initial capital**: currency input with default $10,000.
  - **Transaction cost**: percentage or fixed amount per trade.
  - **Commission model**: dropdown (flat, percentage, tiered).

### Section B – Run Backtest
- **Button**: “Run Backtest” (primary) – triggers simulation.
- **Progress indicator** while backtest is running.

### Section C – Results Visualization
- **Equity curve**: line chart showing portfolio value over time. Tooltips show date/value.
- **Performance metrics grid**:
  - **Sharpe ratio** (colored green if ≥1, amber if 0–1, red if negative).
  - **Max drawdown** (colored by severity).
  - **Win rate**, **Profit factor**, **Total return**, **Total trades**.
- **Trade ledger**: expandable table with columns: Symbol, Entry, Exit, P&L, Duration.
- **Export buttons**: “Download CSV”, “Generate Report”.

---

## 3. Scan Results Screen

### Layout
- **Header**: “Scan Results – [Rule Name]”
- **Subheader**: timestamp, number of matches, scan duration.

### Results Table
- **Columns**: Symbol, Last Price, Condition Met At, Actions.
- **Actions column**: “Add to Watchlist” (plus icon), “View Chart” (chart icon), “Ignore” (eye‑slash).
- **Pagination** (20 rows per page).
- **Export button** (top right): “Export to CSV”.

### Side Panel (Optional)
- When a symbol is clicked, a side panel slides in showing:
  - Price chart (last 30 days).
  - Indicator values at the time of the scan.
  - Quick add to watchlist buttons.

---

## 4. Backtest History Screen

### Layout
- **Table of past backtests** with columns: Strategy Name, Date Range, Total Return, Sharpe Ratio, Actions.
- **Actions**: “View Details”, “Re‑run”, “Duplicate”, “Delete”.
- **Filtering** by date, strategy name, performance threshold.

### Detail View (Modal)
- Opens when “View Details” clicked.
- Contains the full backtest results (same as Section C of the Backtest Configuration Screen).

---

## 5. Responsive Behavior

### Mobile (≤640px)
- Radio cards become full‑width blocks.
- Condition rows stack vertically; each form element takes full width.
- Right‑column summary moves below the configuration.
- Tables switch to card‑based layout with horizontal scroll.

### Tablet (641–1024px)
- Two‑column layout becomes single column.
- Condition rows keep horizontal layout but with reduced gaps.
- Charts resize to fit viewport.

---

## 6. Interactive States

### Hover
- Buttons: background darkens by 10%.
- Radio cards: border color changes to gray‑400.
- Table rows: light gray background.

### Active / Selected
- Primary button: darker shade of primary blue.
- Radio card: blue border, light blue background.
- Condition row: subtle blue tint.

### Disabled
- Opacity: 0.5.
- Cursor: not‑allowed.

### Focus
- Blue outline with `box‑shadow: 0 0 0 3px rgba(0, 102, 255, 0.1)`.

---

## 7. Visual Assets

### Icons
- All icons from Font Awesome free set.
- Consistent size: `16px` for inline icons, `20px` for button icons.

### Illustrations
- Empty states: simple SVG illustrations (e.g., magnifying glass for no results).
- Loading: spinning circle with primary blue color.

### Charts
- Use Lightweight Charts (TradingView) for price charts.
- Custom CSS for chart tooltips and axes.

---

## 8. Accessibility Notes

- All images have `alt` text.
- Color contrast meets WCAG AA.
- Focus order follows visual layout.
- ARIA labels for interactive components (dropdowns, buttons, groups).

---

*These descriptions serve as the blueprint for the front‑end implementation. Each component should be built according to the design system.*