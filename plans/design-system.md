# Investment Scanner – Design System

## Overview
This document defines the visual and interactive standards for the redesigned scanner and backtest modules. The design system ensures consistency, accessibility, and a professional user experience across the application.

## 1. Colors

### Primary Palette
- **Primary Blue**: `#0066FF` – used for primary actions, selected states, and highlights.
- **Primary Blue Light**: `#E6F0FF` – background for selected items, subtle highlights.
- **Primary Blue Dark**: `#0052D6` – hover state for primary buttons.

### Neutral Palette
- **Gray 900**: `#111827` – main text, headings.
- **Gray 700**: `#374151` – secondary text, labels.
- **Gray 500**: `#6B7280` – placeholder, helper text.
- **Gray 300**: `#D1D5DB` – borders, disabled elements.
- **Gray 100**: `#F3F4F6` – light backgrounds.
- **Gray 50**: `#F9FAFB` – page background.

### Semantic Colors
- **Success**: `#10B981` – positive metrics, confirmation messages.
- **Warning**: `#F59E0B` – caution, neutral metrics.
- **Error**: `#EF4444` – negative metrics, error alerts.
- **Info**: `#3B82F6` – informational messages.

## 2. Typography

### Font Family
- **Primary**: `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Monospace**: `'Courier New', Courier, monospace` – used for code snippets, previews.

### Font Sizes & Weights
- **H1**: `28px / 700` – page titles.
- **H2**: `24px / 600` – section headers.
- **H3**: `20px / 600` – card titles.
- **Body Large**: `16px / 400` – main content.
- **Body Regular**: `14px / 400` – standard text, form labels.
- **Body Small**: `13px / 400` – helper text, captions.
- **Code**: `15px / 400` (monospace) – JSON preview, technical values.

### Line Heights
- **Tight**: `1.25` – headings.
- **Normal**: `1.5` – body text.
- **Loose**: `1.75` – long paragraphs.

## 3. Spacing & Layout

### Base Unit
- **8px** – all spacing multiples are based on this unit.

### Common Spacing Values
- **4px**: `--space-1`
- **8px**: `--space-2`
- **12px**: `--space-3`
- **16px**: `--space-4`
- **20px**: `--space-5`
- **24px**: `--space-6`
- **32px**: `--space-8`
- **40px**: `--space-10`
- **48px**: `--space-12`

### Grid
- **Container Max Width**: `1000px` (for content‑heavy screens), `800px` (for focused forms).
- **Gutter**: `24px` (between columns).
- **Card Padding**: `24px` (vertical and horizontal).
- **Form Field Vertical Rhythm**: `16px` between consecutive fields.

## 4. Components

### 4.1 Button

**Primary Button**
- Background: `#0066FF`
- Text color: white
- Padding: `10px 20px`
- Border radius: `6px`
- Font weight: `500`
- Hover: background `#0052D6`
- Focus: `0 0 0 3px rgba(0, 102, 255, 0.1)`

**Secondary Button**
- Background: `#F3F4F6`
- Text color: `#374151`
- Border: `1px solid #D1D5DB`
- Same padding and radius as primary.
- Hover: background `#E5E7EB`

**Icon Button**
- Square, `36px × 36px`
- Background transparent, border `1px solid #D1D5DB`
- Color: `#6B7280`
- Hover: background `#F3F4F6`

### 4.2 Card
- Background: white
- Border radius: `12px`
- Box shadow: `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`
- Padding: `24px`
- Margin bottom: `24px`

### 4.3 Form Fields

**Text Input / Number Input**
- Height: `40px`
- Padding: `10px 12px`
- Border: `1px solid #D1D5DB`
- Border radius: `6px`
- Font size: `14px`
- Focus: border `#0066FF`, box‑shadow `0 0 0 3px rgba(0, 102, 255, 0.1)`
- Placeholder color: `#9CA3AF`

**Dropdown (Select)**
- Same as text input, with a custom chevron icon.
- Background: white `url("data:image/svg+xml,...")` no‑right 12px center.

**Radio Card**
- Border: `2px solid #E5E7EB`
- Border radius: `8px`
- Padding: `20px`
- Cursor: pointer
- Selected: border color `#0066FF`, background `#F0F7FF`
- Hover: border color `#9CA3AF`

### 4.4 Condition Builder

**Condition Row**
- Display: flex, align‑items center, gap `16px`
- Background: white
- Border: `1px solid #E5E7EB`
- Border radius: `8px`
- Padding: `16px`
- Margin bottom: `16px`

**Group Container**
- Border‑left: `4px solid #0066FF`
- Padding left: `20px`
- Margin bottom: `24px`
- Background: `#F8FAFC`
- Border radius: `0 8px 8px 0`

**Operator Badge**
- Display: inline‑block
- Padding: `6px 12px`
- Background: `#E0F2FE`
- Color: `#0369A1`
- Border radius: `20px`
- Font size: `13px`
- Font weight: `600`

### 4.5 Preview Panel
- Background: `#F8FAFC`
- Border: `1px dashed #9CA3AF`
- Border radius: `8px`
- Padding: `20px`
- Monospace font for JSON/text output.

## 5. Icons

**Source**: Font Awesome (free version) via CDN.

**Common Icons**:
- `fa-globe` – scan scope
- `fa-sitemap` – condition builder
- `fa-play-circle` – actions
- `fa-plus` – add
- `fa-trash` – remove
- `fa-layer-group` – group
- `fa-rocket` – run scan
- `fa-save` – save
- `fa-history` – schedule

## 6. Accessibility

### Contrast
All text meets WCAG AA contrast ratios:
- Primary text (`#111827`) on white background: 15.9:1
- Secondary text (`#6B7280`) on white: 7.5:1

### Focus States
- All interactive elements have a visible focus indicator (blue outline with `box‑shadow`).
- Focus order follows logical tab sequence.

### Keyboard Navigation
- Condition rows can be navigated with `Tab` / `Shift+Tab`.
- Dropdowns open with `Space` or `Enter`.
- Buttons activated with `Space` or `Enter`.

### Screen Readers
- Form fields have associated `aria‑label` or `aria‑labelledby`.
- Dynamic content changes are announced via `aria‑live` regions (e.g., live preview).

## 7. Responsive Behavior

### Breakpoints
- **Mobile**: up to `640px`
- **Tablet**: `641px – 1024px`
- **Desktop**: `1025px` and above

### Mobile Adaptations
- Condition rows stack vertically.
- Radio cards become full‑width blocks.
- Card padding reduced to `16px`.
- Font sizes scaled down slightly.

## 8. Implementation Notes

### CSS Architecture
- Use CSS custom properties (variables) for colors, spacing, fonts.
- Follow BEM naming convention for component classes.
- Leverage Flexbox/Grid for layouts.

### React Component Structure
- Each major UI piece (ConditionBuilder, ScanScopeSelector, etc.) is a reusable functional component.
- State managed via React hooks; complex state may use Zustand.
- Props follow TypeScript interfaces for type safety.

### Prototype Location
- Static HTML/CSS/JS prototype is available at `/frontend/prototype/index.html`.
- The prototype demonstrates core interactions and can be used for usability testing.

---

*This design system is a living document and will be updated as the UI evolves.*