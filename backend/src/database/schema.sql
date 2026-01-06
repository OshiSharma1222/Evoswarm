-- EvoSwarm PostgreSQL/Supabase Schema

-- Create ENUMs
CREATE TYPE agent_status AS ENUM ('running', 'paused', 'eliminated', 'error', 'offline');
CREATE TYPE generation_status AS ENUM ('active', 'completed', 'failed');
CREATE TYPE transaction_status AS ENUM ('pending', 'simulated', 'submitted', 'filled', 'failed', 'reverted');
CREATE TYPE transaction_type AS ENUM ('buy', 'sell', 'swap', 'stake', 'unstake');
CREATE TYPE log_level AS ENUM ('debug', 'info', 'warn', 'error');
CREATE TYPE event_severity AS ENUM ('debug', 'info', 'warn', 'error', 'critical');

-- Generations table
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index INTEGER NOT NULL UNIQUE GENERATED ALWAYS AS IDENTITY,
  status generation_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_agents INTEGER NOT NULL DEFAULT 0,
  elite_count INTEGER NOT NULL DEFAULT 0,
  eliminated_count INTEGER NOT NULL DEFAULT 0,
  avg_fitness DECIMAL(10, 6) DEFAULT 0,
  best_fitness DECIMAL(10, 6) DEFAULT 0,
  total_profit DECIMAL(18, 8) DEFAULT 0,
  config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(index, status);
CREATE INDEX IF NOT EXISTS idx_generations_fitness ON generations(best_fitness DESC);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  generation_index INTEGER NOT NULL REFERENCES generations(index) ON DELETE CASCADE,
  parent_ids UUID[],
  status agent_status NOT NULL DEFAULT 'running',
  
  -- DNA/Strategy
  dna JSONB NOT NULL,
  strategy_type VARCHAR(50) NOT NULL,
  
  -- Performance Metrics - All Time
  profit_all_time DECIMAL(18, 8) DEFAULT 0,
  trade_count_all_time INTEGER DEFAULT 0,
  
  -- Performance Metrics - Current Period
  profit_period DECIMAL(18, 8) DEFAULT 0,
  trade_count_period INTEGER DEFAULT 0,
  win_rate_period DECIMAL(5, 4) DEFAULT 0,
  sharpe_ratio_period DECIMAL(10, 6) DEFAULT 0,
  max_drawdown_period DECIMAL(10, 6) DEFAULT 0,
  
  -- Evolution
  fitness_score DECIMAL(10, 6) DEFAULT 0,
  mutation_count INTEGER DEFAULT 0,
  
  -- Blockchain
  wallet_address VARCHAR(42),
  last_tx_hash VARCHAR(66),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agents_generation ON agents(generation_index, status);
CREATE INDEX IF NOT EXISTS idx_agents_fitness ON agents(fitness_score DESC);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_performance ON agents(profit_period DESC, win_rate_period DESC);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Transaction Details
  type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  
  -- Assets
  token_in VARCHAR(42),
  token_out VARCHAR(42),
  amount_in DECIMAL(36, 18),
  amount_out DECIMAL(36, 18),
  
  -- Pricing
  price_entry DECIMAL(36, 18),
  price_exit DECIMAL(36, 18),
  slippage DECIMAL(10, 6),
  
  -- Results
  pnl_realized DECIMAL(18, 8) DEFAULT 0,
  pnl_unrealized DECIMAL(18, 8) DEFAULT 0,
  fees DECIMAL(18, 8) DEFAULT 0,
  
  -- Blockchain
  tx_hash VARCHAR(66),
  block_number BIGINT,
  gas_used BIGINT,
  gas_price DECIMAL(36, 18),
  
  -- Metadata
  strategy_signal VARCHAR(100),
  confidence_score DECIMAL(5, 4),
  execution_time_ms INTEGER,
  error_message TEXT,
  
  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_agent ON transactions(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type, status);
CREATE INDEX IF NOT EXISTS idx_transactions_performance ON transactions(pnl_realized DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(tx_hash);

-- Execution Logs table
CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  level log_level NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  details JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_agent ON execution_logs(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON execution_logs(level, timestamp DESC);

-- Agent Metrics table (time-series)
CREATE TABLE IF NOT EXISTS agent_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  
  -- Snapshot Metrics
  balance DECIMAL(18, 8) NOT NULL,
  equity DECIMAL(18, 8) NOT NULL,
  profit_period DECIMAL(18, 8) NOT NULL,
  trade_count INTEGER NOT NULL,
  win_rate DECIMAL(5, 4) NOT NULL,
  sharpe_ratio DECIMAL(10, 6),
  max_drawdown DECIMAL(10, 6),
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_agent_time ON agent_metrics(agent_id, timestamp DESC);

-- System Events table
CREATE TABLE IF NOT EXISTS system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  severity event_severity NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON system_events(event_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_severity ON system_events(severity, timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role bypasses these)
CREATE POLICY "Enable read access for all users" ON generations FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON agents FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON transactions FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON execution_logs FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON agent_metrics FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON system_events FOR SELECT USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE generations;
