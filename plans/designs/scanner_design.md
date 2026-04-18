# Scanner Engine Design

## Condition Language
The scanner engine evaluates user‑defined rules expressed as a JSON condition tree. The language supports logical operators (`and`, `or`, `not`) and primitive conditions that compare market data fields against thresholds.

**Example condition:**
```json
{
  "operator": "and",
  "conditions": [
    {
      "type": "price",
      "field": "close",
      "operator": ">",
      "value": 100
    },
    {
      "type": "indicator",
      "name": "RSI",
      "parameters": { "period": 14 },
      "operator": "<",
      "value": 30
    }
  ]
}
```

**Supported primitive types:**
- **price**: compares latest price fields (`open`, `high`, `low`, `close`, `volume`) with numeric values.
- **indicator**: computes a technical indicator (RSI, MACD, SMA, etc.) using recent price history and compares the result.
- **fundamental**: compares fundamental ratios (P/E, P/B, etc.) when data is available.
- **change**: price change over a period (e.g., `percentChange1d` > 5).

**Logical operators:** `and`, `or`, `not` can nest conditions arbitrarily.

## Evaluation Process
1. Determine the symbol universe: either from a source watchlist, explicit symbol list, or all active stocks in the database.
2. For each symbol, retrieve the required data (latest price, recent price ticks for indicators) from the database or external API cache.
3. Evaluate the condition tree against the symbol's data.
4. If the condition evaluates to `true`, add the symbol to the target watchlist and log the scan.

## Performance Optimizations
- Caching of computed indicators for a period.
- Batch fetching of price data for multiple symbols.
- Use of TimescaleDB continuous aggregates for pre‑computed metrics.

## Integration Points
- **Real‑time scanning**: triggered via WebSocket when new price ticks arrive.
- **Scheduled scanning**: uses Bull queue with cron expressions.
- **Manual scanning**: via API endpoint for on‑demand scans.