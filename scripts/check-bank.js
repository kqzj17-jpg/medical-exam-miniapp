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
assert(bank.SECTIONS.length >= 2, '至少两个分段')

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
})

const a1 = bank.QUESTIONS.filter((q) => q.section === 'A1')
const a3 = bank.QUESTIONS.filter((q) => q.section === 'A3')
assert(a1.length > 0 && a3.length > 0, 'A1、A3 均需有题')
assert(a3.every((q) => q.caseStem), 'A3 应含病例题干')
assert(a1[0].no === 1 && a3[0].no === a1.length + 1, '题号应为全局连续编号')
assert(exam.formatClock(90) === '00:01:30', '剩余时间应为时:分:秒')

const candidate = bank.DEMO_CANDIDATE
const session = exam.createSession(candidate)
assert(session.briefingDone === false, '新建会话须先走须知流程')
assert(session.currentSection === 'A1', '默认从 A1 开始')
assert(exam.maskPhone('13800138000') === '138****8000', '手机号应脱敏展示')
assert(session.candidate.phoneMasked === '138****8000', '会话考生应带脱敏手机号')
const secList = exam.getSectionList(session)
assert(secList[0].label.indexOf('1~') !== -1, '分段列表应含题号范围')
assert(secList[1].label.indexOf('A3') !== -1, '应列出 A3 分段')

exam.selectAnswer(session, session.currentQid, 'C')
assert(session.answers[session.currentQid] === 'C', '作答应写入')
exam.toggleFlag(session, session.currentQid)
assert(session.flagged[session.currentQid], '标疑应写入')

a1.forEach((q) => exam.selectAnswer(session, q.id, q.answer))
assert(exam.unansweredCount(session, 'A1') === 0, 'A1 应全部作答')

const nextId = exam.nextSectionId(session)
assert(nextId === 'A3', '下一段应为 A3')
exam.enterSection(session, 'A3')
assert(exam.isLocked(session, 'A1'), '进入 A3 后 A1 应锁定')
assert(session.currentSection === 'A3', '当前分段应为 A3')

const lockedQ = a1[0].id
const frozen = session.answers[lockedQ]
exam.selectAnswer(session, lockedQ, frozen === 'A' ? 'B' : 'A')
assert(session.answers[lockedQ] === frozen, '锁定分段不可修改答案')

assert(exam.isLocked(session, 'A1'), '回看 A1 仍为锁定')
assert(exam.unansweredCount(session) === a3.length, '进入 A3 后未答题应为 A3 全段')

a3.forEach((q) => exam.selectAnswer(session, q.id, q.answer))
const result = exam.grade(session)
assert(result.total === bank.QUESTIONS.length, '成绩题目总数应一致')
assert(result.correct === bank.QUESTIONS.length, '两段均正确作答应满分')
assert(result.score === 100, '应给出百分制成绩')
assert(result.details && result.details[0] && result.details[0].stem, '成绩明细须含题干，供错题回顾')
assert(result.wrong === 0, '全对时错题数应为 0')

const missSession = exam.createSession(candidate)
const missItems = exam.unansweredItems(missSession)
assert(missItems.length === bank.SECTIONS.length, '未答汇总应按分段列出')
assert(missItems[0].nosText.indexOf('1') !== -1, '未答汇总须含题号')
exam.selectAnswer(missSession, a1[0].id, a1[0].answer === 'A' ? 'B' : 'A')
const graded = exam.grade(missSession)
assert(graded.wrong === 1, '答错一题应计入错题')
assert(graded.unanswered === bank.QUESTIONS.length - 1, '其余应计未答')
assert(graded.details.filter((d) => !d.ok).length === bank.QUESTIONS.length, '错题回顾应包含错题与未答')

console.log('OK', {
  total: bank.QUESTIONS.length,
  a1: a1.length,
  a3: a3.length,
  scoreIfA3AllCorrect: result.score
})
