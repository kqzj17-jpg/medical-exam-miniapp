function applyLandscape(page) {
  if (wx.setPageOrientation) {
    wx.setPageOrientation({ orientation: 'landscape' })
  }
  const sys = wx.getSystemInfoSync()
  let cap = { top: 6, height: 24, bottom: 32, left: sys.windowWidth, width: 0 }
  try {
    cap = wx.getMenuButtonBoundingClientRect() || cap
  } catch (e) {}
  const titleBarPx = Math.max((cap.bottom || 32) + 4, 28)
  const capsulePad = Math.max(8, sys.windowWidth - (cap.left || sys.windowWidth) + 8)
  page.setData({
    needRotate: sys.windowWidth < sys.windowHeight,
    titleBarPx,
    statusPx: cap.top || 4,
    capsulePad
  })
}

module.exports = {
  applyLandscape
}
