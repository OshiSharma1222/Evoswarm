import { Server as SocketIOServer } from 'socket.io';
import { supabase } from '../database/supabase';
import { AgentDNA } from '../types';

// Evolution configuration
const config = {
  mutationRate: parseFloat(process.env.MUTATION_RATE || '0.15'),
  elitePercentage: parseFloat(process.env.ELITE_PERCENTAGE || '0.2'),
  eliminationPercentage: parseFloat(process.env.ELIMINATION_PERCENTAGE || '0.3'),
};

// Fitness weights
const FITNESS_WEIGHTS = {
  profit: 0.4,
  sharpe: 0.3,
  winRate: 0.2,
  drawdownPenalty: -0.05,
  overtradingPenalty: -0.05,
};

// Parameter bounds for mutation
const PARAM_BOUNDS: Record<string, { min: number; max: number }> = {
  riskTolerance: { min: 0.05, max: 0.95 },
  positionSizePercent: { min: 1, max: 25 },
  maxSlippage: { min: 0.1, max: 5 },
  momentumWindow: { min: 5, max: 100 },
  meanReversionThreshold: { min: 0.5, max: 3 },
  stopLossPercent: { min: 1, max: 20 },
  takeProfitPercent: { min: 2, max: 50 },
};

// Calculate fitness score for an agent
export function calculateFitness(agent: {
  profit_period: number;
  win_rate_period: number;
  max_drawdown_period: number;
  trade_count_period: number;
}): number {
  // Normalize values (assuming reasonable ranges)
  const normalizedProfit = Math.tanh(agent.profit_period / 1000); // -1 to 1
  const normalizedWinRate = agent.win_rate_period; // 0 to 1
  const normalizedDrawdown = Math.min(agent.max_drawdown_period / 50, 1); // 0 to 1
  const normalizedTrades = Math.min(agent.trade_count_period / 100, 1); // 0 to 1

  // Sharpe ratio placeholder (would need returns array for real calc)
  const sharpeProxy = normalizedProfit * normalizedWinRate;

  const fitness =
    FITNESS_WEIGHTS.profit * normalizedProfit +
    FITNESS_WEIGHTS.sharpe * sharpeProxy +
    FITNESS_WEIGHTS.winRate * normalizedWinRate +
    FITNESS_WEIGHTS.drawdownPenalty * normalizedDrawdown +
    FITNESS_WEIGHTS.overtradingPenalty * (normalizedTrades > 0.8 ? normalizedTrades : 0);

  // Scale to 0-100
  return Math.max(0, Math.min(100, (fitness + 1) * 50));
}

// Gaussian random number
function gaussianRandom(mean: number = 0, std: number = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z * std + mean;
}

// Clamp value to range
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Breed two agents (crossover)
function breed(parent1Dna: AgentDNA, parent2Dna: AgentDNA): AgentDNA {
  const childDna: AgentDNA = {
    riskTolerance: 0.5,
    positionSizePercent: 10,
    maxSlippage: 1,
  };

  // Uniform crossover: randomly pick from either parent
  for (const param of Object.keys(parent1Dna)) {
    if (typeof parent1Dna[param] === 'number' && typeof parent2Dna[param] === 'number') {
      childDna[param] = Math.random() > 0.5 ? parent1Dna[param] : parent2Dna[param];
    }
  }

  return childDna;
}

// Mutate agent DNA
function mutate(dna: AgentDNA): AgentDNA {
  const mutatedDna = { ...dna };

  for (const param of Object.keys(mutatedDna)) {
    if (typeof mutatedDna[param] === 'number' && Math.random() < config.mutationRate) {
      const currentValue = mutatedDna[param] as number;
      const bounds = PARAM_BOUNDS[param] || { min: currentValue * 0.5, max: currentValue * 1.5 };
      
      // Add Gaussian noise
      const noise = gaussianRandom(0, currentValue * 0.1);
      mutatedDna[param] = clamp(currentValue + noise, bounds.min, bounds.max);
    }
  }

  return mutatedDna;
}

// Generate agent name
function generateAgentName(generation: number, index: number): string {
  const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
  const suffixes = ['Prime', 'Nova', 'Apex', 'Core', 'Edge', 'Wave', 'Flux', 'Pulse'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return `${prefix}-${suffix}-G${generation}-${index}`;
}

// Tournament selection
function tournamentSelect(agents: any[], tournamentSize: number = 2): any {
  const tournament = [];
  for (let i = 0; i < tournamentSize; i++) {
    tournament.push(agents[Math.floor(Math.random() * agents.length)]);
  }
  tournament.sort((a, b) => b.fitness_score - a.fitness_score);
  
  // 80% chance best wins, 20% underdog wins
  return Math.random() < 0.8 ? tournament[0] : tournament[tournament.length - 1];
}

// Run evolution cycle
export async function runEvolutionCycle(io?: SocketIOServer): Promise<{
  newGeneration: number;
  survivors: number;
  newAgents: number;
  eliminated: number;
}> {
  console.log('🧬 Starting evolution cycle...');

  // Log event
  await supabase.from('system_events').insert({
    event_type: 'evolution_started',
    severity: 'info',
    payload: { timestamp: new Date().toISOString() },
  });

  // 1. Get current generation
  const { data: currentGen } = await supabase
    .from('generations')
    .select('*')
    .eq('status', 'active')
    .order('index', { ascending: false })
    .limit(1)
    .single();

  const currentGenIndex = currentGen?.index || 0;

  // 2. Score all active agents
  const { data: agents, error } = await supabase
    .from('agents')
    .select('*')
    .in('status', ['running', 'paused'])
    .order('fitness_score', { ascending: false });

  if (error || !agents || agents.length === 0) {
    console.log('No agents to evolve');
    return { newGeneration: currentGenIndex, survivors: 0, newAgents: 0, eliminated: 0 };
  }

  // Update fitness scores
  const scoredAgents = agents.map(agent => ({
    ...agent,
    fitness_score: calculateFitness(agent),
  }));

  // Sort by fitness
  scoredAgents.sort((a, b) => b.fitness_score - a.fitness_score);

  const totalAgents = scoredAgents.length;
  const eliteCount = Math.floor(totalAgents * config.elitePercentage);
  const eliminateCount = Math.floor(totalAgents * config.eliminationPercentage);
  const survivorCount = totalAgents - eliminateCount;

  // 3. Select elites (automatically survive)
  const elites = scoredAgents.slice(0, eliteCount);

  // 4. Tournament selection for remaining survivors
  const survivors = [...elites];
  const nonElites = scoredAgents.slice(eliteCount);
  
  while (survivors.length < survivorCount && nonElites.length > 0) {
    const selected = tournamentSelect(nonElites);
    if (!survivors.find(s => s.id === selected.id)) {
      survivors.push(selected);
    }
  }

  // 5. Eliminate bottom performers
  const eliminated = scoredAgents.filter(a => !survivors.find(s => s.id === a.id));

  // Mark eliminated agents
  if (eliminated.length > 0) {
    await supabase
      .from('agents')
      .update({ 
        status: 'eliminated', 
        eliminated_at: new Date().toISOString() 
      })
      .in('id', eliminated.map(a => a.id));
  }

  // 6. Create new generation
  const newGenIndex = currentGenIndex + 1;
  
  const { data: newGen } = await supabase
    .from('generations')
    .insert({
      index: newGenIndex,
      status: 'active',
      total_agents: survivorCount + eliminateCount, // Replace eliminated with new
      config: {
        mutationRate: config.mutationRate,
        elitePercentage: config.elitePercentage,
        eliminationPercentage: config.eliminationPercentage,
      },
    })
    .select()
    .single();

  // Complete old generation
  if (currentGen) {
    const bestAgent = scoredAgents[0];
    const worstAgent = scoredAgents[scoredAgents.length - 1];
    
    await supabase
      .from('generations')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        avg_fitness: scoredAgents.reduce((sum, a) => sum + a.fitness_score, 0) / totalAgents,
        best_agent_id: bestAgent?.id,
        worst_agent_id: worstAgent?.id,
      })
      .eq('id', currentGen.id);
  }

  // 7. Breed new agents to replace eliminated
  const newAgents: any[] = [];
  
  while (newAgents.length < eliminateCount) {
    const parent1 = tournamentSelect(survivors);
    const parent2 = tournamentSelect(survivors.filter(s => s.id !== parent1.id));
    
    if (!parent2) continue;

    const childDna = mutate(breed(parent1.dna, parent2.dna));
    const agentIndex = newAgents.length + 1;

    newAgents.push({
      name: generateAgentName(newGenIndex, agentIndex),
      generation_id: newGen?.id,
      generation_index: newGenIndex,
      parent_ids: [parent1.id, parent2.id],
      dna: childDna,
      strategy_type: Math.random() > 0.5 ? parent1.strategy_type : parent2.strategy_type,
      status: 'running',
      wallet_address: null, // Would be generated/assigned
      profit_all_time: 0,
      profit_period: 0,
      trade_count_period: 0,
      win_rate_period: 0.5,
      max_drawdown_period: 0,
      fitness_score: 50, // Start at neutral
    });
  }

  // Insert new agents
  if (newAgents.length > 0) {
    await supabase.from('agents').insert(newAgents);
  }

  // Update survivors to new generation
  await supabase
    .from('agents')
    .update({ 
      generation_index: newGenIndex,
      generation_id: newGen?.id,
    })
    .in('id', survivors.map(s => s.id));

  // Log completion
  await supabase.from('system_events').insert({
    event_type: 'evolution_completed',
    severity: 'info',
    payload: {
      generation: newGenIndex,
      survivors: survivors.length,
      newAgents: newAgents.length,
      eliminated: eliminated.length,
    },
  });

  // Emit WebSocket event
  if (io) {
    io.emit('generation.completed', {
      generation: newGenIndex,
      survivors: survivors.length,
      newAgents: newAgents.length,
      eliminated: eliminated.length,
    });
  }

  console.log(`🧬 Evolution complete: Gen ${newGenIndex}, ${survivors.length} survivors, ${newAgents.length} new, ${eliminated.length} eliminated`);

  return {
    newGeneration: newGenIndex,
    survivors: survivors.length,
    newAgents: newAgents.length,
    eliminated: eliminated.length,
  };
}

// Schedule periodic evolution
export function scheduleEvolution(io: SocketIOServer): void {
  const intervalHours = parseInt(process.env.EVOLUTION_INTERVAL_HOURS || '24');
  const intervalMs = intervalHours * 60 * 60 * 1000;

  console.log(`📅 Evolution scheduled every ${intervalHours} hours`);

  setInterval(() => {
    runEvolutionCycle(io).catch(err => {
      console.error('Evolution cycle failed:', err);
    });
  }, intervalMs);
}
