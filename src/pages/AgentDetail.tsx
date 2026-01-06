import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DataTable, { Column } from '../components/DataTable'
import KpiCard from '../components/KpiCard'
import Section from '../components/Section'
import StatusPill from '../components/StatusPill'
import { generatePnLTimeSeries, mockAgents, mockTransactions, Transaction } from '../lib/mockData'

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const agent = mockAgents.find((a) => a.id === id)

  if (!agent) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-500">Agent not found</p>
        <button
          onClick={() => navigate('/agents')}
          className="mt-4 text-emerald-500 hover:text-emerald-400"
        >
          ← Back to Agents
        </button>
      </div>
    )
  }

  // Generate agent-specific PnL data
  const agentPnLData = generatePnLTimeSeries(30).map((p) => ({
    date: new Date(p.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    profit: p.v * 0.25, // Scale down for single agent
  }))

  // Filter transactions for this agent
  const agentTransactions = mockTransactions.filter((tx) => tx.agentId === agent.id)

  const txColumns: Column<Transaction>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (row) => (
        <span className="text-dark-700 text-sm">
          {new Date(row.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className={`font-medium ${row.type === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
          {row.type.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'symbol',
      header: 'Symbol',
      render: (row) => <span className="text-dark-700">{row.symbol}</span>,
    },
    {
      key: 'qty',
      header: 'Quantity',
      render: (row) => <span className="text-dark-700">{row.qty.toFixed(4)}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      render: (row) => <span className="text-dark-700">${row.price.toFixed(2)}</span>,
    },
    {
      key: 'fee',
      header: 'Fee',
      render: (row) => <span className="text-dark-500">${row.fee.toFixed(2)}</span>,
    },
    {
      key: 'pnlRealized',
      header: 'PnL',
      render: (row) => (
        <span className={`font-medium ${row.pnlRealized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          ${row.pnlRealized.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusPill status={row.status === 'filled' ? 'ok' : 'warn'} text={row.status} />,
    },
    {
      key: 'txHash',
      header: 'Tx Hash',
      render: (row) => (
        <span className="text-dark-500 text-sm font-mono">{row.txHash}</span>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/agents')}
          className="mb-4 flex items-center gap-2 text-sm text-dark-500 hover:text-dark-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-dark-900">{agent.name}</h1>
            <p className="mt-1 text-sm text-dark-500">Agent ID: {agent.id}</p>
          </div>
          <StatusPill status={agent.status} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Profit (7D)"
          value={`$${agent.profitPeriod.toFixed(2)}`}
          delta={agent.profitPeriod > 0 ? 15.2 : -8.3}
          deltaDirection={agent.profitPeriod > 0 ? 'up' : 'down'}
        />
        <KpiCard
          label="Total Profit"
          value={`$${agent.profitAllTime.toFixed(2)}`}
          helperText="All time"
        />
        <KpiCard
          label="Win Rate"
          value={`${(agent.winRatePeriod * 100).toFixed(1)}%`}
          helperText={`${agent.tradeCountPeriod} trades`}
        />
        <KpiCard
          label="Generation"
          value={`#${agent.generation}`}
          helperText={`Last active: ${new Date(agent.lastHeartbeatAt).toLocaleTimeString()}`}
        />
      </div>

      {/* PnL Chart */}
      <Section title="Profit Over Time" subtitle="Agent-specific performance">
        <div className="rounded-lg border border-dark-200 bg-dark-50 p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={agentPnLData}>
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

      {/* Transactions */}
      <Section title="Transaction History" subtitle={`${agentTransactions.length} transactions`}>
        {agentTransactions.length > 0 ? (
          <DataTable columns={txColumns} data={agentTransactions} rowKey="id" />
        ) : (
          <div className="rounded-lg border border-dark-200 bg-dark-50 p-12 text-center">
            <p className="text-dark-500">No transactions yet</p>
          </div>
        )}
      </Section>
    </div>
  )
}
