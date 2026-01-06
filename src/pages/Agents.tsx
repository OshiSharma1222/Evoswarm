import { useNavigate } from 'react-router-dom'
import DataTable, { Column } from '../components/DataTable'
import Section from '../components/Section'
import StatusPill from '../components/StatusPill'
import { Agent, mockAgents } from '../lib/mockData'

export default function Agents() {
  const navigate = useNavigate()

  const columns: Column<Agent>[] = [
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

  return (
    <div className="space-y-8">
      <Section
        title="All Agents"
        subtitle={`${mockAgents.length} agents across ${Math.max(...mockAgents.map(a => a.generation))} generations`}
      >
        <DataTable
          columns={columns}
          data={mockAgents}
          rowKey="id"
          onRowClick={(agent) => navigate(`/agents/${agent.id}`)}
        />
      </Section>
    </div>
  )
}
