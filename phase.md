PSX Wealth Builder

Master Project Context & Development Phases

Version: 1.0

⸻

Project Vision

PSX Wealth Builder is a long-term wealth creation platform for Pakistan Stock Exchange investors.

The platform is designed for investors who invest a fixed amount every month into Shariah-compliant Pakistani stocks.

The system should help users:

* Build wealth over time
* Generate passive dividend income
* Track monthly investments
* Forecast portfolio growth
* Track portfolio performance
* Rebalance intelligently
* Invest using KMI-30, KMI-100, and Shariah-compliant stocks

This is NOT a day-trading platform.

This is NOT a brokerage platform.

This is a portfolio intelligence and wealth planning platform.

⸻

Business Goal

Allow users to answer:

“I have PKR 50,000/month. What should I invest in today to maximize long-term wealth creation?”

and

“I want PKR 20 Million in 15 years. What monthly investment is required?”

and

“I want PKR 200,000/month in dividends after retirement.”

⸻

Core Principles

1. Long-term investing
2. Shariah-compliant investing
3. Dividend growth investing
4. Fundamental analysis
5. Portfolio diversification
6. Risk management
7. Data transparency

⸻

Tech Stack

Frontend

* React
* TypeScript
* Vite
* TailwindCSS
* React Query
* Zustand
* Recharts

Backend

* Node.js
* Express
* TypeScript

Database

* MongoDB Atlas

Realtime

* Socket.io

Jobs

* BullMQ
* Redis

Deployment

* Docker
* GitHub Actions

⸻

Architecture

Frontend
↓
Express API
↓
Portfolio Engine
↓
Market Data Layer
↓
Data Providers
↓
MongoDB

⸻

Data Providers

All market data must pass through a provider abstraction.

Never directly call a third-party API from business logic.

Create:

MarketDataProvider

Implement:

* MockMarketDataProvider
* CapitalStakeProvider
* RealtimePsxProvider

Future providers can be plugged in later.

⸻

PHASE 0

Foundation & Project Setup

Goal:

Create production-ready architecture.

Deliverables:

* Monorepo setup
* TypeScript configuration
* ESLint
* Prettier
* Husky
* Commitlint
* Docker
* Docker Compose
* Environment handling
* GitHub Actions CI

Folder Structure

/apps
/web
/api

/packages
/shared
/engines
/market-data

/docs

Definition of Done:

* Local development works
* Docker works
* CI passes

⸻

PHASE 1

Market Data Foundation

Goal:

Create company data architecture.

Collections:

companies
quotes
fundamentals
dividends

Company Fields:

* symbol
* companyName
* sector
* marketCap
* shariahCompliant
* indices

Indices:

* KMI30
* KMI100

Deliverables:

* Seed data
* Mock provider
* Data repository layer

Definition of Done:

System can load companies from database.

⸻

PHASE 2

Portfolio Builder MVP

Goal:

Generate investment portfolios.

User Inputs:

* monthlyInvestmentAmount
* durationYears
* strategy
* riskLevel

Strategies:

* Dividend
* Growth
* Balanced

Deliverables:

* Scoring engine
* Ranking engine
* Portfolio generator

Output:

* Top companies
* Allocation percentages
* Suggested purchases

Definition of Done:

User can generate a portfolio.

⸻

PHASE 3

Monthly SIP Engine

Goal:

Support monthly investing.

Features:

* Monthly contributions
* Share accumulation
* Average cost tracking

Calculations:

* Shares purchased
* Portfolio value
* Cost basis

Definition of Done:

User can simulate monthly investing.

⸻

PHASE 4

Dividend Engine

Goal:

Estimate future dividend income.

Features:

* Dividend history
* Dividend growth
* Dividend reinvestment

Scenarios:

* Reinvest ON
* Reinvest OFF

Definition of Done:

Dividend forecasts work.

⸻

PHASE 5

Wealth Projection Engine

Goal:

Forecast long-term outcomes.

Calculate:

* Total invested
* Future value
* CAGR
* Dividend income
* Retirement projections

Scenarios:

* Conservative
* Base
* Optimistic

Definition of Done:

Projection dashboard works.

⸻

PHASE 6

Advanced Filters

Goal:

Improve portfolio quality.

Filters:

* KMI30
* KMI100
* Shariah Only

Financial Filters:

* Dividend Yield
* EPS Growth
* Revenue Growth
* Debt Ratio
* Volatility

Definition of Done:

Portfolio responds to filters.

⸻

PHASE 7

Portfolio Health Score

Goal:

Score portfolio quality.

Metrics:

* Diversification
* Risk
* Dividend strength
* Growth potential
* Sector exposure

Output:

0-100 score

Definition of Done:

Portfolio health displayed.

⸻

PHASE 8

Rebalancing Engine

Goal:

Keep portfolios optimized.

Detect:

* Overweight positions
* Sector concentration
* Dividend deterioration
* Better opportunities

Actions:

* Hold
* Increase
* Reduce
* Replace

Definition of Done:

Rebalancing suggestions generated.

⸻

PHASE 9

Real-Time Market Data

Goal:

Connect to live PSX market feeds.

Sources:

* Capital Stake
* Official PSX feed

Requirements:

* WebSocket updates
* Quote cache
* Data freshness indicators

Display:

Source
Last Updated
Realtime Status

Definition of Done:

Live quotes update automatically.

⸻

PHASE 10

User Accounts

Goal:

Persist user portfolios.

Features:

* Authentication
* Saved portfolios
* Watchlists
* Investment history

Definition of Done:

Users can log in and save progress.

⸻

PHASE 11

Production Readiness

Goal:

Launch publicly.

Features:

* Logging
* Monitoring
* Error tracking
* Analytics
* Security headers
* Rate limiting
* Backups

Definition of Done:

Production deployment ready.

⸻

V1 Launch Scope

Must Have

* KMI30
* KMI100
* Shariah filter
* Portfolio generation
* SIP planning
* Dividend forecasting
* Wealth projections

Can Wait

* AI recommendations
* Brokerage integrations
* Tax calculations
* Mobile apps

⸻

Future V2

* AI portfolio advisor
* Retirement planner
* Goal-based investing
* Dividend calendar
* Stock screener
* Mobile apps
* Portfolio sharing
* Multi-user subscriptions

Success Metric

A user can generate a long-term PSX investment plan in less than 60 seconds and understand exactly how to reach their financial goals.