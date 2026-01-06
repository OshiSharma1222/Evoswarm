import DataTable, { Column } from '../components/DataTable'
import Section from '../components/Section'
import StatusPill from '../components/StatusPill'
import { mockTransactions, Transaction } from '../lib/mockData'

export default function Transactions() {
  const columns: Column<Transaction>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (row) => (
        <span className="text-dark-700">
          {new Date(row.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'agentName',
      header: 'Agent',
      render: (row) => (
        <div>
          <div className="font-medium text-dark-900">{row.agentName}</div>
          <div className="text-xs text-dark-500 mt-0.5">{row.agentId}</div>
        </div>
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
      render: (row) => <span className="text-dark-700 font-medium">{row.symbol}</span>,
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
          {row.pnlRealized >= 0 ? '+' : ''}${row.pnlRealized.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusPill status={row.status === 'filled' ? 'ok' : row.status === 'pending' ? 'warn' : 'error'} text={row.status} />,
    },
    {
      key: 'txHash',
      header: 'Transaction Hash',
      render: (row) => (
        <span className="text-dark-500 font-mono text-sm">{row.txHash}</span>
      ),
    },
  ]

  const totalPnL = mockTransactions.reduce((sum, tx) => sum + tx.pnlRealized, 0)
  const filledCount = mockTransactions.filter(tx => tx.status === 'filled').length

  return (
    <div className="space-y-8">
      <Section
        title="Transaction History"
        subtitle={`${mockTransactions.length} total transactions • ${filledCount} filled • Total PnL: $${totalPnL.toFixed(2)}`}
      >
        <DataTable columns={columns} data={mockTransactions} rowKey="id" />
      </Section>
    </div>
  )
}
