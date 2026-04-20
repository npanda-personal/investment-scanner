# Database Schema Extensions for Real-Time Scanner

## Overview
This document details the database schema extensions required for the real-time scanner module. The extensions include new models for scan sessions, signal definitions, and enhanced scanning capabilities.

## Current Schema Analysis

### Existing Scanner Models
1. **ScannerRule** - Defines scanning rules with conditions
2. **ScanLog** - Logs individual scan executions and results
3. **Watchlist** - Used as source/target for scanner rules

### Limitations
- No batch scan session tracking
- No signal definition catalog
- No temporary result storage for real-time scanning
- Limited metadata for scan performance analysis

## New Models

### 1. ScanSession Model
Tracks batch scanning sessions with progress and results.

```prisma
// File: backend/prisma/schema/ScanSession.prisma
model ScanSession {
  id           String   @id @default(cuid())
  userId       String
  scopeType    String   // 'PRESET' | 'WATCHLIST' | 'CUSTOM'
  scopeData    Json     // JSON containing symbols or watchlist ID
  status       String   // 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  startedAt    DateTime @default(now())
  completedAt  DateTime?
  results      Json?    // JSON array of ScoredOpportunity
  metadata     Json?    // Statistics and metadata
  
  // Indexes for performance
  @@index([userId, startedAt])
  @@index([status])
  @@index([userId, status])
  
  @@map("scan_sessions")
}
```

### 2. SignalDefinition Model
Catalog of available signal types with configuration.

```prisma
// File: backend/prisma/schema/SignalDefinition.prisma
model SignalDefinition {
  id          String   @id @default(cuid())
  type        String   // 'RSI' | 'EMA' | 'MACD' | 'VOLUME' | 'PRICE_CHANGE' | 'CROSSOVER'
  name        String   // Human-readable name (e.g., 'RSI Oversold', 'EMA Crossover Bullish')
  code        String   // Machine identifier (e.g., 'RSI_OVERSOLD', 'EMA_CROSSOVER_BULLISH')
  description String?
  parameters  Json     // Default parameters (e.g., {"period": 14, "threshold": 30})
  weight      Float    @default(1.0)  // Default weight for ranking
  isActive    Boolean  @default(true)
  category    String   // 'MOMENTUM' | 'TREND' | 'VOLUME' | 'VOLATILITY'
  confidence  Float    @default(0.7)  // Historical accuracy confidence
  
  // Unique constraint to prevent duplicates
  @@unique([type, code])
  
  @@map("signal_definitions")
}
```

### 3. ScanPreset Model
Predefined scanning scopes for common use cases.

```prisma
// File: backend/prisma/schema/ScanPreset.prisma
model ScanPreset {
  id          String   @id @default(cuid())
  name        String   // e.g., 'Top 100 by Market Cap', 'S&P 500', 'NASDAQ 100'
  code        String   @unique // e.g., 'TOP_100', 'SP500', 'NASDAQ100'
  description String?
  symbols     String[] // Array of symbols
  isActive    Boolean  @default(true)
  category    String?  // 'INDEX' | 'SECTOR' | 'MARKET_CAP'
  region      String?  // 'US' | 'EU' | 'ASIA' | 'GLOBAL'
  
  @@map("scan_presets")
}
```

### 4. ScannerConfig Model
System-wide scanner configuration.

```prisma
// File: backend/prisma/schema/ScannerConfig.prisma
model ScannerConfig {
  id                    String   @id @default(cuid())
  key                   String   @unique
  value                 Json
  description           String?
  category              String   // 'PERFORMANCE' | 'RATE_LIMIT' | 'SIGNAL' | 'UI'
  isUserConfigurable    Boolean  @default(false)
  
  @@map("scanner_configs")
}
```

## Schema Updates to Existing Models

### 1. Update ScannerRule Model
Add fields for batch scanning integration.

```prisma
// Update to backend/prisma/schema/ScannerRule.prisma
model ScannerRule {
  // Existing fields...
  id                String   @id @default(cuid())
  name              String
  description       String?
  condition         Json
  sourceWatchlistId String?
  sourceSymbols     Json?
  targetWatchlistId String
  isActive          Boolean  @default(true)
  schedule          String?
  nextScanAt        DateTime?
  lastTriggeredAt   DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  targetWatchlist   Watchlist @relation("ScannerTargetWatchlist", fields: [targetWatchlistId], references: [id], onDelete: Cascade)
  sourceWatchlist   Watchlist? @relation("ScannerSourceWatchlist", fields: [sourceWatchlistId], references: [id], onDelete: SetNull)
  
  // New fields for batch scanning
  scanSessionId     String?   // Reference to batch scan session
  scanSession       ScanSession? @relation(fields: [scanSessionId], references: [id], onDelete: SetNull)
  batchEnabled      Boolean   @default(false) // Whether rule can be run in batch mode
  priority          Int       @default(5)     // 1-10, higher = more important
  
  @@map("scanner_rules")
}
```

### 2. Update ScanLog Model
Enhance with batch scanning context.

```prisma
// Update to backend/prisma/schema/ScanLog.prisma
model ScanLog {
  id               String      @id @default(cuid())
  ruleId           String
  rule             ScannerRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)
  symbol           String
  matched          Boolean     @default(false)
  details          Json?       // Additional match details (values, indicators)
  triggeredAt      DateTime    @default(now())
  
  // New fields for batch scanning
  scanSessionId    String?
  scanSession      ScanSession? @relation(fields: [scanSessionId], references: [id], onDelete: SetNull)
  signalCount      Int         @default(0) // Number of signals detected
  confidenceScore  Float?      // Confidence score for this match
  rankingPosition  Int?        // Position in ranked results
  
  @@index([ruleId, triggeredAt])
  @@index([scanSessionId])
  @@index([symbol, triggeredAt])
  
  @@map("scan_logs")
}
```

## Data Types and Interfaces

### TypeScript Interfaces for New Models

```typescript
// File: backend/src/types/scanner.ts (extensions)

export interface ScanSession {
  id: string;
  userId: string;
  scopeType: 'PRESET' | 'WATCHLIST' | 'CUSTOM';
  scopeData: {
    presetId?: string;
    watchlistId?: string;
    symbols?: string[];
    filters?: {
      region?: string;
      marketCapMin?: number;
      marketCapMax?: number;
      sector?: string;
    };
  };
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  startedAt: Date;
  completedAt?: Date;
  results?: ScoredOpportunity[];
  metadata?: {
    symbolsScanned: number;
    durationMs: number;
    signalsDetected: number;
    apiCallsMade: number;
    cacheHitRate: number;
    errorCount: number;
  };
}

export interface SignalDefinition {
  id: string;
  type: 'RSI' | 'EMA' | 'MACD' | 'VOLUME' | 'PRICE_CHANGE' | 'CROSSOVER';
  name: string;
  code: string;
  description?: string;
  parameters: Record<string, any>;
  weight: number;
  isActive: boolean;
  category: 'MOMENTUM' | 'TREND' | 'VOLUME' | 'VOLATILITY';
  confidence: number;
}

export interface ScanPreset {
  id: string;
  name: string;
  code: string;
  description?: string;
  symbols: string[];
  isActive: boolean;
  category?: 'INDEX' | 'SECTOR' | 'MARKET_CAP';
  region?: 'US' | 'EU' | 'ASIA' | 'GLOBAL';
}

export interface ScannerConfig {
  id: string;
  key: string;
  value: any;
  description?: string;
  category: 'PERFORMANCE' | 'RATE_LIMIT' | 'SIGNAL' | 'UI';
  isUserConfigurable: boolean;
}
```

## Migration Strategy

### Phase 1: Add New Models
1. Create new Prisma schema files in `backend/prisma/schema/`
2. Update `schema.combined.prisma` to include new models
3. Generate migration: `npx prisma migrate dev --name add_scanner_models`

### Phase 2: Update Existing Models
1. Add new fields to existing scanner models
2. Create migration for schema updates
3. Update Prisma client

### Phase 3: Seed Initial Data
1. Seed `SignalDefinition` table with default signals:
   - RSI Oversold (RSI < 30)
   - RSI Overbought (RSI > 70)
   - EMA Crossover Bullish (EMA9 > EMA21)
   - EMA Crossover Bearish (EMA9 < EMA21)
   - MACD Bullish Crossover
   - MACD Bearish Crossover
   - Volume Spike (> 200% average)
   - Price Change 1d (> 5%)

2. Seed `ScanPreset` table with common presets:
   - Top 100 US stocks by market cap
   - S&P 500 constituents
   - NASDAQ 100 constituents

3. Seed `ScannerConfig` with default configuration:
   - Batch size: 25 symbols
   - Max concurrent requests: 2
   - Delay between chunks: 1000ms
   - Request timeout: 10000ms
   - Max retries: 2

## Indexing Strategy

### Performance-Critical Indexes
1. **ScanSession**:
   - `(userId, startedAt)` - For user's scan history
   - `(status)` - For monitoring active scans
   - `(userId, status)` - For user's active scans

2. **ScanLog**:
   - `(scanSessionId)` - For session-specific logs
   - `(symbol, triggeredAt)` - For symbol history
   - `(ruleId, triggeredAt)` - For rule performance analysis

3. **SignalDefinition**:
   - `(type, code)` - Unique constraint already provides index
   - `(isActive)` - For filtering active signals

## Data Retention Policy

### ScanSession Data
- **Active sessions**: Keep for 7 days
- **Completed sessions**: Keep for 30 days
- **Failed sessions**: Keep for 7 days for debugging
- **Archival**: Move older sessions to cold storage after 90 days

### ScanLog Data
- **Detailed logs**: Keep for 30 days
- **Aggregated statistics**: Keep indefinitely
- **Compression**: Apply compression to logs older than 7 days

## Security Considerations

### Data Access Control
1. **User Isolation**: All queries must include `userId` filter
2. **Row-Level Security**: Consider PostgreSQL RLS for production
3. **API Validation**: Validate user ownership in service layer

### Sensitive Data
1. **Configuration Values**: Encrypt sensitive config values (API keys)
2. **Scan Results**: No PII in scan results, but consider encryption for compliance
3. **Audit Logging**: Log all scan session creations and accesses

## Implementation Steps

### Step 1: Create Schema Files
1. Create new `.prisma` files in `backend/prisma/schema/`
2. Update `schema.combined.prisma` to include new models
3. Run `npx prisma format` to format schema

### Step 2: Generate Migration
```bash
cd backend
npx prisma migrate dev --name "add_real_time_scanner_models"
```

### Step 3: Update Prisma Client
```bash
npx prisma generate
```

### Step 4: Create Seed Script
1. Create `backend/scripts/seedScannerData.js`
2. Seed initial signal definitions, presets, and config
3. Add to existing seed process

### Step 5: Update TypeScript Types
1. Extend `backend/src/types/scanner.ts`
2. Update service interfaces
3. Update API request/response types

## Validation Queries

### Example Queries for Testing
```sql
-- Get active scan sessions for a user
SELECT * FROM scan_sessions 
WHERE user_id = 'user123' 
AND status IN ('PENDING', 'RUNNING')
ORDER BY started_at DESC;

-- Get scan statistics
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM scan_sessions
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY status;

-- Get most detected signals
SELECT 
  sd.name as signal_name,
  COUNT(*) as detection_count
FROM scan_logs sl
JOIN signal_definitions sd ON (sl.details->>'signalType' = sd.type AND sl.details->>'signalCode' = sd.code)
WHERE sl.triggered_at > NOW() - INTERVAL '1 day'
GROUP BY sd.name
ORDER BY detection_count DESC;
```

## Rollback Plan

### If Issues Arise
1. **Database Rollback**: Use Prisma migration rollback
2. **Feature Flag**: Keep new features behind feature flag initially
3. **Gradual Rollout**: Enable for test users first, then gradually expand

This schema design provides a solid foundation for the real-time scanner module while maintaining compatibility with existing scanner functionality.