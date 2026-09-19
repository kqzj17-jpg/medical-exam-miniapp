const exam = require('../../utils/exam.js')
const ui = require('../../utils/ui.js')
const brand = require('../../utils/brand.js')

Page({
  data: {
    productName: brand.PRODUCT_NAME,
    productTag: brand.PRODUCT_TAG,
    result: {
      candidate: {},
      score: 0,
      correct: 0,
      total: 0,
      accuracyText: '0%',
      usedText: '',
      unanswered: 0,
      autoSubmitted: false,
      details: []
    },
    sectionStats: [],
    review: [],
    details: [],
    showAll: false,
    wrongCount: 0,
    missCount: 0,
    shellStyle: '',
    titlebarStyle: ''
  },

  onLoad() {
    ui.bindShell(this, 'landscape')
    const app = getApp()
    const result = app.globalData.result || exam.loadResult()
    if (!result) {
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }
    const details = result.details || []
    const sectionStats = exam.getSections().map((s) => {
      const stat = (result.bySection && result.bySection[s.id]) || { correct: 0, total: 0 }
      return {
        id: s.id,
        name: s.title || s.name,
        correct: stat.correct,
        total: stat.total
      }
    })
    const wrongCount = details.filter((d) => d.selected && !d.ok).length
    const missCount = details.filter((d) => !d.selected).length
    this.setData({
      result,
      details,
      sectionStats,
      wrongCount,
      missCount,
      showAll: false,
      review: details.filter((d) => !d.ok)
    })
  },

  onShow() {
    ui.applyShell(this, 'landscape')
  },

  onResize() {
    ui.applyShell(this, 'landscape')
  },

  onUnload() {
    ui.unbindShell(this)
  },

  toggleReview() {
    const showAll = !this.data.showAll
    const review = showAll ? this.data.details : this.data.details.filter((d) => !d.ok)
    this.setData({ showAll, review })
  },

  retry() {
    const app = getApp()
    app.globalData.session = null
    app.globalData.result = null
    exam.clearExamStorage()
    wx.redirectTo({ url: '/pages/login/login' })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' })
  }
})
