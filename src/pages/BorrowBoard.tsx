import { useState } from 'react'
import { Plus, Search, Clock, CheckCircle, ArrowRight, AlertTriangle, Calendar, User, Building } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { BORROW_STATUS_LABELS, DEPARTMENTS, RISK_LABELS } from '@/types'
import type { BorrowStatus } from '@/types'
import { showToast } from '@/components/Toast'
import Modal from '@/components/Modal'

type TabKey = 'all' | 'pending' | 'approved' | 'checked_out' | 'returned'

export default function BorrowBoard() {
  const { devices, borrowRecords, createBorrowRequest, approveBorrow, checkoutBorrow, returnBorrow, validateBorrow, getOverdueBorrows } = useStore()
  const [tab, setTab] = useState<TabKey>('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [selectedRecordId, setSelectedRecordId] = useState('')
  const [returnDepartment, setReturnDepartment] = useState('')

  const [deviceId, setDeviceId] = useState('')
  const [borrowerDepartment, setBorrowerDepartment] = useState(DEPARTMENTS[0])
  const [borrowerName, setBorrowerName] = useState('')
  const [reason, setReason] = useState('')
  const [expectedReturnDate, setExpectedReturnDate] = useState('')

  const overdueBorrows = getOverdueBorrows()

  const filtered = borrowRecords.filter((r) => {
    if (tab !== 'all' && r.status !== tab) return false
    if (search) {
      const device = devices.find((d) => d.id === r.deviceId)
      const matchName = device?.name.includes(search)
      const matchSn = device?.serialNumber.includes(search)
      const matchBorrower = r.borrowerName.includes(search)
      if (!matchName && !matchSn && !matchBorrower) return false
    }
    return true
  })

  const availableDevices = devices.filter((d) => d.status === 'available')

  const handleSubmitBorrow = () => {
    if (!deviceId || !borrowerName.trim() || !reason.trim() || !expectedReturnDate) {
      showToast('warning', '请填写完整信息')
      return
    }

    const errors = validateBorrow(deviceId)
    if (errors.length > 0) {
      showToast('error', errors[0].message)
      return
    }

    const result = createBorrowRequest({
      deviceId,
      borrowerDepartment,
      borrowerName: borrowerName.trim(),
      reason: reason.trim(),
      borrowDate: new Date().toISOString(),
      expectedReturnDate: new Date(expectedReturnDate).toISOString(),
    })

    if (result) {
      showToast('success', '借用申请已提交')
      setModalOpen(false)
      setDeviceId('')
      setBorrowerDepartment(DEPARTMENTS[0])
      setBorrowerName('')
      setReason('')
      setExpectedReturnDate('')
    }
  }

  const handleApprove = (id: string) => {
    const result = approveBorrow(id, '库管员')
    if (result) {
      showToast('success', '审批通过')
    } else {
      showToast('error', '审批失败，设备可能不可用')
    }
  }

  const handleCheckout = (id: string) => {
    const result = checkoutBorrow(id, '库管员')
    if (result) {
      showToast('success', '设备已出库')
    }
  }

  const handleOpenReturn = (id: string) => {
    setSelectedRecordId(id)
    setReturnDepartment('')
    setReturnModalOpen(true)
  }

  const handleConfirmReturn = () => {
    if (!returnDepartment.trim()) {
      showToast('warning', '请填写归还科室')
      return
    }
    const errors = returnBorrow(selectedRecordId, returnDepartment.trim())
    if (errors && errors.length > 0) {
      showToast('error', errors[0].message)
      return
    }
    showToast('success', '设备已归还，进入消毒流程')
    setReturnModalOpen(false)
  }

  const statusBadgeClass = (status: BorrowStatus) => {
    switch (status) {
      case 'pending': return 'med-badge med-badge-warning'
      case 'approved': return 'med-badge med-badge-info'
      case 'checked_out': return 'med-badge med-badge-warning'
      case 'returned': return 'med-badge med-badge-success'
    }
  }

  const isOverdue = (record: typeof borrowRecords[0]) => {
    return record.status === 'checked_out' && new Date(record.expectedReturnDate) < new Date()
  }

  const stats = {
    total: borrowRecords.length,
    pending: borrowRecords.filter((r) => r.status === 'pending').length,
    checkedOut: borrowRecords.filter((r) => r.status === 'checked_out').length,
    overdue: overdueBorrows.length,
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待审批' },
    { key: 'approved', label: '待出库' },
    { key: 'checked_out', label: '借出中' },
    { key: 'returned', label: '已归还' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--med-text)]">借用看板</h1>
          <p className="text-sm text-[var(--med-text-muted)] mt-1">管理设备借用申请、审批、出库与归还全流程</p>
        </div>
        <button className="med-btn med-btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> 申请借用
        </button>
      </div>

      {overdueBorrows.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-red-800">逾期未归还提醒</p>
            <p className="text-sm text-red-600 mt-1">共有 {overdueBorrows.length} 件设备已超过预计归还日期，请及时催促归还</p>
          </div>
          <button className="med-btn med-btn-danger text-sm" onClick={() => setTab('checked_out')}>
            查看详情
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">申请总数</p>
          <p className="text-2xl font-bold text-[var(--med-text)] mt-1">{stats.total}</p>
        </div>
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">待审批</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
        </div>
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">借出中</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.checkedOut}</p>
        </div>
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">已逾期</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.overdue}</p>
        </div>
      </div>

      <div className="med-card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--med-border)]">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  tab === t.key
                    ? 'bg-[var(--med-blue)] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="med-input pl-9"
              placeholder="搜索设备或借用人..."
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
                <th>借用科室</th>
                <th>借用人</th>
                <th>借用原因</th>
                <th>借出日期</th>
                <th>预计归还</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((record) => {
                const device = devices.find((d) => d.id === record.deviceId)
                const overdue = isOverdue(record)
                return (
                  <tr key={record.id} className={overdue ? 'bg-red-50/50' : ''}>
                    <td>
                      <div>
                        <p className="font-medium">{device?.name || '-'}</p>
                        <p className="text-xs text-[var(--med-text-muted)] font-mono">{device?.serialNumber || '-'}</p>
                        {device && (
                          <span className={`text-xs mt-1 inline-block ${
                            device.riskLevel === 'high' ? 'text-red-600' :
                            device.riskLevel === 'medium' ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            {RISK_LABELS[device.riskLevel]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <Building size={14} className="text-gray-400" />
                        <span>{record.borrowerDepartment}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <User size={14} className="text-gray-400" />
                        <span>{record.borrowerName}</span>
                      </div>
                    </td>
                    <td className="text-[var(--med-text-muted)] max-w-[180px] truncate" title={record.reason}>
                      {record.reason}
                    </td>
                    <td className="text-sm text-[var(--med-text-muted)]">
                      {record.borrowDate ? new Date(record.borrowDate).toLocaleDateString() : '-'}
                    </td>
                    <td>
                      <div className={`flex items-center gap-1.5 ${overdue ? 'text-red-600 font-medium' : 'text-[var(--med-text-muted)]'}`}>
                        <Calendar size={14} />
                        <span>{new Date(record.expectedReturnDate).toLocaleDateString()}</span>
                        {overdue && <span className="text-xs">(逾期)</span>}
                      </div>
                    </td>
                    <td>
                      <span className={statusBadgeClass(record.status)}>
                        {BORROW_STATUS_LABELS[record.status]}
                      </span>
                    </td>
                    <td>
                      {record.status === 'pending' && (
                        <button className="med-btn med-btn-outline text-sm" onClick={() => handleApprove(record.id)}>
                          审批
                        </button>
                      )}
                      {record.status === 'approved' && (
                        <button className="med-btn med-btn-primary text-sm" onClick={() => handleCheckout(record.id)}>
                          确认出库
                        </button>
                      )}
                      {record.status === 'checked_out' && (
                        <button className="med-btn med-btn-success text-sm" onClick={() => handleOpenReturn(record.id)}>
                          归还
                        </button>
                      )}
                      {record.status === 'returned' && (
                        <span className="text-xs text-[var(--med-text-muted)]">已完成</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[var(--med-text-muted)]">
                    暂无借用记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="med-card p-4">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Clock size={16} className="text-[var(--med-blue)]" />
          借用流程
        </h3>
        <div className="flex items-center justify-between px-4">
          {['申请借用', '科室审批', '库管出库', '使用归还', '消毒检查', '复用/报损'].map((step, idx) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  idx === 0 ? 'bg-[var(--med-blue)] text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {idx + 1}
                </div>
                <span className="text-xs mt-2 text-[var(--med-text-muted)]">{step}</span>
              </div>
              {idx < 5 && <ArrowRight size={16} className="mx-2 text-gray-300" />}
            </div>
          ))}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="申请借用">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">选择设备 <span className="text-red-500">*</span></label>
            <select className="med-select" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              <option value="">请选择设备</option>
              {availableDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}（{d.serialNumber}）- {RISK_LABELS[d.riskLevel]}
                </option>
              ))}
            </select>
            {availableDevices.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">当前没有可用设备，请先完成消毒或新增设备</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">借用科室 <span className="text-red-500">*</span></label>
              <select className="med-select" value={borrowerDepartment} onChange={(e) => setBorrowerDepartment(e.target.value)}>
                {DEPARTMENTS.filter((d) => d !== '消毒供应中心').map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">借用人 <span className="text-red-500">*</span></label>
              <input className="med-input" value={borrowerName} onChange={(e) => setBorrowerName(e.target.value)} placeholder="请输入姓名" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">预计归还日期 <span className="text-red-500">*</span></label>
            <input type="date" className="med-input" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">借用原因 <span className="text-red-500">*</span></label>
            <textarea className="med-input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请输入借用原因" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="med-btn med-btn-ghost" onClick={() => setModalOpen(false)}>取消</button>
            <button className="med-btn med-btn-primary" onClick={handleSubmitBorrow}>提交申请</button>
          </div>
        </div>
      </Modal>

      <Modal open={returnModalOpen} onClose={() => setReturnModalOpen(false)} title="设备归还">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <CheckCircle size={16} className="inline mr-2" />
              设备归还后将自动进入消毒检查流程
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">归还科室 <span className="text-red-500">*</span></label>
            <select className="med-select" value={returnDepartment} onChange={(e) => setReturnDepartment(e.target.value)}>
              <option value="">请选择归还科室</option>
              {DEPARTMENTS.filter((d) => d !== '消毒供应中心').map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <p className="text-xs text-[var(--med-text-muted)] mt-1">
              注意：归还科室必须与借出科室一致，否则将被拦截
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="med-btn med-btn-ghost" onClick={() => setReturnModalOpen(false)}>取消</button>
            <button className="med-btn med-btn-primary" onClick={handleConfirmReturn}>确认归还</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
