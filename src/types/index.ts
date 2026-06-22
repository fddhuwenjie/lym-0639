export type DeviceStatus = 'available' | 'borrowed' | 'disinfecting' | 'pending_disinfect' | 'damaged'
export type RiskLevel = 'high' | 'medium' | 'low'
export type BorrowStatus = 'pending' | 'approved' | 'checked_out' | 'returned'
export type DisinfectStatus = 'pending' | 'in_progress' | 'completed'
export type DamageStatus = 'pending' | 'approved'

export interface Device {
  id: string
  name: string
  serialNumber: string
  riskLevel: RiskLevel
  disinfectRequirement: string
  currentLocation: string
  status: DeviceStatus
  department: string
  createdAt: string
}

export interface BorrowRecord {
  id: string
  deviceId: string
  borrowerDepartment: string
  borrowerName: string
  reason: string
  status: BorrowStatus
  approvedBy: string
  checkoutBy: string
  returnDepartment: string
  borrowDate: string
  expectedReturnDate: string
  actualReturnDate: string
  checkoutDate: string
}

export interface DisinfectRecord {
  id: string
  deviceId: string
  borrowRecordId: string
  method: string
  batchNumber: string
  responsiblePerson: string
  status: DisinfectStatus
  startTime: string
  completionTime: string
}

export interface DamageReport {
  id: string
  deviceId: string
  reporter: string
  reason: string
  status: DamageStatus
  approvedBy: string
  reportDate: string
  approvalDate: string
  lastBorrower: string
  lastDisinfectBatch: string
}

export interface ExportHistory {
  id: string
  fileName: string
  exportDate: string
  recordCount: number
  filters: string
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  high: '高风险',
  medium: '中风险',
  low: '低风险',
}

export const STATUS_LABELS: Record<DeviceStatus, string> = {
  available: '可用',
  borrowed: '借出',
  disinfecting: '消毒中',
  pending_disinfect: '待消毒',
  damaged: '已报损',
}

export const BORROW_STATUS_LABELS: Record<BorrowStatus, string> = {
  pending: '待审批',
  approved: '已审批',
  checked_out: '已出库',
  returned: '已归还',
}

export const DISINFECT_STATUS_LABELS: Record<DisinfectStatus, string> = {
  pending: '待消毒',
  in_progress: '消毒中',
  completed: '已完成',
}

export const DAMAGE_STATUS_LABELS: Record<DamageStatus, string> = {
  pending: '待审批',
  approved: '已批准',
}

export const DEPARTMENTS = ['手术室', 'ICU', '急诊科', '内科', '外科', '儿科', '妇产科', '消毒供应中心']

export type TaskType = 'disinfect' | 'borrow'
export type TaskStatus = 'success' | 'failed' | 'in_progress' | 'pending'

export interface TaskExecution {
  id: string
  taskType: TaskType
  taskName: string
  relatedRecordId: string
  deviceId: string
  deviceName: string
  status: TaskStatus
  startTime: string
  endTime: string
  durationMs: number
  failureReason?: string
  operator?: string
  retryCount: number
  lastRetryAt?: string
}

export interface TaskStats {
  totalCount: number
  successCount: number
  failedCount: number
  inProgressCount: number
  pendingCount: number
  successRate: number
  failureRate: number
  avgDurationMs: number
  maxDurationMs: number
  maxDurationTaskId?: string
  consecutiveFailures: number
  lastConsecutiveFailureAt?: string
}

export interface TaskTrendPoint {
  date: string
  successCount: number
  failedCount: number
  totalCount: number
}

export interface TaskFilter {
  status: TaskStatus | 'all'
  taskType: TaskType | 'all'
  dateFrom: string
  dateTo: string
  keyword: string
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  disinfect: '消毒任务',
  borrow: '借用任务',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  success: '执行成功',
  failed: '执行失败',
  in_progress: '执行中',
  pending: '待执行',
}
