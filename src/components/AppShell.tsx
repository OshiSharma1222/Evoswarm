import { Activity, BarChart3, FileText, List } from 'lucide-react'
import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface AppShellProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
  { name: 'Agents', path: '/agents', icon: Activity },
  { name: 'Transactions', path: '/tx', icon: FileText },
]

export default function AppShell({ children }: AppShellProps) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#09090b] text-dark-700">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-dark-200 bg-dark-50/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <List className="h-6 w-6 text-emerald-500" />
                <span className="text-xl font-bold text-dark-900">EvoSwarm</span>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path || 
                    (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-dark-200 text-dark-900'
                          : 'text-dark-500 hover:text-dark-700 hover:bg-dark-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-400 hidden sm:inline">Single User</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
