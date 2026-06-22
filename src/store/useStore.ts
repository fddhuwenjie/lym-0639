import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Device, BorrowRecord, DisinfectRecord, DamageReport, ExportHistory,
  DeviceStatus, BorrowStatus, DisinfectStatus, DamageStatus,
} from '@/types'

interface ValidationError {
  field: string
  message: string
}

interface AppState {
  devices: Device[]
  borrowRecords: BorrowRecord[]
  disinfectRecords: DisinfectRecord[]
  damageReports: DamageReport[]
  exportHistories: ExportHistory[]

  addDevice: (device: Omit<Device, 'id' | 'createdAt' | 'status'>) => Device
  updateDevice: (id: string, updates: Partial<Device>) => void

  validateBorrow: (deviceId: string, excludeBorrowId?: string) => ValidationError[]
  createBorrowRequest: (data: Omit<BorrowRecord, 'id' | 'status' | 'approvedBy' | 'checkoutBy' | 'returnDepartment' | 'actualReturnDate' | 'checkoutDate'>) => BorrowRecord | null
  approveBorrow: (id: string, approver: string) => BorrowRecord | null
  checkoutBorrow: (id: string, operator: string) => BorrowRecord | null
  returnBorrow: (id: string, returnDepartment: string) => ValidationError[] | null

  startDisinfect: (id: string) => DisinfectRecord | null
  completeDisinfect: (id: string, data: { method: string; batchNumber: string; responsiblePerson: string }) => ValidationError[] | null

  createDamageReport: (data: Omit<DamageReport, 'id' | 'status' | 'approvedBy' | 'approvalDate' | 'lastBorrower' | 'lastDisinfectBatch'>) => DamageReport | null
  approveDamage: (id: string, approver: string) => DamageReport | null

  exportDamageReport: (filters: { dateFrom: string; dateTo: string }) => ExportHistory

  getOverdueBorrows: () => BorrowRecord[]
}

const genId = () => crypto.randomUUID()

const buildSeedData = () => {
  const devices: Device[] = [
    { id: genId(), name: '手术电刀', serialNumber: 'SN-ED-001', riskLevel: 'high', disinfectRequirement: '高温高压灭菌，121°C 30分钟', currentLocation: '消毒供应中心', status: 'available', department: '手术室', createdAt: new Date().toISOString() },
    { id: genId(), name: '腹腔镜', serialNumber: 'SN-LP-001', riskLevel: 'high', disinfectRequirement: '低温等离子灭菌', currentLocation: '手术室', status: 'available', department: '手术室', createdAt: new Date().toISOString() },
    { id: genId(), name: '监护仪', serialNumber: 'SN-MN-001', riskLevel: 'medium', disinfectRequirement: '75%酒精擦拭消毒', currentLocation: 'ICU', status: 'available', department: 'ICU', createdAt: new Date().toISOString() },
    { id: genId(), name: '输液泵', serialNumber: 'SN-IP-001', riskLevel: 'low', disinfectRequirement: '表面清洁擦拭', currentLocation: '内科', status: 'available', department: '内科', createdAt: new Date().toISOString() },
    { id: genId(), name: '呼吸机', serialNumber: 'SN-VN-001', riskLevel: 'high', disinfectRequirement: '高温高压灭菌，回路低温等离子', currentLocation: 'ICU', status: 'available', department: 'ICU', createdAt: new Date().toISOString() },
    { id: genId(), name: '除颤仪', serialNumber: 'SN-DF-001', riskLevel: 'medium', disinfectRequirement: '75%酒精擦拭消毒', currentLocation: '急诊科', status: 'available', department: '急诊科', createdAt: new Date().toISOString() },
    { id: genId(), name: '超声探头', serialNumber: 'SN-US-001', riskLevel: 'medium', disinfectRequirement: '低温等离子灭菌', currentLocation: '外科', status: 'available', department: '外科', createdAt: new Date().toISOString() },
    { id: genId(), name: '骨钻', serialNumber: 'SN-BD-001', riskLevel: 'high', disinfectRequirement: '高温高压灭菌，134°C 18分钟', currentLocation: '消毒供应中心', status: 'available', department: '手术室', createdAt: new Date().toISOString() },
  ]

  const disinfectRecords: DisinfectRecord[] = devices
    .filter((d) => d.riskLevel === 'high')
    .map((d, idx) => ({
      id: genId(),
      deviceId: d.id,
      borrowRecordId: '',
      method: d.disinfectRequirement,
      batchNumber: `INIT-${String(idx + 1).padStart(3, '0')}`,
      responsiblePerson: '系统初始化',
      status: 'completed' as const,
      startTime: new Date(Date.now() - 86400000 * 2).toISOString(),
      completionTime: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
    }))

  return { devices, disinfectRecords }
}

const seedData = buildSeedData()

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      devices: seedData.devices,
      borrowRecords: [],
      disinfectRecords: seedData.disinfectRecords,
      damageReports: [],
      exportHistories: [],

      addDevice: (deviceData) => {
        const device: Device = {
          ...deviceData,
          id: genId(),
          status: 'available',
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ devices: [...s.devices, device] }))
        return device
      },

      updateDevice: (id, updates) => {
        set((s) => ({
          devices: s.devices.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        }))
      },

      validateBorrow: (deviceId, excludeBorrowId) => {
        const errors: ValidationError[] = []
        const { devices, borrowRecords, damageReports, disinfectRecords } = get()
        const device = devices.find((d) => d.id === deviceId)

        if (!device) {
          errors.push({ field: 'deviceId', message: '设备不存在' })
          return errors
        }

        if (device.status !== 'available') {
          errors.push({ field: 'deviceId', message: '设备不可用，当前状态：' + device.status })
        }

        const activeBorrow = borrowRecords.find(
          (b) => b.deviceId === deviceId && b.id !== excludeBorrowId && ['pending', 'approved', 'checked_out'].includes(b.status)
        )
        if (activeBorrow) {
          errors.push({ field: 'deviceId', message: '同一设备重复借出，该设备已有进行中的借用单' })
        }

        const approvedDamage = damageReports.find(
          (d) => d.deviceId === deviceId && d.status === 'approved'
        )
        if (approvedDamage) {
          errors.push({ field: 'deviceId', message: '报损设备不可分配，该设备已批准报损' })
        }

        const pendingDisinfect = disinfectRecords.find(
          (d) => d.deviceId === deviceId && ['pending', 'in_progress'].includes(d.status)
        )
        if (pendingDisinfect) {
          errors.push({ field: 'deviceId', message: '设备未消毒完成，请先完成消毒流程' })
        }

        if (device.riskLevel === 'high' && !pendingDisinfect) {
          const lastCompleted = disinfectRecords
            .filter((d) => d.deviceId === deviceId && d.status === 'completed')
            .sort((a, b) => new Date(b.completionTime).getTime() - new Date(a.completionTime).getTime())[0]
          if (!lastCompleted) {
            errors.push({ field: 'deviceId', message: '高风险器械强制消毒：该器械无消毒记录，不可借出' })
          }
        }

        return errors
      },

      createBorrowRequest: (data) => {
        const errors = get().validateBorrow(data.deviceId)
        if (errors.length > 0) return null

        const record: BorrowRecord = {
          ...data,
          id: genId(),
          status: 'pending',
          approvedBy: '',
          checkoutBy: '',
          returnDepartment: '',
          actualReturnDate: '',
          checkoutDate: '',
        }
        set((s) => ({ borrowRecords: [...s.borrowRecords, record] }))
        return record
      },

      approveBorrow: (id, approver) => {
        const record = get().borrowRecords.find((b) => b.id === id)
        if (!record || record.status !== 'pending') return null

        const errors = get().validateBorrow(record.deviceId, id)
        if (errors.length > 0) return null

        set((s) => ({
          borrowRecords: s.borrowRecords.map((b) =>
            b.id === id ? { ...b, status: 'approved' as BorrowStatus, approvedBy: approver } : b
          ),
        }))
        return get().borrowRecords.find((b) => b.id === id)!
      },

      checkoutBorrow: (id, operator) => {
        const record = get().borrowRecords.find((b) => b.id === id)
        if (!record || record.status !== 'approved') return null

        set((s) => ({
          borrowRecords: s.borrowRecords.map((b) =>
            b.id === id
              ? { ...b, status: 'checked_out' as BorrowStatus, checkoutBy: operator, checkoutDate: new Date().toISOString() }
              : b
          ),
          devices: s.devices.map((d) =>
            d.id === record.deviceId ? { ...d, status: 'borrowed' as DeviceStatus, currentLocation: record.borrowerDepartment } : d
          ),
        }))
        return get().borrowRecords.find((b) => b.id === id)!
      },

      returnBorrow: (id, returnDepartment) => {
        const record = get().borrowRecords.find((b) => b.id === id)
        if (!record || record.status !== 'checked_out') return [{ field: 'status', message: '借用单状态不正确' } as ValidationError]

        if (returnDepartment !== record.borrowerDepartment) {
          return [{ field: 'returnDepartment', message: `归还科室不一致，借出科室为「${record.borrowerDepartment}」` } as ValidationError]
        }

        set((s) => ({
          borrowRecords: s.borrowRecords.map((b) =>
            b.id === id
              ? { ...b, status: 'returned' as BorrowStatus, actualReturnDate: new Date().toISOString(), returnDepartment }
              : b
          ),
          devices: s.devices.map((d) =>
            d.id === record.deviceId ? { ...d, status: 'pending_disinfect' as DeviceStatus } : d
          ),
          disinfectRecords: [
            ...s.disinfectRecords,
            {
              id: genId(),
              deviceId: record.deviceId,
              borrowRecordId: id,
              method: '',
              batchNumber: '',
              responsiblePerson: '',
              status: 'pending' as DisinfectStatus,
              startTime: '',
              completionTime: '',
            },
          ],
        }))
        return null
      },

      startDisinfect: (id) => {
        const record = get().disinfectRecords.find((d) => d.id === id)
        if (!record || record.status !== 'pending') return null

        set((s) => ({
          disinfectRecords: s.disinfectRecords.map((d) =>
            d.id === id ? { ...d, status: 'in_progress' as DisinfectStatus, startTime: new Date().toISOString() } : d
          ),
          devices: s.devices.map((dev) =>
            dev.id === record.deviceId ? { ...dev, status: 'disinfecting' as DeviceStatus } : dev
          ),
        }))
        return get().disinfectRecords.find((d) => d.id === id)!
      },

      completeDisinfect: (id, data) => {
        if (!data.responsiblePerson.trim()) {
          return [{ field: 'responsiblePerson', message: '消毒记录缺少责任人' } as ValidationError]
        }
        if (!data.batchNumber.trim()) {
          return [{ field: 'batchNumber', message: '消毒批次号不能为空' } as ValidationError]
        }

        const record = get().disinfectRecords.find((d) => d.id === id)
        if (!record || record.status !== 'in_progress') return [{ field: 'status', message: '消毒记录状态不正确' } as ValidationError]

        set((s) => ({
          disinfectRecords: s.disinfectRecords.map((d) =>
            d.id === id
              ? { ...d, ...data, status: 'completed' as DisinfectStatus, completionTime: new Date().toISOString() }
              : d
          ),
          devices: s.devices.map((dev) =>
            dev.id === record.deviceId ? { ...dev, status: 'available' as DeviceStatus, currentLocation: dev.department } : dev
          ),
        }))
        return null
      },

      createDamageReport: (data) => {
        const { devices } = get()
        const device = devices.find((d) => d.id === data.deviceId)
        if (!device) return null

        const activeBorrow = get().borrowRecords.find(
          (b) => b.deviceId === data.deviceId && ['pending', 'approved', 'checked_out'].includes(b.status)
        )
        if (activeBorrow) return null

        const lastBorrow = get().borrowRecords
          .filter((b) => b.deviceId === data.deviceId)
          .sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime())[0]

        const lastDisinfect = get().disinfectRecords
          .filter((d) => d.deviceId === data.deviceId && d.status === 'completed')
          .sort((a, b) => new Date(b.completionTime).getTime() - new Date(a.completionTime).getTime())[0]

        const report: DamageReport = {
          ...data,
          id: genId(),
          status: 'pending',
          approvedBy: '',
          approvalDate: '',
          lastBorrower: lastBorrow?.borrowerName || '',
          lastDisinfectBatch: lastDisinfect?.batchNumber || '',
        }
        set((s) => ({ damageReports: [...s.damageReports, report] }))
        return report
      },

      approveDamage: (id, approver) => {
        const report = get().damageReports.find((d) => d.id === id)
        if (!report || report.status !== 'pending') return null

        set((s) => ({
          damageReports: s.damageReports.map((d) =>
            d.id === id ? { ...d, status: 'approved' as DamageStatus, approvedBy: approver, approvalDate: new Date().toISOString() } : d
          ),
          devices: s.devices.map((dev) =>
            dev.id === report.deviceId ? { ...dev, status: 'damaged' as DeviceStatus } : dev
          ),
        }))
        return get().damageReports.find((d) => d.id === id)!
      },

      exportDamageReport: (filters) => {
        const { damageReports, devices, borrowRecords, disinfectRecords } = get()
        let filtered = damageReports
        if (filters.dateFrom) {
          filtered = filtered.filter((d) => new Date(d.reportDate) >= new Date(filters.dateFrom))
        }
        if (filters.dateTo) {
          filtered = filtered.filter((d) => new Date(d.reportDate) <= new Date(filters.dateTo + 'T23:59:59'))
        }

        const rows = filtered.map((r) => {
          const device = devices.find((d) => d.id === r.deviceId)
          return {
            设备名称: device?.name || '',
            序列号: device?.serialNumber || '',
            借用人: r.lastBorrower,
            消毒批次: r.lastDisinfectBatch,
            报损原因: r.reason,
            当前状态: r.status === 'approved' ? '已批准' : '待审批',
            报告人: r.reporter,
            报告日期: r.reportDate,
          }
        })

        const csvHeader = Object.keys(rows[0] || {}).join(',')
        const csvRows = rows.map((r) => Object.values(r).join(','))
        const csvContent = [csvHeader, ...csvRows].join('\n')

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `报损清单_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)

        const history: ExportHistory = {
          id: genId(),
          fileName: `报损清单_${new Date().toISOString().slice(0, 10)}.csv`,
          exportDate: new Date().toISOString(),
          recordCount: filtered.length,
          filters: JSON.stringify(filters),
        }
        set((s) => ({ exportHistories: [...s.exportHistories, history] }))
        return history
      },

      getOverdueBorrows: () => {
        const now = new Date()
        return get().borrowRecords.filter(
          (b) => b.status === 'checked_out' && new Date(b.expectedReturnDate) < now
        )
      },
    }),
    {
      name: 'med-track-storage',
    }
  )
)
