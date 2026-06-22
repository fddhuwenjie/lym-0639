import { create } from 'zustand'

const genId = () => Math.random().toString(36).slice(2, 15)

const buildSeedData = () => {
  const devices = [
    { id: genId(), name: '手术电刀', serialNumber: 'SN-ED-001', riskLevel: 'high', disinfectRequirement: '高温高压灭菌，121°C 30分钟', currentLocation: '消毒供应中心', status: 'available', department: '手术室', createdAt: new Date().toISOString() },
    { id: genId(), name: '腹腔镜', serialNumber: 'SN-LP-001', riskLevel: 'high', disinfectRequirement: '低温等离子灭菌', currentLocation: '手术室', status: 'available', department: '手术室', createdAt: new Date().toISOString() },
    { id: genId(), name: '监护仪', serialNumber: 'SN-MN-001', riskLevel: 'medium', disinfectRequirement: '75%酒精擦拭消毒', currentLocation: 'ICU', status: 'available', department: 'ICU', createdAt: new Date().toISOString() },
    { id: genId(), name: '输液泵', serialNumber: 'SN-IP-001', riskLevel: 'low', disinfectRequirement: '表面清洁擦拭', currentLocation: '内科', status: 'available', department: '内科', createdAt: new Date().toISOString() },
    { id: genId(), name: '呼吸机', serialNumber: 'SN-VN-001', riskLevel: 'high', disinfectRequirement: '高温高压灭菌，回路低温等离子', currentLocation: 'ICU', status: 'available', department: 'ICU', createdAt: new Date().toISOString() },
    { id: genId(), name: '除颤仪', serialNumber: 'SN-DF-001', riskLevel: 'medium', disinfectRequirement: '75%酒精擦拭消毒', currentLocation: '急诊科', status: 'available', department: '急诊科', createdAt: new Date().toISOString() },
    { id: genId(), name: '超声探头', serialNumber: 'SN-US-001', riskLevel: 'medium', disinfectRequirement: '低温等离子灭菌', currentLocation: '外科', status: 'available', department: '外科', createdAt: new Date().toISOString() },
    { id: genId(), name: '骨钻', serialNumber: 'SN-BD-001', riskLevel: 'high', disinfectRequirement: '高温高压灭菌，134°C 18分钟', currentLocation: '消毒供应中心', status: 'available', department: '手术室', createdAt: new Date().toISOString() },
  ]

  const disinfectRecords = devices
    .filter((d) => d.riskLevel === 'high')
    .map((d, idx) => ({
      id: genId(),
      deviceId: d.id,
      borrowRecordId: '',
      method: d.disinfectRequirement,
      batchNumber: 'INIT-' + String(idx + 1).padStart(3, '0'),
      responsiblePerson: '系统初始化',
      status: 'completed',
      startTime: new Date(Date.now() - 86400000 * 2).toISOString(),
      completionTime: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
    }))

  return { devices, disinfectRecords }
}

const seedData = buildSeedData()

const createTestStore = () => create()(
  (set, get) => ({
    devices: JSON.parse(JSON.stringify(seedData.devices)),
    borrowRecords: [],
    disinfectRecords: JSON.parse(JSON.stringify(seedData.disinfectRecords)),
    damageReports: [],
    exportHistories: [],

    addDevice: (deviceData) => {
      const device = {
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
      const errors = []
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

      const record = {
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
          b.id === id ? { ...b, status: 'approved', approvedBy: approver } : b
        ),
      }))
      return get().borrowRecords.find((b) => b.id === id)
    },

    checkoutBorrow: (id, operator) => {
      const record = get().borrowRecords.find((b) => b.id === id)
      if (!record || record.status !== 'approved') return null

      set((s) => ({
        borrowRecords: s.borrowRecords.map((b) =>
          b.id === id
            ? { ...b, status: 'checked_out', checkoutBy: operator, checkoutDate: new Date().toISOString() }
            : b
        ),
        devices: s.devices.map((d) =>
          d.id === record.deviceId ? { ...d, status: 'borrowed', currentLocation: record.borrowerDepartment } : d
        ),
      }))
      return get().borrowRecords.find((b) => b.id === id)
    },

    returnBorrow: (id, returnDept) => {
      const record = get().borrowRecords.find((b) => b.id === id)
      if (!record || record.status !== 'checked_out') return null

      const errors = []
      if (returnDept !== record.borrowerDepartment) {
        errors.push({ field: 'returnDepartment', message: '归还科室不一致，归还科室必须与借出科室相同' })
        return errors
      }

      const device = get().devices.find((d) => d.id === record.deviceId)
      const disinfectRecord = {
        id: genId(),
        deviceId: record.deviceId,
        borrowRecordId: id,
        method: device?.disinfectRequirement || '',
        batchNumber: '',
        responsiblePerson: '',
        status: 'pending',
        startTime: '',
        completionTime: '',
      }

      set((s) => ({
        borrowRecords: s.borrowRecords.map((b) =>
          b.id === id
            ? { ...b, status: 'returned', returnDepartment: returnDept, actualReturnDate: new Date().toISOString() }
            : b
        ),
        devices: s.devices.map((d) =>
          d.id === record.deviceId ? { ...d, status: 'pending_disinfect', currentLocation: '消毒供应中心' } : d
        ),
        disinfectRecords: [...s.disinfectRecords, disinfectRecord],
      }))
      return null
    },

    startDisinfect: (id) => {
      const record = get().disinfectRecords.find((d) => d.id === id)
      if (!record || record.status !== 'pending') return null

      set((s) => ({
        disinfectRecords: s.disinfectRecords.map((d) =>
          d.id === id ? { ...d, status: 'in_progress', startTime: new Date().toISOString() } : d
        ),
        devices: s.devices.map((dev) =>
          dev.id === record.deviceId ? { ...dev, status: 'disinfecting' } : dev
        ),
      }))
      return get().disinfectRecords.find((d) => d.id === id)
    },

    completeDisinfect: (id, data) => {
      const record = get().disinfectRecords.find((d) => d.id === id)
      if (!record || record.status !== 'in_progress') return null

      const errors = []
      if (!data.method.trim()) errors.push({ field: 'method', message: '消毒方式不能为空' })
      if (!data.batchNumber.trim()) errors.push({ field: 'batchNumber', message: '消毒批次号不能为空' })
      if (!data.responsiblePerson.trim()) errors.push({ field: 'responsiblePerson', message: '消毒记录缺少责任人' })
      if (errors.length > 0) return errors

      set((s) => ({
        disinfectRecords: s.disinfectRecords.map((d) =>
          d.id === id
            ? {
                ...d,
                status: 'completed',
                method: data.method,
                batchNumber: data.batchNumber,
                responsiblePerson: data.responsiblePerson,
                completionTime: new Date().toISOString(),
              }
            : d
        ),
        devices: s.devices.map((dev) =>
          dev.id === record.deviceId ? { ...dev, status: 'available' } : dev
        ),
      }))
      return null
    },

    createDamageReport: (data) => {
      const { devices, borrowRecords, disinfectRecords } = get()
      const device = devices.find((d) => d.id === data.deviceId)
      if (!device) return null

      if (device.status === 'damaged') return null

      const activeBorrow = borrowRecords.find(
        (b) => b.deviceId === data.deviceId && ['pending', 'approved', 'checked_out'].includes(b.status)
      )
      if (activeBorrow) return null

      const lastBorrow = borrowRecords
        .filter((b) => b.deviceId === data.deviceId)
        .sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime())[0]

      const lastDisinfect = disinfectRecords
        .filter((d) => d.deviceId === data.deviceId && d.status === 'completed')
        .sort((a, b) => new Date(b.completionTime).getTime() - new Date(a.completionTime).getTime())[0]

      const report = {
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
      const report = get().damageReports.find((r) => r.id === id)
      if (!report || report.status !== 'pending') return null

      set((s) => ({
        damageReports: s.damageReports.map((r) =>
          r.id === id ? { ...r, status: 'approved', approvedBy: approver, approvalDate: new Date().toISOString() } : r
        ),
        devices: s.devices.map((d) =>
          d.id === report.deviceId ? { ...d, status: 'damaged' } : d
        ),
      }))
      return get().damageReports.find((r) => r.id === id)
    },

    exportDamageReport: (filters) => {
      const { damageReports, devices, borrowRecords, disinfectRecords } = get()

      let reports = damageReports
      if (filters.dateFrom) {
        reports = reports.filter((r) => r.reportDate && new Date(r.reportDate) >= new Date(filters.dateFrom))
      }
      if (filters.dateTo) {
        reports = reports.filter((r) => r.reportDate && new Date(r.reportDate) <= new Date(filters.dateTo))
      }

      const rows = reports.map((r) => {
        const device = devices.find((d) => d.id === r.deviceId)
        const lastBorrow = borrowRecords
          .filter((b) => b.deviceId === r.deviceId)
          .sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime())[0]
        const lastDisinfect = disinfectRecords
          .filter((d) => d.deviceId === r.deviceId && d.status === 'completed')
          .sort((a, b) => new Date(b.completionTime).getTime() - new Date(a.completionTime).getTime())[0]

        return {
          deviceName: device?.name || '-',
          serialNumber: device?.serialNumber || '-',
          borrowerName: r.lastBorrower || lastBorrow?.borrowerName || '-',
          disinfectBatch: r.lastDisinfectBatch || lastDisinfect?.batchNumber || '-',
          damageReason: r.reason,
          currentStatus: r.status,
          reporter: r.reporter,
          reportDate: r.reportDate,
        }
      })

      const history = {
        id: genId(),
        fileName: 'damage-report-' + new Date().toISOString().slice(0, 10) + '.csv',
        exportDate: new Date().toISOString(),
        recordCount: rows.length,
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
  })
)

// ============= 测试运行 =============
const results = []

function test(name, fn) {
  try {
    fn()
    results.push({ name, passed: true })
    console.log('✅ ' + name)
  } catch (e) {
    results.push({ name, passed: false, error: e.message })
    console.log('❌ ' + name + ': ' + e.message)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertEq(actual, expected, message) {
  if (actual !== expected) throw new Error(message + ' (expected: ' + JSON.stringify(expected) + ', actual: ' + JSON.stringify(actual) + ')')
}

// ------- 测试 1: 借用全流程 -------
test('借用全流程：申请 → 审批 → 出库 → 归还 → 消毒 → 完成消毒 → 恢复可用', () => {
  const store = createTestStore()
  const device = store.getState().devices.find((d) => d.serialNumber === 'SN-ED-001')
  assert(device, '设备存在')
  assertEq(device.status, 'available', '初始状态应为 available')

  const record = store.getState().createBorrowRequest({
    deviceId: device.id,
    borrowerDepartment: '手术室',
    borrowerName: '张医生',
    reason: '手术使用',
    borrowDate: new Date().toISOString(),
    expectedReturnDate: new Date(Date.now() + 86400000 * 7).toISOString(),
  })
  assert(record, '借用申请创建成功')
  assertEq(record.status, 'pending', '申请状态为 pending')

  const approved = store.getState().approveBorrow(record.id, '库管员甲')
  assert(approved, '审批应通过（修复点：不能因自身待审批申请被误判为重复借出）')
  assertEq(approved.status, 'approved', '审批后状态应为 approved')

  const checkedOut = store.getState().checkoutBorrow(record.id, '库管员甲')
  assert(checkedOut, '出库成功')
  assertEq(checkedOut.status, 'checked_out', '出库后状态为 checked_out')
  assertEq(store.getState().devices.find((d) => d.id === device.id).status, 'borrowed', '设备状态变为 borrowed')

  const returnErrors = store.getState().returnBorrow(record.id, '手术室')
  assertEq(returnErrors, null, '归还不应有错误')
  assertEq(store.getState().borrowRecords.find((b) => b.id === record.id).status, 'returned', '归还状态为 returned')
  assertEq(store.getState().devices.find((d) => d.id === device.id).status, 'pending_disinfect', '设备变为待消毒')

  const disinfectRecord = store.getState().disinfectRecords.find(
    (d) => d.deviceId === device.id && d.status === 'pending'
  )
  assert(disinfectRecord, '待消毒记录已创建')

  const started = store.getState().startDisinfect(disinfectRecord.id)
  assert(started, '开始消毒成功')
  assertEq(started.status, 'in_progress', '消毒状态为 in_progress')
  assertEq(store.getState().devices.find((d) => d.id === device.id).status, 'disinfecting', '设备状态为 disinfecting')

  const completeErrors = store.getState().completeDisinfect(started.id, {
    method: '高温高压灭菌，121°C 30分钟',
    batchNumber: 'BATCH-TEST-001',
    responsiblePerson: '消毒员李',
  })
  assertEq(completeErrors, null, '完成消毒不应有错误')
  assertEq(store.getState().disinfectRecords.find((d) => d.id === started.id).status, 'completed', '消毒完成')
  assertEq(store.getState().devices.find((d) => d.id === device.id).status, 'available', '设备恢复可用状态')
})

// ------- 测试 2: 重复借出拦截 -------
test('拦截：同一设备重复借出', () => {
  const store = createTestStore()
  const device = store.getState().devices[0]

  const record1 = store.getState().createBorrowRequest({
    deviceId: device.id,
    borrowerDepartment: '手术室',
    borrowerName: '张医生',
    reason: '手术1',
    borrowDate: new Date().toISOString(),
    expectedReturnDate: new Date(Date.now() + 86400000 * 7).toISOString(),
  })
  assert(record1, '第一个申请成功')

  const record2 = store.getState().createBorrowRequest({
    deviceId: device.id,
    borrowerDepartment: '手术室',
    borrowerName: '李医生',
    reason: '手术2',
    borrowDate: new Date().toISOString(),
    expectedReturnDate: new Date(Date.now() + 86400000 * 7).toISOString(),
  })
  assertEq(record2, null, '第二个相同设备的申请应被拦截')
})

// ------- 测试 3: 设备未消毒完成拦截 -------
test('拦截：设备未消毒完成不可借出', () => {
  const store = createTestStore()
  const device = store.getState().devices.find((d) => d.riskLevel === 'medium')

  // 通过 set 方式新增待消毒记录（不直接 mutate 数组）
  const state = store.getState()
  const newRecord = {
    id: genId(),
    deviceId: device.id,
    borrowRecordId: '',
    method: device.disinfectRequirement,
    batchNumber: '',
    responsiblePerson: '',
    status: 'pending',
    startTime: '',
    completionTime: '',
  }
  // 使用 zustand set 更新（实际测试通过 setStore 方式，这里通过内部 set 模拟）
  state.disinfectRecords = [...state.disinfectRecords, newRecord]
  store.setState({ disinfectRecords: state.disinfectRecords })
  store.getState().updateDevice(device.id, { status: 'pending_disinfect' })

  const errors = store.getState().validateBorrow(device.id)
  assert(errors.some((e) => e.message.includes('设备未消毒完成')), '应拦截未消毒设备')
})

// ------- 测试 4: 归还科室不一致拦截 -------
test('拦截：归还科室不一致', () => {
  const store = createTestStore()
  const device = store.getState().devices[0]

  const record = store.getState().createBorrowRequest({
    deviceId: device.id,
    borrowerDepartment: '手术室',
    borrowerName: '张医生',
    reason: '手术',
    borrowDate: new Date().toISOString(),
    expectedReturnDate: new Date(Date.now() + 86400000 * 7).toISOString(),
  })
  store.getState().approveBorrow(record.id, '库管员甲')
  store.getState().checkoutBorrow(record.id, '库管员甲')

  const errors = store.getState().returnBorrow(record.id, '内科')
  assert(errors && errors.length > 0, '应返回错误')
  assert(errors.some((e) => e.message.includes('归还科室不一致')), '错误信息应包含归还科室不一致')
})

// ------- 测试 5: 消毒记录缺少责任人拦截 -------
test('拦截：消毒记录缺少责任人', () => {
  const store = createTestStore()
  const device = store.getState().devices[0]

  const record = store.getState().createBorrowRequest({
    deviceId: device.id,
    borrowerDepartment: '手术室',
    borrowerName: '张医生',
    reason: '手术',
    borrowDate: new Date().toISOString(),
    expectedReturnDate: new Date(Date.now() + 86400000 * 7).toISOString(),
  })
  store.getState().approveBorrow(record.id, '库管员甲')
  store.getState().checkoutBorrow(record.id, '库管员甲')
  store.getState().returnBorrow(record.id, '手术室')

  const disinfectRecord = store.getState().disinfectRecords.find(
    (d) => d.deviceId === device.id && d.status === 'pending'
  )
  store.getState().startDisinfect(disinfectRecord.id)

  const errors = store.getState().completeDisinfect(disinfectRecord.id, {
    method: '高温高压灭菌',
    batchNumber: 'BATCH-TEST-002',
    responsiblePerson: '',
  })
  assert(errors && errors.length > 0, '应返回错误')
  assert(errors.some((e) => e.message.includes('缺少责任人')), '错误信息应包含缺少责任人')
})

// ------- 测试 6: 报损后不可借用 -------
test('拦截：报损设备不可借用', () => {
  const store = createTestStore()
  const device = store.getState().devices[0]

  const damage = store.getState().createDamageReport({
    deviceId: device.id,
    reporter: '管理员',
    reason: '设备损坏',
    reportDate: new Date().toISOString(),
  })
  assert(damage, '报损创建成功')
  store.getState().approveDamage(damage.id, '库管员')
  assertEq(store.getState().devices.find((d) => d.id === device.id).status, 'damaged', '设备状态为 damaged')

  const errors = store.getState().validateBorrow(device.id)
  assert(errors.some((e) => e.message.includes('报损设备不可分配')), '应拦截报损设备借用')
})

// ------- 测试 7: 高风险器械强制消毒 -------
test('拦截：高风险器械无消毒记录不可借出', () => {
  const store = createTestStore()

  const newDevice = store.getState().addDevice({
    name: '新手术器械',
    serialNumber: 'SN-NEW-HIGH-001',
    riskLevel: 'high',
    disinfectRequirement: '高温高压灭菌',
    currentLocation: '消毒供应中心',
    department: '手术室',
  })

  const errors = store.getState().validateBorrow(newDevice.id)
  assert(errors.some((e) => e.message.includes('高风险器械强制消毒')), '应拦截无消毒记录的高风险器械')
})

// ------- 测试 8: 逾期未归还提醒 -------
test('功能：逾期未归还提醒（getOverdueBorrows）', () => {
  const store = createTestStore()
  const device = store.getState().devices[0]

  const record = store.getState().createBorrowRequest({
    deviceId: device.id,
    borrowerDepartment: '手术室',
    borrowerName: '张医生',
    reason: '手术',
    borrowDate: new Date().toISOString(),
    expectedReturnDate: new Date(Date.now() - 86400000).toISOString(),
  })
  store.getState().approveBorrow(record.id, '库管员甲')
  store.getState().checkoutBorrow(record.id, '库管员甲')

  const overdue = store.getState().getOverdueBorrows()
  assert(overdue.length >= 1, '应检测到逾期借用单')
  assertEq(overdue[0].id, record.id, '逾期的应为刚创建的借用单')
})

// ------- 测试 9: 报损导出 -------
test('功能：报损导出包含借用人、消毒批次、报损原因和当前状态', () => {
  const store = createTestStore()
  const device = store.getState().devices.find((d) => d.riskLevel === 'medium')
  assert(device, '找到中风险设备')

  const record = store.getState().createBorrowRequest({
    deviceId: device.id,
    borrowerDepartment: 'ICU',
    borrowerName: '王护士',
    reason: '监护使用',
    borrowDate: new Date().toISOString(),
    expectedReturnDate: new Date(Date.now() + 86400000 * 3).toISOString(),
  })
  assert(record, '借用申请创建成功')
  assert(store.getState().approveBorrow(record.id, '库管员甲'), '审批成功')
  assert(store.getState().checkoutBorrow(record.id, '库管员甲'), '出库成功')
  assertEq(store.getState().returnBorrow(record.id, 'ICU'), null, '归还成功')

  const disinfectRecords = store.getState().disinfectRecords
  const disinfectRecord = disinfectRecords.find((d) => d.deviceId === device.id && d.status === 'pending')
  assert(disinfectRecord, '应找到待消毒记录')
  assert(store.getState().startDisinfect(disinfectRecord.id), '开始消毒成功')
  assertEq(
    store.getState().completeDisinfect(disinfectRecord.id, {
      method: '75%酒精擦拭',
      batchNumber: 'BATCH-EXPORT-001',
      responsiblePerson: '消毒员',
    }),
    null,
    '完成消毒成功'
  )

  const damage = store.getState().createDamageReport({
    deviceId: device.id,
    reporter: '护士长',
    reason: '屏幕显示异常，无法修复',
    reportDate: new Date().toISOString(),
  })
  assert(damage, '报损创建成功')
  store.getState().approveDamage(damage.id, '库管员')

  const history = store.getState().exportDamageReport({ dateFrom: '', dateTo: '' })
  assertEq(history.recordCount, 1, '应导出1条记录')
  assertEq(store.getState().exportHistories.length, 1, '导出历史应有1条')

  const approvedDamage = store.getState().damageReports.find((r) => r.id === damage.id)
  assertEq(approvedDamage.status, 'approved', '报损状态为 approved')
  assert(approvedDamage.lastBorrower === '王护士', '借用人应为王护士，实际：' + approvedDamage.lastBorrower)
  assert(approvedDamage.lastDisinfectBatch === 'BATCH-EXPORT-001', '消毒批次应为 BATCH-EXPORT-001，实际：' + approvedDamage.lastDisinfectBatch)
  assertEq(approvedDamage.reason, '屏幕显示异常，无法修复', '报损原因正确')
})

// ------- 测试 10: 审批时排除自身待审批记录（核心修复回归） -------
test('核心修复：审批自身待审批申请不应被误判为重复借出', () => {
  const store = createTestStore()
  const device = store.getState().devices[0]

  const record = store.getState().createBorrowRequest({
    deviceId: device.id,
    borrowerDepartment: '手术室',
    borrowerName: '张医生',
    reason: '测试',
    borrowDate: new Date().toISOString(),
    expectedReturnDate: new Date(Date.now() + 86400000).toISOString(),
  })
  assert(record && record.status === 'pending', '创建待审批申请成功')

  const validateErrors = store.getState().validateBorrow(device.id, record.id)
  assert(!validateErrors.some((e) => e.message.includes('重复借出')), 'validateBorrow 排除自身后不应有重复借出错误，实际错误：' + JSON.stringify(validateErrors))

  const approved = store.getState().approveBorrow(record.id, '库管员')
  assert(approved && approved.status === 'approved', '审批应成功通过，实际：' + (approved ? approved.status : 'null'))
})

// ------- 汇总 -------
console.log('\n================ 测试结果 ================')
const passed = results.filter((r) => r.passed).length
const total = results.length
console.log('通过: ' + passed + ' / ' + total)
if (passed === total) {
  console.log('🎉 所有测试通过！')
  process.exit(0)
} else {
  console.log('❌ 部分测试失败：')
  results.filter((r) => !r.passed).forEach((r) => console.log('  - ' + r.name + ': ' + r.error))
  process.exit(1)
}
