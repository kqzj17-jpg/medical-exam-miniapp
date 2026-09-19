const exam = require('./utils/exam.js')
const auth = require('./utils/auth.js')

App({
  globalData: {
    candidate: null,
    session: null,
    result: null,
    user: null
  },

  onLaunch() {
    try {
      const candidate = exam.loadCandidate()
      const session = exam.loadSession()
      const result = exam.loadResult()
      const user = auth.loadUser()
      if (candidate) this.globalData.candidate = candidate
      if (session) this.globalData.session = session
      if (result) this.globalData.result = result
      if (user) this.globalData.user = user
    } catch (e) {
      console.warn('restore storage failed', e)
    }
  }
})
