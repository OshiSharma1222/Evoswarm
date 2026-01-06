import clsx from 'clsx'

interface StatusPillProps {
  status: 'ok' | 'warn' | 'error' | 'running' | 'paused' | 'offline'
  text?: string
}

const statusStyles = {
  ok: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  running: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warn: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-400 border-red-500/20',
  offline: 'bg-dark-200 text-dark-500 border-dark-300',
}

const statusLabels = {
  ok: 'OK',
  running: 'Running',
  warn: 'Warning',
  paused: 'Paused',
  error: 'Error',
  offline: 'Offline',
}

export default function StatusPill({ status, text }: StatusPillProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {text || statusLabels[status]}
    </span>
  )
}
