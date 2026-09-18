function readWindowInfo() {
  let info = {
    windowWidth: 667,
    windowHeight: 375,
    screenWidth: 667,
    screenHeight: 375,
    safeArea: null
  }
  try {
    if (typeof wx !== 'undefined' && wx.getWindowInfo) {
      info = Object.assign(info, wx.getWindowInfo())
    } else if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
      info = Object.assign(info, wx.getSystemInfoSync())
    }
  } catch (e) {}
  return info
}

function readInsets(info) {
  const w = info.windowWidth || 0
  const h = info.windowHeight || 0
  const sa = info.safeArea || {}
  const left = Math.max(0, typeof sa.left === 'number' ? sa.left : 0)
  const top = Math.max(0, typeof sa.top === 'number' ? sa.top : 0)
  const right = Math.max(0, typeof sa.right === 'number' ? w - sa.right : 0)
  const bottom = Math.max(0, typeof sa.bottom === 'number' ? h - sa.bottom : 0)
  return { left, top, right, bottom, w, h }
}

function readCapsulePad(info) {
  try {
    if (typeof wx === 'undefined' || !wx.getMenuButtonBoundingClientRect) return 0
    const mb = wx.getMenuButtonBoundingClientRect()
    if (!mb || !mb.left) return 0
    const w = info.windowWidth || 0
    return Math.max(0, w - mb.left + 8)
  } catch (e) {
    return 0
  }
}

const TITLE_H = 32
const NAV_H = 92
const SIDE_RATIO = 0.24
const TYPEBAR_H = 36

function computeLayout(info) {
  const inset = readInsets(info)
  const innerW = inset.w - inset.left - inset.right
  const innerH = inset.h - inset.top - inset.bottom
  const workH = innerH - TITLE_H - NAV_H
  let sideW = innerW * SIDE_RATIO
  if (sideW < 168) sideW = Math.min(168, innerW * 0.3)
  if (sideW > 280) sideW = 280
  const mainW = innerW - sideW
  const qareaH = workH - TYPEBAR_H
  return {
    inset,
    innerW,
    innerH,
    titleH: TITLE_H,
    navH: NAV_H,
    typebarH: TYPEBAR_H,
    workH,
    sideW,
    mainW,
    qareaH,
    complete:
      innerW >= 300 &&
      innerH >= 280 &&
      workH >= 90 &&
      qareaH >= 50 &&
      sideW >= 70 &&
      mainW >= 180
  }
}

function buildShellStyle(info) {
  const inset = readInsets(info)
  const cap = readCapsulePad(info)
  const padRight = Math.max(inset.right, cap)
  const useJs = inset.top + inset.left + inset.bottom + padRight > 0
  return {
    shellStyle: useJs
      ? 'padding-top:' +
        inset.top +
        'px;padding-right:' +
        padRight +
        'px;padding-bottom:' +
        inset.bottom +
        'px;padding-left:' +
        inset.left +
        'px;'
      : '',
    titlebarStyle: ''
  }
}

function applyShell(page) {
  if (typeof wx !== 'undefined' && wx.setPageOrientation) {
    wx.setPageOrientation({ orientation: 'landscape' })
  }
  const info = readWindowInfo()
  const styles = buildShellStyle(info)
  page.setData({
    shellStyle: styles.shellStyle,
    titlebarStyle: styles.titlebarStyle
  })
}

function bindShell(page) {
  applyShell(page)
  if (page._shellBound) return
  page._shellBound = true
  page._onShellResize = function () {
    applyShell(page)
  }
  if (typeof wx !== 'undefined' && wx.onWindowResize) {
    wx.onWindowResize(page._onShellResize)
  }
}

function unbindShell(page) {
  if (typeof wx !== 'undefined' && wx.offWindowResize && page._onShellResize) {
    wx.offWindowResize(page._onShellResize)
  }
  page._shellBound = false
}

module.exports = {
  TITLE_H,
  NAV_H,
  SIDE_RATIO,
  TYPEBAR_H,
  readInsets,
  computeLayout,
  buildShellStyle,
  applyShell,
  bindShell,
  unbindShell,
  applyStage: applyShell,
  bindStage: bindShell,
  unbindStage: unbindShell
}
