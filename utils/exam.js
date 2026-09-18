const bank = require('../data/questions.js')

const STORAGE = {
  candidate: 'nmec_candidate',
  session: 'nmec_session',
  result: 'nmec_result'
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

function getQuestions() {
  return bank.QUESTIONS
}

function getSections() {
  return bank.SECTIONS
}

function getQuestionsBySection(sectionId) {
  return bank.QUESTIONS.filter((q) => q.section === sectionId)
}

function getQuestion(qid) {
  return bank.QUESTIONS.find((q) => q.id === qid)
}

function sectionIndex(sectionId) {
  return bank.SECTIONS.findIndex((s) => s.id === sectionId)
}

function createSession(candidate) {
  const first = bank.QUESTIONS[0]
  return {
    candidate: clone(candidate),
    answers: {},
    flagged: {},
    lockedSections: [],
    currentSection: first.section,
    currentQid: first.id,
    startAt: Date.now(),
    duration: bank.DURATION_SECONDS,
    submitted: false
  }
}

function isLocked(session, sectionId) {
  return session.lockedSections.indexOf(sectionId) !== -1
}

function unansweredCount(session, sectionId) {
  const list = sectionId ? getQuestionsBySection(sectionId) : bank.QUESTIONS
  return list.filter((q) => !session.answers[q.id]).length
}

function flaggedCount(session, sectionId) {
  const list = sectionId ? getQuestionsBySection(sectionId) : bank.QUESTIONS
  return list.filter((q) => !!session.flagged[q.id]).length
}

function gridForSection(session, sectionId) {
  return getQuestionsBySection(sectionId).map((q, i) => {
    let status = 'unanswered'
    if (session.flagged[q.id]) status = 'flagged'
    else if (session.answers[q.id]) status = 'answered'
    return {
      id: q.id,
      no: i + 1,
      status,
      current: q.id === session.currentQid
    }
  })
}

function displayNo(qid) {
  const q = getQuestion(qid)
  if (!q) return 1
  const list = getQuestionsBySection(q.section)
  return list.findIndex((item) => item.id === qid) + 1
}

function remainingSeconds(session, now) {
  const nowMs = now || Date.now()
  const used = Math.floor((nowMs - session.startAt) / 1000)
  return Math.max(0, session.duration - used)
}

function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0')
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return m + ' 分 ' + r + ' 秒'
}

function selectAnswer(session, qid, key) {
  const q = getQuestion(qid)
  if (!q || isLocked(session, q.section)) return session
  session.answers[qid] = key
  return session
}

function toggleFlag(session, qid) {
  const q = getQuestion(qid)
  if (!q || isLocked(session, q.section)) return session
  if (session.flagged[qid]) delete session.flagged[qid]
  else session.flagged[qid] = true
  return session
}

function goTo(session, qid) {
  const q = getQuestion(qid)
  if (!q) return session
  session.currentQid = qid
  session.currentSection = q.section
  return session
}

function moveInSection(session, step) {
  const list = getQuestionsBySection(session.currentSection)
  const idx = list.findIndex((q) => q.id === session.currentQid)
  const next = idx + step
  if (next < 0 || next >= list.length) {
    return { session, hitBound: true, atStart: next < 0, atEnd: next >= list.length }
  }
  session.currentQid = list[next].id
  return { session, hitBound: false, atStart: false, atEnd: false }
}

function jumpFiltered(session, predicate) {
  const list = getQuestionsBySection(session.currentSection)
  if (!list.length) return false
  const idx = Math.max(0, list.findIndex((q) => q.id === session.currentQid))
  for (let i = 1; i <= list.length; i++) {
    const q = list[(idx + i) % list.length]
    if (predicate(q, session)) {
      session.currentQid = q.id
      return true
    }
  }
  return false
}

function nextUnanswered(session) {
  return jumpFiltered(session, (q, s) => !s.answers[q.id])
}

function nextFlagged(session) {
  return jumpFiltered(session, (q, s) => !!s.flagged[q.id])
}

function canEnterSection(session, targetId) {
  const from = sectionIndex(session.currentSection)
  const to = sectionIndex(targetId)
  if (to < 0) return false
  if (to <= from) return true
  return to === from + 1
}

function enterSection(session, targetId) {
  const from = sectionIndex(session.currentSection)
  const to = sectionIndex(targetId)
  if (to < 0) return session
  if (to > from) {
    for (let i = from; i < to; i++) {
      const sid = bank.SECTIONS[i].id
      if (session.lockedSections.indexOf(sid) === -1) {
        session.lockedSections.push(sid)
      }
    }
  }
  const list = getQuestionsBySection(targetId)
  session.currentSection = targetId
  session.currentQid = list.length ? list[0].id : session.currentQid
  return session
}

function nextSectionId(session) {
  const i = sectionIndex(session.currentSection)
  if (i < 0 || i >= bank.SECTIONS.length - 1) return ''
  return bank.SECTIONS[i + 1].id
}

function isLastSection(session) {
  return sectionIndex(session.currentSection) === bank.SECTIONS.length - 1
}

function grade(session) {
  let correct = 0
  const bySection = {}
  bank.SECTIONS.forEach((s) => {
    bySection[s.id] = { correct: 0, total: 0 }
  })
  const details = bank.QUESTIONS.map((q) => {
    const selected = session.answers[q.id] || ''
    const ok = selected === q.answer
    if (ok) correct++
    if (!bySection[q.section]) bySection[q.section] = { correct: 0, total: 0 }
    bySection[q.section].total++
    if (ok) bySection[q.section].correct++
    return {
      id: q.id,
      section: q.section,
      selected,
      answer: q.answer,
      ok
    }
  })
  const total = bank.QUESTIONS.length
  const score = total ? Math.round((correct / total) * 100) : 0
  const used = Math.min(
    session.duration,
    Math.max(0, Math.floor((Date.now() - session.startAt) / 1000))
  )
  return {
    candidate: clone(session.candidate),
    correct,
    total,
    score,
    accuracyText: score + '%',
    usedSeconds: used,
    usedText: formatDuration(used),
    unanswered: unansweredCount(session),
    flagged: flaggedCount(session),
    bySection,
    details,
    finishedAt: Date.now(),
    autoSubmitted: !!session.autoSubmitted
  }
}

function persistCandidate(candidate) {
  wx.setStorageSync(STORAGE.candidate, candidate)
}

function persistSession(session) {
  wx.setStorageSync(STORAGE.session, session)
}

function persistResult(result) {
  wx.setStorageSync(STORAGE.result, result)
}

function loadSession() {
  try {
    return wx.getStorageSync(STORAGE.session) || null
  } catch (e) {
    return null
  }
}

function loadCandidate() {
  try {
    return wx.getStorageSync(STORAGE.candidate) || null
  } catch (e) {
    return null
  }
}

function loadResult() {
  try {
    return wx.getStorageSync(STORAGE.result) || null
  } catch (e) {
    return null
  }
}

function clearExamStorage() {
  wx.removeStorageSync(STORAGE.session)
  wx.removeStorageSync(STORAGE.result)
}

function maskIdNo(idNo) {
  const s = String(idNo || '')
  if (s.length < 8) return s
  return s.slice(0, 4) + '**********' + s.slice(-4)
}

module.exports = {
  STORAGE,
  DEMO_CANDIDATE: bank.DEMO_CANDIDATE,
  DURATION_SECONDS: bank.DURATION_SECONDS,
  getQuestions,
  getSections,
  getQuestionsBySection,
  getQuestion,
  createSession,
  isLocked,
  unansweredCount,
  flaggedCount,
  gridForSection,
  displayNo,
  remainingSeconds,
  formatClock,
  formatDuration,
  selectAnswer,
  toggleFlag,
  goTo,
  moveInSection,
  nextUnanswered,
  nextFlagged,
  canEnterSection,
  enterSection,
  nextSectionId,
  isLastSection,
  grade,
  persistCandidate,
  persistSession,
  persistResult,
  loadSession,
  loadCandidate,
  loadResult,
  clearExamStorage,
  maskIdNo
}
