import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DataTable, { Column } from '../components/DataTable'
import Section from '../components/Section'
import StatusPill from '../components/StatusPill'
import { Agent, fetchAgents } from '../lib/api'

interface UIAgent {
  id: string
  name: string
  status: 'running' | 'paused' | 'error' | 'offline'
  profitAllTime: number
  profitPeriod: number
  tradeCountPeriod: number
  winRatePeriod: number
  generation: number
  lastHeartbeatAt: string
}

export default function Agents() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<UIAgent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAgents() {
      try {
        const data = await fetchAgents()
        setAgents(
          data.map((a: Agent) => ({
            id: a.id,
            name: a.name,
            status: a.status === 'eliminated' ? 'offline' : a.status,
            profitAllTime: a.profit_all_time || 0,
            profitPeriod: a.profit_period || 0,
            tradeCountPeriod: a.trade_count_period || 0,
            winRatePeriod: a.win_rate_period || 0,
            generation: a.generation_index || 1,
            lastHeartbeatAt: a.last_active_at || a.created_at,
          }))
        )
      } catch (err) {
        console.error('Failed to load agents:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAgents()
    const interval = setInterval(loadAgents, 30000)
    return () => clearInterval(interval)
  }, [])

  const columns: Column<UIAgent>[] = [
    {
      key: 'name',
      header: 'Agent',
      render: (row) => (
        <div>
          <div className="font-medium text-dark-900">{row.name}</div>
          <div className="text-xs text-dark-500 mt-0.5">{row.id}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: 'generation',
      header: 'Generation',
      render: (row) => <span className="text-dark-700">Gen #{row.generation}</span>,
    },
    {
      key: 'profitPeriod',
      header: 'Profit (7D)',
      render: (row) => (
        <span className={row.profitPeriod >= 0 ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
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
      header: 'Trades (7D)',
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
      key: 'lastHeartbeatAt',
      header: 'Last Active',
      render: (row) => (
        <span className="text-dark-500 text-sm">
          {new Date(row.lastHeartbeatAt).toLocaleString()}
        </span>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark-500">Loading agents...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Section
        title="All Agents"
        subtitle={`${agents.length} agents across ${Math.max(...agents.map(a => a.generation), 1)} generations`}
      >
        {agents.length > 0 ? (
          <DataTable
            columns={columns}
            data={agents}
            rowKey="id"
            onRowClick={(agent) => navigate(`/agents/${agent.id}`)}
          />
        ) : (
          <div className="text-center py-8 text-dark-500">No agents found</div>
        )}
      </Section>
    </div>
  )
}
