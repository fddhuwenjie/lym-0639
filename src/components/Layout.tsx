import { useMemo } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Database, ClipboardList, Droplets, FileWarning, AlertTriangle } from 'lucide-react'
import { useStore } from '@/store/useStore'

const navItems = [
  { to: '/', label: '器械台账', icon: Database },
  { to: '/borrow', label: '借用看板', icon: ClipboardList },
  { to: '/disinfect', label: '消毒队列', icon: Droplets },
  { to: '/damage', label: '报损导出', icon: FileWarning },
]

export default function Layout() {
  const borrowRecords = useStore((s) => s.borrowRecords)
  const overdueBorrows = useMemo(
    () =>
      borrowRecords.filter(
        (b) => b.status === 'checked_out' && new Date(b.expectedReturnDate) < new Date()
      ),
    [borrowRecords]
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 bg-[var(--med-blue)] text-white flex flex-col shrink-0">
        <div className="px-5 py-6 border-b border-white/10">
          <h1 className="text-lg font-bold tracking-tight">器械追踪系统</h1>
          <p className="text-xs text-blue-200 mt-1">借用 · 消毒 · 报损</p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-[10px] text-blue-300">v1.0.0 · 医疗器械管理</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {overdueBorrows.length > 0 && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-3 animate-slide-in">
            <AlertTriangle size={18} className="text-red-500 shrink-0" />
            <span className="text-sm text-red-700 font-medium">
              逾期未归还提醒：{overdueBorrows.length} 件设备已超过预计归还日期
            </span>
            <span className="text-xs text-red-500 ml-auto">
              最近逾期：{overdueBorrows[0] && new Date(overdueBorrows[0].expectedReturnDate).toLocaleDateString()}
            </span>
          </div>
        )}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
