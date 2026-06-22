import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Device, BorrowRecord, DisinfectRecord, DamageReport, ExportHistory,
  DeviceStatus, BorrowStatus, DisinfectStatus, DamageStatus,
  TaskExecution, TaskStats, TaskTrendPoint, TaskFilter, TaskStatus, TaskType,
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
  taskExecutions: TaskExecution[]
  taskFilter: TaskFilter

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

  setTaskFilter: (filter: Partial<TaskFilter>) => void
  resetTaskFilter: () => void
  getFilteredTasks: () => TaskExecution[]
  getTaskStats: () => TaskStats
  getTaskTrend: (days?: number) => TaskTrendPoint[]
  getTaskById: (id: string) => TaskExecution | undefined
  getTaskExecutionsByDevice: (deviceId: string) => TaskExecution[]
  retryTask: (taskId: string) => TaskExecution | null
  recordTaskExecution: (task: Omit<TaskExecution, 'id' | 'retryCount'>) => TaskExecution
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

const buildTaskSeedData = (devices: Device[]): TaskExecution[] => {
  const tasks: TaskExecution[] = []
  const now = new Date()
  const failureReasons = [
    '消毒温度未达标，实际温度110°C，要求121°C',
    '消毒时间不足，实际15分钟，要求30分钟',
    '责任人未确认，流程中断',
    '设备检测异常，消毒效果验证失败',
    '批次号重复，系统校验不通过',
    '设备借出时状态异常',
    '借用审批超时，自动驳回',
  ]

  const generateRandomTask = (baseDate: Date, index: number): TaskExecution => {
    const device = devices[index % devices.length]
    const isDisinfect = Math.random() > 0.4
    const taskType: TaskType = isDisinfect ? 'disinfect' : 'borrow'
    const taskName = isDisinfect ? `${device.name}消毒` : `${device.name}借用`
    const isFailed = Math.random() < 0.2
    const isInProgress = !isFailed && Math.random() < 0.1
    const isPending = !isFailed && !isInProgress && Math.random() < 0.05

    let status: TaskStatus = 'success'
    if (isFailed) status = 'failed'
    else if (isInProgress) status = 'in_progress'
    else if (isPending) status = 'pending'

    const startTime = new Date(baseDate.getTime() - Math.random() * 3600000 * 2)
    const endTime = status === 'success' || status === 'failed'
      ? new Date(startTime.getTime() + (isDisinfect ? 30 : 10) * 60000 + Math.random() * 600000)
      : status === 'in_progress' ? '' : ''

    const durationMs = endTime
      ? new Date(endTime).getTime() - new Date(startTime).getTime()
      : 0

    return {
      id: genId(),
      taskType,
      taskName,
      relatedRecordId: genId(),
      deviceId: device.id,
      deviceName: device.name,
      status,
      startTime: startTime.toISOString(),
      endTime: endTime ? endTime.toISOString() : '',
      durationMs,
      failureReason: isFailed ? failureReasons[Math.floor(Math.random() * failureReasons.length)] : undefined,
      operator: ['张护士', '李消毒员', '王库管', '赵护士长'][Math.floor(Math.random() * 4)],
      retryCount: isFailed && Math.random() < 0.3 ? Math.floor(Math.random() * 3) + 1 : 0,
      lastRetryAt: isFailed && Math.random() < 0.3
        ? new Date(startTime.getTime() + 3600000).toISOString()
        : undefined,
    }
  }

  for (let day = 29; day >= 0; day--) {
    const date = new Date(now.getTime() - day * 86400000)
    const tasksPerDay = Math.floor(Math.random() * 8) + 3
    for (let i = 0; i < tasksPerDay; i++) {
      const hour = 8 + Math.floor(Math.random() * 10)
      const taskDate = new Date(date)
      taskDate.setHours(hour, Math.floor(Math.random() * 60), 0, 0)
      tasks.push(generateRandomTask(taskDate, tasks.length))
    }
  }

  return tasks.sort((a, b) =>
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  )
}

const seedData = buildSeedData()
const taskSeedData = buildTaskSeedData(seedData.devices)

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      devices: seedData.devices,
      borrowRecords: [],
      disinfectRecords: seedData.disinfectRecords,
      damageReports: [],
      exportHistories: [],
      taskExecutions: taskSeedData,
      taskFilter: {
        status: 'all',
        taskType: 'all',
        dateFrom: '',
        dateTo: '',
        keyword: '',
      },

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
        const { damageReports, devices } = get()
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

      setTaskFilter: (filter) => {
        set((s) => ({
          taskFilter: { ...s.taskFilter, ...filter },
        }))
      },

      resetTaskFilter: () => {
        set({
          taskFilter: {
            status: 'all',
            taskType: 'all',
            dateFrom: '',
            dateTo: '',
            keyword: '',
          },
        })
      },

      getFilteredTasks: () => {
        const { taskExecutions, taskFilter } = get()
        return taskExecutions.filter((task) => {
          if (taskFilter.status !== 'all' && task.status !== taskFilter.status) return false
          if (taskFilter.taskType !== 'all' && task.taskType !== taskFilter.taskType) return false
          if (taskFilter.dateFrom && new Date(task.startTime) < new Date(taskFilter.dateFrom)) return false
          if (taskFilter.dateTo && new Date(task.startTime) > new Date(taskFilter.dateTo + 'T23:59:59')) return false
          if (taskFilter.keyword) {
            const keyword = taskFilter.keyword.toLowerCase()
            const matchName = task.taskName.toLowerCase().includes(keyword)
            const matchDevice = task.deviceName.toLowerCase().includes(keyword)
            const matchOperator = task.operator?.toLowerCase().includes(keyword)
            const matchReason = task.failureReason?.toLowerCase().includes(keyword)
            if (!matchName && !matchDevice && !matchOperator && !matchReason) return false
          }
          return true
        })
      },

      getTaskStats: () => {
        const tasks = get().getFilteredTasks()
        const completedTasks = tasks.filter((t) => t.status === 'success' || t.status === 'failed')
        const successTasks = tasks.filter((t) => t.status === 'success')
        const failedTasks = tasks.filter((t) => t.status === 'failed')
        const inProgressTasks = tasks.filter((t) => t.status === 'in_progress')
        const pendingTasks = tasks.filter((t) => t.status === 'pending')

        const durations = completedTasks.filter((t) => t.durationMs > 0).map((t) => t.durationMs)
        const avgDurationMs = durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0
        const maxDurationMs = durations.length > 0 ? Math.max(...durations) : 0
        const maxDurationTask = durations.length > 0
          ? completedTasks.find((t) => t.durationMs === maxDurationMs)
          : undefined

        let consecutiveFailures = 0
        let lastConsecutiveFailureAt: string | undefined
        const sortedByTime = [...tasks].sort((a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )
        for (const task of sortedByTime) {
          if (task.status === 'failed') {
            consecutiveFailures++
            if (!lastConsecutiveFailureAt) {
              lastConsecutiveFailureAt = task.startTime
            }
          } else if (task.status === 'success') {
            break
          }
        }

        return {
          totalCount: tasks.length,
          successCount: successTasks.length,
          failedCount: failedTasks.length,
          inProgressCount: inProgressTasks.length,
          pendingCount: pendingTasks.length,
          successRate: completedTasks.length > 0
            ? Math.round((successTasks.length / completedTasks.length) * 10000) / 100
            : 0,
          failureRate: completedTasks.length > 0
            ? Math.round((failedTasks.length / completedTasks.length) * 10000) / 100
            : 0,
          avgDurationMs,
          maxDurationMs,
          maxDurationTaskId: maxDurationTask?.id,
          consecutiveFailures,
          lastConsecutiveFailureAt,
        }
      },

      getTaskTrend: (days = 7) => {
        const tasks = get().getFilteredTasks()
        const now = new Date()
        now.setHours(0, 0, 0, 0)

        const trend: TaskTrendPoint[] = []
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now)
          date.setDate(date.getDate() - i)
          const dateStr = date.toISOString().slice(0, 10)
          const nextDate = new Date(date)
          nextDate.setDate(nextDate.getDate() + 1)

          const dayTasks = tasks.filter((t) => {
            const taskDate = new Date(t.startTime)
            return taskDate >= date && taskDate < nextDate
          })

          trend.push({
            date: dateStr,
            successCount: dayTasks.filter((t) => t.status === 'success').length,
            failedCount: dayTasks.filter((t) => t.status === 'failed').length,
            totalCount: dayTasks.length,
          })
        }
        return trend
      },

      getTaskById: (id) => {
        return get().taskExecutions.find((t) => t.id === id)
      },

      getTaskExecutionsByDevice: (deviceId) => {
        return get().taskExecutions
          .filter((t) => t.deviceId === deviceId)
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
          .slice(0, 10)
      },

      retryTask: (taskId) => {
        const task = get().taskExecutions.find((t) => t.id === taskId)
        if (!task || task.status !== 'failed') return null

        const now = new Date()
        const newTask: TaskExecution = {
          id: genId(),
          taskType: task.taskType,
          taskName: task.taskName,
          relatedRecordId: task.relatedRecordId,
          deviceId: task.deviceId,
          deviceName: task.deviceName,
          status: 'in_progress',
          startTime: now.toISOString(),
          endTime: '',
          durationMs: 0,
          operator: '系统重试',
          retryCount: task.retryCount + 1,
          lastRetryAt: now.toISOString(),
        }

        setTimeout(() => {
          set((s) => ({
            taskExecutions: s.taskExecutions.map((t) =>
              t.id === newTask.id
                ? { ...t, status: 'success', endTime: new Date().toISOString(), durationMs: 1800000 }
                : t
            ),
          }))
        }, 2000)

        set((s) => ({
          taskExecutions: [newTask, ...s.taskExecutions],
        }))

        return newTask
      },

      recordTaskExecution: (taskData) => {
        const task: TaskExecution = {
          ...taskData,
          id: genId(),
          retryCount: 0,
        }
        set((s) => ({
          taskExecutions: [task, ...s.taskExecutions],
        }))
        return task
      },
    }),
    {
      name: 'med-track-storage',
    }
  )
)
