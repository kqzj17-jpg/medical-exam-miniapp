const ui = require('../../utils/ui.js')

Page({
  data: {
    stageStyle: ui.DEFAULT_STAGE_STYLE,
    showFitHint: false
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

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  }
})
