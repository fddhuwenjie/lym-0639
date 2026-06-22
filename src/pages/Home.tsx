import { useState } from 'react'
import { Plus, Search, Filter, Info, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { STATUS_LABELS, RISK_LABELS, DEPARTMENTS } from '@/types'
import type { Device, RiskLevel, DeviceStatus } from '@/types'
import { showToast } from '@/components/Toast'
import Modal from '@/components/Modal'

export default function Home() {
  const { devices, addDevice } = useStore()
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | 'all'>('all')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailDevice, setDetailDevice] = useState<Device | null>(null)

  const [name, setName] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('medium')
  const [disinfectRequirement, setDisinfectRequirement] = useState('')
  const [currentLocation, setCurrentLocation] = useState('')
  const [department, setDepartment] = useState(DEPARTMENTS[0])

  const filtered = devices.filter((d) => {
    if (search && !d.name.includes(search) && !d.serialNumber.includes(search)) return false
    if (riskFilter !== 'all' && d.riskLevel !== riskFilter) return false
    if (statusFilter !== 'all' && d.status !== statusFilter) return false
    if (deptFilter !== 'all' && d.department !== deptFilter) return false
    return true
  })

  const handleAddDevice = () => {
    if (!name.trim() || !serialNumber.trim()) {
      showToast('warning', '请填写设备名称和序列号')
      return
    }
    const exists = devices.some((d) => d.serialNumber === serialNumber.trim())
    if (exists) {
      showToast('error', '序列号已存在')
      return
    }
    addDevice({
      name: name.trim(),
      serialNumber: serialNumber.trim(),
      riskLevel,
      disinfectRequirement: disinfectRequirement.trim() || '常规消毒',
      currentLocation: currentLocation.trim() || department,
      department,
    })
    showToast('success', '设备已添加')
    setModalOpen(false)
    setName('')
    setSerialNumber('')
    setRiskLevel('medium')
    setDisinfectRequirement('')
    setCurrentLocation('')
    setDepartment(DEPARTMENTS[0])
  }

  const statusIcon = (status: DeviceStatus) => {
    switch (status) {
      case 'available': return <CheckCircle size={16} className="text-emerald-500" />
      case 'borrowed': return <Clock size={16} className="text-amber-500" />
      case 'disinfecting': return <Clock size={16} className="text-blue-500" />
      case 'pending_disinfect': return <AlertTriangle size={16} className="text-orange-500" />
      case 'damaged': return <XCircle size={16} className="text-red-500" />
    }
  }

  const statusBadgeClass = (status: DeviceStatus) => {
    switch (status) {
      case 'available': return 'med-badge med-badge-success'
      case 'borrowed': return 'med-badge med-badge-warning'
      case 'disinfecting': return 'med-badge med-badge-info'
      case 'pending_disinfect': return 'med-badge med-badge-warning'
      case 'damaged': return 'med-badge med-badge-danger'
    }
  }

  const riskBadgeClass = (risk: RiskLevel) => {
    switch (risk) {
      case 'high': return 'med-badge med-badge-danger'
      case 'medium': return 'med-badge med-badge-warning'
      case 'low': return 'med-badge med-badge-success'
    }
  }

  const statCounts = {
    total: devices.length,
    available: devices.filter((d) => d.status === 'available').length,
    borrowed: devices.filter((d) => d.status === 'borrowed').length,
    damaged: devices.filter((d) => d.status === 'damaged').length,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--med-text)]">器械台账</h1>
          <p className="text-sm text-[var(--med-text-muted)] mt-1">管理所有医疗器械的基础信息和当前状态</p>
        </div>
        <button className="med-btn med-btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> 新增设备
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">设备总数</p>
          <p className="text-2xl font-bold text-[var(--med-text)] mt-1">{statCounts.total}</p>
        </div>
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">可用</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{statCounts.available}</p>
        </div>
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">借出中</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{statCounts.borrowed}</p>
        </div>
        <div className="med-card p-4">
          <p className="text-sm text-[var(--med-text-muted)]">已报损</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{statCounts.damaged}</p>
        </div>
      </div>

      <div className="med-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="med-input pl-9"
              placeholder="搜索设备名称或序列号..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select className="med-select w-32" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as RiskLevel | 'all')}>
              <option value="all">全部风险</option>
              <option value="high">高风险</option>
              <option value="medium">中风险</option>
              <option value="low">低风险</option>
            </select>
            <select className="med-select w-32" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DeviceStatus | 'all')}>
              <option value="all">全部状态</option>
              <option value="available">可用</option>
              <option value="borrowed">借出</option>
              <option value="pending_disinfect">待消毒</option>
              <option value="disinfecting">消毒中</option>
              <option value="damaged">已报损</option>
            </select>
            <select className="med-select w-36" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="all">全部科室</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="med-card overflow-hidden">
        <table className="med-table w-full">
          <thead>
            <tr>
              <th>设备名称</th>
              <th>序列号</th>
              <th>风险等级</th>
              <th>所属科室</th>
              <th>当前位置</th>
              <th>状态</th>
              <th>消毒要求</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((device) => (
              <tr key={device.id} className="cursor-pointer" onClick={() => setDetailDevice(device)}>
                <td className="font-medium">{device.name}</td>
                <td className="font-mono text-xs">{device.serialNumber}</td>
                <td>
                  <span className={riskBadgeClass(device.riskLevel)}>
                    {RISK_LABELS[device.riskLevel]}
                  </span>
                </td>
                <td>{device.department}</td>
                <td className="text-[var(--med-text-muted)]">{device.currentLocation}</td>
                <td>
                  <span className={`${statusBadgeClass(device.status)} flex items-center gap-1.5`}>
                    {statusIcon(device.status)}
                    {STATUS_LABELS[device.status]}
                  </span>
                </td>
                <td className="text-[var(--med-text-muted)] text-xs max-w-[200px] truncate" title={device.disinfectRequirement}>
                  {device.disinfectRequirement}
                </td>
                <td>
                  <button
                    className="med-btn med-btn-ghost text-xs px-2 py-1"
                    onClick={(e) => { e.stopPropagation(); setDetailDevice(device) }}
                  >
                    <Info size={14} /> 详情
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[var(--med-text-muted)]">
                  暂无匹配的设备
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="新增设备">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">设备名称 <span className="text-red-500">*</span></label>
            <input className="med-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="如：手术电刀" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">序列号 <span className="text-red-500">*</span></label>
            <input className="med-input font-mono" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="如：SN-ED-001" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">风险等级</label>
              <select className="med-select" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}>
                <option value="high">高风险</option>
                <option value="medium">中风险</option>
                <option value="low">低风险</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">所属科室</label>
              <select className="med-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">消毒要求</label>
            <textarea className="med-input" rows={2} value={disinfectRequirement} onChange={(e) => setDisinfectRequirement(e.target.value)} placeholder="如：高温高压灭菌，121°C 30分钟" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">当前位置</label>
            <input className="med-input" value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)} placeholder="如：消毒供应中心" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="med-btn med-btn-ghost" onClick={() => setModalOpen(false)}>取消</button>
            <button className="med-btn med-btn-primary" onClick={handleAddDevice}>确认添加</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detailDevice} onClose={() => setDetailDevice(null)} title="设备详情" width="max-w-xl">
        {detailDevice && (
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{detailDevice.name}</h3>
                <p className="text-sm text-[var(--med-text-muted)] font-mono mt-0.5">{detailDevice.serialNumber}</p>
              </div>
              <span className={`${statusBadgeClass(detailDevice.status)} flex items-center gap-1.5`}>
                {statusIcon(detailDevice.status)}
                {STATUS_LABELS[detailDevice.status]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="med-card p-3">
                <p className="text-xs text-[var(--med-text-muted)]">风险等级</p>
                <p className="mt-1">
                  <span className={riskBadgeClass(detailDevice.riskLevel)}>
                    {RISK_LABELS[detailDevice.riskLevel]}
                  </span>
                </p>
              </div>
              <div className="med-card p-3">
                <p className="text-xs text-[var(--med-text-muted)]">所属科室</p>
                <p className="mt-1 font-medium">{detailDevice.department}</p>
              </div>
              <div className="med-card p-3">
                <p className="text-xs text-[var(--med-text-muted)]">当前位置</p>
                <p className="mt-1 font-medium">{detailDevice.currentLocation}</p>
              </div>
              <div className="med-card p-3">
                <p className="text-xs text-[var(--med-text-muted)]">入库日期</p>
                <p className="mt-1 font-medium">{new Date(detailDevice.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="med-card p-4">
              <p className="text-xs text-[var(--med-text-muted)] mb-2">消毒要求</p>
              <p className="text-sm">{detailDevice.disinfectRequirement}</p>
            </div>

            {detailDevice.riskLevel === 'high' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">高风险器械注意事项</p>
                  <p className="text-xs text-red-600 mt-1">该器械每次使用前必须完成消毒流程，无消毒记录不可借出</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
