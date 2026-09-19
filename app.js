const exam = require('./utils/exam.js')

App({
  globalData: {
    candidate: null,
    session: null,
    result: null
  },

  onLaunch() {
    try {
      const candidate = exam.loadCandidate()
      const session = exam.loadSession()
      const result = exam.loadResult()
      if (candidate) this.globalData.candidate = candidate
      if (session) this.globalData.session = session
      if (result) this.globalData.result = result
    } catch (e) {
      console.warn('restore storage failed', e)
    }
  }
})
