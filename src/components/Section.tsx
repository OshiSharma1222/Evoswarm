import { ReactNode } from 'react'

interface SectionProps {
  title: string
  subtitle?: string
  rightSlot?: ReactNode
  children: ReactNode
}

export default function Section({ title, subtitle, rightSlot, children }: SectionProps) {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-dark-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-dark-500">{subtitle}</p>}
        </div>
        {rightSlot && <div>{rightSlot}</div>}
      </div>
      {children}
    </section>
  )
}
