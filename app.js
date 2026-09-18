App({
  globalData: {
    candidate: null,
    session: null,
    result: null
  },

  onLaunch() {
    if (wx.setPageOrientation) {
      wx.setPageOrientation({ orientation: 'landscape' })
    }
    try {
      const candidate = wx.getStorageSync('nmec_candidate')
      const session = wx.getStorageSync('nmec_session')
      const result = wx.getStorageSync('nmec_result')
      if (candidate) this.globalData.candidate = candidate
      if (session) this.globalData.session = session
      if (result) this.globalData.result = result
    } catch (e) {
      console.warn('restore storage failed', e)
    }
  }
})
