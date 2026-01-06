import { ArrowLeft, Activity } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import DataTable, { Column } from '../components/DataTable'
import KpiCard from '../components/KpiCard'
import Section from '../components/Section'
import StatusPill from '../components/StatusPill'
import { fetchAgent, fetchAgentTransactions, pauseAgent, resumeAgent, type Agent, type Transaction } from '../lib/api'

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [agent, setAgent] = useState<Agent | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [agentData, txData] = await Promise.all([
          fetchAgent(id),
          fetchAgentTransactions(id)
        ])
        setAgent(agentData)
        setTransactions(txData)
      } catch (err) {
        console.error('Error loading agent:', err)
        setError(err instanceof Error ? err.message : 'Failed to load agent')
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
    const interval = setInterval(loadData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [id])

  if (loading && !agent) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-500">Loading agent...</p>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-500">{error || 'Agent not found'}</p>
        <button
          onClick={() => navigate('/agents')}
          className="mt-4 text-emerald-500 hover:text-emerald-400"
        >
          ← Back to Agents
        </button>
      </div>
    )
  }

  // Generate agent-specific PnL data from transactions
  const agentPnLData = transactions
    .slice(0, 30)
    .reverse()
    .map((tx, i) => ({
      date: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      profit: transactions.slice(0, i + 1).reduce((sum, t) => sum + t.pnl_realized, 0)
    }))

  const agentTransactions = transactions

  const txColumns: Column<Transaction>[] = [
    {
      key: 'created_at',
      header: 'Timestamp',
      render: (row) => (
        <span className="text-dark-700 text-sm">
          {new Date(row.created_at).toLocaleString()}
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
      key: 'pnl_realized',
      header: 'PnL',
      render: (row) => (
        <span className={`font-medium ${row.pnl_realized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          ${row.pnl_realized.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusPill status={row.status === 'filled' ? 'ok' : 'warn'} text={row.status} />,
    },
    {
      key: 'tx_hash',
      header: 'Tx Hash',
      render: (row) => (
        <span className="text-dark-500 text-sm font-mono">{row.tx_hash || 'N/A'}</span>
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
          label="Profit (Period)"
          value={`$${agent.profit_period.toFixed(2)}`}
          delta={agent.profit_period > 0 ? 15.2 : -8.3}
          deltaDirection={agent.profit_period > 0 ? 'up' : 'down'}
        />
        <KpiCard
          label="Total Profit"
          value={`$${agent.profit_all_time.toFixed(2)}`}
          helperText="All time"
        />
        <KpiCard
          label="Win Rate"
          value={`${(agent.win_rate_period * 100).toFixed(1)}%`}
          helperText={`${agent.trade_count_period} trades`}
        />
        <KpiCard
          label="Fitness Score"
          value={agent.fitness_score.toFixed(2)}
          helperText={`Gen ${agent.generation}`}
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
