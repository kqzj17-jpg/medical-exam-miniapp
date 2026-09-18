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

/** 与 pages/exam/exam.wxss 底栏按钮尺寸对齐，供横向装得下估算 */
const OPS = {
  fontSize: 12,
  padX: 8,
  borderX: 4,
  height: 26,
  btnGap: 6,
  groupGap: 8,
  navPadX: 10,
  navPadY: 10,
  wrapGap: 4,
  opsMarginBottom: 6,
  gridH: 24,
  legendH: 16
}

function measureOpsBtn(chars) {
  return chars * OPS.fontSize + OPS.padX * 2 + OPS.borderX
}

function estimateOpsFit(innerW) {
  const prevW = measureOpsBtn(3)
  const nextW = measureOpsBtn(3)
  const rightW = prevW + OPS.btnGap + nextW
  const leftMinW = measureOpsBtn(2)
  const leftOneRow = measureOpsBtn(4) + OPS.btnGap + measureOpsBtn(5) + OPS.btnGap + measureOpsBtn(5)
  const avail = innerW - OPS.navPadX * 2
  const needed = rightW + OPS.groupGap + leftMinW
  const oneRow = leftOneRow + OPS.groupGap + rightW <= avail
  const rows = oneRow ? 1 : 2
  const opsH = rows * OPS.height + (rows - 1) * OPS.wrapGap
  const contentNavH = OPS.navPadY + opsH + OPS.opsMarginBottom + OPS.gridH + OPS.legendH
  const navH = Math.max(NAV_H, contentNavH)
  const nextComplete = needed <= avail && rightW <= avail && nextW > 0 && innerW > 0
  return {
    innerW,
    avail,
    prevW,
    nextW,
    rightW,
    leftMinW,
    leftOneRow,
    needed,
    rows,
    opsH,
    navH,
    nextComplete,
    complete: nextComplete
  }
}

function estimateLegacyFiveButtonRow(innerW, minWidth) {
  const labels = [2, 5, 5, 3, 3]
  const widths = labels.map((n) => Math.max(measureOpsBtn(n), minWidth))
  let total = 0
  widths.forEach((w, i) => {
    total += w
    if (i < widths.length - 1) total += 8
  })
  const avail = innerW - OPS.navPadX * 2
  return { innerW, minWidth, total, avail, fits: total <= avail }
}

function computeLayout(info) {
  const inset = readInsets(info)
  const innerW = inset.w - inset.left - inset.right
  const innerH = inset.h - inset.top - inset.bottom
  const ops = estimateOpsFit(innerW)
  const navH = ops.navH
  const workH = innerH - TITLE_H - navH
  let sideW = innerW * SIDE_RATIO
  if (sideW < 168) sideW = Math.min(168, innerW * 0.3)
  if (sideW > 280) sideW = 280
  const mainW = innerW - sideW
  const qareaH = workH - TYPEBAR_H
  const verticalOk =
    innerW >= 300 &&
    innerH >= 280 &&
    workH >= 90 &&
    qareaH >= 50 &&
    sideW >= 70 &&
    mainW >= 180
  return {
    inset,
    innerW,
    innerH,
    titleH: TITLE_H,
    navH,
    typebarH: TYPEBAR_H,
    workH,
    sideW,
    mainW,
    qareaH,
    ops,
    complete: verticalOk && ops.complete
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
  OPS,
  measureOpsBtn,
  estimateOpsFit,
  estimateLegacyFiveButtonRow,
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
