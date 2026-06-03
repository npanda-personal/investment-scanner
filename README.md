# Investment Scanner

A professional‑grade investment scanning application for multiple asset classes (stocks, ETFs, cryptocurrencies, bonds, real estate, forex, commodities) with real‑time monitoring, technical & fundamental analysis, news aggregation, alerting, portfolio tracking, and backtesting.

## Features

- **Real‑time price monitoring** across thousands of symbols
- **Custom scanning** based on price, technical indicators, fundamental ratios
- **Email & desktop alerts** when scan criteria are met
- **Portfolio tracking** with performance analytics
- **Sector & market trend visualization**
- **Advanced research tools** (sector rotation, market breadth, sentiment analysis)
- **Backtesting engine** for strategy validation
- **Modern, responsive web interface**

## Architecture

The application is built as a modular web app with a Node.js/TypeScript backend, React/TypeScript frontend, PostgreSQL + TimescaleDB for data storage, and Redis for caching & real‑time messaging. It is designed to run locally for personal use while being SaaS‑ready for future scaling.

For detailed architecture, see [`plans/architecture.md`](plans/architecture.md).

## Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development without Docker)
- Git

### Quick Start (with Docker)

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd investment-scanner
   ```

2. Start the infrastructure (PostgreSQL with TimescaleDB, Redis, pgAdmin):
   ```bash
   docker-compose up -d
   ```

3. Set up environment variables:
   ```bash
   cd backend
   cp .env.example .env   # adjust if needed
   ```

4. Install backend dependencies and create database schema:
   ```bash
   npm install
   npm run db:push   # creates tables using Prisma
   npm run dev      # starts backend on port 3000
   ```

5. Set up the frontend (in a separate terminal):
   ```bash
   cd ../frontend
   npm install
   npm run dev      # starts frontend on port 5173
   ```

6. Open your browser at `http://localhost:5173`.

### Environment Variables

The backend requires the following environment variables (see `backend/.env.example`):

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://scanner:scanner_password@localhost:5432/investment_scanner?schema=public` |
| `JWT_SECRET` | Secret key for signing JWT tokens | (none) |
| `PORT` | HTTP port for the backend API | `3000` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `YAHOO_FINANCE_API_KEY` | Optional API key for Yahoo Finance | (empty) |
| `ALPHA_VANTAGE_API_KEY` | Optional API key for Alpha Vantage | (empty) |
| `COINGECKO_API_KEY` | Optional API key for CoinGecko | (empty) |

Copy `backend/.env.example` to `backend/.env` and adjust values as needed.

### Development Without Docker

See the individual README files in `backend/` and `frontend/` for detailed instructions.

## Market Data Foundation APIs

The Market Data Foundation module uses free/open-source tooling with NSE/BSE exchange-file imports and manual verified evidence as the active market-data foundation. MVP REST endpoints:

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Application health check |
| `GET /api/v1/market-data/health` | Market data module status, instrument count, and freshness |
| `GET /api/v1/instruments` | List/search instruments |
| `POST /api/v1/instruments` | Create an instrument with required symbol, exchange, currency, and asset type |
| `GET /api/v1/instruments/:id` | Get instrument details |
| `GET /api/v1/prices/:instrumentId` | Get historical OHLCV prices |
| `GET /api/v1/prices/:instrumentId/latest` | Get latest price |
| `GET /api/v1/fundamentals/:instrumentId` | Get core fundamentals from the provider |
| `GET /api/v1/corporate-actions/:instrumentId` | Get dividends and splits from the provider |
| `POST /api/v1/ingestion/sync` | Manually sync market data by `symbol` or `instrumentId` |

The frontend Market Data Foundation feature lives under `frontend/src/features/market-data-foundation` and exposes the instrument explorer, add-instrument form, detail page, dashboard status panel, and manual ingestion page.

## Project Structure

```
investment-scanner/
├── backend/          # Node.js/TypeScript API server
├── frontend/         # React/TypeScript UI
├── shared/           # Shared types & utilities
├── docker/           # Docker configuration
├── docs/             # Project documentation
├── plans/            # Architecture & planning documents
└── scripts/          # Deployment & maintenance scripts
```

## Development Workflow

Development work is organized by independent module lanes so the backend, frontend, tests, and docs for a product capability can move in parallel. Core project constraints live in [`docs/instructions.md`](docs/instructions.md) and the architecture is documented in [`docs/architecture.md`](docs/architecture.md) and [`plans/architecture.md`](plans/architecture.md). Module-specific notes live alongside each module under `backend/src/modules/<module>/<module>.md`.

## License

All code is released under the MIT License. Third‑party services and APIs may have their own terms of use.
