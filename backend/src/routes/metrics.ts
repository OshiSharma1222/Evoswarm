import { Request, Response, Router } from 'express';
import { query } from '../database/db';

const router = Router();

// GET /api/metrics/dashboard - Dashboard stats
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // Get agent stats
    const agentsResult = await query(`
      SELECT 
        id, name, status, profit_all_time, profit_period, 
        win_rate_period, max_drawdown_period, fitness_score
      FROM agents
      ORDER BY fitness_score DESC
    `);

    const agents = agentsResult.rows;
    const activeAgents = agents.filter(a => a.status === 'running');
    const totalProfit = agents.reduce((sum, a) => sum + parseFloat(a.profit_all_time || 0), 0);
    
    // Get best and worst agent
    const sortedByProfit = [...agents].sort((a, b) => 
      parseFloat(b.profit_period) - parseFloat(a.profit_period)
    );
    const bestAgent = sortedByProfit[0] || null;
    const worstAgent = sortedByProfit[sortedByProfit.length - 1] || null;

    // Get current generation
    const genResult = await query(
      "SELECT index FROM generations WHERE status = 'active' ORDER BY index DESC LIMIT 1"
    );
    const currentGeneration = genResult.rows[0]?.index || 0;

    // Calculate profit change (last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentTxResult = await query(`
      SELECT pnl_realized, timestamp 
      FROM transactions 
      WHERE timestamp >= $1 AND status = 'filled'
    `, [fourteenDaysAgo.toISOString()]);

    const recentTx = recentTxResult.rows;
    const last7DaysProfit = recentTx
      .filter(t => new Date(t.timestamp) >= sevenDaysAgo)
      .reduce((sum, t) => sum + parseFloat(t.pnl_realized || 0), 0);

    const prev7DaysProfit = recentTx
      .filter(t => new Date(t.timestamp) < sevenDaysAgo)
      .reduce((sum, t) => sum + parseFloat(t.pnl_realized || 0), 0);

    const profitChange = prev7DaysProfit !== 0 
      ? ((last7DaysProfit - prev7DaysProfit) / Math.abs(prev7DaysProfit)) * 100 
      : 0;

    res.json({
      totalProfit: Math.round(totalProfit * 100) / 100,
      profitChange: Math.round(profitChange * 100) / 100,
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      currentGeneration,
      bestAgent: bestAgent ? {
        id: bestAgent.id,
        name: bestAgent.name,
        profit: parseFloat(bestAgent.profit_period),
        winRate: parseFloat(bestAgent.win_rate_period),
      } : null,
      worstAgent: worstAgent && worstAgent !== bestAgent ? {
        id: worstAgent.id,
        name: worstAgent.name,
        profit: parseFloat(worstAgent.profit_period),
        maxDrawdown: parseFloat(worstAgent.max_drawdown_period),
      } : null,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/metrics/pnl - PnL time series
router.get('/pnl', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;
    
    let daysBack = 30;
    if (period === '7d') daysBack = 7;
    else if (period === '90d') daysBack = 90;
    else if (period === 'all') daysBack = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const result = await query(`
      SELECT 
        DATE(timestamp) as date,
        SUM(pnl_realized) as daily_pnl
      FROM transactions
      WHERE timestamp >= $1 AND status = 'filled'
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `, [startDate.toISOString()]);

    // Convert to cumulative time series
    let cumulative = 0;
    const timeSeries = result.rows.map(row => {
      const dailyPnl = parseFloat(row.daily_pnl || 0);
      cumulative += dailyPnl;
      return {
        timestamp: row.date,
        value: Math.round(cumulative * 100) / 100,
        daily: Math.round(dailyPnl * 100) / 100,
      };
    });

    res.json(timeSeries);
  } catch (error) {
    console.error('Error fetching PnL:', error);
    res.status(500).json({ error: 'Failed to fetch PnL data' });
  }
});

// GET /api/metrics/generations - Generation performance
router.get('/generations', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        generation_index as generation,
        SUM(profit_all_time) as profit,
        SUM(trade_count_period) as trade_count,
        COUNT(id) as agent_count
      FROM agents
      GROUP BY generation_index
      ORDER BY generation_index
    `);

    const formatted = result.rows.map(row => ({
      generation: row.generation,
      profit: parseFloat(row.profit || 0),
      tradeCount: parseInt(row.trade_count || 0),
      agentCount: parseInt(row.agent_count || 0),
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching generation metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// GET /api/metrics/agent/:id - Agent-specific metrics
router.get('/agent/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 100, 500);

    const result = await query(`
      SELECT * FROM agent_metrics
      WHERE agent_id = $1
      ORDER BY timestamp ASC
      LIMIT $2
    `, [id, limitNum]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching agent metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

export default router;
