const fs = require('fs')
const path = require('path')
const ui = require('../utils/ui.js')

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const app = JSON.parse(fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8'))
assert(app.pageOrientation === 'landscape', 'app.json 顶层须 pageOrientation: landscape')
assert(app.window && app.window.pageOrientation === 'landscape', 'app.json window 须 pageOrientation: landscape')

;['index', 'login', 'exam', 'result'].forEach((name) => {
  const json = JSON.parse(fs.readFileSync(path.join(__dirname, '../pages/' + name + '/' + name + '.json'), 'utf8'))
  assert(json.pageOrientation === 'landscape', name + ' 页面 json 须横屏')
  const wxml = fs.readFileSync(path.join(__dirname, '../pages/' + name + '/' + name + '.wxml'), 'utf8')
  const wxss = fs.readFileSync(path.join(__dirname, '../pages/' + name + '/' + name + '.wxss'), 'utf8')
  const js = fs.readFileSync(path.join(__dirname, '../pages/' + name + '/' + name + '.js'), 'utf8')
  assert(wxml.indexOf('page-orientation="landscape"') !== -1, name + ' wxml 须含 page-meta landscape')
  assert(wxml.indexOf('transform:scale') === -1, name + ' wxml 不应再 scale')
  assert(wxss.indexOf('transform:scale') === -1, name + ' wxss 不应再 scale')
  assert(js.indexOf('DEFAULT_STAGE_STYLE') === -1, name + ' 不应再使用固定舞台')
})

const uiSrc = fs.readFileSync(path.join(__dirname, '../utils/ui.js'), 'utf8')
assert(uiSrc.indexOf('Math.max(w / DESIGN_W') === -1, 'ui.js 不应再 cover scale')
assert(uiSrc.indexOf('safe-area') !== -1 || uiSrc.indexOf('safeArea') !== -1, 'ui.js 须处理 safeArea')
assert(fs.readFileSync(path.join(__dirname, '../app.wxss'), 'utf8').indexOf('safe-area-inset') !== -1, 'app.wxss 须含安全区 padding')

const sizes = [
  { name: 'iPhone14 横屏', windowWidth: 844, windowHeight: 390, safeArea: { left: 47, top: 0, right: 797, bottom: 369 } },
  { name: 'iPhone14 Pro Max 横屏', windowWidth: 926, windowHeight: 428, safeArea: { left: 47, top: 0, right: 879, bottom: 407 } },
  { name: 'iPhone SE 横屏', windowWidth: 667, windowHeight: 375, safeArea: { left: 0, top: 0, right: 667, bottom: 375 } },
  { name: 'iPad/桌面', windowWidth: 1280, windowHeight: 800, safeArea: { left: 0, top: 0, right: 1280, bottom: 800 } }
]

const results = sizes.map((s) => {
  const layout = ui.computeLayout(s)
  assert(layout.complete, s.name + ' 关键区域无法完整排布: ' + JSON.stringify(layout))
  assert(layout.workH + layout.titleH + layout.navH === layout.innerH, s.name + ' 高度应被标题+工作区+底栏分完')
  assert(layout.qareaH > 0, s.name + ' 题干区高度须为正')
  assert(layout.sideW / layout.innerW >= 0.2 && layout.sideW / layout.innerW <= 0.3, s.name + ' 左栏约 22%~26%')
  return {
    name: s.name,
    inner: Math.round(layout.innerW) + 'x' + Math.round(layout.innerH),
    side: Math.round(layout.sideW),
    qareaH: Math.round(layout.qareaH),
    navH: layout.navH,
    ok: layout.complete
  }
})

console.log('UI layout OK')
results.forEach((r) => {
  console.log(' - ' + r.name + ': inner ' + r.inner + ', sidebar ' + r.side + 'px, qareaH ' + r.qareaH + 'px, navH ' + r.navH + ' => complete')
})
