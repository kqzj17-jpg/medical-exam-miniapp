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
assert(phone.scale === Math.max(375 / 1280, 667 / 800), '竖屏应为 cover 统一 scale')
assert(phone.stageStyle.indexOf('scale(' + phone.scale + ')') !== -1, 'scaleX 与 scaleY 必须相同')
assert(phone.stageStyle.indexOf(',') === -1 || phone.stageStyle.indexOf('scale(') < phone.stageStyle.lastIndexOf('scale('), '不得使用分开的 scaleX,scaleY')

const land = ui.computeStage({ windowWidth: 667, windowHeight: 375 })
const expectedLand = Math.max(667 / 1280, 375 / 800)
assert(Math.abs(land.scale - expectedLand) < 1e-9, '横屏应为 cover 统一 scale')
assert(land.scale * 1280 >= 667 - 1e-6, 'cover 应盖住宽度')
assert(land.scale * 800 >= 375 - 1e-6, 'cover 应盖住高度')

const pc = ui.computeStage({ windowWidth: 1280, windowHeight: 800 })
assert(pc.scale === 1, '1280×800 应为 1:1')
assert(pc.left === 0 && pc.top === 0, '1:1 无偏移')

console.log('UI fit OK', {
  phone: { scale: Number(phone.scale.toFixed(3)), left: phone.left, top: phone.top },
  land: { scale: Number(land.scale.toFixed(3)), left: land.left, top: land.top },
  pc: { scale: pc.scale }
})
