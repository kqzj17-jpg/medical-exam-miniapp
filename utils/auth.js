const STORAGE_KEY = 'sim_exam_user'

const DEMO_USER = {
  nickname: '演示考生',
  avatarUrl: '',
  phone: '13800138000',
  demo: true
}

function maskPhone(phone) {
  const s = String(phone || '').replace(/\s/g, '')
  if (s.length < 7) return s || ''
  return s.slice(0, 3) + '****' + s.slice(-4)
}

function persistUser(user) {
  try {
    wx.setStorageSync(STORAGE_KEY, user)
  } catch (e) {}
}

function loadUser() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || null
  } catch (e) {
    return null
  }
}

function clearUser() {
  try {
    wx.removeStorageSync(STORAGE_KEY)
  } catch (e) {}
}

function saveAvatarFile(tempPath, done) {
  if (!tempPath) {
    done('')
    return
  }
  if (typeof wx === 'undefined' || !wx.getFileSystemManager) {
    done(tempPath)
    return
  }
  try {
    wx.getFileSystemManager().saveFile({
      tempFilePath: tempPath,
      success(res) {
        done(res.savedFilePath || tempPath)
      },
      fail() {
        done(tempPath)
      }
    })
  } catch (e) {
    done(tempPath)
  }
}

function buildCandidate(profile, bankDemo) {
  const demo = bankDemo || {}
  const nickname = (profile && profile.nickname) || demo.name || '练习考生'
  const phone = (profile && profile.phone) || ''
  return {
    name: nickname,
    nickname,
    avatarUrl: (profile && profile.avatarUrl) || '',
    phone,
    phoneMasked: maskPhone(phone),
    examName: demo.examName || '口腔医学仿真练习（演示）',
    examTime: demo.examTime || '09:00-09:30',
    site: demo.site || '演示考站',
    demo: !!(profile && profile.demo),
    loginAt: Date.now()
  }
}

module.exports = {
  STORAGE_KEY,
  DEMO_USER,
  maskPhone,
  persistUser,
  loadUser,
  clearUser,
  saveAvatarFile,
  buildCandidate
}
