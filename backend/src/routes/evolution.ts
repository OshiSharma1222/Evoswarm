import { Request, Response, Router } from 'express';
import { supabase } from '../database/supabase';
import { runEvolutionCycle } from '../services/evolution-engine';

const router = Router();

// GET /api/evolution/status - Current evolution status
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get current generation
    const { data: generation } = await supabase
      .from('generations')
      .select('*')
      .eq('status', 'active')
      .order('index', { ascending: false })
      .limit(1)
      .single();

    // Get agent counts by status
    const { data: agents } = await supabase
      .from('agents')
      .select('status, fitness_score');

    const agentsList = agents || [];
    const statusCounts: Record<string, number> = {
      running: 0,
      paused: 0,
      eliminated: 0,
      error: 0,
      offline: 0,
    };

    let totalFitness = 0;
    agentsList.forEach(a => {
      if (a.status in statusCounts) {
        statusCounts[a.status]++;
      }
      totalFitness += parseFloat(a.fitness_score || '0');
    });

    const avgFitness = agentsList.length ? totalFitness / agentsList.length : 0;

    // Get last evolution event
    const { data: lastEvent } = await supabase
      .from('system_events')
      .select('*')
      .eq('event_type', 'evolution_completed')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    res.json({
      currentGeneration: generation || null,
      agentCounts: statusCounts,
      totalAgents: agentsList.length,
      avgFitness: Math.round(avgFitness * 1000) / 1000,
      lastEvolutionAt: lastEvent?.timestamp || null,
      config: {
        mutationRate: parseFloat(process.env.MUTATION_RATE || '0.15'),
        elitePercentage: parseFloat(process.env.ELITE_PERCENTAGE || '0.2'),
        eliminationPercentage: parseFloat(process.env.ELIMINATION_PERCENTAGE || '0.3'),
        intervalHours: parseInt(process.env.EVOLUTION_INTERVAL_HOURS || '24'),
      },
    });
  } catch (error) {
    console.error('Error fetching evolution status:', error);
    res.status(500).json({ error: 'Failed to fetch evolution status' });
  }
});

// POST /api/evolution/trigger - Manually trigger evolution cycle
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const result = await runEvolutionCycle();
    
    res.json({
      success: true,
      message: 'Evolution cycle completed',
      result,
    });
  } catch (error) {
    console.error('Error triggering evolution:', error);
    res.status(500).json({ error: 'Failed to trigger evolution' });
  }
});

// GET /api/evolution/history - Evolution history
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);

    const { data, error } = await supabase
      .from('system_events')
      .select('*')
      .in('event_type', ['evolution_started', 'evolution_completed', 'generation_created'])
      .order('timestamp', { ascending: false })
      .limit(limitNum);

    if (error) {
      console.error('Error fetching evolution history:', error);
      return res.status(500).json({ error: 'Failed to fetch history' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching evolution history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/evolution/lineage/:agentId - Get agent lineage
router.get('/lineage/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    // Get the agent
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();
    
    if (error || !agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const lineage: any[] = [agent];
    let currentParentIds = agent.parent_ids || [];
    
    // Get parents recursively (up to 3 generations back)
    for (let i = 0; i < 3 && currentParentIds.length > 0; i++) {
      const { data: parents } = await supabase
        .from('agents')
        .select('*')
        .in('id', currentParentIds);

      if (parents && parents.length > 0) {
        lineage.push(...parents);
        currentParentIds = parents.flatMap(p => p.parent_ids || []);
      } else {
        break;
      }
    }

    // Get children
    const { data: children } = await supabase
      .from('agents')
      .select('*')
      .contains('parent_ids', [agentId]);

    res.json({
      agent,
      ancestors: lineage.slice(1),
      descendants: children || [],
    });
  } catch (error) {
    console.error('Error fetching lineage:', error);
    res.status(500).json({ error: 'Failed to fetch lineage' });
  }
});

export default router;
