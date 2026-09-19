const exam = require('../../utils/exam.js')
const auth = require('../../utils/auth.js')
const ui = require('../../utils/ui.js')
const brand = require('../../utils/brand.js')

Page({
  data: {
    productName: brand.PRODUCT_NAME,
    productTag: brand.PRODUCT_TAG,
    shellStyle: '',
    titlebarStyle: '',
    nickname: '',
    avatarUrl: '',
    phone: '',
    phoneMasked: '',
    phoneDemo: false,
    phoneHint: '',
    demo: false,
    canStart: false
  },

  onLoad() {
    ui.bindShell(this, 'portrait')
    this.tryWxLogin()
    this.restoreUser()
  },

  onShow() {
    ui.applyShell(this, 'portrait')
    this.askPrivacy()
  },

  onResize() {
    ui.applyShell(this, 'portrait')
  },

  onUnload() {
    ui.unbindShell(this)
  },

  tryWxLogin() {
    if (typeof wx === 'undefined' || !wx.login) return
    wx.login({
      success() {},
      fail() {}
    })
  },

  askPrivacy() {
    if (typeof wx === 'undefined' || !wx.requirePrivacyAuthorize) return
    wx.requirePrivacyAuthorize({
      success() {},
      fail() {}
    })
  },

  restoreUser() {
    const user = auth.loadUser()
    if (!user) return
    this.applyProfile({
      nickname: user.nickname || '',
      avatarUrl: user.avatarUrl || '',
      phone: user.phone || '',
      demo: !!user.demo,
      phoneDemo: !!user.demo,
      phoneHint: user.demo ? '当前为演示资料，非真实微信授权。' : ''
    })
  },

  applyProfile(partial) {
    const next = Object.assign(
      {
        nickname: this.data.nickname,
        avatarUrl: this.data.avatarUrl,
        phone: this.data.phone,
        demo: this.data.demo,
        phoneDemo: this.data.phoneDemo,
        phoneHint: this.data.phoneHint
      },
      partial
    )
    next.phoneMasked = auth.maskPhone(next.phone)
    next.canStart = !!(next.nickname && next.phone)
    this.setData(next)
    auth.persistUser({
      nickname: next.nickname,
      avatarUrl: next.avatarUrl,
      phone: next.phone,
      demo: next.demo
    })
  },

  onChooseAvatar(e) {
    const temp = (e.detail && (e.detail.avatarUrl || e.detail.avatarurl)) || ''
    if (!temp) return
    const self = this
    auth.saveAvatarFile(temp, function (saved) {
      self.applyProfile({ avatarUrl: saved || temp })
    })
  },

  onNickname(e) {
    const nickname = ((e.detail && e.detail.value) || '').trim()
    this.applyProfile({ nickname })
  },

  onNicknameInput(e) {
    const nickname = ((e.detail && e.detail.value) || '').trim()
    this.applyProfile({ nickname })
  },

  onNicknameReview(e) {
    if (e.detail && e.detail.pass === false) {
      wx.showToast({ title: '昵称未通过校验，请重填', icon: 'none' })
    }
  },

  onGetPhoneNumber(e) {
    const d = (e && e.detail) || {}
    const msg = d.errMsg || ''
    const ok = msg.indexOf('ok') !== -1 || d.code || d.encryptedData || d.phoneNumber || d.purePhoneNumber
    if (!ok) {
      wx.showToast({ title: '未获取到手机号，可用演示模式', icon: 'none' })
      return
    }
    const real = d.phoneNumber || d.purePhoneNumber || ''
    if (real) {
      this.applyProfile({
        phone: real,
        demo: false,
        phoneDemo: false,
        phoneHint: '已获取手机号。'
      })
      return
    }
    this.applyProfile({
      phone: auth.DEMO_USER.phone,
      demo: this.data.demo,
      phoneDemo: true,
      phoneHint: '已授权。无后端无法解密真实号码，已用演示号方便继续。'
    })
  },

  onDemoLogin() {
    const demo = auth.DEMO_USER
    this.applyProfile({
      nickname: demo.nickname,
      phone: demo.phone,
      demo: true,
      phoneDemo: true,
      phoneHint: '演示模式：开发工具 / tourist / 测试号无法走真实手机号解密时使用。'
    })
    wx.showToast({ title: '已填入演示资料', icon: 'none' })
  },

  onStart() {
    if (!this.data.nickname || !this.data.phone) {
      wx.showToast({ title: '请先填写昵称并授权手机号', icon: 'none' })
      return
    }
    const candidate = auth.buildCandidate(
      {
        nickname: this.data.nickname,
        avatarUrl: this.data.avatarUrl,
        phone: this.data.phone,
        demo: this.data.demo || this.data.phoneDemo
      },
      exam.DEMO_CANDIDATE
    )
    const session = exam.createSession(candidate)
    const app = getApp()
    app.globalData.candidate = candidate
    app.globalData.session = session
    app.globalData.result = null
    app.globalData.user = {
      nickname: candidate.nickname,
      avatarUrl: candidate.avatarUrl,
      phone: candidate.phone,
      demo: candidate.demo
    }
    exam.clearExamStorage()
    exam.persistCandidate(candidate)
    exam.persistSession(session)
    auth.persistUser(app.globalData.user)
    wx.redirectTo({ url: '/pages/exam/exam' })
  }
})
