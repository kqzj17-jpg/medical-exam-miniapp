const ui = require('../../utils/ui.js')
const brand = require('../../utils/brand.js')

Page({
  data: {
    productName: brand.PRODUCT_NAME,
    productTag: brand.PRODUCT_TAG,
    shellStyle: '',
    titlebarStyle: ''
  },

  onLoad() {
    ui.bindShell(this, 'portrait')
  },

  onShow() {
    ui.applyShell(this, 'portrait')
  },

  onResize() {
    ui.applyShell(this, 'portrait', { skipOrientation: true })
  },

  onUnload() {
    ui.unbindShell(this)
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/login' })
  }
})
