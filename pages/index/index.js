const ui = require('../../utils/ui.js')

Page({
  data: {
    needRotate: false,
    titleBarPx: 8,
    statusPx: 4,
    capsulePad: 96
  },

  onLoad() {
    ui.applyLandscape(this)
  },

  onShow() {
    ui.applyLandscape(this)
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  }
})
