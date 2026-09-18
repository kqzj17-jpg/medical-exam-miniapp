const ui = require('../utils/ui.js')

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const phone = ui.computeStage({ windowWidth: 375, windowHeight: 667 })
assert(Math.abs(phone.scale - 375 / 1280) < 1e-6, '竖屏应按宽度等比缩放')
assert(phone.scale * 800 < 667, '缩放后高度应落入窗口')
assert(phone.left === 0, '竖屏应水平铺满')
assert(phone.top > 0, '竖屏应垂直居中留灰边')

const land = ui.computeStage({ windowWidth: 667, windowHeight: 375 })
assert(land.scale * 1280 <= 667 + 1e-6, '横屏宽度不溢出')
assert(land.scale * 800 <= 375 + 1e-6, '横屏高度不溢出')

const pc = ui.computeStage({ windowWidth: 1280, windowHeight: 800 })
assert(pc.scale === 1, '1280×800 应为 1:1')
assert(pc.left === 0 && pc.top === 0, '1:1 无偏移')

console.log('UI fit OK', {
  phone: { scale: Number(phone.scale.toFixed(3)), top: phone.top },
  land: { scale: Number(land.scale.toFixed(3)), left: land.left },
  pc: { scale: pc.scale }
})
