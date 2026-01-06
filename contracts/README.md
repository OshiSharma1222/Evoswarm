# EvoSwarm Smart Contracts (EVM-only)

This folder contains Solidity contracts and a Hardhat project. Solidity + Hardhat require an **EVM-compatible chain** (Ethereum JSON-RPC).

If Amadeus is **not EVM** and does **not** expose Ethereum JSON-RPC, you cannot deploy these contracts to Amadeus, and MetaMask cannot connect to it.

## 📝 Contracts

### 1. **AgentRegistry.sol**
- Stores agent metadata, DNA hashes, and performance metrics on-chain
- Tracks generations, fitness scores, and agent lifecycle
- Events: `AgentRegistered`, `AgentMetricsUpdated`, `AgentEliminated`

### 2. **ExecutionRouter.sol**
- Executes trades on behalf of agents
- Manages agent token balances
- Logs all trades with PnL tracking
- Events: `TradeExecuted`, `FundsDeposited`, `FundsWithdrawn`

### 3. **StakingPool.sol**
- Users stake on individual agents
- Profit-sharing mechanism (95% to stakers, 5% protocol fee)
- Reward distribution based on agent performance
- Events: `Staked`, `Unstaked`, `RewardsClaimed`, `ProfitDistributed`

## 🛠️ Setup

```bash
cd contracts
npm install
```

## 🔑 Environment Variables

Create `contracts/.env` (see `.env.example`):

```env
# EVM network (optional)
EVM_RPC_URL=
EVM_CHAIN_ID=

# Deployer key (testnet wallet only!)
PRIVATE_KEY=

# Optional token for StakingPool constructor
STAKING_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
```

## 🚀 Deployment

### Local (Hardhat)
```bash
npm run compile
npx hardhat node                    # Terminal 1
npm run deploy:local                # Terminal 2
```

If you want to deploy to a remote EVM chain, add a network to `hardhat.config.ts` and point it at an EVM JSON-RPC URL.

## 📊 Contract Addresses (After Deployment)

Save these to `backend/.env`:

```env
AGENT_REGISTRY_ADDRESS=0x...
EXECUTION_ROUTER_ADDRESS=0x...
STAKING_POOL_ADDRESS=0x...
```

## 🧪 Testing

```bash
npm run test
```

## 📚 Backend Integration Note

The current backend in this repo does not require EVM connectivity to run (it uses Supabase for realtime + storage). If you later add an EVM adapter (ethers/viem), keep it optional so non-EVM chains don’t break the API.

## 🔐 Security

- All contracts use OpenZeppelin v5 standards
- ReentrancyGuard on all state-changing functions
- Ownable pattern for admin functions
- SafeERC20 for token transfers

## 📄 License

MIT
