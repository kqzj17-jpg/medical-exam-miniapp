const brand = require('./brand.js')

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

const TITLE_H = 28
const NAV_H = 72
const SIDE_RATIO = 0.2
const TYPEBAR_H = 28

/** 与 pages/exam/exam.wxss 压缩后的底栏对齐，把垂直空间让给题干 */
const OPS = {
  fontSize: 11,
  padX: 6,
  borderX: 2,
  height: 24,
  btnGap: 6,
  groupGap: 8,
  navPadX: 8,
  navPadY: 6,
  wrapGap: 2,
  opsMarginBottom: 4,
  gridH: 20,
  legendH: 14
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
  if (sideW < 140) sideW = Math.min(140, innerW * 0.3)
  if (sideW > 200) sideW = 200
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

function buildShellStyle(info, orientation) {
  const inset = readInsets(info)
  const cap = readCapsulePad(info)
  const landscape = orientation === 'landscape'
  let titlebarStyle = ''
  // Portrait: titlebar consumes status-bar + capsule. Shell must NOT also pad-top
  // (env(safe-area) + JS inset + titlebar height stacked = 页面被顶歪).
  let padTop = landscape ? inset.top : 0
  // Portrait: never pad the shell on the right (titlebar already clears the capsule).
  // env(safe-area-inset-right) + JS padRight stacked looks like a full-height vertical line.
  let padRight = landscape ? Math.max(inset.right, cap) : 0
  const padBottom = inset.bottom
  const padLeft = inset.left

  if (!landscape) {
    let barPadTop = inset.top
    let barH = 44 + barPadTop
    let barPadRight = Math.max(16, cap)
    try {
      if (typeof wx !== 'undefined' && wx.getMenuButtonBoundingClientRect) {
        const mb = wx.getMenuButtonBoundingClientRect()
        if (mb && mb.height && mb.bottom) {
          barPadTop = Math.max(0, mb.top)
          const below = Math.max(6, barPadTop - (inset.top || 0))
          barH = mb.bottom + below
          barPadRight = Math.max(16, cap)
        }
      }
    } catch (e) {}
    titlebarStyle =
      'padding-top:' +
      barPadTop +
      'px;height:' +
      barH +
      'px;min-height:' +
      barH +
      'px;padding-right:' +
      barPadRight +
      'px;box-sizing:border-box;'
  } else if (cap) {
    titlebarStyle = 'padding-right:' + Math.max(12, cap) + 'px;'
  }

  return {
    shellStyle:
      'padding-top:' +
      padTop +
      'px;padding-right:' +
      padRight +
      'px;padding-bottom:' +
      padBottom +
      'px;padding-left:' +
      padLeft +
      'px;',
    titlebarStyle
  }
}

function applyShell(page, orientation, opts) {
  const options = opts && typeof opts === 'object' ? opts : {}
  const dir = orientation || page._shellOrientation || 'portrait'
  page._shellOrientation = dir
  const skipOrientation = !!options.skipOrientation
  // Portrait: page-meta + page json only. setPageOrientation('portrait') on
  // navigateTo(login) makes DevTools rotate 90° (「进入登录都是歪的」).
  // Landscape: call API only when last !== landscape. Resize always skips.
  if (!skipOrientation) {
    if (dir === 'landscape' && page._lastPageOrientation !== 'landscape') {
      page._lastPageOrientation = 'landscape'
      if (typeof wx !== 'undefined' && wx.setPageOrientation) {
        wx.setPageOrientation({ orientation: dir })
      }
    } else if (dir !== 'landscape') {
      page._lastPageOrientation = dir
    }
  }
  const info = readWindowInfo()
  const styles = buildShellStyle(info, dir)
  page.setData({
    shellStyle: styles.shellStyle,
    titlebarStyle: styles.titlebarStyle,
    productName: brand.PRODUCT_NAME,
    productTag: brand.PRODUCT_TAG
  })
}

function bindShell(page, orientation) {
  page._shellOrientation = orientation || page._shellOrientation || 'portrait'
  applyShell(page, page._shellOrientation)
  if (page._shellBound) return
  page._shellBound = true
  page._onShellResize = function () {
    applyShell(page, page._shellOrientation, { skipOrientation: true })
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
  PRODUCT_NAME: brand.PRODUCT_NAME,
  PRODUCT_TAG: brand.PRODUCT_TAG,
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
