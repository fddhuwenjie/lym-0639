import { useMemo, useState, useEffect } from 'react'
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  RotateCcw,
  X,
  Calendar,
  Play,
  History,
  User,
  Activity,
  Gauge,
  Flame,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import {
  TASK_TYPE_LABELS,
  TASK_STATUS_LABELS,
  type TaskExecution,
  type TaskStatus,
  type TaskType,
} from '@/types'
import { showToast } from '@/components/Toast'

const formatDuration = (ms: number): string => {
  if (ms <= 0) return '-'
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  if (minutes > 60) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}小时${mins}分`
  }
  return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

export default function TaskQualityAnalysis() {
  const {
    taskExecutions,
    taskFilter,
    setTaskFilter,
    resetTaskFilter,
    getFilteredTasks,
    getTaskStats,
    getTaskTrend,
    getTaskById,
    getTaskExecutionsByDevice,
    retryTask,
  } = useStore()

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [trendDays, setTrendDays] = useState(7)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const filteredTasks = useMemo(() => getFilteredTasks(), [taskFilter, taskExecutions, getFilteredTasks])
  const stats = useMemo(() => getTaskStats(), [filteredTasks, getTaskStats])
  const trend = useMemo(() => getTaskTrend(trendDays), [filteredTasks, trendDays, getTaskTrend])
  const selectedTask = useMemo(
    () => (selectedTaskId ? getTaskById(selectedTaskId) : null),
    [selectedTaskId, taskExecutions, getTaskById]
  )
  const relatedExecutions = useMemo(
    () => (selectedTask ? getTaskExecutionsByDevice(selectedTask.deviceId) : []),
    [selectedTask, taskExecutions, getTaskExecutionsByDevice]
  )

  const maxTrendValue = Math.max(...trend.map((t) => t.totalCount), 1)

  const statusBadgeClass = (status: TaskStatus) => {
    switch (status) {
      case 'success':
        return 'med-badge med-badge-success'
      case 'failed':
        return 'med-badge med-badge-danger'
      case 'in_progress':
        return 'med-badge med-badge-info'
      case 'pending':
        return 'med-badge med-badge-warning'
    }
  }

  const statusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 size={14} />
      case 'failed':
        return <XCircle size={14} />
      case 'in_progress':
        return <Play size={14} />
      case 'pending':
        return <Clock size={14} />
    }
  }

  const handleViewDetail = (task: TaskExecution) => {
    setSelectedTaskId(task.id)
    setDrawerOpen(true)
  }

  const handleRetry = async (taskId: string) => {
    setIsRetrying(true)
    const result = retryTask(taskId)
    if (result) {
      showToast('success', '重试任务已启动')
    } else {
      showToast('error', '重试失败，任务状态不正确')
    }
    setTimeout(() => setIsRetrying(false), 500)
  }

  const handleFilterChange = (key: keyof typeof taskFilter, value: string) => {
    setTaskFilter({ [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--med-text)]">
            任务执行质量分析中心
          </h1>
          <p className="text-sm text-[var(--med-text-muted)] mt-1">
            实时监控任务执行情况，统计成功率、耗时等关键指标
          </p>
        </div>
        {stats.consecutiveFailures >= 3 && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2 animate-pulse">
            <Flame size={18} className="text-red-500" />
            <span className="text-sm font-medium text-red-700">
              连续失败 {stats.consecutiveFailures} 次，请及时处理
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-6 gap-4">
        <div className="med-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--med-text-muted)]">总任务数</p>
              <p className="text-2xl font-bold text-[var(--med-text)] mt-1">
                {stats.totalCount}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Activity size={20} className="text-blue-600" />
            </div>
          </div>
        </div>
        <div className="med-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--med-text-muted)]">成功率</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {stats.successRate}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.successRate}%` }}
            />
          </div>
        </div>
        <div className="med-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--med-text-muted)]">失败率</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {stats.failureRate}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle size={20} className="text-red-600" />
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-red-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${stats.failureRate}%` }}
            />
          </div>
        </div>
        <div className="med-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--med-text-muted)]">平均耗时</p>
              <p className="text-2xl font-bold text-[var(--med-text)] mt-1">
                {formatDuration(stats.avgDurationMs)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Gauge size={20} className="text-amber-600" />
            </div>
          </div>
        </div>
        <div className="med-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--med-text-muted)]">最长耗时</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatDuration(stats.maxDurationMs)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Clock size={20} className="text-orange-600" />
            </div>
          </div>
        </div>
        <div className="med-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[var(--med-text-muted)]">连续失败</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  stats.consecutiveFailures >= 3
                    ? 'text-red-600'
                    : stats.consecutiveFailures > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              >
                {stats.consecutiveFailures} 次
              </p>
            </div>
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                stats.consecutiveFailures >= 3
                  ? 'bg-red-100'
                  : stats.consecutiveFailures > 0
                    ? 'bg-amber-100'
                    : 'bg-emerald-100'
              }`}
            >
              <AlertTriangle
                size={20}
                className={
                  stats.consecutiveFailures >= 3
                    ? 'text-red-600'
                    : stats.consecutiveFailures > 0
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="med-card p-4">
        <div className="flex items-center gap-4 mb-4">
          <TrendingUp size={18} className="text-[var(--med-blue)]" />
          <h3 className="font-medium">最近执行趋势</h3>
          <div className="flex gap-1 ml-auto">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setTrendDays(days)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  trendDays === days
                    ? 'bg-[var(--med-blue)] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                最近{days}天
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2 h-40 px-2">
          {trend.map((point, idx) => {
            const successHeight =
              maxTrendValue > 0
                ? (point.successCount / maxTrendValue) * 100
                : 0
            const failedHeight =
              maxTrendValue > 0
                ? (point.failedCount / maxTrendValue) * 100
                : 0
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end gap-1 group"
              >
                <div className="text-xs text-[var(--med-text-muted)] mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  成功:{point.successCount} 失败:{point.failedCount}
                </div>
                <div className="w-full flex items-end gap-0.5 h-32">
                  {successHeight > 0 && (
                    <div
                      className="flex-1 bg-emerald-400 rounded-t transition-all duration-300 hover:bg-emerald-500"
                      style={{ height: `${successHeight}%` }}
                    />
                  )}
                  {failedHeight > 0 && (
                    <div
                      className="flex-1 bg-red-400 rounded-t transition-all duration-300 hover:bg-red-500"
                      style={{ height: `${failedHeight}%` }}
                    />
                  )}
                </div>
                <div className="text-xs text-[var(--med-text-muted)] mt-1">
                  {formatDateShort(point.date)}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-[var(--med-text-muted)]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-emerald-400 rounded" />
            <span>成功</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-red-400 rounded" />
            <span>失败</span>
          </div>
        </div>
      </div>

      <div className="med-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className="med-input pl-9"
              placeholder="搜索任务名称、设备、操作人、失败原因..."
              value={taskFilter.keyword}
              onChange={(e) => handleFilterChange('keyword', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              className="med-select w-32"
              value={taskFilter.status}
              onChange={(e) =>
                handleFilterChange('status', e.target.value as TaskStatus | 'all')
              }
            >
              <option value="all">全部状态</option>
              <option value="success">执行成功</option>
              <option value="failed">执行失败</option>
              <option value="in_progress">执行中</option>
              <option value="pending">待执行</option>
            </select>
            <select
              className="med-select w-32"
              value={taskFilter.taskType}
              onChange={(e) =>
                handleFilterChange('taskType', e.target.value as TaskType | 'all')
              }
            >
              <option value="all">全部类型</option>
              <option value="disinfect">消毒任务</option>
              <option value="borrow">借用任务</option>
            </select>
            <div className="relative">
              <Calendar
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="date"
                className="med-input pl-9 w-36"
                value={taskFilter.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div className="text-[var(--med-text-muted)]">至</div>
            <input
              type="date"
              className="med-input w-36"
              value={taskFilter.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
            <button
              className="med-btn med-btn-ghost text-sm"
              onClick={resetTaskFilter}
            >
              <RotateCcw size={14} /> 重置
            </button>
          </div>
        </div>
      </div>

      <div className="med-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--med-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-[var(--med-blue)]" />
            <h3 className="font-medium">任务执行列表</h3>
            <span className="text-xs text-[var(--med-text-muted)]">
              共 {filteredTasks.length} 条记录
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="med-table w-full">
            <thead>
              <tr>
                <th>任务名称</th>
                <th>设备</th>
                <th>类型</th>
                <th>状态</th>
                <th>操作人</th>
                <th>开始时间</th>
                <th>结束时间</th>
                <th>耗时</th>
                <th>重试</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  className="cursor-pointer"
                  onClick={() => handleViewDetail(task)}
                >
                  <td className="font-medium">{task.taskName}</td>
                  <td>
                    <div>
                      <p className="font-medium">{task.deviceName}</p>
                    </div>
                  </td>
                  <td>
                    <span className="med-badge med-badge-muted">
                      {TASK_TYPE_LABELS[task.taskType]}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${statusBadgeClass(task.status)} flex items-center gap-1.5`}
                    >
                      {statusIcon(task.status)}
                      {TASK_STATUS_LABELS[task.status]}
                    </span>
                  </td>
                  <td>
                    {task.operator ? (
                      <span className="flex items-center gap-1 text-sm">
                        <User size={14} className="text-gray-400" />
                        {task.operator}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="text-sm text-[var(--med-text-muted)]">
                    {formatDate(task.startTime)}
                  </td>
                  <td className="text-sm text-[var(--med-text-muted)]">
                    {formatDate(task.endTime)}
                  </td>
                  <td className="text-sm text-[var(--med-text-muted)]">
                    {formatDuration(task.durationMs)}
                  </td>
                  <td>
                    {task.retryCount > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <RefreshCw size={12} />
                        {task.retryCount}次
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {task.status === 'failed' && (
                        <button
                          className="med-btn med-btn-warning text-xs px-2 py-1"
                          onClick={() => handleRetry(task.id)}
                          disabled={isRetrying}
                        >
                          <RotateCcw size={12} className={isRetrying ? 'animate-spin' : ''} />
                          重试
                        </button>
                      )}
                      <button
                        className="med-btn med-btn-ghost text-xs px-2 py-1"
                        onClick={() => handleViewDetail(task)}
                      >
                        详情 <ChevronRight size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-12 text-[var(--med-text-muted)]"
                  >
                    <BarChart3 size={32} className="mx-auto mb-2 text-gray-300" />
                    暂无匹配的任务记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl animate-slide-in-right flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--med-border)]">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                <h2 className="text-base font-semibold text-[var(--med-text)]">
                  任务详情
                </h2>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {selectedTask && (
                <>
                  <div className="med-card p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {selectedTask.taskName}
                        </h3>
                        <p className="text-sm text-[var(--med-text-muted)] mt-1">
                          设备：{selectedTask.deviceName}
                        </p>
                      </div>
                      <span
                        className={`${statusBadgeClass(selectedTask.status)} flex items-center gap-1.5`}
                      >
                        {statusIcon(selectedTask.status)}
                        {TASK_STATUS_LABELS[selectedTask.status]}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-[var(--med-text-muted)]">
                          任务类型
                        </p>
                        <p className="mt-1 font-medium">
                          {TASK_TYPE_LABELS[selectedTask.taskType]}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-[var(--med-text-muted)]">
                          操作人
                        </p>
                        <p className="mt-1 font-medium">
                          {selectedTask.operator || '-'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-[var(--med-text-muted)]">
                          开始时间
                        </p>
                        <p className="mt-1 font-medium text-sm">
                          {formatDate(selectedTask.startTime)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-[var(--med-text-muted)]">
                          结束时间
                        </p>
                        <p className="mt-1 font-medium text-sm">
                          {formatDate(selectedTask.endTime)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-[var(--med-text-muted)]">
                          执行耗时
                        </p>
                        <p className="mt-1 font-medium">
                          {formatDuration(selectedTask.durationMs)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-[var(--med-text-muted)]">
                          重试次数
                        </p>
                        <p className="mt-1 font-medium">
                          {selectedTask.retryCount} 次
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedTask.status === 'failed' && selectedTask.failureReason && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">失败原因</p>
                          <p className="text-sm text-red-700 mt-1">
                            {selectedTask.failureReason}
                          </p>
                          {selectedTask.lastRetryAt && (
                            <p className="text-xs text-red-500 mt-2">
                              上次重试时间：{formatDate(selectedTask.lastRetryAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <History size={16} className="text-[var(--med-blue)]" />
                      <h4 className="font-medium">最近执行记录</h4>
                      <span className="text-xs text-[var(--med-text-muted)]">
                        该设备最近 {relatedExecutions.length} 条记录
                      </span>
                    </div>
                    <div className="space-y-2">
                      {relatedExecutions.map((exec) => (
                        <div
                          key={exec.id}
                          className={`med-card p-3 transition-colors ${
                            exec.id === selectedTask.id
                              ? 'border-blue-300 bg-blue-50/30'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`${statusBadgeClass(exec.status)} flex items-center gap-1`}
                              >
                                {statusIcon(exec.status)}
                                {TASK_STATUS_LABELS[exec.status]}
                              </span>
                              <span className="text-sm">{exec.taskName}</span>
                            </div>
                            <span className="text-xs text-[var(--med-text-muted)]">
                              {formatDate(exec.startTime)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--med-text-muted)]">
                            <span>耗时：{formatDuration(exec.durationMs)}</span>
                            {exec.operator && <span>操作人：{exec.operator}</span>}
                            {exec.retryCount > 0 && (
                              <span className="text-amber-600">
                                已重试 {exec.retryCount} 次
                              </span>
                            )}
                          </div>
                          {exec.failureReason && (
                            <p className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded">
                              失败：{exec.failureReason}
                            </p>
                          )}
                        </div>
                      ))}
                      {relatedExecutions.length === 0 && (
                        <div className="text-center py-8 text-[var(--med-text-muted)] text-sm">
                          暂无历史执行记录
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[var(--med-border)] bg-gray-50">
              <div className="flex justify-end gap-2">
                <button
                  className="med-btn med-btn-ghost"
                  onClick={() => setDrawerOpen(false)}
                >
                  关闭
                </button>
                {selectedTask?.status === 'failed' && (
                  <button
                    className="med-btn med-btn-warning"
                    onClick={() => handleRetry(selectedTask.id)}
                    disabled={isRetrying}
                  >
                    <RotateCcw size={14} className={isRetrying ? 'animate-spin' : ''} />
                    重试任务
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
