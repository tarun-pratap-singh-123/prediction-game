# Prediction Market System

A comprehensive decentralized prediction market system consisting of a blockchain indexer, a backend API, and a React frontend interacting with Ethereum smart contracts.

## 🏗️ Architecture

The system is composed of three main components:

1.  **`predictionMarket` (Frontend & Contracts)**
    *   **Smart Contracts**: Solidity contracts for the prediction market and mock USDC, deployed on Sepolia.
    *   **Frontend**: React + Vite application for users to interact with markets.
2.  **`sync` (Indexer)**
    *   Listens to blockchain events.
    *   Syncs market data to a PostgreSQL database.
    *   Uses Redis for state management.
3.  **`backend-api` (API Service)**
    *   Provides REST API endpoints for the frontend to fetch indexed data.
    *   Connects to the same PostgreSQL database.

## 📋 Prerequisites

*   **Node.js** v18+
*   **Docker** & **Docker Compose**
*   **PostgreSQL** (provided via Docker)
*   **Redis** (provided via Docker)

## 🚀 Getting Started

### 1. Infrastructure Setup

Start the database and cache services using Docker Compose:

```bash
docker-compose up -d postgres redis
```

### 2. Component Setup

#### Prediction Market (Frontend & Contracts)

Navigate to `predictionMarket`:

```bash
cd predictionMarket
npm install
```

*   **Contracts**:
    *   Create `.env` and set `PRIVATE_KEY` and `SEPOLIA_RPC_URL`.
    *   Deploy: `npm run deploy:sepolia`
*   **Frontend**:
    *   Update `.env` with deployed contract addresses.
    *   Run: `npm run dev`

#### Sync Service

Navigate to `sync`:

```bash
cd sync
npm install
cp .env.example .env # Configure DB and Redis credentials
npm run dev
```

#### Backend API

Navigate to `backend-api`:

```bash
cd backend-api
npm install
cp .env.example .env # Configure DB credentials
npm run dev
```

## 📂 Project Structure

```
.
├── backend-api/        # Express.js REST API
├── predictionMarket/   # Smart Contracts (Hardhat) & Frontend (Vite/React)
├── sync/               # Blockchain Event Indexer
└── docker-compose.yml  # Infrastructure orchestration
```

## 🛠️ Technologies

*   **Blockchain**: Solidity, Hardhat, Ethers.js
*   **Backend**: Node.js, TypeScript, Express, PostgreSQL, Redis
*   **Frontend**: React, Vite, TailwindCSS, Wagmi
