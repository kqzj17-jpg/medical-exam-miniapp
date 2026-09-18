const ui = require('../../utils/ui.js')

Page({
  data: {
    shellStyle: '',
    titlebarStyle: ''
  },

  onLoad() {
    ui.bindShell(this)
  },

  onShow() {
    ui.applyShell(this)
  },

  onResize() {
    ui.applyShell(this)
  },

  onUnload() {
    ui.unbindShell(this)
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  }
})
