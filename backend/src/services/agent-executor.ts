import { Server as SocketIOServer } from 'socket.io';
import { supabase } from '../database/supabase';
import { AgentDNA } from '../types';
import { calculateFitness } from './evolution-engine';

// Strategy interface
interface StrategyDecision {
  action: 'buy' | 'sell' | 'hold';
  symbol?: string;
  qty?: number;
  confidence: number;
  reasoning: string;
}

interface MarketState {
  prices: Record<string, number>;
  portfolio: Record<string, number>;
  indicators: Record<string, number>;
}

// Simple momentum strategy
function momentumStrategy(state: MarketState, dna: AgentDNA): StrategyDecision {
  const window = (dna.momentumWindow as number) || 20;
  const threshold = dna.riskTolerance || 0.5;
  
  // Mock momentum calculation (would use real price history)
  const momentum = Math.random() * 2 - 1; // -1 to 1
  
  if (momentum > threshold) {
    return {
      action: 'buy',
      symbol: 'ETH/USDC',
      qty: ((dna.positionSizePercent as number) || 10) / 100 * (state.portfolio['USDC'] || 1000),
      confidence: Math.abs(momentum),
      reasoning: `Momentum ${momentum.toFixed(2)} above threshold ${threshold}`,
    };
  } else if (momentum < -threshold) {
    return {
      action: 'sell',
      symbol: 'ETH/USDC',
      qty: ((dna.positionSizePercent as number) || 10) / 100 * (state.portfolio['ETH'] || 0),
      confidence: Math.abs(momentum),
      reasoning: `Momentum ${momentum.toFixed(2)} below threshold ${-threshold}`,
    };
  }
  
  return {
    action: 'hold',
    confidence: 0.5,
    reasoning: `Momentum ${momentum.toFixed(2)} within threshold range`,
  };
}

// Mean reversion strategy
function meanReversionStrategy(state: MarketState, dna: AgentDNA): StrategyDecision {
  const threshold = (dna.meanReversionThreshold as number) || 1.5;
  
  // Mock z-score calculation
  const zScore = Math.random() * 4 - 2; // -2 to 2
  
  if (zScore < -threshold) {
    return {
      action: 'buy',
      symbol: 'ETH/USDC',
      qty: ((dna.positionSizePercent as number) || 10) / 100 * (state.portfolio['USDC'] || 1000),
      confidence: Math.min(Math.abs(zScore) / 3, 1),
      reasoning: `Price ${threshold} std below mean, expecting reversion`,
    };
  } else if (zScore > threshold) {
    return {
      action: 'sell',
      symbol: 'ETH/USDC',
      qty: ((dna.positionSizePercent as number) || 10) / 100 * (state.portfolio['ETH'] || 0),
      confidence: Math.min(Math.abs(zScore) / 3, 1),
      reasoning: `Price ${threshold} std above mean, expecting reversion`,
    };
  }
  
  return {
    action: 'hold',
    confidence: 0.5,
    reasoning: `Z-score ${zScore.toFixed(2)} within mean reversion range`,
  };
}

// Execute strategy decision (mock/simulation)
async function executeDecision(
  agentId: string,
  decision: StrategyDecision,
  state: MarketState,
): Promise<{ success: boolean; txHash?: string; pnl?: number; error?: string }> {
  if (decision.action === 'hold') {
    return { success: true };
  }

  // Simulate transaction (in real implementation, this would call blockchain)
  const mockPrice = state.prices['ETH'] || 2000;
  const mockSlippage = Math.random() * 0.02; // 0-2% slippage
  const mockGas = 0.001 * mockPrice; // ~$2 gas
  
  // Simulate success/failure (95% success rate)
  if (Math.random() > 0.95) {
    return { success: false, error: 'Transaction reverted: insufficient liquidity' };
  }

  const executedPrice = decision.action === 'buy' 
    ? mockPrice * (1 + mockSlippage) 
    : mockPrice * (1 - mockSlippage);
  
  const mockPnl = decision.action === 'sell' 
    ? (decision.qty || 0) * (executedPrice - mockPrice) - mockGas
    : -mockGas;

  // Record transaction in database
  const { data: tx, error } = await supabase
    .from('transactions')
    .insert({
      agent_id: agentId,
      type: decision.action,
      token_in: decision.action === 'buy' ? 'USDC' : 'ETH',
      token_out: decision.action === 'buy' ? 'ETH' : 'USDC',
      amount_in: decision.qty || 0,
      amount_out: (decision.qty || 0) * executedPrice,
      price_entry: executedPrice,
      fees: mockGas,
      pnl_realized: mockPnl,
      status: 'filled',
      tx_hash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
      block_number: Math.floor(Date.now() / 1000),
      gas_used: 150000,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to record transaction:', error);
  }

  return { 
    success: true, 
    txHash: tx?.tx_hash,
    pnl: mockPnl,
  };
}

// Update agent metrics after execution
async function updateAgentMetrics(agentId: string, pnl: number): Promise<void> {
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (!agent) return;

  const newProfitAllTime = (agent.profit_all_time || 0) + pnl;
  const newProfitPeriod = (agent.profit_period || 0) + pnl;
  const newTradeCount = (agent.trade_count_period || 0) + 1;
  const newWinRate = pnl > 0 
    ? (agent.win_rate_period * (newTradeCount - 1) + 1) / newTradeCount
    : (agent.win_rate_period * (newTradeCount - 1)) / newTradeCount;
  const newMaxDrawdown = Math.max(agent.max_drawdown_period || 0, pnl < 0 ? Math.abs(pnl) : 0);

  const fitnessScore = calculateFitness({
    profit_period: newProfitPeriod,
    win_rate_period: newWinRate,
    max_drawdown_period: newMaxDrawdown,
    trade_count_period: newTradeCount,
  });

  await supabase
    .from('agents')
    .update({
      profit_all_time: newProfitAllTime,
      profit_period: newProfitPeriod,
      trade_count_period: newTradeCount,
      win_rate_period: newWinRate,
      max_drawdown_period: newMaxDrawdown,
      fitness_score: fitnessScore,
      last_heartbeat_at: new Date().toISOString(),
    })
    .eq('id', agentId);

  // Record metric point
  await supabase.from('agent_metrics').insert({
    agent_id: agentId,
    profit_all_time: newProfitAllTime,
    profit_period: newProfitPeriod,
    trade_count_period: newTradeCount,
    win_rate_period: newWinRate,
    max_drawdown: newMaxDrawdown,
    fitness_score: fitnessScore,
    sharpe_ratio: 0, // Would need proper calculation
  });
}

// Run single agent cycle
async function runAgentCycle(agent: any, io?: SocketIOServer): Promise<void> {
  try {
    // 1. Fetch current state (mock)
    const state: MarketState = {
      prices: { ETH: 2000 + Math.random() * 200 - 100, USDC: 1 },
      portfolio: { ETH: 1, USDC: 1000 },
      indicators: { rsi: Math.random() * 100, macd: Math.random() * 2 - 1 },
    };

    // 2. Run strategy
    let decision: StrategyDecision;
    switch (agent.strategy_type) {
      case 'mean_reversion':
        decision = meanReversionStrategy(state, agent.dna);
        break;
      case 'momentum':
      default:
        decision = momentumStrategy(state, agent.dna);
    }

    // 3. Log decision
    await supabase.from('execution_logs').insert({
      agent_id: agent.id,
      state_snapshot: state,
      decision: decision,
      simulated_outcome: decision.action !== 'hold' ? {
        expectedPnl: (decision.qty || 0) * 0.01, // 1% expected
        gasEstimate: 150000,
        slippage: 0.5,
      } : null,
      executed: decision.action !== 'hold',
    });

    // 4. Execute if not hold
    if (decision.action !== 'hold' && decision.confidence > 0.6) {
      const result = await executeDecision(agent.id, decision, state);
      
      if (result.success && result.pnl !== undefined) {
        await updateAgentMetrics(agent.id, result.pnl);
        
        // Emit WebSocket event
        if (io) {
          io.emit('transaction.new', {
            agentId: agent.id,
            agentName: agent.name,
            type: decision.action,
            symbol: decision.symbol,
            pnl: result.pnl,
            txHash: result.txHash,
          });
        }
      }
    }

    // Update heartbeat
    await supabase
      .from('agents')
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq('id', agent.id);

  } catch (error) {
    console.error(`Agent ${agent.name} cycle failed:`, error);
    
    await supabase
      .from('agents')
      .update({ status: 'error' })
      .eq('id', agent.id);
  }
}

// Main executor loop
export function startAgentExecutor(io: SocketIOServer): void {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('⚠️  Supabase not configured - agent executor disabled');
      console.warn('⚠️  Set SUPABASE_URL and SUPABASE_SERVICE_KEY to enable');
      return;
    }

    const pollInterval = parseInt(process.env.AGENT_POLL_INTERVAL_MS || '60000');

    console.log(`🤖 Agent executor started (polling every ${pollInterval / 1000}s)`);

    async function executorLoop() {
      try {
        // Get all running agents
        const { data: agents, error } = await supabase
          .from('agents')
          .select('*')
          .eq('status', 'running');

        if (error) {
          console.error('Failed to fetch agents:', error);
          return;
        }

        if (!agents || agents.length === 0) {
          return;
        }

        console.log(`🤖 Executing ${agents.length} agents...`);

        // Run all agents in parallel (with concurrency limit)
        const concurrencyLimit = 10;
        for (let i = 0; i < agents.length; i += concurrencyLimit) {
          const batch = agents.slice(i, i + concurrencyLimit);
          await Promise.all(batch.map(agent => runAgentCycle(agent, io)));
        }

      } catch (error) {
        console.error('Executor loop error:', error);
      }
    }

    // Run immediately, then on interval
    executorLoop();
    setInterval(executorLoop, pollInterval);
  } catch (error: any) {
    console.warn(' Failed to start agent executor:', error.message);
  }
}
