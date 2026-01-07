# EvoSwarm

A full-stack Web3 platform that deploys autonomous AI agents which execute real on-chain tasks, generate measurable profit, and continuously improve through evolutionary selection.

## Features

- **PnL-First Dashboard**: Real-time profit tracking across agents and generations
- **Agent Management**: Monitor active agents, performance metrics, and execution history
- **Evolutionary Selection**: Track agent lineages and performance across generations
- **Transaction Proof Layer**: Transparent on-chain execution history
- **Dark-First UI**: Clean, futuristic interface inspired by modern dev tools

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Charts**: Recharts
- **Icons**: Lucide React
- **Backend**: Node.js + Express + TypeScript + Socket.IO
- **Database**: Supabase Postgres + Realtime
- **Chain**: Amadeus Protocol (non-EVM, BLS12-381)
- **SDK**: [@amadeus-protocol/sdk](https://github.com/amadeusprotocol/amadeus-typescript-sdk)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (Supabase recommended)
- Backend and frontend need to run separately

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file in the `backend` directory:**
   ```env
   PORT=3001
   DATABASE_URL=postgresql://user:password@host:5432/database
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-key
   
   # Amadeus Chain (optional)
   AMADEUS_NODE_URL=https://nodes.amadeus.bot/api
   AMADEUS_PRIVATE_KEY=your_base58_private_key
   USE_AMADEUS=true
   ```
   
   > See [AMADEUS_INTEGRATION.md](AMADEUS_INTEGRATION.md) for full Amadeus setup guide.

4. **Start the backend server:**
   ```bash
   npm run dev
   ```

   The backend will start on `http://localhost:3001` even if the database isn't configured (you'll see warnings).

### Frontend Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

3. **Open [http://localhost:5173](http://localhost:5173)** in your browser.

   The frontend expects the backend to be running on `http://localhost:3001`.

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── AppShell.tsx
│   ├── KpiCard.tsx
│   ├── DataTable.tsx
│   ├── Section.tsx
│   └── StatusPill.tsx
├── pages/           # Route pages
│   ├── Dashboard.tsx
│   ├── Agents.tsx
│   ├── AgentDetail.tsx
│   └── Transactions.tsx
├── lib/             # Utilities and mock data
│   └── mockData.ts
├── App.tsx          # Root component with routing
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Pages

- **`/dashboard`**: Main overview with KPIs, PnL charts, profit per generation, agents table, and recent transactions
- **`/agents`**: List of all agents with performance metrics
- **`/agents/:id`**: Detailed agent view with PnL chart and transaction history
- **`/tx`**: Full transaction history across all agents

## Next Steps

### Amadeus Chain Integration ⛓️

EvoSwarm is integrated with **Amadeus Protocol** — a high-performance Layer 1 blockchain built for AI agents.

📖 **[Read full integration guide →](AMADEUS_INTEGRATION.md)**

Quick start:
1. Generate Amadeus keypair: `node -e "const { generateKeypair } = require('@amadeus-protocol/sdk'); console.log(generateKeypair())"`
2. Add to `backend/.env`: `AMADEUS_PRIVATE_KEY=your_key`
3. Backend will auto-connect and submit real on-chain transactions

---

### Roadmap

1. **Smart Contracts**: Implement Solidity contracts for strategy registry, execution router, and staking
2. **Agent Runner**: Build off-chain agent execution engine with risk controls
3. **Backend API**: REST + WebSocket API for real-time data
4. **Indexer**: Event indexer for on-chain data
5. **Real Data**: Replace mock data with live blockchain data
6. **Evolutionary Logic**: Implement selection, reproduction, and mutation mechanics

## License

MIT
