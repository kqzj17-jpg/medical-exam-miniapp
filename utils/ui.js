const DESIGN_W = 1280
const DESIGN_H = 800

function computeStage(sys) {
  const w = (sys && sys.windowWidth) || 375
  const h = (sys && sys.windowHeight) || 667
  const scale = Math.max(w / DESIGN_W, h / DESIGN_H)
  const left = Math.round((w - DESIGN_W * scale) / 2)
  const top = Math.round((h - DESIGN_H * scale) / 2)
  return {
    scale,
    left,
    top,
    stageStyle:
      'position:absolute;left:' +
      left +
      'px;top:' +
      top +
      'px;width:' +
      DESIGN_W +
      'px;height:' +
      DESIGN_H +
      'px;transform:scale(' +
      scale +
      ');transform-origin:0 0;'
  }
}

function applyStage(page) {
  if (typeof wx !== 'undefined' && wx.setPageOrientation) {
    wx.setPageOrientation({ orientation: 'landscape' })
  }
  let sys = { windowWidth: 667, windowHeight: 375 }
  try {
    sys = wx.getSystemInfoSync() || sys
  } catch (e) {}
  const fit = computeStage(sys)
  page.setData({
    stageStyle: fit.stageStyle,
    stageScale: fit.scale
  })
}

function bindStage(page) {
  applyStage(page)
  if (page._stageBound) return
  page._stageBound = true
  page._onStageResize = function () {
    applyStage(page)
  }
  if (typeof wx !== 'undefined' && wx.onWindowResize) {
    wx.onWindowResize(page._onStageResize)
  }
}

function unbindStage(page) {
  if (typeof wx !== 'undefined' && wx.offWindowResize && page._onStageResize) {
    wx.offWindowResize(page._onStageResize)
  }
  page._stageBound = false
}

module.exports = {
  DESIGN_W,
  DESIGN_H,
  DEFAULT_STAGE_STYLE: computeStage({ windowWidth: 667, windowHeight: 375 }).stageStyle,
  computeStage,
  applyStage,
  bindStage,
  unbindStage
}
