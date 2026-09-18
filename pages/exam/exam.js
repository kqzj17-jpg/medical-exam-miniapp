const exam = require('../../utils/exam.js')

Page({
  data: {
    remainingText: '30:00',
    timeUrgent: false,
    unansweredCount: 0,
    flaggedCount: 0,
    sections: [],
    currentSection: 'A1',
    isLocked: false,
    question: { options: [] },
    displayNo: 1,
    sectionTotal: 0,
    selected: '',
    flagged: false,
    drawerOpen: false,
    grid: [],
    dialog: {
      show: false,
      type: '',
      title: '',
      content: '',
      confirmText: '',
      cancelText: ''
    }
  },

  session: null,
  pendingSection: '',
  timer: null,
  submitting: false,

  onLoad() {
    const app = getApp()
    let session = app.globalData.session || exam.loadSession()
    const candidate = app.globalData.candidate || exam.loadCandidate()
    if (!session || !candidate) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    if (session.submitted) {
      wx.redirectTo({ url: '/pages/result/result' })
      return
    }
    this.session = session
    this.syncView()
    this.startTimer()
  },

  onUnload() {
    this.clearTimer()
  },

  onHide() {
    this.save()
  },

  startTimer() {
    this.clearTimer()
    this.tick()
    this.timer = setInterval(() => this.tick(), 1000)
  },

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  tick() {
    if (!this.session || this.session.submitted) return
    const left = exam.remainingSeconds(this.session)
    this.setData({
      remainingText: exam.formatClock(left),
      timeUrgent: left <= 60
    })
    if (left <= 0) {
      this.clearTimer()
      this.finishExam(true)
    }
  },

  save() {
    if (!this.session) return
    const app = getApp()
    app.globalData.session = this.session
    exam.persistSession(this.session)
  },

  syncView() {
    const session = this.session
    const q = exam.getQuestion(session.currentQid)
    const sections = exam.getSections().map((s) => ({
      id: s.id,
      name: s.name,
      locked: exam.isLocked(session, s.id)
    }))
    const sectionQs = exam.getQuestionsBySection(session.currentSection)
    this.setData({
      unansweredCount: exam.unansweredCount(session),
      flaggedCount: exam.flaggedCount(session),
      sections,
      currentSection: session.currentSection,
      isLocked: exam.isLocked(session, session.currentSection),
      question: q,
      displayNo: exam.displayNo(session.currentQid),
      sectionTotal: sectionQs.length,
      selected: session.answers[session.currentQid] || '',
      flagged: !!session.flagged[session.currentQid],
      grid: exam.gridForSection(session, session.currentSection)
    })
    this.save()
  },

  showDialog(cfg) {
    this.setData({
      dialog: {
        show: true,
        type: cfg.type,
        title: cfg.title || '提示',
        content: cfg.content || '',
        confirmText: cfg.confirmText || '确定',
        cancelText: cfg.cancelText || ''
      }
    })
  },

  hideDialog() {
    this.setData({
      'dialog.show': false,
      'dialog.type': ''
    })
    this.pendingSection = ''
  },

  onDialogCancel() {
    this.hideDialog()
  },

  onDialogConfirm() {
    const type = this.data.dialog.type
    if (type === 'nextSection') {
      const target = this.pendingSection || exam.nextSectionId(this.session)
      this.hideDialog()
      if (target) {
        exam.enterSection(this.session, target)
        this.syncView()
      }
      return
    }
    if (type === 'submit') {
      this.hideDialog()
      this.finishExam(false)
      return
    }
    if (type === 'submitted') {
      this.hideDialog()
      wx.redirectTo({ url: '/pages/result/result' })
      return
    }
    this.hideDialog()
  },

  askEnterSection(targetId) {
    this.pendingSection = targetId
    this.showDialog({
      type: 'nextSection',
      title: '进入下一段',
      content: '考试将进入下一分段. 进入后本段试题将无法再作修改. 确认要进入下一段考试吗?',
      confirmText: '进入下一段',
      cancelText: '继续作答'
    })
  },

  onTapSection(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === this.session.currentSection) return
    const currentIdx = exam.getSections().findIndex((s) => s.id === this.session.currentSection)
    const targetIdx = exam.getSections().findIndex((s) => s.id === id)
    if (targetIdx > currentIdx && !exam.isLocked(this.session, this.session.currentSection)) {
      this.askEnterSection(id)
      return
    }
    exam.enterSection(this.session, id)
    this.syncView()
  },

  onSelect(e) {
    if (this.data.isLocked) return
    const key = e.currentTarget.dataset.key
    exam.selectAnswer(this.session, this.session.currentQid, key)
    this.syncView()
  },

  onFlag() {
    if (this.data.isLocked) {
      wx.showToast({ title: '此题不可回看', icon: 'none' })
      return
    }
    exam.toggleFlag(this.session, this.session.currentQid)
    this.syncView()
  },

  onJumpUnanswered() {
    const ok = exam.nextUnanswered(this.session)
    if (!ok) {
      wx.showToast({ title: '当前分段没有未答题', icon: 'none' })
      return
    }
    this.syncView()
  },

  onJumpFlagged() {
    const ok = exam.nextFlagged(this.session)
    if (!ok) {
      wx.showToast({ title: '当前分段没有标疑题', icon: 'none' })
      return
    }
    this.syncView()
  },

  onPrev() {
    const res = exam.moveInSection(this.session, -1)
    if (res.hitBound) {
      wx.showToast({ title: '已是本段第一题', icon: 'none' })
      return
    }
    this.syncView()
  },

  onNext() {
    const res = exam.moveInSection(this.session, 1)
    if (res.hitBound && res.atEnd) {
      const nextId = exam.nextSectionId(this.session)
      if (nextId && !exam.isLocked(this.session, this.session.currentSection)) {
        this.askEnterSection(nextId)
        return
      }
      if (exam.isLastSection(this.session) || exam.isLocked(this.session, this.session.currentSection)) {
        wx.showToast({ title: '已是本段最后一题', icon: 'none' })
      }
      return
    }
    this.syncView()
  },

  onTapGrid(e) {
    const id = e.currentTarget.dataset.id
    exam.goTo(this.session, id)
    this.syncView()
  },

  toggleDrawer() {
    this.setData({ drawerOpen: !this.data.drawerOpen })
  },

  onAskSubmit() {
    const n = exam.unansweredCount(this.session)
    const content =
      n > 0
        ? '您还有 ' + n + ' 道试题未答. 确认要完成考试吗?'
        : '全部试题已作答. 确认要完成考试吗?'
    this.showDialog({
      type: 'submit',
      title: '完成考试',
      content,
      confirmText: '确认交卷',
      cancelText: '继续作答'
    })
  },

  finishExam(autoSubmitted) {
    if (this.submitting || !this.session || this.session.submitted) return
    this.submitting = true
    this.clearTimer()
    this.session.submitted = true
    this.session.autoSubmitted = !!autoSubmitted
    const result = exam.grade(this.session)
    result.autoSubmitted = !!autoSubmitted
    const app = getApp()
    app.globalData.session = this.session
    app.globalData.result = result
    exam.persistSession(this.session)
    exam.persistResult(result)
    this.showDialog({
      type: 'submitted',
      title: '交卷成功',
      content: autoSubmitted
        ? '考试时间已到，系统已自动交卷。交卷成功！祝您好运！'
        : '交卷成功！祝您好运！',
      confirmText: '查看成绩',
      cancelText: ''
    })
  },

  noop() {}
})
