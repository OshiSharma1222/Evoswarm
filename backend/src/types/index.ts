// Agent status enum
export type AgentStatus = 'running' | 'paused' | 'eliminated' | 'error' | 'offline';

// Generation status enum
export type GenerationStatus = 'active' | 'completed' | 'failed';

// Transaction status enum
export type TransactionStatus = 'pending' | 'simulated' | 'submitted' | 'filled' | 'failed' | 'reverted';

// Transaction type enum
export type TransactionType = 'buy' | 'sell' | 'swap' | 'stake' | 'unstake';

// Log level enum
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Agent DNA (strategy parameters)
export interface AgentDNA {
  // Common parameters
  riskTolerance: number;        // 0-1, how much risk to take
  positionSizePercent: number;  // % of portfolio per trade
  maxSlippage: number;          // max acceptable slippage
  
  // Strategy-specific parameters
  momentumWindow?: number;      // lookback period for momentum
  meanReversionThreshold?: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  
  // Custom params stored as JSON
  [key: string]: number | string | boolean | undefined;
}

// Agent entity
export interface Agent {
  id: string;
  name: string;
  generationId: string | null;
  generationIndex: number;
  parentIds: string[];
  dna: AgentDNA;
  strategyType: string;
  status: AgentStatus;
  walletAddress: string;
  createdAt: Date;
  eliminatedAt: Date | null;
  
  // Denormalized metrics for fast queries
  profitAllTime: number;
  profitPeriod: number;
  tradeCountPeriod: number;
  winRatePeriod: number;
  maxDrawdownPeriod: number;
  fitnessScore: number;
  lastHeartbeatAt: Date | null;
}

// Generation entity
export interface Generation {
  id: string;
  index: number;
  startedAt: Date;
  endedAt: Date | null;
  status: GenerationStatus;
  totalAgents: number;
  avgFitness: number;
  bestAgentId: string | null;
  worstAgentId: string | null;
  config: {
    mutationRate: number;
    elitePercentage: number;
    eliminationPercentage: number;
  };
}

// Transaction entity
export interface Transaction {
  id: string;
  agentId: string;
  generationIndex: number;
  timestamp: Date;
  type: TransactionType;
  symbol: string;
  qty: number;
  price: number;
  fee: number;
  pnlRealized: number | null;
  status: TransactionStatus;
  txHash: string | null;
  blockNumber: number | null;
  gasUsed: number | null;
  errorMessage: string | null;
}

// Execution log entity
export interface ExecutionLog {
  id: string;
  agentId: string;
  timestamp: Date;
  stateSnapshot: {
    portfolio: Record<string, number>;
    prices: Record<string, number>;
    indicators: Record<string, number>;
  };
  decision: {
    action: 'buy' | 'sell' | 'hold';
    symbol?: string;
    qty?: number;
    confidence: number;
    reasoning: string;
  };
  simulatedOutcome: {
    expectedPnl: number;
    gasEstimate: number;
    slippage: number;
  } | null;
  executed: boolean;
  error: string | null;
}

// Agent metric point (time-series)
export interface AgentMetric {
  agentId: string;
  timestamp: Date;
  profitAllTime: number;
  profitPeriod: number;
  tradeCountPeriod: number;
  winRatePeriod: number;
  sharpeRatio: number;
  maxDrawdown: number;
  fitnessScore: number;
}

// System event
export interface SystemEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  severity: 'info' | 'warning' | 'error';
  payload: Record<string, unknown>;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalProfit: number;
  profitChange: number;
  totalAgents: number;
  activeAgents: number;
  currentGeneration: number;
  bestAgent: {
    id: string;
    name: string;
    profit: number;
    winRate: number;
  } | null;
  worstAgent: {
    id: string;
    name: string;
    profit: number;
    maxDrawdown: number;
  } | null;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

export interface GenerationProfit {
  generation: number;
  profit: number;
  tradeCount: number;
  agentCount: number;
}

// WebSocket event types
export interface WSAgentUpdate {
  type: 'agent.updated';
  data: Partial<Agent> & { id: string };
}

export interface WSTransactionNew {
  type: 'transaction.new';
  data: Transaction;
}

export interface WSMetricsUpdate {
  type: 'metrics.updated';
  data: {
    agentId: string;
    metrics: AgentMetric;
  };
}

export interface WSGenerationEvent {
  type: 'generation.started' | 'generation.completed';
  data: Generation;
}

export interface WSSystemAlert {
  type: 'system.alert';
  data: {
    severity: 'info' | 'warning' | 'error';
    message: string;
  };
}

export type WSEvent = 
  | WSAgentUpdate 
  | WSTransactionNew 
  | WSMetricsUpdate 
  | WSGenerationEvent 
  | WSSystemAlert;
