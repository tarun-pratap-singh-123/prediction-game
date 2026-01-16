# PredictMarket - Decentralized Prediction Markets

A production-ready YES/NO prediction market platform built on Ethereum (Sepolia testnet). Users can create markets, place bets with USDC, and claim proportional winnings using a parimutuel payout model.

## 🌟 Features

### Smart Contracts
- **PredictionMarket.sol**: Core market functionality with parimutuel betting
- **MockUSDC.sol**: ERC20 token (6 decimals) for testing
- **Security**: ReentrancyGuard, input validation, checks-effects-interactions pattern
- **Admin Resolution**: Markets are resolved by admin after end time

### Frontend
- **Modern UI**: React 18 + Vite + TypeScript
- **Premium Design**: Dark mode with glassmorphism effects and smooth animations
- **Web3 Integration**: wagmi v2, ethers.js v6, viem
- **Wallet Support**: MetaMask via injected connector
- **Responsive**: TailwindCSS with mobile-first design

### User Flow
1. **Create Market**: Anyone can create a YES/NO prediction market
2. **Place Bets**: Users approve USDC and bet on YES or NO
3. **Resolution**: Admin resolves market after end time
4. **Claim Winnings**: Winners claim proportional rewards based on pool distribution

## 📋 Prerequisites

- Node.js v18+ (v20+ recommended for Hardhat)
- MetaMask browser extension
- Sepolia testnet ETH (for deployment and gas)
- Infura or Alchemy account (for Sepolia RPC)

## 🚀 Installation

```bash
npm install
```

## ⚙️ Configuration

1. **Create `.env` file** from the example:

```bash
cp .env.example .env
```

2. **Fill in your environment variables**:

```env
# Deployment
PRIVATE_KEY=your_private_key_here
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Frontend (filled after deployment)
VITE_PREDICTION_MARKET_ADDRESS=
VITE_MOCK_USDC_ADDRESS=
```

## 📦 Smart Contract Deployment

### 1. Compile Contracts

```bash
npm run compile
```

### 2. Deploy to Sepolia

```bash
npm run deploy:sepolia
```

This will:
- Deploy MockUSDC token
- Deploy PredictionMarket contract
- Export ABIs to `src/abi/`
- Save contract addresses to `deployed-addresses.json`

### 3. Update Environment

After deployment, update your `.env` file with the contract addresses printed in the console:

```env
VITE_PREDICTION_MARKET_ADDRESS=0x...
VITE_MOCK_USDC_ADDRESS=0x...
```

## 🖥️ Frontend Development

### Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 🎯 Usage Guide

### For Users

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask
2. **Browse Markets**: View all markets on the home page
3. **Create Market**:
   - Click "+ Create Market"
   - Enter a clear YES/NO question
   - Set end date and time
   - Submit transaction
4. **Place Bet**:
   - Open any active market
   - Choose YES or NO
   - Enter USDC amount
   - Approve USDC (first time only)
   - Place bet
5. **Claim Winnings**:
   - Wait for market resolution
   - Click "Claim Rewards" if you won

### For Admins

- **Resolve Markets**: After end time, click "YES Wins" or "NO Wins" to resolve

## 📂 Project Structure

```
predictionMarket/
├── contracts/                # Solidity smart contracts
│   ├── PredictionMarket.sol
│   └── MockUSDC.sol
├── scripts/                  # Deployment scripts
│   └── deploy.js
├── src/                      # React frontend
│   ├── abi/                  # Contract ABIs (auto-generated)
│   ├── components/           # React components
│   │   ├── WalletConnect.tsx
│   │   └── MarketCard.tsx
│   ├── pages/                # Page components
│   │   ├── Home.tsx
│   │   ├── CreateMarket.tsx
│   │   └── MarketDetails.tsx
│   ├── config/               # Configuration
│   │   ├── wagmi.ts
│   │   └── contracts.ts
│   ├── App.tsx               # Main app component
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles
├── hardhat.config.js         # Hardhat configuration
├── vite.config.ts            # Vite configuration
├── tailwind.config.js        # TailwindCSS configuration
└── package.json              # Dependencies and scripts
```

## 🔐 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks on state-changing functions
- **Input Validation**: All user inputs are validated
- **Access Control**: Admin-only functions for market resolution
- **Checks-Effects-Interactions**: Secure pattern for state updates
- **Prevent Double Claims**: Users can only claim winnings once
- **Time Locks**: No betting after end time, no resolution before end time

## 🧪 Testing Locally

### Get Test USDC

After deployment, you can mint test USDC tokens:

```javascript
// Using ethers.js or wagmi
await mockUSDC.mint(yourAddress, parseUnits("1000", 6));
```

Or use the convenience function:

```javascript
await mockUSDC.mintWithDecimals(yourAddress, 1000); // Mints 1000 USDC
```

## 🌐 Network Info

- **Network**: Sepolia Testnet
- **Chain ID**: 11155111
- **Currency**: SepoliaETH (for gas)
- **Bet Currency**: Mock USDC (6 decimals)

Get Sepolia ETH from faucets:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

## 🛠️ Tech Stack

### Smart Contracts
- Solidity ^0.8.20
- Hardhat 2.x
- OpenZeppelin Contracts
- ethers.js v6

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- wagmi v2
- viem
- React Router v6
- TanStack Query (React Query)

## 📝 License

ISC

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## ⚠️ Disclaimer

This is a testnet application. Do not use with real funds on mainnet without proper audits.

---

Built with ❤️ for decentralized prediction markets
