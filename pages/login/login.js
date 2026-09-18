const exam = require('../../utils/exam.js')
const ui = require('../../utils/ui.js')

Page({
  data: {
    ticketNo: '',
    idNo: '',
    demo: exam.DEMO_CANDIDATE,
    stageStyle: ui.DEFAULT_STAGE_STYLE
  },

  onLoad() {
    ui.bindStage(this)
  },

  onShow() {
    ui.applyStage(this)
  },

  onResize() {
    ui.applyStage(this)
  },

  onUnload() {
    ui.unbindStage(this)
  },

  onTicket(e) {
    this.setData({ ticketNo: (e.detail.value || '').trim() })
  },

  onId(e) {
    this.setData({ idNo: (e.detail.value || '').trim() })
  },

  onFillDemo() {
    const demo = exam.DEMO_CANDIDATE
    this.setData({
      ticketNo: demo.ticketNo,
      idNo: demo.idNo
    })
  },

  onLogin() {
    const ticketNo = this.data.ticketNo.trim()
    const idNo = this.data.idNo.trim()
    if (!ticketNo || !idNo) {
      wx.showToast({ title: '请输入准考证号和证件号', icon: 'none' })
      return
    }

    const demo = exam.DEMO_CANDIDATE
    const isDemo = ticketNo === demo.ticketNo
    const candidate = {
      name: isDemo ? demo.name : '练习考生',
      ticketNo,
      idNo,
      examName: demo.examName,
      site: demo.site,
      examTime: demo.examTime
    }

    const session = exam.createSession(candidate)
    const app = getApp()
    app.globalData.candidate = candidate
    app.globalData.session = session
    app.globalData.result = null
    exam.clearExamStorage()
    exam.persistCandidate(candidate)
    exam.persistSession(session)

    wx.redirectTo({ url: '/pages/exam/exam' })
  }
})
