import { useState } from 'react'
import { Droplets, Play, CheckCircle, Clock, AlertTriangle, Search, User, Hash, ThermometerSun } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { DISINFECT_STATUS_LABELS, RISK_LABELS } from '@/types'
import type { DisinfectStatus } from '@/types'
import { showToast } from '@/components/Toast'
import Modal from '@/components/Modal'

type TabKey = 'pending' | 'in_progress' | 'completed'

export default function DisinfectQueue() {
  const { devices, disinfectRecords, borrowRecords, startDisinfect, completeDisinfect } = useStore()
  const [tab, setTab] = useState<TabKey>('pending')
  const [search, setSearch] = useState('')
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [selectedRecordId, setSelectedRecordId] = useState('')

  const [method, setMethod] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [responsiblePerson, setResponsiblePerson] = useState('')

  const filtered = disinfectRecords.filter((r) => {
    if (r.status !== tab) return false
    if (search) {
      const device = devices.find((d) => d.id === r.deviceId)
      const matchName = device?.name.includes(search)
      const matchSn = device?.serialNumber.includes(search)
      const matchBatch = r.batchNumber.includes(search)
      if (!matchName && !matchSn && !matchBatch) return false
    }
    return true
  }).sort((a, b) => {
    const dateA = a.startTime || a.completionTime || ''
    const dateB = b.startTime || b.completionTime || ''
    return new Date(dateB).getTime() - new Date(dateA).getTime()
  })

  const handleStartDisinfect = (id: string) => {
    const result = startDisinfect(id)
    if (result) {
      showToast('success', '已开始消毒')
    }
  }

  const handleOpenComplete = (id: string) => {
    setSelectedRecordId(id)
    setMethod('')
    const record = disinfectRecords.find((r) => r.id === id)
    const device = record ? devices.find((d) => d.id === record.deviceId) : null
    setMethod(device?.disinfectRequirement || '')
    setBatchNumber('')
    setResponsiblePerson('')
    setCompleteModalOpen(true)
  }

  const handleCompleteDisinfect = () => {
    if (!method.trim() || !batchNumber.trim() || !responsiblePerson.trim()) {
      showToast('warning', '请填写完整信息')
      return
    }

    const errors = completeDisinfect(selectedRecordId, {
      method: method.trim(),
      batchNumber: batchNumber.trim(),
      responsiblePerson: responsiblePerson.trim(),
    })

    if (errors && errors.length > 0) {
      showToast('error', errors[0].message)
      return
    }

    showToast('success', '消毒完成，设备已可复用')
    setCompleteModalOpen(false)
  }

  const statusBadgeClass = (status: DisinfectStatus) => {
    switch (status) {
      case 'pending': return 'med-badge med-badge-warning'
      case 'in_progress': return 'med-badge med-badge-info'
      case 'completed': return 'med-badge med-badge-success'
    }
  }

  const stats = {
    pending: disinfectRecords.filter((r) => r.status === 'pending').length,
    inProgress: disinfectRecords.filter((r) => r.status === 'in_progress').length,
    completed: disinfectRecords.filter((r) => r.status === 'completed').length,
    highRisk: disinfectRecords.filter((r) => {
      const device = devices.find((d) => d.id === r.deviceId)
      return r.status !== 'completed' && device?.riskLevel === 'high'
    }).length,
  }

  const tabs: { key: TabKey; label: string; icon: typeof Clock }[] = [
    { key: 'pending', label: '待消毒', icon: Clock },
    { key: 'in_progress', label: '消毒中', icon: Droplets },
    { key: 'completed', label: '已完成', icon: CheckCircle },
  ]

  const getBorrowInfo = (borrowRecordId: string) => {
    const borrow = borrowRecords.find((b) => b.id === borrowRecordId)
    return borrow
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--med-text)]">消毒队列</h1>
          <p className="text-sm text-[var(--med-text-muted)] mt-1">管理设备归还后的消毒检查流程</p>
        </div>
      </div>

      {stats.highRisk > 0 && tab !== 'completed' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">高风险器械待消毒提醒</p>
            <p className="text-sm text-red-600 mt-1">共有 {stats.highRisk} 件高风险器械等待消毒，请优先处理</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">待消毒</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
        </div>
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">消毒中</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
        </div>
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">已完成</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
        </div>
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">高风险待处理</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.highRisk}</p>
        </div>
      </div>

      <div className="med-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--med-border)]">
          <div className="flex gap-1">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  tab === key
                    ? 'bg-[var(--med-blue)] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setTab(key)}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="med-input pl-9"
              placeholder="搜索设备或批次号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="med-table w-full">
            <thead>
              <tr>
                <th>设备信息</th>
                <th>风险等级</th>
                <th>消毒方式</th>
                <th>批次号</th>
                <th>责任人</th>
                <th>开始时间</th>
                <th>完成时间</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => {
                const device = devices.find((d) => d.id === record.deviceId)
                const borrow = getBorrowInfo(record.borrowRecordId)
                return (
                  <tr key={record.id}>
                    <td>
                      <div>
                        <p className="font-medium">{device?.name || '-'}</p>
                        <p className="text-xs text-[var(--med-text-muted)] font-mono">{device?.serialNumber || '-'}</p>
                        {borrow && (
                          <p className="text-xs text-[var(--med-text-muted)] mt-0.5">
                            来自 {borrow.borrowerDepartment} · {borrow.borrowerName}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`${
                        device?.riskLevel === 'high' ? 'med-badge med-badge-danger' :
                        device?.riskLevel === 'medium' ? 'med-badge med-badge-warning' :
                        'med-badge med-badge-success'
                      }`}>
                        {device ? RISK_LABELS[device.riskLevel] : '-'}
                      </span>
                    </td>
                    <td className="text-sm text-[var(--med-text-muted)] max-w-[200px] truncate" title={record.method || device?.disinfectRequirement}>
                      {record.method || device?.disinfectRequirement || '-'}
                    </td>
                    <td>
                      {record.batchNumber ? (
                        <span className="font-mono text-sm flex items-center gap-1">
                          <Hash size={12} className="text-gray-400" />
                          {record.batchNumber}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td>
                      {record.responsiblePerson ? (
                        <span className="flex items-center gap-1 text-sm">
                          <User size={14} className="text-gray-400" />
                          {record.responsiblePerson}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">未指派</span>
                      )}
                    </td>
                    <td className="text-sm text-[var(--med-text-muted)]">
                      {record.startTime ? new Date(record.startTime).toLocaleString() : '-'}
                    </td>
                    <td className="text-sm text-[var(--med-text-muted)]">
                      {record.completionTime ? new Date(record.completionTime).toLocaleString() : '-'}
                    </td>
                    <td>
                      <span className={statusBadgeClass(record.status)}>
                        {DISINFECT_STATUS_LABELS[record.status]}
                      </span>
                    </td>
                    <td>
                      {record.status === 'pending' && (
                        <button
                          className="med-btn med-btn-primary text-sm"
                          onClick={() => handleStartDisinfect(record.id)}
                        >
                          <Play size={14} /> 开始消毒
                        </button>
                      )}
                      {record.status === 'in_progress' && (
                        <button
                          className="med-btn med-btn-success text-sm"
                          onClick={() => handleOpenComplete(record.id)}
                        >
                          <CheckCircle size={14} /> 完成消毒
                        </button>
                      )}
                      {record.status === 'completed' && (
                        <span className="text-xs text-emerald-600">✓ 已完成</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-[var(--med-text-muted)]">
                    <ThermometerSun size={32} className="mx-auto mb-2 text-gray-300" />
                    {tab === 'pending' ? '暂无待消毒设备' : tab === 'in_progress' ? '暂无进行中的消毒任务' : '暂无已完成的消毒记录'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="med-card p-4">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          消毒注意事项
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm text-[var(--med-text-muted)]">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-medium shrink-0">1</span>
            <p>高风险器械必须严格按照消毒要求执行，记录批次号和责任人</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-medium shrink-0">2</span>
            <p>消毒完成后设备自动变为可用状态，可进入下一次借用流程</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium shrink-0">3</span>
            <p>缺少责任人的消毒记录无法完成，必须填写完整信息</p>
          </div>
        </div>
      </div>

      <Modal open={completeModalOpen} onClose={() => setCompleteModalOpen(false)} title="完成消毒">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">消毒方式 <span className="text-red-500">*</span></label>
            <textarea className="med-input" rows={2} value={method} onChange={(e) => setMethod(e.target.value)} placeholder="请输入消毒方式" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">消毒批次号 <span className="text-red-500">*</span></label>
              <input className="med-input font-mono" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="如：BATCH-20240101-001" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">责任人 <span className="text-red-500">*</span></label>
              <input className="med-input" value={responsiblePerson} onChange={(e) => setResponsiblePerson(e.target.value)} placeholder="请输入责任人姓名" />
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-700 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              完成消毒后，设备状态将变为「可用」，可重新被借用。请确保消毒质量符合要求。
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="med-btn med-btn-ghost" onClick={() => setCompleteModalOpen(false)}>取消</button>
            <button className="med-btn med-btn-primary" onClick={handleCompleteDisinfect}>确认完成</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
