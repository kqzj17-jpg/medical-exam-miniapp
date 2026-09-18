const exam = require('../../utils/exam.js')

Page({
  data: {
    result: {
      candidate: {},
      score: 0,
      correct: 0,
      total: 0,
      accuracyText: '0%',
      usedText: '',
      unanswered: 0,
      autoSubmitted: false
    },
    sectionStats: []
  },

  onLoad() {
    const app = getApp()
    const result = app.globalData.result || exam.loadResult()
    if (!result) {
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }
    const sectionStats = exam.getSections().map((s) => {
      const stat = (result.bySection && result.bySection[s.id]) || { correct: 0, total: 0 }
      return {
        id: s.id,
        name: s.title || s.name,
        correct: stat.correct,
        total: stat.total
      }
    })
    this.setData({ result, sectionStats })
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
