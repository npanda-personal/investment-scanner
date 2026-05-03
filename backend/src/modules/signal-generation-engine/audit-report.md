# Audit Report: Signal Generation Engine

## Backend Audit

### 1. API Validation Parameter Stripping
- **Affected File(s):** `signal-generation-engine.validation.ts`
- **Severity:** HIGH
- **Why it matters:** `parseSignalQuery` only extracts a subset of allowed parameters. Crucial parameters like `offset`, `sortBy`, and `sortDirection` are ignored, which breaks pagination and sorting across the entire module.
- **Signal Impact:** Frontend filters and table controls appear functional but don't actually affect the results returned by the API.
- **Recommended Fix:** Update `parseSignalQuery` and `parseRunRequest` to include all supported `SignalQuery` fields with proper type normalization.
- **Safe to fix now:** YES

### 2. N+1 Performance Bottleneck in Enrichment
- **Affected File(s):** `signal-generation-engine.service.ts`
- **Severity:** HIGH
- **Why it matters:** `enrichSignals` calls `enrichSignal` for every item in a list. `enrichSignal` makes 3 separate async calls to `marketDataService`. For a page size of 25, this results in 75 extra calls per request.
- **Signal Impact:** Slower API response times, especially as the number of concurrent users or items per page grows.
- **Recommended Fix:** Implement batch lookups in `marketDataService` if available, or at least optimize `enrichSignal` to minimize redundant calls.
- **Safe to fix now:** YES

### 3. Non-Scalable Signal Retrieval Logic
- **Affected File(s):** `signal-generation-engine.repository.ts`
- **Severity:** HIGH
- **Why it matters:** `latestSignals` fetches ALL `signalResult` rows from the database matching the criteria, then filters for the latest result per instrument in memory using a `Map`. As the history grows, this will consume excessive memory and CPU.
- **Signal Impact:** Eventual API timeouts and potential server crashes under load.
- **Recommended Fix:** Utilize Prisma's `distinct` and `orderBy` features to let the database handle the "latest per instrument" logic.
- **Safe to fix now:** YES

### 4. Flawed Confidence Logic
- **Affected File(s):** `signal-generation-engine.service.ts`
- **Severity:** MEDIUM
- **Why it matters:** `confidenceFor` only counts "triggered" (positive) signals. A stock with 10 bearish signals and 0 bullish signals would have 0 signal count in this logic, resulting in LOW confidence even if the data is high quality and the bearish signal is strong.
- **Signal Impact:** Misleading confidence levels for bearish or neutral signals.
- **Recommended Fix:** Count the total number of evaluated signals (triggered + negative) and consider data freshness/quality.
- **Safe to fix now:** YES

### 5. RSI Calculation Accuracy
- **Affected File(s):** `signal-generation-engine.service.ts`
- **Severity:** LOW
- **Why it matters:** The current implementation uses a "Simple RSI" (average gain / average loss) instead of the industry-standard Wilder's smoothing method.
- **Signal Impact:** Slight variance from standard RSI values found on trading platforms.
- **Recommended Fix:** Implement standard smoothed RSI calculation or document the current method as "Simple RSI".
- **Safe to fix now:** YES

### 6. Scoring Sensitivity with Low Data
- **Affected File(s):** `signal-generation-engine.service.ts`
- **Severity:** MEDIUM
- **Why it matters:** `categoryScore` is a simple ratio of positive signals. If only one signal is evaluated and it's positive, the category score is 1.0 (100%). This overweights instruments with sparse data.
- **Signal Impact:** High scores for stocks with very little information, leading to false positives.
- **Recommended Fix:** Add a small "Laplace smoothing" or a minimum signal requirement before a category can reach extreme scores.
- **Safe to fix now:** YES

### 7. Missing Data Staleness Check
- **Affected File(s):** `signal-generation-engine.service.ts`
- **Severity:** MEDIUM
- **Why it matters:** Signals can be generated even if the latest price is several days old (stale), without any warning or confidence penalty.
- **Signal Impact:** Users might act on signals based on outdated information.
- **Recommended Fix:** Check `priceTimestamp` against current time and add warnings/penalties for stale data.
- **Safe to fix now:** YES

## Frontend Audit

### 1. Ineffective Filters and Sorting
- **Affected File(s):** `SignalsDashboardPage.tsx`
- **Severity:** HIGH
- **Why it matters:** Filters and sorting rely on query parameters that are currently being stripped by the backend.
- **Signal Impact:** The user experience is frustrating as table controls don't persist or work as expected.
- **Recommended Fix:** Fix backend validation and ensure frontend state correctly maps to API calls.
- **Safe to fix now:** YES

### 2. Limited Signal Visibility
- **Affected File(s):** `SignalTable.tsx`
- **Severity:** MEDIUM
- **Why it matters:** Users only see the top 3 reasons in the table. There is no way to see the full set of triggered and negative signals for a specific result.
- **Signal Impact:** Lack of transparency; users "just have to trust" the score.
- **Recommended Fix:** Add a detail view or expand row feature to show all signals and the full explanation.
- **Safe to fix now:** YES

### 3. Search and Select Usability
- **Affected File(s):** `SignalsDashboardPage.tsx`
- **Severity:** LOW
- **Why it matters:** Manual signal run uses a text field for limit, and there is no easy way to run signals for a specific sector or country without typing.
- **Signal Impact:** Slight UX friction for power users.
- **Recommended Fix:** Use standard selectors and better input validation.
- **Safe to fix now:** YES
