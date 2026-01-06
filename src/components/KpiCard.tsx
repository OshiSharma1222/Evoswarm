import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

interface KpiCardProps {
  label: string
  value: string | number
  delta?: number
  deltaDirection?: 'up' | 'down' | 'flat'
  helperText?: string
  sparkline?: number[]
}

export default function KpiCard({
  label,
  value,
  delta,
  deltaDirection = 'flat',
  helperText,
}: KpiCardProps) {
  const deltaColor =
    deltaDirection === 'up'
      ? 'text-emerald-400'
      : deltaDirection === 'down'
      ? 'text-red-400'
      : 'text-dark-500'

  const DeltaIcon =
    deltaDirection === 'up'
      ? TrendingUp
      : deltaDirection === 'down'
      ? TrendingDown
      : Minus

  return (
    <div className="rounded-lg border border-dark-200 bg-dark-50 p-6">
      <div className="text-sm font-medium text-dark-500">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-bold text-dark-900">{value}</div>
        {delta !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${deltaColor}`}>
            <DeltaIcon className="h-4 w-4" />
            {delta > 0 ? '+' : ''}
            {delta.toFixed(2)}%
          </div>
        )}
      </div>
      {helperText && <div className="mt-1 text-xs text-dark-400">{helperText}</div>}
    </div>
  )
}
