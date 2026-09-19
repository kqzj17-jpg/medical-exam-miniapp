const fs = require('fs')
const path = require('path')
const ui = require('../utils/ui.js')

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function flatten(src) {
  return src.replace(/\s+/g, ' ')
}

const brand = require('../utils/brand.js')

const app = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'))
assert(app.pageOrientation !== 'landscape', 'app.json 顶层不应锁定 landscape，否则说明/登录无法竖屏')
assert(app.pageOrientation === 'auto' || app.pageOrientation === 'portrait', 'app.json 顶层须 auto 或 portrait 以允许分页面旋转')
assert(app.window && (app.window.pageOrientation === 'portrait' || app.window.pageOrientation === 'auto'), 'window 默认应为 portrait 或 auto')
assert(brand.PRODUCT_NAME === '模拟仿真考试系统', '产品名须为模拟仿真考试系统')
assert(app.window.navigationBarTitleText === brand.PRODUCT_NAME, 'app.json 标题须为产品名')

const project = JSON.parse(fs.readFileSync(path.join(__dirname, '../project.config.json'), 'utf8'))
assert(String(project.description).indexOf(brand.PRODUCT_NAME) !== -1, 'project 描述须含产品名')

function collectFiles(dir, acc) {
  fs.readdirSync(dir).forEach((name) => {
    if (name === '.git' || name === 'node_modules') return
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) collectFiles(p, acc)
    else if (/\.(js|json|wxml|wxss|md|html)$/.test(name)) acc.push(p)
  })
  return acc
}

const selfPath = path.normalize(__filename)
const needles = ['国家' + '医学考试', '考试' + '中心', '考试' + '网', 'NM' + 'EC', 'nm' + 'ec']
collectFiles(path.join(__dirname, '..'), []).forEach((file) => {
  if (path.normalize(file) === selfPath) return
  const src = fs.readFileSync(file, 'utf8')
  needles.forEach((n) => {
    assert(src.toLowerCase().indexOf(n.toLowerCase()) === -1, file + ' 含禁用字眼: ' + n)
  })
})

const ORIENT = {
  index: 'portrait',
  login: 'portrait',
  exam: 'landscape',
  result: 'landscape'
}

;['index', 'login', 'exam', 'result'].forEach((name) => {
  const json = JSON.parse(fs.readFileSync(path.join(__dirname, '../pages/' + name + '/' + name + '.json'), 'utf8'))
  assert(json.pageOrientation === ORIENT[name], name + ' 页面 json 须 ' + ORIENT[name])
  const wxml = fs.readFileSync(path.join(__dirname, '../pages/' + name + '/' + name + '.wxml'), 'utf8')
  const wxss = fs.readFileSync(path.join(__dirname, '../pages/' + name + '/' + name + '.wxss'), 'utf8')
  const js = fs.readFileSync(path.join(__dirname, '../pages/' + name + '/' + name + '.js'), 'utf8')
  assert(wxml.indexOf('page-orientation="' + ORIENT[name] + '"') !== -1, name + ' wxml 须含 page-meta ' + ORIENT[name])
  assert(wxml.indexOf('transform:scale') === -1, name + ' wxml 不应再 scale')
  assert(wxss.indexOf('transform:scale') === -1, name + ' wxss 不应再 scale')
  assert(js.indexOf('DEFAULT_STAGE_STYLE') === -1, name + ' 不应再使用固定舞台')
  assert(wxml.indexOf('{{productName}}') !== -1, name + ' 须使用产品名绑定')
  assert(js.indexOf("'" + ORIENT[name] + "'") !== -1 || js.indexOf('"' + ORIENT[name] + '"') !== -1, name + ' 须按页 setPageOrientation ' + ORIENT[name])
  assert(
    js.indexOf('skipOrientation: true') !== -1 || js.indexOf('skipOrientation:true') !== -1,
    name + ' onResize 须 skipOrientation:true，禁止在 resize 里再 setPageOrientation'
  )
  if (ORIENT[name] === 'portrait') {
    assert(wxml.indexOf('class="desk"') === -1, name + ' 竖屏页不应再用横屏 desk 窗口壳')
    assert(wxml.indexOf('class="win ') === -1 && wxml.indexOf('class="win"') === -1, name + ' 竖屏页不应再用桌面窗口壳')
    assert(wxss.indexOf('.cta') !== -1, name + ' 竖屏页须有清晰主按钮')
  }
})

const uiSrc = fs.readFileSync(path.join(__dirname, '../utils/ui.js'), 'utf8')
assert(uiSrc.indexOf('Math.max(w / DESIGN_W') === -1, 'ui.js 不应再 cover scale')
assert(uiSrc.indexOf('safe-area') !== -1 || uiSrc.indexOf('safeArea') !== -1, 'ui.js 须处理 safeArea')
assert(uiSrc.indexOf('estimateOpsFit') !== -1, 'ui.js 须估算底栏按钮横向是否装得下')
assert(uiSrc.indexOf("orientation: dir") !== -1 || uiSrc.indexOf('orientation:dir') !== -1, 'ui.js 须按页设置 orientation，不能写死 landscape')
assert(uiSrc.indexOf('skipOrientation') !== -1, 'resize 时须 skipOrientation，避免 setPageOrientation 死循环闪屏')
assert(uiSrc.indexOf('_lastPageOrientation') !== -1, '须记录上次方向，相同则不再 setPageOrientation')
assert(uiSrc.indexOf("wx.setPageOrientation({ orientation: 'landscape' })") === -1, 'ui.js 不应无条件强制横屏')
assert(
  /_onShellResize[\s\S]*skipOrientation:\s*true/.test(uiSrc),
  'bindShell 的 window resize 回调须 skipOrientation:true'
)

const loginWxss = fs.readFileSync(path.join(__dirname, '../pages/login/login.wxss'), 'utf8')
assert(/height:\s*48px/.test(loginWxss) && loginWxss.indexOf('.inp') !== -1, '登录输入框须足够高，方便竖屏点按输入')
const loginWxml = fs.readFileSync(path.join(__dirname, '../pages/login/login.wxml'), 'utf8')
assert(loginWxml.indexOf('chooseAvatar') !== -1, '登录须支持选择微信头像')
assert(loginWxml.indexOf('type="nickname"') !== -1, '登录须用 nickname 输入框')
assert(loginWxml.indexOf('getPhoneNumber') !== -1, '登录须有授权手机号按钮')
assert(loginWxml.indexOf('演示模式') !== -1, '登录须提供演示模式兜底')
assert(loginWxml.indexOf('准考证号') === -1, '登录主流程不应再要求准考证号')

const appWxss = fs.readFileSync(path.join(__dirname, '../app.wxss'), 'utf8')
assert(appWxss.indexOf('safe-area-inset') !== -1, 'app.wxss 须含安全区 padding')
assert(/button\s*\{[^}]*min-width:\s*0/.test(flatten(appWxss)), 'app.wxss button 须 min-width:0 覆盖微信默认')
assert(/\.win-btn\s*\{[^}]*min-width:\s*0/.test(flatten(appWxss)), 'app.wxss .win-btn 须 min-width:0')

const examWxml = fs.readFileSync(path.join(__dirname, '../pages/exam/exam.wxml'), 'utf8')
assert(examWxml.indexOf('phoneMasked') !== -1, '作答页须展示手机号（可脱敏）')
assert(examWxml.indexOf('准考证号') === -1, '作答页主信息不应再以准考证为主')
assert(examWxml.indexOf('class="ops-left"') !== -1, 'exam 底栏须分 ops-left（标疑等可换行）')
assert(examWxml.indexOf('class="ops-right"') !== -1, 'exam 底栏须分 ops-right（上一题/下一题）')
assert(examWxml.indexOf('ops-spacer') === -1, '不应再用 spacer 把下一题顶出屏幕')
const rightChunk = examWxml.match(/class="ops-right"[\s\S]*?<\/view>/)
assert(rightChunk, '找不到 ops-right 闭合')
assert(rightChunk[0].indexOf('上一题') !== -1 && rightChunk[0].indexOf('下一题') !== -1, '上一题/下一题必须写在 ops-right 内')
assert(examWxml.indexOf('bindtap="onPrev"') !== -1 && examWxml.indexOf('bindtap="onNext"') !== -1, '上一题/下一题须可点')
assert(examWxml.indexOf('未答汇总') !== -1, '交卷对话框须有未答汇总')
const resultWxml = fs.readFileSync(path.join(__dirname, '../pages/result/result.wxml'), 'utf8')
assert(resultWxml.indexOf('错题回顾') !== -1, '成绩页须有错题回顾')

const examWxss = fs.readFileSync(path.join(__dirname, '../pages/exam/exam.wxss'), 'utf8')
const examFlat = flatten(examWxss)
const navBlock = examWxss.match(/\.nav\s*\{[^}]+\}/)
assert(navBlock && /width:\s*100%/.test(navBlock[0]), '.nav 宽度须 100%')
assert(navBlock && /box-sizing:\s*border-box/.test(navBlock[0]), '.nav 须 box-sizing:border-box')
assert(/\.ops-left\s*\{[^}]*flex-wrap:\s*wrap/.test(examFlat), 'ops-left 须允许换行')
assert(/\.ops-left\s*\{[^}]*min-width:\s*0/.test(examFlat), 'ops-left 须 min-width:0，避免把右区挤出')
assert(/\.ops-right\s*\{[^}]*flex-shrink:\s*0/.test(examFlat), 'ops-right 须 flex-shrink:0')
assert(/\.ops\s+\.win-btn\s*\{[^}]*min-width:\s*0/.test(examFlat), '底栏按钮须 min-width:0')
assert(/\.ops-right\s+\.win-btn\s*\{[^}]*flex-shrink:\s*0/.test(examFlat), '上一题/下一题按钮须 flex-shrink:0')

const sizes = [
  { name: 'iPhone14 横屏', windowWidth: 844, windowHeight: 390, safeArea: { left: 47, top: 0, right: 797, bottom: 369 } },
  { name: 'iPhone14 Pro Max 横屏', windowWidth: 926, windowHeight: 428, safeArea: { left: 47, top: 0, right: 879, bottom: 407 } },
  { name: 'iPhone SE 横屏', windowWidth: 667, windowHeight: 375, safeArea: { left: 0, top: 0, right: 667, bottom: 375 } },
  { name: '窄横屏扣除刘海 inner600', windowWidth: 667, windowHeight: 375, safeArea: { left: 44, top: 0, right: 644, bottom: 375 } },
  { name: 'iPad/桌面', windowWidth: 1280, windowHeight: 800, safeArea: { left: 0, top: 0, right: 1280, bottom: 800 } }
]

const results = sizes.map((s) => {
  const layout = ui.computeLayout(s)
  assert(layout.complete, s.name + ' 关键区域无法完整排布: ' + JSON.stringify(layout))
  assert(layout.workH + layout.titleH + layout.navH === layout.innerH, s.name + ' 高度应被标题+工作区+底栏分完')
  assert(layout.qareaH > 0, s.name + ' 题干区高度须为正')
  assert(layout.sideW / layout.innerW >= 0.2 && layout.sideW / layout.innerW <= 0.3, s.name + ' 左栏约 22%~26%')
  assert(layout.ops && layout.ops.complete, s.name + ' 底栏「下一题」横向装不下: ' + JSON.stringify(layout.ops))
  assert(layout.ops.rightW + layout.ops.leftMinW + ui.OPS.groupGap <= layout.ops.avail, s.name + ' 右区两按钮+左区最小宽须 ≤ innerW(扣除 nav padding)')
  return {
    name: s.name,
    inner: Math.round(layout.innerW) + 'x' + Math.round(layout.innerH),
    side: Math.round(layout.sideW),
    qareaH: Math.round(layout.qareaH),
    navH: layout.navH,
    ops: 'right ' + layout.ops.rightW + ' + leftMin ' + layout.ops.leftMinW + ' = ' + layout.ops.needed + ' / avail ' + layout.ops.avail,
    ok: layout.complete
  }
})

console.log('UI layout OK')
results.forEach((r) => {
  console.log(
    ' - ' +
      r.name +
      ': inner ' +
      r.inner +
      ', sidebar ' +
      r.side +
      'px, qareaH ' +
      r.qareaH +
      'px, navH ' +
      r.navH +
      ', ops ' +
      r.ops +
      ' => complete'
  )
})

console.log('Ops row innerW simulations')
;[600, 667, 750].forEach((w) => {
  const fit = ui.estimateOpsFit(w)
  assert(fit.complete, 'innerW=' + w + ' 下一题无法完整落入可视区: ' + JSON.stringify(fit))
  const layout = ui.computeLayout({
    windowWidth: w,
    windowHeight: 375,
    safeArea: { left: 0, top: 0, right: w, bottom: 375 }
  })
  assert(layout.complete, 'innerW=' + w + ' 整页 complete 失败: ' + JSON.stringify(layout))
  assert(layout.ops.nextComplete, 'innerW=' + w + ' 下一题须 complete')
  console.log(
    ' - innerW=' +
      w +
      ': nextW=' +
      fit.nextW +
      ' rightW=' +
      fit.rightW +
      ' leftMin=' +
      fit.leftMinW +
      ' needed=' +
      fit.needed +
      ' avail=' +
      fit.avail +
      ' rows=' +
      fit.rows +
      ' => next complete'
  )
})

const legacy = ui.estimateLegacyFiveButtonRow(667, 184)
assert(!legacy.fits, '回归：微信默认 min-width:184 的五按钮横排在 667 应装不下（否则检测失去意义）')
console.log(' - legacy 5-btn min-width 184 @667: total ' + legacy.total + ' / avail ' + legacy.avail + ' => overflow (expected)')

let setCount = 0
let resizeHandler = null
global.wx = {
  setPageOrientation() {
    setCount += 1
  },
  onWindowResize(fn) {
    resizeHandler = fn
  },
  offWindowResize() {},
  getWindowInfo() {
    return {
      windowWidth: 667,
      windowHeight: 375,
      safeArea: { left: 0, top: 0, right: 667, bottom: 375 }
    }
  }
}

const pageA = { setData() {} }
ui.applyShell(pageA, 'landscape')
assert(setCount === 1, '首次进入 landscape 应 setPageOrientation')
assert(pageA._lastPageOrientation === 'landscape', '须记下上次方向')
ui.applyShell(pageA, 'landscape')
assert(setCount === 1, '相同方向不得再次 setPageOrientation')
ui.applyShell(pageA, 'landscape', { skipOrientation: true })
assert(setCount === 1, 'skipOrientation 不得调用 setPageOrientation')
ui.applyShell(pageA, 'portrait')
assert(setCount === 2, '方向真正变化时才 setPageOrientation')

const pageB = { setData() {} }
ui.bindShell(pageB, 'landscape')
assert(setCount === 3, 'bindShell 首次应 setPageOrientation')
assert(typeof resizeHandler === 'function', '须绑定 onWindowResize')
resizeHandler()
resizeHandler()
assert(setCount === 3, 'onWindowResize 只重建 shell 样式，禁止再 setPageOrientation')
console.log(' - orientation guard: setPageOrientation only on real change; resize skip => OK')

