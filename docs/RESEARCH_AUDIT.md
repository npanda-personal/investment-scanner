# Research Section Audit Report (Phase 1 - Deep Logic & Architecture)

## Executive Summary
This deeper architectural audit evaluates the business logic, data contracts, and performance safety of the four core Research modules. We discovered critical architectural flaws in how calculations are orchestrated across the modules. Two of the modules (Smart Money and Market Context) are performing expensive, unscalable on-the-fly calculations for every API request, violating the core requirement that no endpoint should process the universe without an explicit batch action.

---

## 1. Smart Money Intelligence (Severity: BLOCKER)

### Architecture & Performance Flaws
- **No Persistence Layer**: The `smart-money-intelligence.repository.ts` explicitly states it calculates everything on demand. There is no `SmartMoneySnapshot` in the database.
- **N+1 / Full Universe On-The-Fly Processing**: The endpoints `/top`, `/distribution`, and `/sectors` call a method `loadUniverseSummaries()`. This method fetches 75 hardcoded instruments, loads their full historical price bars, and recalculates accumulation/distribution scores synchronously on every HTTP request.
- **Orchestration Bottleneck**: When the Strategy Decision Engine evaluates candidates, it calls `smartMoneyService.stock()` inside its loop, forcing another DB query for price bars and on-the-fly math. 

### Recommended Fix (Phase 2 & 4)
- **Add Persistence**: Create a Prisma model (e.g., `SmartMoneySnapshot`) and wire up the repository.
- **Batch Processing**: Introduce a `POST /api/v1/smart-money/run` endpoint to batch calculate scores asynchronously.
- **Refactor Reads**: Refactor the `top` and `distribution` endpoints to simply query the persisted snapshots with proper DB-level pagination (`limit`/`offset`).

---

## 2. Market Context Intelligence (Severity: HIGH)

### Architecture & Performance Flaws
- **On-The-Fly Aggregation**: Similar to Smart Money, Market Context calculates the market regime, breadth, and sector rotation *on the fly* for every request by pulling 120 sample instruments (`SAMPLE_SIZE = 120`) into memory.
- **Coupling & Caching**: Because Market Gate (used by Strategy) relies on Market Context, every time a user views the Strategy dashboard, the server runs heavy calculations across 120 stocks to determine if the gate is Open or Closed.

### Recommended Fix (Phase 2 & 4)
- **Add Persistence**: Create a `MarketContextSnapshot` Prisma model to store the daily regime, breadth, and sector rankings.
- **Batch Processing**: Create a `run()` endpoint.
- **Refactor Reads**: Ensure the frontend and Strategy module only read the latest persisted snapshot.

---

## 3. Strategy Decision Engine (Severity: MEDIUM)

### Logic & Orchestration
- **Market Gate Integration**: Strategy correctly uses the `MarketGate` to block or allow trades based on the regime. However, it relies on the unscalable, un-persisted `MarketContextService`.
- **Decision Logic**: Evaluates inputs (Signals, Quality, Smart Money) correctly but pays the price for the lack of persistence in the downstream modules.
- **Pagination**: The `exits` and `wait/watch` endpoints lack standard DB pagination parameters.

### Recommended Fix
- Update the orchestration so Strategy reads the *persisted* Smart Money and Market Context data. 
- Fix pagination for all list endpoints.

---

## 4. Signal Generation Engine (Severity: LOW)

### Logic & Orchestration
- **Data Quality**: Correctly utilizes the Data Quality Engine to filter out bad data before generating signals.
- **Persistence**: Safely persists `SignalResult` to the database using an explicit `run()` batch action. This is the correct architectural pattern that the other modules should emulate.

---

## Phase 2 Re-Architecture Plan
1. **Database Schema Updates**: Add `SmartMoneySnapshot` and `MarketContextSnapshot` to `schema.prisma`.
2. **Backend Refactoring**: Rewrite the Smart Money and Market Context services to separate generation (batch processing) from reading (paginated DB queries).
3. **Frontend Refactoring**: Once the backend is scalable, upgrade the Smart Money UI to use `DataTable` with the new paginated endpoints. Ensure all raw IDs are removed across the research screens.