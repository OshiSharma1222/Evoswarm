import { Request, Response, Router } from 'express';
import { supabase } from '../database/supabase';

const router = Router();

// GET /api/metrics/dashboard - Dashboard stats
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // Get agent stats
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, status, profit_all_time, profit_period, win_rate_period, max_drawdown_period, fitness_score')
      .order('fitness_score', { ascending: false });

    if (agentsError) {
      console.error('Error fetching agents:', agentsError);
      return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }

    const agentsList = agents || [];
    const activeAgents = agentsList.filter(a => a.status === 'running');
    const totalProfit = agentsList.reduce((sum, a) => sum + parseFloat(a.profit_all_time || '0'), 0);
    
    // Get best and worst agent
    const sortedByProfit = [...agentsList].sort((a, b) => 
      parseFloat(b.profit_period || '0') - parseFloat(a.profit_period || '0')
    );
    const bestAgent = sortedByProfit[0] || null;
    const worstAgent = sortedByProfit[sortedByProfit.length - 1] || null;

    // Get current generation
    const { data: genData } = await supabase
      .from('generations')
      .select('index')
      .eq('status', 'active')
      .order('index', { ascending: false })
      .limit(1)
      .single();

    const currentGeneration = genData?.index || 0;

    // Calculate profit change (last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const { data: recentTx } = await supabase
      .from('transactions')
      .select('pnl_realized, created_at')
      .gte('created_at', fourteenDaysAgo.toISOString())
      .eq('status', 'filled');

    const transactions = recentTx || [];
    const last7DaysProfit = transactions
      .filter(t => new Date(t.created_at) >= sevenDaysAgo)
      .reduce((sum, t) => sum + parseFloat(t.pnl_realized || '0'), 0);

    const prev7DaysProfit = transactions
      .filter(t => new Date(t.created_at) < sevenDaysAgo)
      .reduce((sum, t) => sum + parseFloat(t.pnl_realized || '0'), 0);

    const profitChange = prev7DaysProfit !== 0 
      ? ((last7DaysProfit - prev7DaysProfit) / Math.abs(prev7DaysProfit)) * 100 
      : 0;

    res.json({
      totalProfit: Math.round(totalProfit * 100) / 100,
      profitChange: Math.round(profitChange * 100) / 100,
      totalAgents: agentsList.length,
      activeAgents: activeAgents.length,
      currentGeneration,
      bestAgent: bestAgent ? {
        id: bestAgent.id,
        name: bestAgent.name,
        profit: parseFloat(bestAgent.profit_period || '0'),
        winRate: parseFloat(bestAgent.win_rate_period || '0'),
      } : null,
      worstAgent: worstAgent && worstAgent !== bestAgent ? {
        id: worstAgent.id,
        name: worstAgent.name,
        profit: parseFloat(worstAgent.profit_period || '0'),
        maxDrawdown: parseFloat(worstAgent.max_drawdown_period || '0'),
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

    const { data, error } = await supabase
      .from('transactions')
      .select('pnl_realized, created_at')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'filled')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching PnL:', error);
      return res.status(500).json({ error: 'Failed to fetch PnL data' });
    }

    // Group by date and calculate cumulative
    const dailyPnl: Record<string, number> = {};
    for (const tx of data || []) {
      const date = tx.created_at.split('T')[0];
      dailyPnl[date] = (dailyPnl[date] || 0) + parseFloat(tx.pnl_realized || '0');
    }

    let cumulative = 0;
    const timeSeries = Object.entries(dailyPnl)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, daily]) => {
        cumulative += daily;
        return {
          timestamp: date,
          value: Math.round(cumulative * 100) / 100,
          daily: Math.round(daily * 100) / 100,
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
    const { data, error } = await supabase
      .from('agents')
      .select('generation_index, profit_all_time, trade_count_period, id');

    if (error) {
      console.error('Error fetching generation metrics:', error);
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }

    // Group by generation_index manually
    const grouped: Record<number, { profit: number; tradeCount: number; agentCount: number }> = {};
    
    for (const agent of data || []) {
      const genIndex = agent.generation_index || 0;
      if (!grouped[genIndex]) {
        grouped[genIndex] = { profit: 0, tradeCount: 0, agentCount: 0 };
      }
      grouped[genIndex].profit += parseFloat(agent.profit_all_time || '0');
      grouped[genIndex].tradeCount += parseInt(agent.trade_count_period || '0');
      grouped[genIndex].agentCount += 1;
    }

    const result = Object.entries(grouped)
      .map(([generation, stats]) => ({
        generation: parseInt(generation),
        ...stats
      }))
      .sort((a, b) => a.generation - b.generation);

    res.json(result);
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

    const { data, error } = await supabase
      .from('agent_metrics')
      .select('*')
      .eq('agent_id', id)
      .order('timestamp', { ascending: true })
      .limit(limitNum);

    if (error) {
      console.error('Error fetching agent metrics:', error);
      return res.status(500).json({ error: 'Failed to fetch metrics' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching agent metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

export default router;
