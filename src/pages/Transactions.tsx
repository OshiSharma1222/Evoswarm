import { useEffect, useState } from 'react'
import DataTable, { Column } from '../components/DataTable'
import Section from '../components/Section'
import StatusPill from '../components/StatusPill'
import { fetchTransactions, Transaction } from '../lib/api'

interface UITransaction {
  id: string
  timestamp: string
  agentId: string
  agentName: string
  type: 'buy' | 'sell' | 'swap'
  symbol: string
  qty: number
  price: number
  fee: number
  pnlRealized: number
  status: 'filled' | 'pending' | 'failed'
  txHash: string
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<UITransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTransactions() {
      try {
        const data = await fetchTransactions(100)
        setTransactions(
          data.map((t: Transaction) => ({
            id: t.id,
            timestamp: t.created_at,
            agentId: t.agent_id,
            agentName: `Agent ${t.agent_id.slice(0, 6)}`,
            type: t.type,
            symbol: t.symbol || 'ETH/USDC',
            qty: t.qty || 0,
            price: t.price || 0,
            fee: t.fee || 0,
            pnlRealized: t.pnl_realized || 0,
            status: t.status,
            txHash: t.tx_hash || 'pending...',
          }))
        )
      } catch (err) {
        console.error('Failed to load transactions:', err)
      } finally {
        setLoading(false)
      }
    }
    loadTransactions()
    const interval = setInterval(loadTransactions, 15000)
    return () => clearInterval(interval)
  }, [])

  const columns: Column<UITransaction>[] = [
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

  const totalPnL = transactions.reduce((sum, tx) => sum + tx.pnlRealized, 0)
  const filledCount = transactions.filter(tx => tx.status === 'filled').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark-500">Loading transactions...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Section
        title="Transaction History"
        subtitle={`${transactions.length} total transactions • ${filledCount} filled • Total PnL: $${totalPnL.toFixed(2)}`}
      >
        {transactions.length > 0 ? (
          <DataTable columns={columns} data={transactions} rowKey="id" />
        ) : (
          <div className="text-center py-8 text-dark-500">No transactions yet</div>
        )}
      </Section>
    </div>
  )
}
