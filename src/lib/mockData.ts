// Mock data types
export interface Agent {
  id: string
  name: string
  status: 'running' | 'paused' | 'error' | 'offline'
  profitAllTime: number
  profitPeriod: number
  tradeCountPeriod: number
  winRatePeriod: number
  lastHeartbeatAt: string
  generation: number
}

export interface Generation {
  id: string
  index: number
  profit: number
  tradeCount: number
  bestAgentId: string
  status: 'active' | 'completed'
}

export interface Transaction {
  id: string
  timestamp: string
  agentId: string
  agentName: string
  type: 'buy' | 'sell' | 'swap'
  symbol: string
  qty: number
  price: number
  fee: number
  pnlRealized: number
  status: 'filled' | 'pending' | 'failed'
  txHash: string
}

export interface MetricPoint {
  t: string
  v: number
}

// Generate mock data
export const mockAgents: Agent[] = [
  {
    id: 'agent-001',
    name: 'Alpha Trader',
    status: 'running',
    profitAllTime: 12450.23,
    profitPeriod: 3245.67,
    tradeCountPeriod: 156,
    winRatePeriod: 0.68,
    lastHeartbeatAt: new Date(Date.now() - 5000).toISOString(),
    generation: 5,
  },
  {
    id: 'agent-002',
    name: 'Beta Optimizer',
    status: 'running',
    profitAllTime: 9823.45,
    profitPeriod: 2134.89,
    tradeCountPeriod: 142,
    winRatePeriod: 0.62,
    lastHeartbeatAt: new Date(Date.now() - 8000).toISOString(),
    generation: 4,
  },
  {
    id: 'agent-003',
    name: 'Gamma Scout',
    status: 'paused',
    profitAllTime: 7654.12,
    profitPeriod: 1876.34,
    tradeCountPeriod: 98,
    winRatePeriod: 0.59,
    lastHeartbeatAt: new Date(Date.now() - 120000).toISOString(),
    generation: 5,
  },
  {
    id: 'agent-004',
    name: 'Delta Rebalancer',
    status: 'running',
    profitAllTime: 5432.98,
    profitPeriod: 987.45,
    tradeCountPeriod: 76,
    winRatePeriod: 0.55,
    lastHeartbeatAt: new Date(Date.now() - 3000).toISOString(),
    generation: 3,
  },
  {
    id: 'agent-005',
    name: 'Epsilon Hunter',
    status: 'error',
    profitAllTime: -1234.56,
    profitPeriod: -456.78,
    tradeCountPeriod: 45,
    winRatePeriod: 0.42,
    lastHeartbeatAt: new Date(Date.now() - 300000).toISOString(),
    generation: 2,
  },
]

export const mockGenerations: Generation[] = [
  { id: 'gen-1', index: 1, profit: 2345.67, tradeCount: 234, bestAgentId: 'agent-001', status: 'completed' },
  { id: 'gen-2', index: 2, profit: 3456.78, tradeCount: 312, bestAgentId: 'agent-002', status: 'completed' },
  { id: 'gen-3', index: 3, profit: 4567.89, tradeCount: 398, bestAgentId: 'agent-001', status: 'completed' },
  { id: 'gen-4', index: 4, profit: 5678.90, tradeCount: 445, bestAgentId: 'agent-002', status: 'completed' },
  { id: 'gen-5', index: 5, profit: 7234.56, tradeCount: 512, bestAgentId: 'agent-001', status: 'active' },
]

export const mockTransactions: Transaction[] = [
  {
    id: 'tx-001',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    agentId: 'agent-001',
    agentName: 'Alpha Trader',
    type: 'buy',
    symbol: 'ETH/USDC',
    qty: 2.5,
    price: 2345.67,
    fee: 5.86,
    pnlRealized: 0,
    status: 'filled',
    txHash: '0x1234...5678',
  },
  {
    id: 'tx-002',
    timestamp: new Date(Date.now() - 240000).toISOString(),
    agentId: 'agent-002',
    agentName: 'Beta Optimizer',
    type: 'sell',
    symbol: 'ETH/USDC',
    qty: 1.8,
    price: 2389.12,
    fee: 4.30,
    pnlRealized: 78.21,
    status: 'filled',
    txHash: '0xabcd...efgh',
  },
  {
    id: 'tx-003',
    timestamp: new Date(Date.now() - 180000).toISOString(),
    agentId: 'agent-001',
    agentName: 'Alpha Trader',
    type: 'sell',
    symbol: 'ETH/USDC',
    qty: 2.5,
    price: 2412.45,
    fee: 6.03,
    pnlRealized: 167.15,
    status: 'filled',
    txHash: '0x9876...5432',
  },
]

// Generate time series data for charts
export const generatePnLTimeSeries = (days: number = 30): MetricPoint[] => {
  const points: MetricPoint[] = []
  let value = 0
  const now = Date.now()
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000)
    value += (Math.random() - 0.35) * 500 // Slight upward bias
    points.push({
      t: date.toISOString(),
      v: Math.round(value * 100) / 100,
    })
  }
  
  return points
}

export const mockPnLTimeSeries = generatePnLTimeSeries(30)
