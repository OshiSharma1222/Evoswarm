import { Request, Response, Router } from 'express';
import { query } from '../database/db';

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

    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Filters
    if (agent_id && typeof agent_id === 'string') {
      sql += ` AND agent_id = $${paramIndex++}`;
      params.push(agent_id);
    }

    if (status && typeof status === 'string') {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (type && typeof type === 'string') {
      sql += ` AND type = $${paramIndex++}`;
      params.push(type);
    }

    if (from_date && typeof from_date === 'string') {
      sql += ` AND timestamp >= $${paramIndex++}`;
      params.push(from_date);
    }

    if (to_date && typeof to_date === 'string') {
      sql += ` AND timestamp <= $${paramIndex++}`;
      params.push(to_date);
    }

    // Count total
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await query(countSql, params);
    const total = parseInt(countResult.rows[0].count);

    // Pagination
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;
    
    sql += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limitNum, offsetNum);

    const result = await query(sql, params);

    res.json({
      data: result.rows,
      total,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/transactions/:id - Get single transaction
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM transactions WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
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

    const result = await query(`
      SELECT 
        t.*,
        a.name as agent_name,
        a.status as agent_status
      FROM transactions t
      LEFT JOIN agents a ON t.agent_id = a.id
      ORDER BY t.timestamp DESC
      LIMIT $1
    `, [limitNum]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
