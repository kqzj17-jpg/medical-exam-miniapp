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
  assert(wxml.indexOf('page-orientation="landscape"') !== -1, name + ' wxml 须含 page-meta landscape')
  assert(wxml.indexOf('fit-hint') === -1, name + ' 不应再显示缩放提示')
})

const phone = ui.computeStage({ windowWidth: 375, windowHeight: 667 })
assert(phone.left === 0 && phone.top === 0, '应贴边铺满，不留 letterbox')
assert(Math.abs(phone.scaleX * 1280 - 375) < 1e-6, '竖屏应拉满宽度')
assert(Math.abs(phone.scaleY * 800 - 667) < 1e-6, '竖屏应拉满高度')

const land = ui.computeStage({ windowWidth: 667, windowHeight: 375 })
assert(land.left === 0 && land.top === 0, '横屏贴边')
assert(Math.abs(land.scaleX * 1280 - 667) < 1e-6, '横屏应拉满宽度')
assert(Math.abs(land.scaleY * 800 - 375) < 1e-6, '横屏应拉满高度')

const pc = ui.computeStage({ windowWidth: 1280, windowHeight: 800 })
assert(pc.scaleX === 1 && pc.scaleY === 1, '1280×800 应为 1:1')

console.log('UI fit OK', {
  phone: { scaleX: Number(phone.scaleX.toFixed(3)), scaleY: Number(phone.scaleY.toFixed(3)) },
  land: { scaleX: Number(land.scaleX.toFixed(3)), scaleY: Number(land.scaleY.toFixed(3)) },
  pc: { scaleX: pc.scaleX, scaleY: pc.scaleY }
})
