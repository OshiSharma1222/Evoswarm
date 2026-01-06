import { Request, Response, Router } from 'express';
import { supabase } from '../database/supabase';

const router = Router();

// GET /api/transactions - List all transactions
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      agent_id, 
      status, 
      type,
      from_date,
      to_date,
      limit = 50, 
      offset = 0 
    } = req.query;

    let queryBuilder = supabase.from('transactions').select('*', { count: 'exact' });

    // Filters
    if (agent_id && typeof agent_id === 'string') {
      queryBuilder = queryBuilder.eq('agent_id', agent_id);
    }

    if (status && typeof status === 'string') {
      queryBuilder = queryBuilder.eq('status', status);
    }

    if (type && typeof type === 'string') {
      queryBuilder = queryBuilder.eq('type', type);
    }

    if (from_date && typeof from_date === 'string') {
      queryBuilder = queryBuilder.gte('created_at', from_date);
    }

    if (to_date && typeof to_date === 'string') {
      queryBuilder = queryBuilder.lte('created_at', to_date);
    }

    // Sorting
    queryBuilder = queryBuilder.order('created_at', { ascending: false });

    // Pagination
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;
    queryBuilder = queryBuilder.range(offsetNum, offsetNum + limitNum - 1);

    const { data, count, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching transactions:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/transactions/:id - Get single transaction
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// GET /api/transactions/list/recent - Get recent transactions (last 20)
router.get('/list/recent', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 20, 50);

    const { data, error } = await supabase
      .from('transactions')
      .select('*, agents(name, status)')
      .order('created_at', { ascending: false })
      .limit(limitNum);

    if (error) {
      console.error('Error fetching recent transactions:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
