import { Request, Response, Router } from 'express';
import { supabase } from '../database/supabase';

const router = Router();

// GET /api/agents - List all agents
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, generation, sort = 'fitness_score', order = 'desc', limit = 50, offset = 0 } = req.query;

    let queryBuilder = supabase.from('agents').select('*', { count: 'exact' });

    // Filter by status
    if (status && typeof status === 'string') {
      queryBuilder = queryBuilder.eq('status', status);
    }

    // Filter by generation
    if (generation && typeof generation === 'string') {
      queryBuilder = queryBuilder.eq('generation_index', parseInt(generation));
    }

    // Sorting
    const sortColumn = typeof sort === 'string' ? sort : 'fitness_score';
    const ascending = order === 'asc';
    queryBuilder = queryBuilder.order(sortColumn, { ascending });

    // Pagination
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;
    queryBuilder = queryBuilder.range(offsetNum, offsetNum + limitNum - 1);

    const { data, count, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching agents:', error);
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// GET /api/agents/:id - Get single agent
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// POST /api/agents/:id/pause - Pause agent
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('agents')
      .update({ status: 'paused' })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error pausing agent:', error);
    res.status(500).json({ error: 'Failed to pause agent' });
  }
});

// POST /api/agents/:id/resume - Resume agent
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('agents')
      .update({ status: 'running' })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error resuming agent:', error);
    res.status(500).json({ error: 'Failed to resume agent' });
  }
});

// GET /api/agents/:id/transactions - Get agent transactions
router.get('/:id/transactions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;

    const { data, count, error } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (error) {
      console.error('Error fetching transactions:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching agent transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/agents/:id/logs - Get agent execution logs
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;

    const { data, count, error } = await supabase
      .from('execution_logs')
      .select('*', { count: 'exact' })
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);

    if (error) {
      console.error('Error fetching logs:', error);
      return res.status(500).json({ error: 'Failed to fetch logs' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching agent logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
