import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DataTable, { Column } from '../components/DataTable'
import KpiCard from '../components/KpiCard'
import Section from '../components/Section'
import StatusPill from '../components/StatusPill'
import { Agent, mockAgents, mockGenerations, mockPnLTimeSeries, mockTransactions, Transaction } from '../lib/mockData'

export default function Dashboard() {
  const navigate = useNavigate()

  // Calculate KPIs
  const totalProfit = mockAgents.reduce((sum, a) => sum + a.profitAllTime, 0)
  const periodProfit = mockAgents.reduce((sum, a) => sum + a.profitPeriod, 0)
  const bestAgent = mockAgents.reduce((best, curr) => 
    curr.profitPeriod > best.profitPeriod ? curr : best
  )
  const worstAgent = mockAgents.reduce((worst, curr) => 
    curr.profitPeriod < worst.profitPeriod ? curr : worst
  )
  const avgProfitPerGen = mockGenerations.reduce((sum, g) => sum + g.profit, 0) / mockGenerations.length

  // Format chart data
  const pnlChartData = mockPnLTimeSeries.map(p => ({
    date: new Date(p.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    profit: p.v,
  }))

  const generationChartData = mockGenerations.map(g => ({
    generation: `Gen ${g.index}`,
    profit: g.profit,
  }))

  // Agent table columns
  const agentColumns: Column<Agent>[] = [
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

  // Transaction table columns (compact for dashboard)
  const txColumns: Column<Transaction>[] = [
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

  return (
    <div className="space-y-8">
      {/* Hero KPI Strip */}
      <Section title="PnL Overview" subtitle="Performance metrics for the last 7 days">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Total Profit"
            value={`$${totalProfit.toFixed(2)}`}
            delta={12.5}
            deltaDirection="up"
            helperText="All agents, all time"
          />
          <KpiCard
            label="Profit / Generation"
            value={`$${avgProfitPerGen.toFixed(2)}`}
            delta={8.3}
            deltaDirection="up"
            helperText="Average across 5 generations"
          />
          <KpiCard
            label="Best Agent"
            value={bestAgent.name}
            helperText={`$${bestAgent.profitPeriod.toFixed(2)} profit`}
          />
          <KpiCard
            label="Worst Agent"
            value={worstAgent.name}
            helperText={`$${worstAgent.profitPeriod.toFixed(2)} loss`}
          />
        </div>
      </Section>

      {/* PnL Trend Chart */}
      <Section title="Profit Trend" subtitle="Cumulative profit over time">
        <div className="rounded-lg border border-dark-200 bg-dark-50 p-6">
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
        </div>
      </Section>

      {/* Profit per Generation */}
      <Section title="Profit per Generation" subtitle="Performance evolution across generations">
        <div className="rounded-lg border border-dark-200 bg-dark-50 p-6">
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
        </div>
      </Section>

      {/* Agents List */}
      <Section
        title="Active Agents"
        subtitle="Performance summary of all agents"
        rightSlot={
          <button
            onClick={() => navigate('/agents')}
            className="text-sm font-medium text-emerald-500 hover:text-emerald-400"
          >
            View all →
          </button>
        }
      >
        <DataTable
          columns={agentColumns}
          data={mockAgents}
          rowKey="id"
          onRowClick={(agent) => navigate(`/agents/${agent.id}`)}
        />
      </Section>

      {/* Recent Transactions (Proof Layer) */}
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
        <DataTable
          columns={txColumns}
          data={mockTransactions.slice(0, 10)}
          rowKey="id"
        />
      </Section>
    </div>
  )
}
