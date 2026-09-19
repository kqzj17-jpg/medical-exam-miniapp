const exam = require('../../utils/exam.js')
const ui = require('../../utils/ui.js')
const brand = require('../../utils/brand.js')
const briefing = require('../../utils/briefing.js')

const TEXTS = [briefing.NOTICE, briefing.RULES, briefing.PROMISE]

Page({
  data: {
    productName: brand.PRODUCT_NAME,
    productTag: brand.PRODUCT_TAG,
    shellStyle: '',
    titlebarStyle: '',
    steps: briefing.STEPS,
    current: 0,
    stepTitle: briefing.NOTICE_TITLE,
    paragraphs: briefing.NOTICE,
    confirmText: briefing.STEPS[0].confirm,
    readReady: false,
    agreed: false,
    canConfirm: false,
    reminderShow: false,
    reminderTitle: briefing.REMINDER_TITLE,
    reminderLines: briefing.REMINDER
  },

  session: null,

  onLoad() {
    ui.bindShell(this, 'landscape')
    const app = getApp()
    const session = app.globalData.session || exam.loadSession()
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
    this.applyStep(0)
  },

  onShow() {
    ui.applyShell(this, 'landscape')
  },

  onResize() {
    ui.applyShell(this, 'landscape', { skipOrientation: true })
    this.checkPaperFits()
  },

  onUnload() {
    ui.unbindShell(this)
  },

  applyStep(i) {
    const step = briefing.STEPS[i]
    const paragraphs = TEXTS[i] || briefing.PROMISE
    const readReady = false
    const agreed = false
    this.setData(
      {
        current: i,
        stepTitle: step.title,
        paragraphs,
        confirmText: step.confirm,
        readReady,
        agreed,
        reminderShow: false,
        canConfirm: false
      },
      () => {
        const self = this
        setTimeout(function () {
          self.checkPaperFits()
        }, 50)
      }
    )
  },

  checkPaperFits() {
    if (this.data.current >= 2 || this.data.readReady) return
    if (typeof this.createSelectorQuery !== 'function') {
      this.onScrollEnd()
      return
    }
    const self = this
    this.createSelectorQuery()
      .select('.qarea')
      .boundingClientRect()
      .select('.paper')
      .boundingClientRect()
      .exec(function (res) {
        const area = res && res[0]
        const paper = res && res[1]
        if (!area || !paper || !area.height) return
        if (paper.height <= area.height + 24) self.onScrollEnd()
      })
  },

  onMarkRead() {
    this.onScrollEnd()
  },

  onScrollEnd() {
    const canConfirm = this.data.current === 2 ? this.data.agreed : true
    this.setData({ readReady: true, canConfirm })
  },

  onToggleAgree() {
    const agreed = !this.data.agreed
    this.setData({
      agreed,
      readReady: true,
      canConfirm: agreed
    })
  },

  onBack() {
    if (this.data.reminderShow) {
      this.setData({ reminderShow: false })
      return
    }
    if (this.data.current === 0) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.applyStep(this.data.current - 1)
  },

  onConfirm() {
    if (!this.data.canConfirm) {
      wx.showToast({
        title: this.data.current === 2 ? '请先勾选同意' : '请先滚动阅读全文',
        icon: 'none'
      })
      return
    }
    if (this.data.current < 2) {
      this.applyStep(this.data.current + 1)
      return
    }
    this.setData({ reminderShow: true, current: 3 })
  },

  onReminderCancel() {
    this.setData({ reminderShow: false, current: 2 })
    this.applyStep(2)
  },

  onEnterExam() {
    const session = this.session
    if (!session) return
    session.briefingDone = true
    session.startAt = Date.now()
    try {
      wx.setStorageSync('sim_exam_briefing', { at: Date.now(), demo: true })
    } catch (e) {}
    const app = getApp()
    app.globalData.session = session
    exam.persistSession(session)
    wx.redirectTo({ url: '/pages/exam/exam' })
  }
})
