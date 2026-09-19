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
assert(
  !Object.prototype.hasOwnProperty.call(app, 'requiredPrivateInfos'),
  'app.json 不应含 requiredPrivateInfos：getPhoneNumber 不是该字段合法值，模拟器会无法启动'
)

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
  notice: 'landscape',
  exam: 'landscape',
  result: 'landscape'
}

;['index', 'login', 'notice', 'exam', 'result'].forEach((name) => {
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
    assert(wxml.indexOf('portrait-shell') !== -1, name + ' 须用竖屏壳，不得套横屏机考 chrome')
    assert(wxml.indexOf('exam-shell') === -1, name + ' 竖屏页不得渲染横屏机考壳')
    assert(js.indexOf("'landscape'") === -1 && js.indexOf('"landscape"') === -1, name + ' 竖屏页不得 setPageOrientation landscape')
    assert(wxml.indexOf('show-scrollbar') !== -1, name + ' 竖屏 scroll-view 须隐藏滚动条，避免内容区右侧竖线')
  }
  if (ORIENT[name] === 'landscape') {
    assert(js.indexOf("'portrait'") === -1 && js.indexOf('"portrait"') === -1, name + ' 横屏页不得卡在 portrait')
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
  uiSrc.indexOf("dir === 'landscape'") !== -1 || uiSrc.indexOf('dir === "landscape"') !== -1,
  'setPageOrientation 仅允许 landscape；竖屏只靠 page-meta / json，避免进登录 90° 歪斜'
)
assert(
  /_onShellResize[\s\S]*skipOrientation:\s*true/.test(uiSrc),
  'bindShell 的 window resize 回调须 skipOrientation:true'
)

const portraitShell = ui.buildShellStyle(
  {
    windowWidth: 393,
    windowHeight: 852,
    safeArea: { left: 0, top: 59, right: 393, bottom: 818 }
  },
  'portrait'
)
assert(
  /padding-top:0px/.test(portraitShell.shellStyle.replace(/\s/g, '')),
  '竖屏 shell 顶 padding 须为 0，避免与 titlebar 叠出双倍安全区把页面顶歪'
)
assert(
  /padding-right:0px/.test(portraitShell.shellStyle.replace(/\s/g, '')),
  '竖屏 shell 右 padding 须为 0，避免与滚动条叠成全高竖线'
)
const portraitShellRight = ui.buildShellStyle(
  {
    windowWidth: 393,
    windowHeight: 852,
    safeArea: { left: 0, top: 59, right: 380, bottom: 818 }
  },
  'portrait'
)
assert(
  /padding-right:0px/.test(portraitShellRight.shellStyle.replace(/\s/g, '')),
  '竖屏即使 safeArea.right 非满宽，shell 也不得再 padRight'
)
assert(
  /padding-top:59px/.test(portraitShell.titlebarStyle.replace(/\s/g, '')),
  '竖屏 titlebar 须自己消化 safe-area-top，并给胶囊留右 padding'
)
assert(
  /padding-right:\d+px/.test(portraitShell.titlebarStyle),
  '竖屏 titlebar 须避开微信胶囊'
)
const landShell = ui.buildShellStyle(
  {
    windowWidth: 852,
    windowHeight: 393,
    safeArea: { left: 59, top: 0, right: 818, bottom: 393 }
  },
  'landscape'
)
assert(/padding-left:59px/.test(landShell.shellStyle.replace(/\s/g, '')), '横屏 shell 须避开左侧刘海')
assert(/padding-top:0px/.test(landShell.shellStyle.replace(/\s/g, '')), '横屏刘海在左右，顶 inset 通常为 0')

const loginWxss = fs.readFileSync(path.join(__dirname, '../pages/login/login.wxss'), 'utf8')
assert(/height:\s*48px/.test(loginWxss) && loginWxss.indexOf('.inp') !== -1, '登录输入框须足够高，方便竖屏点按输入')
const loginWxml = fs.readFileSync(path.join(__dirname, '../pages/login/login.wxml'), 'utf8')
assert(loginWxml.indexOf('chooseAvatar') !== -1, '登录须支持选择微信头像')
assert(loginWxml.indexOf('type="nickname"') !== -1, '登录须用 nickname 输入框')
assert(loginWxml.indexOf('getPhoneNumber') !== -1, '登录须有授权手机号按钮')
assert(loginWxml.indexOf('onDemoLogin') !== -1, '登录须提供演示账号兜底')
assert(loginWxml.indexOf('演示账号') !== -1 || loginWxml.indexOf('演示模式') !== -1, '登录须提供演示模式兜底')
assert(loginWxml.indexOf('没有真机授权') !== -1, '演示按钮文案须完整可读，不能是挤扁的「演示模式（开发工具/测试号）」')
assert(loginWxml.indexOf('开始练习') !== -1 && loginWxml.indexOf('开始练习') < loginWxml.indexOf('onDemoLogin'), '登录底栏须先「开始练习」再演示入口')
assert(loginWxml.indexOf('准考证号') === -1, '登录主流程不应再要求准考证号')
assert(
  /button\.cta[\s\S]*display:\s*block/.test(flatten(loginWxss)) || /display:\s*block\s*!important/.test(loginWxss),
  '登录 CTA 须 display:block 覆盖全局 inline-flex，避免按钮被挤成碎块'
)
assert(/width:\s*100%\s*!important/.test(loginWxss), '登录 CTA 须 width:100% !important')
assert(/white-space:\s*normal/.test(loginWxss), '登录 CTA 文案须允许换行而不是裁切')
assert(/min-height:\s*48px/.test(loginWxss), '登录 CTA 须有固定最小高度')

const appWxss = fs.readFileSync(path.join(__dirname, '../app.wxss'), 'utf8')
assert(appWxss.indexOf('safe-area-inset') !== -1, 'app.wxss 须含安全区 padding')
assert(/button\s*\{[^}]*min-width:\s*0/.test(flatten(appWxss)), 'app.wxss button 须 min-width:0 覆盖微信默认')
assert(/\.win-btn\s*\{[^}]*min-width:\s*0/.test(flatten(appWxss)), 'app.wxss .win-btn 须 min-width:0')
const portraitShellCss = appWxss.match(/\.portrait-shell\s*\{[^}]+\}/)
assert(
  portraitShellCss && portraitShellCss[0].indexOf('padding-right') === -1,
  '竖屏壳 CSS 不得 padding-right，避免与滚动条叠成全高竖线'
)
assert(appWxss.indexOf('::-webkit-scrollbar') !== -1, '须隐藏 portrait-body 滚动条')

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
const loginJs = fs.readFileSync(path.join(__dirname, '../pages/login/login.js'), 'utf8')
assert(loginJs.indexOf('/pages/notice/notice') !== -1, '开始练习须先进入须知流程')
assert(loginJs.indexOf('/pages/exam/exam') === -1, '登录不得直达作答，须经过须知/规则/承诺')

const briefing = require('../utils/briefing.js')
assert(briefing.NOTICE_TITLE === '仿真练习须知', '须知标题须为仿真练习须知')
assert(briefing.RULES_TITLE === '仿真练习规则', '规则标题须为仿真练习规则')
assert(briefing.PROMISE_TITLE === '练习承诺', '承诺标题须为练习承诺')
assert(briefing.NOTICE.join('').length > 180 && briefing.RULES.join('').length > 160, '须知/规则须有完整原创段落')
assert(briefing.NOTICE.join('').indexOf('演示') !== -1 && briefing.NOTICE.join('').indexOf('非正式') !== -1, '须知须标明演示、非正式考核')
assert(briefing.RULES.join('').indexOf('锁定') !== -1 && briefing.RULES.join('').indexOf('标疑') !== -1, '规则须覆盖分段锁定与标疑')
assert(briefing.REMINDER.join('').indexOf('倒计时') !== -1 || briefing.REMINDER.join('').indexOf('剩余时间') !== -1, '提醒须说明计时从进场后开始')

const noticeWxml = fs.readFileSync(path.join(__dirname, '../pages/notice/notice.wxml'), 'utf8')
assert(noticeWxml.indexOf('已阅读确认') !== -1, '须知页须有已阅读确认')
assert(noticeWxml.indexOf('我已读完') !== -1, '一屏装得下时须提供「我已读完」，避免 scrolltolower 永不触发')
const noticeJs = fs.readFileSync(path.join(__dirname, '../pages/notice/notice.js'), 'utf8')
assert(noticeJs.indexOf('checkPaperFits') !== -1 && noticeJs.indexOf('boundingClientRect') !== -1, 'applyStep 后须测量 paper 是否一屏内并自动点亮确认')
assert(noticeWxml.indexOf('练习承诺') !== -1, '须有练习承诺步骤')
assert(noticeWxml.indexOf('onEnterExam') !== -1, '提醒对话框须能进入作答')
assert(noticeWxml.indexOf('show-scrollbar') !== -1, '须知页滚动条须隐藏')

const examJsGate = fs.readFileSync(path.join(__dirname, '../pages/exam/exam.js'), 'utf8')
assert(examJsGate.indexOf('briefingDone') !== -1, '未完成须知不得直接进作答')
assert(app.pages.indexOf('pages/notice/notice') !== -1, 'app.json 须注册须知页')
assert(examWxml.indexOf('show-scrollbar') !== -1, '作答题干区须隐藏滚动条，避免右侧竖线')
assert(examWxml.indexOf('qareaScrollTop') !== -1, '换题须把题干滚回顶部')
const examJs = fs.readFileSync(path.join(__dirname, '../pages/exam/exam.js'), 'utf8')
assert(examJs.indexOf('qareaScrollTop') !== -1 && examJs.indexOf('q-start') !== -1, '换题须重置 qarea 滚动到题干')
assert(ui.NAV_H <= 76 && ui.TITLE_H <= 28 && ui.TYPEBAR_H <= 28, '作答 chrome 须压缩，把高度让给题干')
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
assert(ui.SIDE_RATIO === 0.2, '左栏比例须约 20%')
assert(/max-width:\s*880px/.test(examWxss), '题干栏须限宽并居中，避免贴在侧栏边上')

const sizes = [
  { name: 'iPhone14 横屏', windowWidth: 844, windowHeight: 390, safeArea: { left: 47, top: 0, right: 797, bottom: 369 } },
  { name: 'iPhone14 Pro Max 横屏', windowWidth: 926, windowHeight: 428, safeArea: { left: 47, top: 0, right: 879, bottom: 407 } },
  { name: 'iPhone SE 横屏', windowWidth: 667, windowHeight: 375, safeArea: { left: 0, top: 0, right: 667, bottom: 375 } },
  { name: 'iPhone15 Pro 横屏', windowWidth: 852, windowHeight: 393, safeArea: { left: 59, top: 0, right: 818, bottom: 393 } },
  { name: '矮横屏 320', windowWidth: 844, windowHeight: 320, safeArea: { left: 0, top: 0, right: 844, bottom: 320 } },
  { name: '窄横屏扣除刘海 inner600', windowWidth: 667, windowHeight: 375, safeArea: { left: 44, top: 0, right: 644, bottom: 375 } },
  { name: 'iPad/桌面', windowWidth: 1280, windowHeight: 800, safeArea: { left: 0, top: 0, right: 1280, bottom: 800 } }
]

const results = sizes.map((s) => {
  const layout = ui.computeLayout(s)
  assert(layout.complete, s.name + ' 关键区域无法完整排布: ' + JSON.stringify(layout))
  assert(layout.workH + layout.titleH + layout.navH === layout.innerH, s.name + ' 高度应被标题+工作区+底栏分完')
  assert(layout.qareaH > 0, s.name + ' 题干区高度须为正')
  assert(layout.sideW <= 200, s.name + ' 左栏不得宽于 200，避免挡住题干')
  assert(layout.sideW >= Math.min(140, layout.innerW * 0.2) - 1, s.name + ' 左栏过窄')
  assert(layout.sideW / layout.innerW <= 0.28, s.name + ' 左栏占比应约 20%')
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

const pageP = { setData() {} }
ui.applyShell(pageP, 'portrait')
assert(setCount === 0, '竖屏不得调用 setPageOrientation，否则 navigateTo 登录会 90° 歪斜')
assert(pageP._lastPageOrientation === 'portrait', '竖屏仍须记下 last，方便之后进横屏')
ui.applyShell(pageP, 'portrait')
assert(setCount === 0, '重复竖屏不得 setPageOrientation')

const pageA = { setData() {} }
ui.applyShell(pageA, 'landscape')
assert(setCount === 1, '首次进入 landscape 应 setPageOrientation')
assert(pageA._lastPageOrientation === 'landscape', '须记下上次方向')
ui.applyShell(pageA, 'landscape')
assert(setCount === 1, '相同方向不得再次 setPageOrientation')
ui.applyShell(pageA, 'landscape', { skipOrientation: true })
assert(setCount === 1, 'skipOrientation 不得调用 setPageOrientation')
ui.applyShell(pageA, 'portrait')
assert(setCount === 1, '回到竖屏不得再调 setPageOrientation，交给 page-meta')

const pageB = { setData() {} }
ui.bindShell(pageB, 'landscape')
assert(setCount === 2, 'bindShell landscape 首次应 setPageOrientation')
assert(typeof resizeHandler === 'function', '须绑定 onWindowResize')
resizeHandler()
resizeHandler()
assert(setCount === 2, 'onWindowResize 只重建 shell 样式，禁止再 setPageOrientation')

const pageC = { setData() {} }
ui.bindShell(pageC, 'portrait')
assert(setCount === 2, 'bindShell portrait 不得 setPageOrientation')
console.log(' - orientation guard: landscape-only setPageOrientation; portrait/resize skip => OK')

