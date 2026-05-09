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

### 4. Browser Audit: Unsupported Enriched-Field Sorting
- **Affected File(s):** `SignalTable.tsx`
- **Severity:** MEDIUM
- **Why it matters:** Price and daily change are enriched after the backend selects and paginates persisted signal rows, so sortable headers for those columns appeared to work while the backend could not honor them accurately.
- **Signal Impact:** Users could believe they were sorting by current price or daily move while still seeing score/date ordered data.
- **Implemented Fix:** Removed the sortable affordance for Price and Daily columns until those values are persisted or backed by a dedicated query path.
- **Safe to fix now:** DONE

### 5. Browser Audit: Broken Stock Detail Navigation
- **Affected File(s):** `SignalTable.tsx`
- **Severity:** HIGH
- **Why it matters:** Table row, symbol, and View Stock Details actions routed to `/stocks/:id`, but the registered stock research route is `/research/stocks/:id`.
- **Signal Impact:** Primary inspection actions from signal rows led to an unmatched route instead of the stock workspace.
- **Implemented Fix:** Updated signal table navigation to `/research/stocks/:id`.
- **Safe to fix now:** DONE

### 6. Browser Audit: Header Actions Overflow
- **Affected File(s):** `PageHeader.tsx`, `SignalsDashboardPage.tsx`
- **Severity:** MEDIUM
- **Why it matters:** The Signals page primary and secondary actions clipped at tablet-width viewports, hiding part of "View Signal Quality Lab" and pushing content into page-level horizontal overflow.
- **Signal Impact:** Users could miss key actions or have to horizontally scroll the whole page.
- **Implemented Fix:** Made shared page header action groups wrap with bounded width and wrapping button labels.
- **Safe to fix now:** DONE

### 7. Performance Audit: User-Editable Batch/Worker Controls
- **Affected File(s):** `SignalsDashboardPage.tsx`, `config.ts`, `signal-generation-engine.config.ts`
- **Severity:** MEDIUM
- **Why it matters:** Exposing batch size and worker count as raw UI inputs lets users accidentally choose values that create slow runs, high memory pressure, or excessive provider fallback traffic.
- **Signal Impact:** Signal generation could be harmed by unusual per-run values instead of following tested module defaults.
- **Implemented Fix:** Removed the batch/worker inputs from the dashboard. Defaults are now module-owned config constants: `signal_generation_engine_batch_size=100` and `signal_generation_engine_workers_count=4`, with backend clamps still protecting the API.
- **Safe to fix now:** DONE

### 8. Architecture Audit: Batch Generation Coupled to Heavy Research/Provider Work
- **Affected File(s):** `signal-generation-engine.service.ts`
- **Severity:** HIGH
- **Why it matters:** Raw signal batch generation was calling the full Stock Research Workbench aggregate for every instrument and still allowed missing fundamentals to fall back to Yahoo. That aggregate is optimized for an investor-facing stock detail workflow and can fan out into peer comparison, corporate actions, latest price, fundamentals, and price-history lookups.
- **Signal Impact:** Large universe runs performed unnecessary detail-page/provider work, making the worker pool less effective and causing each 100-instrument batch to sit behind provider-throttle timing.
- **Implemented Fix:** Added a lightweight research context for batch generation. Batches now score from instrument, price, and stored fundamentals data without invoking the full workbench or fetching missing fundamentals from Yahoo per instrument; single-symbol/single-instrument generation still uses the full context for targeted review.
- **Safe to fix now:** DONE

### 9. Performance Audit: Sequential Frontend Batch Dispatch
- **Affected File(s):** `useBatchRunner.ts`, `SignalsDashboardPage.tsx`, `config.ts`
- **Severity:** HIGH
- **Why it matters:** The dashboard waited for each bounded backend batch before starting the next offset, so full-universe generation serialized network and database work even after the backend supported bounded workers.
- **Signal Impact:** Users saw many `/signals/run` requests finish one at a time, increasing total run duration unnecessarily.
- **Implemented Fix:** Added a hidden module-owned frontend request pool, `signal_generation_engine_batch_request_workers_count`, so independent backend offsets can run concurrently after the first batch discovers `totalCount`.
- **Safe to fix now:** DONE

### 10. Performance Audit: Strategy Context Loaded On Every Table Request
- **Affected File(s):** `SignalsDashboardPage.tsx`, `SignalTable.tsx`, `signal-generation-engine.md`
- **Severity:** MEDIUM
- **Why it matters:** The dashboard requested `includeStrategyMatches=true` for every list view even when users were only scanning raw signals. That forced Strategy Framework enrichment, extra price-history reads, and strategy-performance lookups into the default table path.
- **Signal Impact:** Raw signal browsing became heavier than necessary and the table could show "No match" when the user had not intentionally asked to load strategy context.
- **Implemented Fix:** Made strategy context opt-in with a "Show strategy context" control. Strategy filters still load context automatically when required, and the table now shows "Not loaded" when context is intentionally skipped.
- **Safe to fix now:** DONE

### 11. Architecture Audit: Strategy Framework Barrel Export Cycle
- **Affected File(s):** `signal-generation-engine.service.ts`
- **Severity:** MEDIUM
- **Why it matters:** Strategy Framework exports evaluator/registry through its public index, but importing that barrel here loads Strategy Framework service/router/module side effects, which currently pull Market Context back into Signal Generation and create a circular constructor failure in tests.
- **Signal Impact:** A naive public-barrel import breaks Signal Generation tests and can make runtime module load order fragile.
- **Recommended Fix:** Split Strategy Framework public exports into a side-effect-light contract/evaluator entrypoint, or make its module index avoid eager router/service imports. Until then, keep the existing direct evaluator/registry imports and do not import another module's repository directly.
- **Safe to fix now:** NO, because it requires a broader Strategy Framework export cleanup outside this module pass.

### 12. UX Audit: Row Click Navigated Away Instead Of Inspecting Signal Evidence
- **Affected File(s):** `SignalTable.tsx`, `signal-generation-engine.md`
- **Severity:** MEDIUM
- **Why it matters:** The shared table UX standard says row click should inspect dense comparison rows, while explicit buttons should handle navigation. Signal rows previously navigated directly to stock research, which made it hard to inspect full triggered/negative evidence without leaving the page.
- **Signal Impact:** Users could not quickly audit why a raw score was bullish, neutral, or bearish from the signal table itself.
- **Implemented Fix:** Row click now opens a raw-signal diagnostics drawer with score, direction, confidence, triggered factors, negative factors, warnings, and optional strategy context. Research and Strategy Decision remain explicit actions.
- **Safe to fix now:** DONE
