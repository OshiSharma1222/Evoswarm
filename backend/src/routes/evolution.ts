import { Request, Response, Router } from 'express';
import { query } from '../database/db';
import { runEvolutionCycle } from '../services/evolution-engine';

const router = Router();

// GET /api/evolution/status - Current evolution status
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Get current generation
    const genResult = await query(
      "SELECT * FROM generations WHERE status = 'active' ORDER BY index DESC LIMIT 1"
    );
    const generation = genResult.rows[0] || null;

    // Get agent counts by status
    const agentsResult = await query('SELECT status, fitness_score FROM agents');
    const agents = agentsResult.rows;

    const statusCounts: Record<string, number> = {
      running: 0,
      paused: 0,
      eliminated: 0,
      error: 0,
      offline: 0,
    };

    let totalFitness = 0;
    agents.forEach(a => {
      if (a.status in statusCounts) {
        statusCounts[a.status]++;
      }
      totalFitness += parseFloat(a.fitness_score || 0);
    });

    const avgFitness = agents.length ? totalFitness / agents.length : 0;

    // Get last evolution event
    const lastEventResult = await query(
      "SELECT * FROM system_events WHERE event_type = 'evolution_completed' ORDER BY timestamp DESC LIMIT 1"
    );
    const lastEvent = lastEventResult.rows[0] || null;

    res.json({
      currentGeneration: generation,
      agentCounts: statusCounts,
      totalAgents: agents.length,
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

    const result = await query(`
      SELECT * FROM system_events
      WHERE event_type IN ('evolution_started', 'evolution_completed', 'generation_created')
      ORDER BY timestamp DESC
      LIMIT $1
    `, [limitNum]);

    res.json(result.rows);
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
    const agentResult = await query('SELECT * FROM agents WHERE id = $1', [agentId]);
    
    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agent = agentResult.rows[0];
    const lineage: any[] = [agent];
    let currentParentIds = agent.parent_ids || [];
    
    // Get parents recursively (up to 3 generations back)
    for (let i = 0; i < 3 && currentParentIds.length > 0; i++) {
      const parentsResult = await query(
        'SELECT * FROM agents WHERE id = ANY($1::uuid[])',
        [currentParentIds]
      );

      if (parentsResult.rows.length > 0) {
        lineage.push(...parentsResult.rows);
        currentParentIds = parentsResult.rows.flatMap(p => p.parent_ids || []);
      } else {
        break;
      }
    }

    // Get children
    const childrenResult = await query(
      'SELECT * FROM agents WHERE $1 = ANY(parent_ids)',
      [agentId]
    );

    res.json({
      agent,
      ancestors: lineage.slice(1),
      descendants: childrenResult.rows,
    });
  } catch (error) {
    console.error('Error fetching lineage:', error);
    res.status(500).json({ error: 'Failed to fetch lineage' });
  }
});

export default router;
