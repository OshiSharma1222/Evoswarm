import { Request, Response, Router } from 'express';
import { query } from '../database/db';

const router = Router();

// GET /api/agents - List all agents
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, generation, sort = 'fitness_score', order = 'desc', limit = 50, offset = 0 } = req.query;

    let sql = 'SELECT * FROM agents WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by status
    if (status && typeof status === 'string') {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    // Filter by generation
    if (generation && typeof generation === 'string') {
      sql += ` AND generation_index = $${paramIndex++}`;
      params.push(parseInt(generation));
    }

    // Count total (before pagination)
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].count);

    // Sorting
    const sortColumn = typeof sort === 'string' ? sort : 'fitness_score';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Pagination
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limitNum, offsetNum);

    const result = await query(sql, params);

    res.json({
      data: result.rows,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// GET /api/agents/:id - Get single agent
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM agents WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// POST /api/agents/:id/pause - Pause agent
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE agents SET status = $1 WHERE id = $2 RETURNING *',
      ['paused', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error pausing agent:', error);
    res.status(500).json({ error: 'Failed to pause agent' });
  }
});

// POST /api/agents/:id/resume - Resume agent
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'UPDATE agents SET status = $1 WHERE id = $2 RETURNING *',
      ['running', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(result.rows[0]);
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

    const countResult = await query(
      'SELECT COUNT(*) FROM transactions WHERE agent_id = $1',
      [id]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      'SELECT * FROM transactions WHERE agent_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
      [id, limitNum, offsetNum]
    );

    res.json({
      data: result.rows,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
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

    const countResult = await query(
      'SELECT COUNT(*) FROM execution_logs WHERE agent_id = $1',
      [id]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      'SELECT * FROM execution_logs WHERE agent_id = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
      [id, limitNum, offsetNum]
    );

    res.json({
      data: result.rows,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Error fetching agent logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

export default router;
