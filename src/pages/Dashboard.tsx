import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DataTable, { Column } from '../components/DataTable'
import KpiCard from '../components/KpiCard'
import Section from '../components/Section'
import StatusPill from '../components/StatusPill'
import {
    Agent,
    DashboardMetrics,
    fetchAgents,
    fetchDashboardStats,
    fetchGenerationMetrics,
    fetchPnLTimeSeries,
    fetchTransactions,
    GenerationMetrics,
    PnLDataPoint,
    Transaction,
} from '../lib/api'

// Transformed types for UI
interface UIAgent {
  id: string
  name: string
  status: 'running' | 'paused' | 'error' | 'offline'
  profitAllTime: number
  profitPeriod: number
  tradeCountPeriod: number
  winRatePeriod: number
  generation: number
}

interface UITransaction {
  id: string
  timestamp: string
  agentId: string
  agentName: string
  type: 'buy' | 'sell' | 'swap'
  symbol: string
  qty: number
  price: number
  pnlRealized: number
  status: 'filled' | 'pending' | 'failed'
}

export default function Dashboard() {
  const navigate = useNavigate()

  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agents, setAgents] = useState<UIAgent[]>([])
  const [transactions, setTransactions] = useState<UITransaction[]>([])
  const [generationMetrics, setGenerationMetrics] = useState<GenerationMetrics[]>([])
  const [pnlData, setPnlData] = useState<PnLDataPoint[]>([])
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)

  // Fetch data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const [agentsRes, txRes, genMetricsRes, pnlRes, metricsRes] = await Promise.all([
          fetchAgents().catch(() => []),
          fetchTransactions(20).catch(() => []),
          fetchGenerationMetrics().catch(() => []),
          fetchPnLTimeSeries(30).catch(() => []),
          fetchDashboardStats().catch(() => null),
        ])

        // Transform agents
        setAgents(
          agentsRes.map((a: Agent) => ({
            id: a.id,
            name: a.name,
            status: a.status === 'eliminated' ? 'offline' : a.status,
            profitAllTime: a.profit_all_time || 0,
            profitPeriod: a.profit_period || 0,
            tradeCountPeriod: a.trade_count_period || 0,
            winRatePeriod: a.win_rate_period || 0,
            generation: a.generation_index || 1,
          }))
        )

        // Transform transactions
        setTransactions(
          txRes.map((t: Transaction) => ({
            id: t.id,
            timestamp: t.created_at,
            agentId: t.agent_id,
            agentName: `Agent ${t.agent_id.slice(0, 6)}`,
            type: t.type,
            symbol: t.symbol || 'ETH/USDC',
            qty: t.qty || 0,
            price: t.price || 0,
            pnlRealized: t.pnl_realized || 0,
            status: t.status,
          })) )

        setGenerationMetrics(genMetricsRes)
        setPnlData(pnlRes)
        setMetrics(metricsRes)
      } catch (err: any) {
        console.error('Failed to load dashboard:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Calculate KPIs from data
  const totalProfit = metrics?.totalProfit ?? agents.reduce((sum, a) => sum + a.profitAllTime, 0)
  const periodProfit = metrics?.periodProfit ?? agents.reduce((sum, a) => sum + a.profitPeriod, 0)
  const bestAgent = agents.length > 0
    ? agents.reduce((best, curr) => (curr.profitPeriod > best.profitPeriod ? curr : best))
    : null
  const worstAgent = agents.length > 0
    ? agents.reduce((worst, curr) => (curr.profitPeriod < worst.profitPeriod ? curr : worst))
    : null
  const avgProfitPerGen = generationMetrics.length > 0
    ? generationMetrics.reduce((sum, g) => sum + g.profit, 0) / generationMetrics.length
    : 0

  // Format chart data
  const pnlChartData = pnlData.map((p) => ({
    date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    profit: p.value,
  }))

  const generationChartData = generationMetrics.map((g) => ({
    generation: `Gen ${g.generation}`,
    profit: g.profit,
  }))

  // Agent table columns
  const agentColumns: Column<UIAgent>[] = [
    {
      key: 'name',
      header: 'Agent',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-dark-900">{row.name}</span>
          <StatusPill status={row.status} />
        </div>
      ),
    },
    {
      key: 'profitPeriod',
      header: 'Profit (7D)',
      render: (row) => (
        <span className={row.profitPeriod >= 0 ? 'text-emerald-400' : 'text-red-400'}>
          ${row.profitPeriod.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'profitAllTime',
      header: 'Total Profit',
      render: (row) => (
        <span className={row.profitAllTime >= 0 ? 'text-emerald-400' : 'text-red-400'}>
          ${row.profitAllTime.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'tradeCountPeriod',
      header: 'Trades',
      render: (row) => <span className="text-dark-700">{row.tradeCountPeriod}</span>,
    },
    {
      key: 'winRatePeriod',
      header: 'Win Rate',
      render: (row) => (
        <span className="text-dark-700">{(row.winRatePeriod * 100).toFixed(1)}%</span>
      ),
    },
    {
      key: 'generation',
      header: 'Gen',
      render: (row) => <span className="text-dark-500">#{row.generation}</span>,
    },
  ]

  // Transaction table columns
  const txColumns: Column<UITransaction>[] = [
    {
      key: 'timestamp',
      header: 'Time',
      render: (row) => (
        <span className="text-dark-500 text-xs">
          {new Date(row.timestamp).toLocaleTimeString()}
        </span>
      ),
    },
    {
      key: 'agentName',
      header: 'Agent',
      render: (row) => <span className="text-dark-700 text-xs">{row.agentName}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className={`text-xs font-medium ${row.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
          {row.type.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'symbol',
      header: 'Symbol',
      render: (row) => <span className="text-dark-700 text-xs">{row.symbol}</span>,
    },
    {
      key: 'pnlRealized',
      header: 'PnL',
      render: (row) => (
        <span className={`text-xs ${row.pnlRealized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          ${row.pnlRealized.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusPill status={row.status === 'filled' ? 'ok' : 'warn'} text={row.status} />,
    },
  ]

  if (loading && agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark-500">Loading dashboard...</div>
      </div>
    )
  }

  if (error && agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">Failed to load: {error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Connection Status */}
      {error && (
        <div className="rounded-lg border border-yellow-600 bg-yellow-900/20 p-3 text-yellow-400 text-sm">
          ⚠️ Having trouble connecting to backend. Showing cached data.
        </div>
      )}

      {/* Hero KPI Strip */}
      <Section title="PnL Overview" subtitle="Performance metrics for the last 7 days">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Profit"
            value={`$${totalProfit.toFixed(2)}`}
            delta={12.5}
            deltaDirection={totalProfit >= 0 ? 'up' : 'down'}
            helperText="All agents, all time"
          />
          <KpiCard
            label="Profit / Generation"
            value={`$${avgProfitPerGen.toFixed(2)}`}
            delta={8.3}
            deltaDirection="up"
            helperText={`Average across ${generationMetrics.length || 0} generations`}
          />
          <KpiCard
            label="Best Agent"
            value={bestAgent?.name || 'N/A'}
            helperText={bestAgent ? `$${bestAgent.profitPeriod.toFixed(2)} profit` : 'No agents yet'}
          />
          <KpiCard
            label="Worst Agent"
            value={worstAgent?.name || 'N/A'}
            helperText={worstAgent ? `$${worstAgent.profitPeriod.toFixed(2)} loss` : 'No agents yet'}
          />
        </div>
      </Section>

      {/* PnL Trend Chart */}
      <Section title="Profit Trend" subtitle="Cumulative profit over time">
        <div className="rounded-lg border border-dark-200 bg-dark-50 p-6">
          {pnlChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pnlChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: 12 }} />
                <YAxis stroke="#71717a" style={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    color: '#e4e4e7',
                  }}
                />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-dark-500">
              No PnL data yet. Agents are executing trades...
            </div>
          )}
        </div>
      </Section>

      {/* Profit per Generation */}
      <Section title="Profit per Generation" subtitle="Performance evolution across generations">
        <div className="rounded-lg border border-dark-200 bg-dark-50 p-6">
          {generationChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={generationChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="generation" stroke="#71717a" style={{ fontSize: 12 }} />
                <YAxis stroke="#71717a" style={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    color: '#e4e4e7',
                  }}
                />
                <Bar dataKey="profit" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-dark-500">
              No generation data yet
            </div>
          )}
        </div>
      </Section>

      {/* Agents List */}
      <Section
        title="Active Agents"
        subtitle={`${agents.length} agents | Performance summary`}
        rightSlot={
          <button
            onClick={() => navigate('/agents')}
            className="text-sm font-medium text-emerald-500 hover:text-emerald-400"
          >
            View all →
          </button>
        }
      >
        {agents.length > 0 ? (
          <DataTable
            columns={agentColumns}
            data={agents}
            rowKey="id"
            onRowClick={(agent) => navigate(`/agents/${agent.id}`)}
          />
        ) : (
          <div className="text-center py-8 text-dark-500">No agents found. Backend may still be initializing...</div>
        )}
      </Section>

      {/* Recent Transactions */}
      <Section
        title="Recent Transactions"
        subtitle="Latest execution history"
        rightSlot={
          <button
            onClick={() => navigate('/tx')}
            className="text-sm font-medium text-emerald-500 hover:text-emerald-400"
          >
            View all →
          </button>
        }
      >
        {transactions.length > 0 ? (
          <DataTable columns={txColumns} data={transactions.slice(0, 10)} rowKey="id" />
        ) : (
          <div className="text-center py-8 text-dark-500">No transactions yet. Agents are analyzing markets...</div>
        )}
      </Section>
    </div>
  )
}
