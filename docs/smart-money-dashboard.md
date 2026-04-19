# Smart Money & Sector Rotation Dashboard

## Overview
The Smart Money & Sector Rotation Dashboard is a comprehensive, data-driven web application that visualizes institutional capital flows and sector rotation patterns. It provides retail investors with insights into "smart money" activities and helps identify investment opportunities based on institutional behavior.

## Features

### 1. Dynamic Interactive Dashboard
- **Real-time Data Visualizations**: Heat maps showing sector performance vs. institutional money flow
- **Smart Money Indicators**: Key metrics including institutional flow, options activity, and block trades
- **Performance Metrics**: Sector-by-sector performance with color-coded visual indicators

### 2. Educational Modules
- **Smart Money Concepts**: Definition and characteristics of institutional investors
- **Sector Rotation Strategy**: Explanation of economic cycle phases and sector leadership
- **Economic Cycle Analysis**: Visual representation of current economic phase and leading sectors

### 3. Analytical Tools
- **Time Frame Filters**: Intraday, daily, weekly, monthly, and quarterly views
- **Asset Class Selection**: Equities, ETFs, bonds, commodities, or all asset classes
- **Sector Comparison**: Multi-select sector comparison tools
- **Benchmark Analysis**: Compare selected sectors against S&P 500

### 4. Actionable Insights
- **Trend Identification**: Automated detection of unusual institutional activity
- **Confidence Scoring**: Probability-based insights with confidence percentages
- **Sector Recommendations**: Data-driven sector allocation suggestions

### 5. Responsive Design
- **Mobile-First Approach**: Fully responsive layout for all screen sizes
- **Adaptive Components**: Cards, grids, and visualizations that adjust to device
- **Touch-Friendly Controls**: Optimized for touch interactions on mobile devices

## Technical Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: React Hooks (useState, useEffect)
- **Data Visualization**: Custom heat maps and performance indicators
- **Routing**: React Router v6

### Backend
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints with consistent response format
- **Data Sources**: Mock institutional data (extensible to real APIs)
- **CORS Configuration**: Secure cross-origin resource sharing

### API Endpoints

#### Smart Money Data
- `GET /api/smart-money/sector-performance` - Sector performance and money flow data
- `GET /api/smart-money/indicators` - Smart money indicators (institutional flow, options activity)
- `GET /api/smart-money/economic-cycle` - Economic cycle phases and leading sectors
- `GET /api/smart-money/insights` - Actionable investment insights
- `GET /api/smart-money/relative-strength` - Sector relative strength analysis
- `GET /api/smart-money/macro-indicators` - Macroeconomic indicators

#### Response Format
```json
{
  "success": true,
  "data": [...],
  "timeframe": "weekly",
  "lastUpdated": "2026-04-19T10:46:57.373Z"
}
```

## Data Models

### Sector Performance
```typescript
interface SectorPerformance {
  sector: string;
  performance: number;  // percentage
  flow: number;        // money flow in millions
  color: string;       // hex color for visualization
  marketCap: number;   // market capitalization in billions
}
```

### Smart Money Indicator
```typescript
interface SmartMoneyIndicator {
  indicator: string;
  value: number;
  unit?: string;
  trend: 'up' | 'down' | 'neutral';
  change: number;      // percentage change
  description: string;
}
```

### Economic Cycle Phase
```typescript
interface EconomicCyclePhase {
  phase: string;
  description: string;
  leadingSectors: string[];
  color: string;
  currentPhase: boolean;
}
```

### Actionable Insight
```typescript
interface ActionableInsight {
  id: string;
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'negative' | 'neutral';
  sectors: string[];
  confidence: number;  // 0-1 probability
}
```

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- TypeScript 5+
- Git

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
Create `.env` files in both frontend and backend directories:

**Backend (.env)**
```
PORT=3000
NODE_ENV=development
```

**Frontend (.env)**
```
VITE_API_BASE_URL=http://localhost:3000
```

## Usage Guide

### 1. Accessing the Dashboard
- Navigate to `/smart-money` in the application
- The dashboard loads automatically with default weekly timeframe

### 2. Interacting with Visualizations
- **Heat Map**: Hover over sectors to see detailed performance metrics
- **Filters**: Use time frame and asset class filters to adjust data view
- **Sector Selection**: Click sectors to add/remove from comparison

### 3. Understanding the Data
- **Green Sectors**: Positive performance and institutional inflow
- **Red Sectors**: Negative performance and institutional outflow
- **Bubble Size**: Represents magnitude of institutional money flow
- **Confidence Scores**: Higher percentages indicate stronger signals

### 4. Making Investment Decisions
1. Review current economic cycle phase
2. Identify sectors with strong institutional inflow
3. Check smart money indicators for confirmation
4. Review actionable insights for specific recommendations
5. Use analytical tools to compare sectors

## Extending the Dashboard

### Adding Real Data Sources
1. Implement data connectors in `backend/src/data/ingestion/`
2. Update API endpoints to fetch from real sources
3. Add caching layer for performance

### Custom Visualizations
1. Create new chart components in `frontend/src/components/Charts/`
2. Integrate with D3.js or Chart.js for advanced visualizations
3. Add interactive features like zoom and drill-down

### Additional Features
1. **User Preferences**: Save filter settings and watchlists
2. **Alerts**: Set up notifications for unusual activity
3. **Historical Analysis**: Add time series analysis tools
4. **Portfolio Integration**: Connect to user portfolios for personalized insights

## Performance Considerations

### Frontend Optimization
- Lazy loading of heavy visualizations
- Virtual scrolling for large data sets
- Memoization of expensive calculations
- Image optimization and compression

### Backend Optimization
- Response caching with Redis
- Database indexing for frequent queries
- API rate limiting and throttling
- Connection pooling for database

## Security

### API Security
- CORS configuration for trusted origins
- Input validation and sanitization
- Rate limiting to prevent abuse
- HTTPS enforcement in production

### Data Security
- Secure storage of API keys
- Encryption of sensitive data
- Regular security audits
- Compliance with financial data regulations

## Testing

### Unit Tests
```bash
cd frontend
npm test

cd backend
npm test
```

### Integration Tests
- API endpoint testing with Supertest
- Component testing with React Testing Library
- End-to-end testing with Cypress

### Data Validation
- TypeScript for compile-time type checking
- Runtime validation with Zod schemas
- Data consistency checks

## Deployment

### Production Build
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
```

### Docker Deployment
```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Cloud Deployment
- **Frontend**: Vercel, Netlify, or AWS S3 + CloudFront
- **Backend**: AWS EC2, Google Cloud Run, or Azure App Service
- **Database**: PostgreSQL with TimescaleDB for time series data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request
5. Ensure CI/CD passes

## License
Proprietary - All rights reserved

## Support
For technical support or feature requests, contact the development team or create an issue in the repository.

---

*Last Updated: April 2026*  
*Version: 1.0.0*