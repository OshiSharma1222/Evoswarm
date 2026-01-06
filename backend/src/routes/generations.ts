import { Request, Response, Router } from 'express';
import { supabase } from '../database/supabase';

const router = Router();

// GET /api/generations - List all generations
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let queryBuilder = supabase.from('generations').select('*', { count: 'exact' });

    if (status && typeof status === 'string') {
      queryBuilder = queryBuilder.eq('status', status);
    }

    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;

    queryBuilder = queryBuilder
      .order('index', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    const { data, count, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching generations:', error);
      return res.status(500).json({ error: 'Failed to fetch generations' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching generations:', error);
    res.status(500).json({ error: 'Failed to fetch generations' });
  }
});

// GET /api/generations/current - Get current active generation
router.get('/current', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .eq('status', 'active')
      .order('index', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'No active generation' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching current generation:', error);
    res.status(500).json({ error: 'Failed to fetch generation' });
  }
});

// GET /api/generations/stats/profits - Get profit by generation (must be before /:index)
router.get('/stats/profits', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('generation_index, profit_all_time, trade_count_period, id');

    if (error) {
      console.error('Error fetching generation profits:', error);
      return res.status(500).json({ error: 'Failed to fetch profits' });
    }

    // Group by generation_index manually
    const grouped: Record<number, { profit: number; trade_count: number; agent_count: number }> = {};
    
    for (const agent of data || []) {
      const genIndex = agent.generation_index || 0;
      if (!grouped[genIndex]) {
        grouped[genIndex] = { profit: 0, trade_count: 0, agent_count: 0 };
      }
      grouped[genIndex].profit += parseFloat(agent.profit_all_time || '0');
      grouped[genIndex].trade_count += parseInt(agent.trade_count_period || '0');
      grouped[genIndex].agent_count += 1;
    }

    const result = Object.entries(grouped)
      .map(([generation, stats]) => ({
        generation: parseInt(generation),
        ...stats
      }))
      .sort((a, b) => a.generation - b.generation);

    res.json(result);
  } catch (error) {
    console.error('Error fetching generation profits:', error);
    res.status(500).json({ error: 'Failed to fetch profits' });
  }
});

// GET /api/generations/:index/agents - Get agents in generation (must be before /:index)
router.get('/:index/agents', async (req: Request, res: Response) => {
  try {
    const index = parseInt(req.params.index);
    const { limit = 50, offset = 0 } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;

    const { data, count, error } = await supabase
      .from('agents')
      .select('*', { count: 'exact' })
      .eq('generation_index', index)
      .order('fitness_score', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (error) {
      console.error('Error fetching generation agents:', error);
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching generation agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// GET /api/generations/:index - Get generation by index (must be last)
router.get('/:index', async (req: Request, res: Response) => {
  try {
    const index = parseInt(req.params.index);

    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .eq('index', index)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Generation not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching generation:', error);
    res.status(500).json({ error: 'Failed to fetch generation' });
  }
});

export default router;
