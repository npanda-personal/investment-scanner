# Real-Time Scanner Implementation Plan

## Overview
This document outlines the detailed implementation plan for the redesigned real-time scanner module based on the architecture specified in `plans/designs/real-time-scanner-architecture.md`. The implementation will focus on batch scanning with real-time progress polling (WebSocket implementation deferred with feature flag).

## Current State Analysis

### Existing Components to Leverage
1. **Condition Evaluator** (`backend/src/scanners/evaluator.ts`) - Already supports RSI, EMA, MACD calculations
2. **Scanner Service** (`backend/src/scanners/service.ts`) - CRUD operations for scanner rules
3. **Scanner API** (`backend/src/api/scanners/router.ts`) - Basic REST endpoints
4. **Frontend Scanner UI** (`frontend/src/components/Scanner/`) - Rule management interface
5. **Market Data Services** (`backend/src/data/ingestion/yahoo.service.ts`) - Data fetching

### Gaps to Address
- No batch scanning with progress tracking
- Missing signal detection and ranking engine
- No session-based result storage
- Limited real-time feedback to users
- No comprehensive scanner dashboard

## Implementation Strategy

### Phase 1: Database & Core Engine (Week 1)
1. **Extend Database Schema**
   - Add `ScanSession` model for tracking batch scans
   - Add `SignalDefinition` model for configurable signals
   - Add `ScanResultCache` for temporary result storage

2. **Implement Core Scanner Engine**
   - Create `ScannerEngine` class orchestrating the scanning workflow
   - Implement symbol resolution based on scope (preset/watchlist/custom)
   - Add progress tracking and state management

3. **Build Batch Data Fetcher**
   - Implement `BatchAPIManager` with chunking and rate limiting
   - Integrate with existing Yahoo service
   - Add retry logic and error handling

### Phase 2: Signal Detection & Ranking (Week 2)
1. **Enhance Signal Detection**
   - Extend `ConditionEvaluator` with crossover detection
   - Implement `SignalDetector` class for RSI, EMA, MACD, Volume, Price change signals
   - Add signal strength scoring and metadata

2. **Implement Ranking Engine**
   - Create `RankingEngine` with configurable weights
   - Implement scoring algorithm for opportunities
   - Add ranking based on signal count, volume, price change

3. **Build Session Storage**
   - Implement `SessionStorageService` for Redis/PostgreSQL hybrid storage
   - Add cleanup jobs for expired sessions
   - Create result caching with TTL

### Phase 3: API & Frontend (Week 3)
1. **Extend Scanner API**
   - Add `/api/scanner/dashboard` endpoint for dashboard state
   - Add `/api/scanner/scan` for triggering batch scans
   - Add `/api/scanner/scan/:sessionId/progress` for progress polling
   - Add `/api/scanner/scope/*` endpoints for scope management

2. **Build Scanner Dashboard UI**
   - Create `ScannerDashboard` component with ranked opportunities table
   - Implement progress indicator with polling
   - Add "Run Scan" button with scope selection modal
   - Display signal statistics and last updated timestamp

3. **Integrate with Existing UI**
   - Merge new dashboard into existing scanner page
   - Update condition builder to support new signal types
   - Add crossover detection UI components

### Phase 4: Testing & Optimization (Week 4)
1. **Comprehensive Testing**
   - Unit tests for all new backend services
   - Integration tests for API endpoints
   - E2E tests for complete user journey
   - Performance tests with 300+ symbols

2. **Security & Performance**
   - Input validation and sanitization
   - API rate limiting implementation
   - Memory usage optimization
   - Error handling and graceful degradation

3. **Documentation & Deployment**
   - Update API documentation
   - Create user guide for new features
   - Update CI/CD pipeline for new module
   - Performance monitoring setup

## Detailed Technical Specifications

### Database Schema Extensions

```prisma
model ScanSession {
  id           String   @id @default(cuid())
  userId       String
  scopeType    String   // 'PRESET' | 'WATCHLIST' | 'CUSTOM'
  scopeData    Json     // JSON containing symbols or watchlist ID
  status       String   // 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  startedAt    DateTime @default(now())
  completedAt  DateTime?
  results      Json?    // JSON array of ScoredOpportunity
  metadata     Json?    // Statistics and metadata
  
  @@index([userId, startedAt])
  @@index([status])
}

model SignalDefinition {
  id          String   @id @default(cuid())
  type        String   // 'RSI' | 'EMA' | 'MACD' | 'VOLUME' | 'PRICE_CHANGE'
  name        String   // Human-readable name
  code        String   // Machine identifier
  description String?
  parameters  Json     // Default parameters
  weight      Float    @default(1.0)
  isActive    Boolean  @default(true)
  
  @@unique([type, code])
}
```

### API Endpoints

#### Scanner Dashboard API
```
GET    /api/scanner/dashboard          # Get dashboard state (recent scans, top opportunities)
POST   /api/scanner/scan               # Trigger new batch scan
GET    /api/scanner/scan/:sessionId    # Get scan results
GET    /api/scanner/scan/:sessionId/progress  # Get scan progress (polling endpoint)
DELETE /api/scanner/scan/:sessionId    # Cancel/delete scan
```

#### Scan Scope Management
```
GET    /api/scanner/scope/presets      # Get available presets (TOP_100, SP500, etc.)
POST   /api/scanner/scope/custom       # Create custom scope
GET    /api/scanner/scope/watchlists   # Get user watchlists for scanning
```

#### Signal Management
```
GET    /api/scanner/signals            # List available signal types
GET    /api/scanner/signals/:type      # Get signal details and parameters
```

### Frontend Components

#### ScannerDashboard Component
- **RankedOpportunitiesTable**: Displays sorted opportunities with signals
- **ProgressIndicator**: Shows scan progress with polling
- **ScanScopeSelector**: Modal for selecting scan scope
- **SignalStatsPanel**: Shows statistics about detected signals
- **LastUpdatedBadge**: Timestamp of last scan

#### Integration Points
- Extend existing `Scanner` component to include dashboard
- Update `ConditionBuilder` to support crossover conditions
- Add real-time progress polling to scan triggers

### Performance Targets
- **100 symbols**: < 10 seconds scan time
- **300 symbols**: < 20 seconds scan time  
- **Memory usage**: < 500MB for max scan
- **Concurrent users**: Support 5+ simultaneous scans
- **API rate limits**: Respect Yahoo Finance (100 req/hour) and Alpha Vantage (5 req/minute)

### Testing Strategy

#### Backend Tests
- Unit tests for `SignalDetector`, `RankingEngine`, `BatchAPIManager`
- Integration tests for scanner API endpoints
- Mock external API calls for reliable testing

#### Frontend Tests
- Component tests for `ScannerDashboard`
- Integration tests for progress polling
- E2E tests with Cypress/Playwright

#### E2E Test Scenarios
1. User triggers scan with custom scope
2. System shows progress updates via polling
3. User sees ranked results upon completion
4. User can filter and sort results
5. System handles API rate limit errors gracefully

### Security Considerations
1. **Input Validation**: Validate all scan scope inputs
2. **Rate Limiting**: Implement per-user rate limits
3. **Data Sanitization**: Sanitize all user-provided symbols
4. **Session Isolation**: Ensure users can only access their own scan sessions
5. **API Key Protection**: Secure external API credentials

### Deployment Considerations
1. **Redis Dependency**: Required for session storage and caching
2. **Environment Variables**: Add configuration for batch sizes, timeouts, rate limits
3. **Monitoring**: Add metrics for scan performance and error rates
4. **CI/CD**: Update pipeline to run new test suites
5. **Feature Flags**: Prepare for WebSocket implementation (disabled initially)

## Success Criteria

### Technical Success Metrics
- All new endpoints return correct responses within < 200ms
- Batch scanning completes within performance targets
- Memory usage stays within limits during concurrent scans
- Test coverage > 80% for new code

### User Experience Metrics
- Users can trigger scans and see progress within 1 second
- Ranked results are displayed within 2 seconds of scan completion
- UI is responsive and accessible (WCAG AA compliant)
- Error messages are clear and actionable

### Business Metrics
- Increased user engagement with scanner feature
- Higher retention for users who use the scanner
- Positive feedback on signal accuracy and usefulness

## Risk Mitigation

### Technical Risks
1. **API Rate Limiting**: Implement queueing with exponential backoff
2. **Performance Degradation**: Add monitoring and automatic scaling triggers
3. **Data Inconsistency**: Implement data validation and confidence scoring

### Product Risks
1. **Signal Overload**: Curate top 5 most valuable signals initially
2. **False Positives**: Provide confidence scores and historical accuracy
3. **User Understanding**: Add educational tooltips and documentation

## Next Steps

1. **Review this plan** with development team
2. **Begin implementation** following the phased approach
3. **Set up development environment** with Redis dependency
4. **Create detailed technical specifications** for each module
5. **Establish monitoring** from day one of development

This implementation plan provides a clear roadmap for delivering a production-ready real-time scanner module that addresses the gaps in the current system while leveraging existing components where possible.