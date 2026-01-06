import { Request, Response, Router } from 'express';
import { query } from '../database/db';

const router = Router();

// GET /api/generations - List all generations
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let sql = 'SELECT * FROM generations WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status && typeof status === 'string') {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].count);

    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;

    sql += ` ORDER BY index DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limitNum, offsetNum);

    const result = await query(sql, params);

    res.json({
      data: result.rows,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Error fetching generations:', error);
    res.status(500).json({ error: 'Failed to fetch generations' });
  }
});

// GET /api/generations/current - Get current active generation
router.get('/current', async (req: Request, res: Response) => {
  try {
    const result = await query(
      "SELECT * FROM generations WHERE status = 'active' ORDER BY index DESC LIMIT 1"
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active generation' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching current generation:', error);
    res.status(500).json({ error: 'Failed to fetch generation' });
  }
});

// GET /api/generations/stats/profits - Get profit by generation (must be before /:index)
router.get('/stats/profits', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        generation_index as generation,
        COALESCE(SUM(profit_all_time), 0) as profit,
        COALESCE(SUM(trade_count_period), 0) as trade_count,
        COUNT(DISTINCT id) as agent_count
      FROM agents
      GROUP BY generation_index
      ORDER BY generation_index
    `);

    res.json(result.rows);
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

    const countResult = await query(
      'SELECT COUNT(*) FROM agents WHERE generation_index = $1',
      [index]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      'SELECT * FROM agents WHERE generation_index = $1 ORDER BY fitness_score DESC LIMIT $2 OFFSET $3',
      [index, limitNum, offsetNum]
    );

    res.json({
      data: result.rows,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Error fetching generation agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// GET /api/generations/:index - Get generation by index (must be last)
router.get('/:index', async (req: Request, res: Response) => {
  try {
    const index = parseInt(req.params.index);

    const result = await query('SELECT * FROM generations WHERE index = $1', [index]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Generation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching generation:', error);
    res.status(500).json({ error: 'Failed to fetch generation' });
  }
});

export default router;
