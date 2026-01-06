const API_BASE = 'http://localhost:3001/api';

// Types matching backend
export interface Agent {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'error' | 'eliminated';
  generation_index: number;
  dna: Record<string, any>;
  profit_all_time: number;
  profit_period: number;
  trade_count_period: number;
  win_rate_period: number;
  fitness_score: number;
  last_active_at: string;
  created_at: string;
}

export interface Generation {
  id: string;
  index: number;
  started_at: string;
  ended_at?: string;
  agent_count: number;
  total_profit: number;
  best_agent_id?: string;
  status: 'active' | 'completed';
}

export interface GenerationMetrics {
  generation: number;
  profit: number;
  tradeCount: number;
  agentCount: number;
}

export interface Transaction {
  id: string;
  agent_id: string;
  type: 'buy' | 'sell' | 'swap';
  symbol: string;
  qty: number;
  price: number;
  fee: number;
  pnl_realized: number;
  status: 'pending' | 'filled' | 'failed';
  tx_hash?: string;
  created_at: string;
}

export interface DashboardMetrics {
  totalProfit: number;
  periodProfit: number;
  activeAgents: number;
  totalTrades: number;
  avgWinRate: number;
  currentGeneration: number;
  bestAgent: {
    id: string;
    name: string;
    profit: number;
  } | null;
  worstAgent: {
    id: string;
    name: string;
    profit: number;
  } | null;
}

export interface PnLDataPoint {
  timestamp: string;
  value: number;
  daily: number;
}

// API functions
export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${API_BASE}/agents`);
  if (!res.ok) throw new Error('Failed to fetch agents');
  return res.json();
}

export async function fetchAgent(id: string): Promise<Agent> {
  const res = await fetch(`${API_BASE}/agents/${id}`);
  if (!res.ok) throw new Error('Failed to fetch agent');
  return res.json();
}

export async function fetchAgentTransactions(id: string): Promise<Transaction[]> {
  const res = await fetch(`${API_BASE}/agents/${id}/transactions`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function pauseAgent(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/agents/${id}/pause`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to pause agent');
}

export async function resumeAgent(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/agents/${id}/resume`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to resume agent');
}

export async function fetchGenerations(): Promise<Generation[]> {
  const res = await fetch(`${API_BASE}/generations`);
  if (!res.ok) throw new Error('Failed to fetch generations');
  return res.json();
}

export async function fetchCurrentGeneration(): Promise<Generation> {
  const res = await fetch(`${API_BASE}/generations/current`);
  if (!res.ok) throw new Error('Failed to fetch current generation');
  return res.json();
}

export async function fetchTransactions(limit = 50): Promise<Transaction[]> {
  const res = await fetch(`${API_BASE}/transactions?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}

export async function fetchDashboardStats(): Promise<DashboardMetrics> {
  const res = await fetch(`${API_BASE}/metrics/dashboard`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchPnLTimeSeries(days = 30): Promise<PnLDataPoint[]> {
  const res = await fetch(`${API_BASE}/metrics/pnl?period=${days}d`);
  if (!res.ok) throw new Error('Failed to fetch PnL time series');
  return res.json();
}

export async function fetchGenerationMetrics(): Promise<GenerationMetrics[]> {
  const res = await fetch(`${API_BASE}/metrics/generations`);
  if (!res.ok) throw new Error('Failed to fetch generation metrics');
  return res.json();
}

export async function fetchHealth(): Promise<{ status: string; timestamp: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend not available');
  return res.json();
}

// Evolution API
export async function triggerEvolution(): Promise<{ message: string; generation: number }> {
  const res = await fetch(`${API_BASE}/evolution/trigger`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger evolution');
  return res.json();
}

export async function fetchEvolutionHistory(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/evolution/history`);
  if (!res.ok) throw new Error('Failed to fetch evolution history');
  return res.json();
}
