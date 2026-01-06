import dotenv from 'dotenv';
import { supabase } from './supabase';

dotenv.config();

// Strategy types
const STRATEGY_TYPES = ['momentum', 'mean_reversion'];

// Generate random DNA for an agent
function generateRandomDNA() {
  return {
    riskTolerance: 0.3 + Math.random() * 0.4, // 0.3-0.7
    positionSizePercent: 5 + Math.random() * 15, // 5-20%
    maxSlippage: 0.5 + Math.random() * 1.5, // 0.5-2%
    momentumWindow: Math.floor(10 + Math.random() * 40), // 10-50
    meanReversionThreshold: 1 + Math.random() * 1.5, // 1-2.5
    stopLossPercent: 2 + Math.random() * 8, // 2-10%
    takeProfitPercent: 5 + Math.random() * 20, // 5-25%
  };
}

// Generate agent name
function generateAgentName(generation: number, index: number): string {
  const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'];
  const suffixes = ['Prime', 'Nova', 'Apex', 'Core', 'Edge', 'Wave', 'Flux', 'Pulse', 'Vortex', 'Nexus'];
  
  const prefix = prefixes[index % prefixes.length];
  const suffix = suffixes[Math.floor(index / prefixes.length) % suffixes.length];
  
  return `${prefix}-${suffix}-G${generation}`;
}

// Seed database with initial data
async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Clear existing data (in order due to foreign keys)
    console.log('Clearing existing data...');
    await supabase.from('agent_metrics').delete().neq('agent_id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('execution_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('system_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('agents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('generations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Create initial generation
    console.log('Creating generation 1...');
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .insert({
        status: 'active',
        total_agents: 10,
        config: {
          mutationRate: 0.15,
          elitePercentage: 0.2,
          eliminationPercentage: 0.3,
        },
      })
      .select()
      .single();

    if (genError) throw genError;
    console.log(`Created generation: ${generation.id}`);

    // Create initial agents
    console.log('Creating 10 initial agents...');
    const agents = [];
    for (let i = 0; i < 10; i++) {
      const strategyType = STRATEGY_TYPES[i % STRATEGY_TYPES.length];
      const profitAllTime = -500 + Math.random() * 2000; // -500 to 1500
      const profitPeriod = -200 + Math.random() * 800; // -200 to 600
      const tradeCount = Math.floor(10 + Math.random() * 90); // 10-100
      const winRate = 0.3 + Math.random() * 0.4; // 30-70%
      const maxDrawdown = Math.random() * 30; // 0-30%

      agents.push({
        name: generateAgentName(1, i + 1),
        generation_index: generation.index,
        parent_ids: [],
        dna: generateRandomDNA(),
        strategy_type: strategyType,
        status: i < 8 ? 'running' : (i === 8 ? 'paused' : 'error'),
        wallet_address: `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`,
        profit_all_time: profitAllTime,
        profit_period: profitPeriod,
        trade_count_period: tradeCount,
        win_rate_period: winRate,
        max_drawdown_period: maxDrawdown,
        fitness_score: 30 + Math.random() * 50, // 30-80
        last_active_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      });
    }

    const { data: createdAgents, error: agentsError } = await supabase
      .from('agents')
      .insert(agents)
      .select();

    if (agentsError) throw agentsError;
    console.log(`Created ${createdAgents.length} agents`);

    // Update generation with best/worst agent
    const sortedByFitness = [...createdAgents].sort((a, b) => b.fitness_score - a.fitness_score);
    await supabase
      .from('generations')
      .update({
        best_agent_id: sortedByFitness[0].id,
        worst_agent_id: sortedByFitness[sortedByFitness.length - 1].id,
        avg_fitness: createdAgents.reduce((sum, a) => sum + a.fitness_score, 0) / createdAgents.length,
      })
      .eq('id', generation.id);

    // Create sample transactions (last 30 days)
    console.log('Creating sample transactions...');
    const transactions = [];
    const now = Date.now();
    
    for (const agent of createdAgents) {
      const txCount = Math.floor(5 + Math.random() * 20); // 5-25 transactions per agent
      
      for (let i = 0; i < txCount; i++) {
        const daysAgo = Math.random() * 30;
        const timestamp = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
        const type = Math.random() > 0.5 ? 'buy' : 'sell';
        const amountIn = 0.1 + Math.random() * 2; // 0.1-2.1 ETH
        const priceEntry = 1800 + Math.random() * 400; // 1800-2200
        const pnl = -50 + Math.random() * 150; // -50 to 100

        transactions.push({
          agent_id: agent.id,
          timestamp: timestamp.toISOString(),
          type,
          token_in: type === 'buy' ? 'USDC' : 'ETH',
          token_out: type === 'buy' ? 'ETH' : 'USDC',
          amount_in: amountIn,
          amount_out: amountIn * priceEntry,
          price_entry: priceEntry,
          fees: 0.001 * priceEntry,
          pnl_realized: pnl,
          status: Math.random() > 0.05 ? 'filled' : 'failed',
          tx_hash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`.slice(0, 66),
          block_number: Math.floor(19000000 + Math.random() * 1000000),
          gas_used: Math.floor(100000 + Math.random() * 100000),
        });
      }
    }

    const { error: txError } = await supabase.from('transactions').insert(transactions);
    if (txError) throw txError;
    console.log(`Created ${transactions.length} transactions`);

    // Create sample execution logs
    console.log('Creating sample execution logs...');
    const logs = [];
    
    for (const agent of createdAgents.slice(0, 5)) {
      for (let i = 0; i < 10; i++) {
        const daysAgo = Math.random() * 7;
        const timestamp = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
        const actions = ['buy', 'sell', 'hold'];
        const action = actions[Math.floor(Math.random() * actions.length)];
        const levels = ['info', 'warn', 'error', 'debug'];
        const level = levels[Math.floor(Math.random() * levels.length)];

        logs.push({
          agent_id: agent.id,
          timestamp: timestamp.toISOString(),
          level,
          message: `Agent executed ${action} strategy`,
          details: {
            action,
            portfolio: { ETH: 1 + Math.random(), USDC: 500 + Math.random() * 1000 },
            prices: { ETH: 1900 + Math.random() * 200, USDC: 1 },
            confidence: 0.5 + Math.random() * 0.4,
          },
        });
      }
    }

    const { error: logsError } = await supabase.from('execution_logs').insert(logs);
    if (logsError) throw logsError;
    console.log(`Created ${logs.length} execution logs`);

    // Create system events
    console.log('Creating system events...');
    const events = [
      {
        event_type: 'system_started',
        severity: 'info',
        payload: { version: '1.0.0', agents: 10 },
      },
      {
        event_type: 'generation_created',
        severity: 'info',
        payload: { generation: 1, agents: 10 },
      },
    ];

    await supabase.from('system_events').insert(events);
    console.log('Created system events');

    console.log('✅ Database seeded successfully!');
    console.log(`
Summary:
- 1 generation
- ${createdAgents.length} agents
- ${transactions.length} transactions
- ${logs.length} execution logs
- ${events.length} system events
    `);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run seed
seed().then(() => process.exit(0));
