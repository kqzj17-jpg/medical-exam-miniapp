/**
 * 本地校验：题库完整性与分段/交卷逻辑（不依赖微信运行时）
 */
global.wx = {
  setStorageSync() {},
  getStorageSync() { return null },
  removeStorageSync() {}
}

const bank = require('../data/questions.js')
const exam = require('../utils/exam.js')

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(bank.QUESTIONS.length >= 40, '题库应不少于 40 题')
assert(bank.SECTIONS.length >= 4, '须有 A1 / A2 / A3A4 / B1 四段')

const sectionIds = bank.SECTIONS.map((s) => s.id)
assert(sectionIds.join(',') === 'A1,A2,A3A4,B1', '分段顺序须为 A1 → A2 → A3A4 → B1')
assert(bank.SECTIONS.find((s) => s.id === 'A3A4').name.indexOf('A3') !== -1, 'A3/A4 段须在左侧标出')

const keys = ['A', 'B', 'C', 'D', 'E']
const ids = {}
bank.QUESTIONS.forEach((q, i) => {
  assert(q.id && !ids[q.id], '题目 id 缺失或重复: ' + (q && q.id))
  ids[q.id] = true
  assert(q.demo === true, '题目应标明演示: ' + q.id)
  assert(q.section && q.stem && q.answer && q.explanation, '题目字段不完整: ' + q.id)
  assert(Array.isArray(q.options) && q.options.length === 5, '应为 A-E 五选项: ' + q.id)
  q.options.forEach((opt, idx) => {
    assert(opt.key === keys[idx] && opt.text, '选项格式错误: ' + q.id)
  })
  assert(keys.indexOf(q.answer) !== -1, '答案必须为 A-E: ' + q.id)
  if (i > 0) assert(q.no === bank.QUESTIONS[i - 1].no + 1, '题号须全局连续: ' + q.id)
})

const bySec = {}
sectionIds.forEach((id) => {
  bySec[id] = bank.QUESTIONS.filter((q) => q.section === id)
})
assert(bySec.A1.length >= 20, 'A1 演示题应足够多，便于底栏滚动')
assert(bySec.A2.length > 0 && bySec.A3A4.length > 0 && bySec.B1.length > 0, 'A2、A3A4、B1 均需有题')
assert(bySec.A2.every((q) => q.caseStem), 'A2 应含病例摘要')
assert(bySec.A3A4.every((q) => q.caseStem), 'A3/A4 应含病例题干')
assert(bySec.B1.every((q) => q.caseStem), 'B1 应标明共用备选答案')
assert(bySec.A1[0].no === 1, '题号应从 1 连续编号')
assert(bySec.A2[0].no === bySec.A1.length + 1, 'A2 应接在 A1 之后连续编号')
assert(exam.formatClock(90) === '00:01:30', '剩余时间应为时:分:秒')

const candidate = bank.DEMO_CANDIDATE
const session = exam.createSession(candidate)
assert(session.briefingDone === false, '新建会话须先走须知流程')
assert(session.currentSection === 'A1', '默认从 A1 开始')
assert(exam.maskPhone('13800138000') === '138****8000', '手机号应脱敏展示')
assert(session.candidate.phoneMasked === '138****8000', '会话考生应带脱敏手机号')

const secList = exam.getSectionList(session)
assert(secList.length === 4, '左侧须列出四段')
assert(secList[0].label.indexOf('1~') !== -1, '分段列表应含题号范围')
assert(secList[2].name.indexOf('A3') !== -1, '应列出 A3/A4 分段')
assert(secList.every((s) => /:\s*\d+~\d+/.test(s.label)), '每段须标注连续题号范围')

const gridA1 = exam.gridForSection(session, 'A1')
assert(gridA1.length === bySec.A1.length, '底栏答题卡只渲染当前段')
assert(gridA1.every((c) => bySec.A1.some((q) => q.id === c.id)), '答题卡不得混入其他段')
assert(gridA1.length !== bank.QUESTIONS.length, '不得一次画出全卷题号')

exam.selectAnswer(session, session.currentQid, 'C')
assert(session.answers[session.currentQid] === 'C', '作答应写入')
exam.toggleFlag(session, session.currentQid)
assert(session.flagged[session.currentQid], '标疑应写入')

assert(exam.nextSectionId(session) === 'A2', 'A1 下一段应为 A2')
assert(exam.canEnterSection(session, 'A2'), '可进入紧邻的下一段')
assert(!exam.canEnterSection(session, 'A3A4'), '不得跳过 A2 进入 A3/A4')
assert(!exam.canEnterSection(session, 'B1'), '不得从 A1 跳到 B1')
assert(!exam.canGoTo(session, bySec.A2[0].id), '不得用题号跳到其他段')
exam.goTo(session, bySec.A2[0].id)
assert(session.currentSection === 'A1', 'grid/goTo 跨段应被拒绝')

const skipped = exam.createSession(candidate)
exam.enterSection(skipped, 'A3A4')
assert(skipped.currentSection === 'A1', 'enterSection 跳段须失败')

bySec.A1.forEach((q) => exam.selectAnswer(session, q.id, q.answer))
assert(exam.unansweredCount(session, 'A1') === 0, 'A1 应全部作答')

exam.enterSection(session, 'A2')
assert(exam.isLocked(session, 'A1'), '进入 A2 后 A1 应锁定')
assert(session.currentSection === 'A2', '当前分段应为 A2')
assert(!exam.canEnterSection(session, 'A1'), '锁定后不可回看 A1')
exam.enterSection(session, 'A1')
assert(session.currentSection === 'A2', 'enterSection 回看须失败')

const lockedQ = bySec.A1[0].id
const frozen = session.answers[lockedQ]
exam.selectAnswer(session, lockedQ, frozen === 'A' ? 'B' : 'A')
assert(session.answers[lockedQ] === frozen, '锁定分段不可修改答案')
assert(!exam.canGoTo(session, lockedQ), '不得跳回已锁定分段')

const movePrev = exam.moveInSection(session, -1)
assert(movePrev.hitBound && movePrev.atStart, '上一题不能跨出本段')

assert(exam.unansweredCount(session) === bank.QUESTIONS.length - bySec.A1.length, '进入 A2 后未答应为后续各段')

bySec.A2.forEach((q) => exam.selectAnswer(session, q.id, q.answer))
assert(exam.nextSectionId(session) === 'A3A4', 'A2 下一段应为 A3A4')
exam.enterSection(session, 'A3A4')
assert(exam.isLocked(session, 'A2'), '进入 A3/A4 后 A2 应锁定')
assert(!exam.canEnterSection(session, 'A2'), '不可回看 A2')
assert(exam.getTypeHint(session.currentSection).length > 10, '题型条须有当前段说明')

bySec.A3A4.forEach((q) => exam.selectAnswer(session, q.id, q.answer))
exam.enterSection(session, 'B1')
assert(exam.isLocked(session, 'A3A4'), '进入 B1 后 A3/A4 应锁定')
assert(exam.isLastSection(session), 'B1 应为最后一段')
assert(!exam.nextSectionId(session), 'B1 之后没有下一段')

bySec.B1.forEach((q) => exam.selectAnswer(session, q.id, q.answer))
const result = exam.grade(session)
assert(result.total === bank.QUESTIONS.length, '成绩题目总数应一致')
assert(result.correct === bank.QUESTIONS.length, '四段均正确作答应满分')
assert(result.score === 100, '应给出百分制成绩')
assert(result.details && result.details[0] && result.details[0].stem, '成绩明细须含题干，供错题回顾')
assert(result.wrong === 0, '全对时错题数应为 0')
assert(result.bySection.A1 && result.bySection.B1, '成绩须按 A1/A2/A3A4/B1 分段')

const missSession = exam.createSession(candidate)
const missItems = exam.unansweredItems(missSession)
assert(missItems.length === bank.SECTIONS.length, '未答汇总应按分段列出')
assert(missItems[0].nosText.indexOf('1') !== -1, '未答汇总须含题号')
exam.selectAnswer(missSession, bySec.A1[0].id, bySec.A1[0].answer === 'A' ? 'B' : 'A')
const graded = exam.grade(missSession)
assert(graded.wrong === 1, '答错一题应计入错题')
assert(graded.unanswered === bank.QUESTIONS.length - 1, '其余应计未答')
assert(graded.details.filter((d) => !d.ok).length === bank.QUESTIONS.length, '错题回顾应包含错题与未答')

console.log('OK', {
  total: bank.QUESTIONS.length,
  a1: bySec.A1.length,
  a2: bySec.A2.length,
  a3a4: bySec.A3A4.length,
  b1: bySec.B1.length,
  ranges: secList.map((s) => s.label)
})
