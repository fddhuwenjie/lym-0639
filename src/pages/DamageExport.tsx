import { useState } from 'react'
import { FileDown, Plus, CheckCircle, AlertTriangle, Search, XCircle, Calendar } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { DAMAGE_STATUS_LABELS, RISK_LABELS, STATUS_LABELS } from '@/types'
import type { DamageStatus } from '@/types'
import { showToast } from '@/components/Toast'
import Modal from '@/components/Modal'

type TabKey = 'damage' | 'export'

export default function DamageExport() {
  const { devices, damageReports, exportHistories, createDamageReport, approveDamage, exportDamageReport, borrowRecords, disinfectRecords } = useStore()
  const [tab, setTab] = useState<TabKey>('damage')
  const [modalOpen, setModalOpen] = useState(false)
  const [deviceId, setDeviceId] = useState('')
  const [reporter, setReporter] = useState('')
  const [reason, setReason] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  const reportableDevices = devices.filter((d) => {
    if (d.status === 'damaged') return false
    const activeBorrow = borrowRecords.find(
      (b) => b.deviceId === d.id && ['pending', 'approved', 'checked_out'].includes(b.status)
    )
    if (activeBorrow) return false
    return true
  })

  const filteredReports = damageReports.filter((r) => {
    if (search) {
      const device = devices.find((d) => d.id === r.deviceId)
      const matchName = device?.name.includes(search)
      const matchSn = device?.serialNumber.includes(search)
      const matchReporter = r.reporter.includes(search)
      if (!matchName && !matchSn && !matchReporter) return false
    }
    return true
  })

  const handleSubmitDamage = () => {
    if (!deviceId || !reporter.trim() || !reason.trim()) {
      showToast('warning', '请填写完整信息')
      return
    }

    const device = devices.find((d) => d.id === deviceId)
    if (!device) {
      showToast('error', '设备不存在')
      return
    }

    if (device.status === 'damaged') {
      showToast('error', '该设备已报损，不可重复报损')
      return
    }

    const activeBorrow = borrowRecords.find(
      (b) => b.deviceId === deviceId && ['pending', 'approved', 'checked_out'].includes(b.status)
    )
    if (activeBorrow) {
      showToast('error', '设备正在借用中，无法报损')
      return
    }

    const result = createDamageReport({
      deviceId,
      reporter: reporter.trim(),
      reason: reason.trim(),
      reportDate: new Date().toISOString(),
    })

    if (result) {
      showToast('success', '报损申请已提交')
      setModalOpen(false)
      setDeviceId('')
      setReporter('')
      setReason('')
    } else {
      showToast('error', '提交失败，请检查设备状态')
    }
  }

  const handleApprove = (id: string) => {
    const result = approveDamage(id, '库管员')
    if (result) {
      showToast('success', '已审批通过，设备已标记为报损')
    } else {
      showToast('error', '审批失败')
    }
  }

  const handleExport = () => {
    const result = exportDamageReport({ dateFrom, dateTo })
    if (result) {
      showToast('success', `导出成功，共 ${result.recordCount} 条记录`)
    }
  }

  const getDeviceInfo = (deviceId: string) => devices.find((d) => d.id === deviceId)

  const getLastBorrower = (deviceId: string) => {
    const borrows = borrowRecords
      .filter((b) => b.deviceId === deviceId)
      .sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime())
    return borrows[0]?.borrowerName || '-'
  }

  const getLastDisinfectBatch = (deviceId: string) => {
    const disinfects = disinfectRecords
      .filter((d) => d.deviceId === deviceId && d.status === 'completed')
      .sort((a, b) => new Date(b.completionTime).getTime() - new Date(a.completionTime).getTime())
    return disinfects[0]?.batchNumber || '-'
  }

  const badgeClass = (status: DamageStatus) =>
    status === 'pending' ? 'med-badge med-badge-warning' : 'med-badge med-badge-danger'

  const stats = {
    total: damageReports.length,
    pending: damageReports.filter((r) => r.status === 'pending').length,
    approved: damageReports.filter((r) => r.status === 'approved').length,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--med-text)]">报损导出</h1>
          <p className="text-sm text-[var(--med-text-muted)] mt-1">管理设备报损申请和导出报损清单</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">报损总数</p>
          <p className="text-2xl font-bold text-[var(--med-text)] mt-1">{stats.total}</p>
        </div>
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">待审批</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
        </div>
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">已批准</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.approved}</p>
        </div>
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">已导出</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{exportHistories.length}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b" style={{ borderColor: 'var(--med-border)' }}>
        {(['damage', 'export'] as TabKey[]).map((key) => (
          <button
            key={key}
            className={`px-4 py-2 -mb-px border-b-2 font-medium transition-colors ${
              tab === key ? 'border-[var(--med-blue)] text-[var(--med-blue)]' : 'border-transparent text-gray-500'
            }`}
            onClick={() => setTab(key)}
          >
            {key === 'damage' ? '报损管理' : '导出记录'}
          </button>
        ))}
      </div>

      {tab === 'damage' && (
        <>
          <div className="flex justify-between items-center">
            <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="med-input pl-9"
                placeholder="搜索设备或报损人..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="med-btn med-btn-primary flex items-center gap-1" onClick={() => setModalOpen(true)}>
              <Plus size={16} /> 报损申请
            </button>
          </div>
          <div className="med-card overflow-x-auto">
            <table className="med-table w-full">
              <thead>
                <tr>
                  <th>设备名称</th>
                  <th>序列号</th>
                  <th>风险等级</th>
                  <th>报损人</th>
                  <th>报损原因</th>
                  <th>最后借用人</th>
                  <th>最后消毒批次</th>
                  <th>报损日期</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((r) => {
                  const device = getDeviceInfo(r.deviceId)
                  return (
                    <tr key={r.id} className={r.status === 'approved' ? 'bg-red-50/30' : ''}>
                      <td className="font-medium">{device?.name ?? '-'}</td>
                      <td className="font-mono text-xs">{device?.serialNumber ?? '-'}</td>
                      <td>
                        {device && (
                          <span className={`${
                            device.riskLevel === 'high' ? 'med-badge med-badge-danger' :
                            device.riskLevel === 'medium' ? 'med-badge med-badge-warning' :
                            'med-badge med-badge-success'
                          }`}>
                            {RISK_LABELS[device.riskLevel]}
                          </span>
                        )}
                      </td>
                      <td>{r.reporter}</td>
                      <td className="text-[var(--med-text-muted)] max-w-[180px] truncate" title={r.reason}>
                        {r.reason}
                      </td>
                      <td>{r.lastBorrower || getLastBorrower(r.deviceId)}</td>
                      <td className="font-mono text-xs">
                        {r.lastDisinfectBatch || getLastDisinfectBatch(r.deviceId)}
                      </td>
                      <td className="text-sm text-[var(--med-text-muted)]">
                        {r.reportDate ? new Date(r.reportDate).toLocaleDateString() : '-'}
                      </td>
                      <td>
                        <span className={badgeClass(r.status)}>
                          {DAMAGE_STATUS_LABELS[r.status]}
                        </span>
                      </td>
                      <td>
                        {r.status === 'pending' && (
                          <button className="med-btn med-btn-outline text-sm" onClick={() => handleApprove(r.id)}>
                            审批
                          </button>
                        )}
                        {r.status === 'approved' && (
                          <span className="text-xs text-red-500 flex items-center gap-1">
                            <XCircle size={14} /> 已报损
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-[var(--med-text-muted)]">
                      暂无报损记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'export' && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">导出记录</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                <input type="date" className="med-input w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="开始日期" />
                <span className="text-gray-400">至</span>
                <input type="date" className="med-input w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="结束日期" />
              </div>
              <button className="med-btn med-btn-primary flex items-center gap-1" onClick={handleExport}>
                <FileDown size={16} /> 导出报损清单
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-medium text-blue-800 flex items-center gap-2">
              <CheckCircle size={16} />
              导出内容说明
            </h3>
            <p className="text-sm text-blue-600 mt-2">
              导出的 CSV 文件包含：设备名称、序列号、借用人、消毒批次、报损原因、当前状态、报告人、报告日期
            </p>
          </div>

          <div className="med-card overflow-x-auto">
            <table className="med-table w-full">
              <thead>
                <tr><th>文件名</th><th>导出日期</th><th>记录数</th><th>筛选条件</th></tr>
              </thead>
              <tbody>
                {exportHistories.map((h) => (
                  <tr key={h.id}>
                    <td className="font-medium">{h.fileName}</td>
                    <td className="text-sm text-[var(--med-text-muted)]">
                      {new Date(h.exportDate).toLocaleString()}
                    </td>
                    <td>
                      <span className="med-badge med-badge-info">{h.recordCount} 条</span>
                    </td>
                    <td className="text-sm text-[var(--med-text-muted)]">
                      {h.filters && h.filters !== '{}' ? (() => {
                        try {
                          const f = JSON.parse(h.filters)
                          const parts = []
                          if (f.dateFrom) parts.push(`从 ${f.dateFrom}`)
                          if (f.dateTo) parts.push(`到 ${f.dateTo}`)
                          return parts.join(' ') || '全部'
                        } catch {
                          return '全部'
                        }
                      })() : '全部'}
                    </td>
                  </tr>
                ))}
                {exportHistories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-[var(--med-text-muted)]">
                      暂无导出记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="报损申请">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700">注意事项</p>
              <p className="text-xs text-amber-600 mt-1">
                只有可用状态且无借用中的设备可以报损。已报损设备不可再被借用。
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">选择设备 <span className="text-red-500">*</span></label>
            <select className="med-select w-full" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              <option value="">请选择设备</option>
              {reportableDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}（{d.serialNumber}）- {STATUS_LABELS[d.status]}
                </option>
              ))}
            </select>
            {reportableDevices.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">暂无可报损设备（所有设备都在借用中或已报损）</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">报损人 <span className="text-red-500">*</span></label>
            <input className="med-input w-full" value={reporter} onChange={(e) => setReporter(e.target.value)} placeholder="请输入报损人姓名" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">报损原因 <span className="text-red-500">*</span></label>
            <textarea className="med-input w-full" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请输入报损原因，如：设备损坏、老化故障等" />
          </div>
          <div className="flex justify-end gap-2">
            <button className="med-btn med-btn-ghost" onClick={() => setModalOpen(false)}>取消</button>
            <button className="med-btn med-btn-primary" onClick={handleSubmitDamage}>提交</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
