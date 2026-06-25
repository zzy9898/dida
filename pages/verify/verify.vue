<script setup lang="ts">
import { ref, onUnmounted, getCurrentInstance, nextTick } from 'vue'
import { useAppStore } from '@/stores/app'
import { MOCK_SCHOOLS, QUESTIONNAIRE_QUESTIONS } from '@/data/mock'
import type { GenderType, RegisterParam } from '@/data/types'
import * as userApi from '@/api/user'
import { CAPTCHA_ID } from '@/config'
// #ifndef MP-WEIXIN
import { getCaptchaResult } from '@/utils/captcha'
// #endif
// #ifdef MP-WEIXIN
import { beginMpCaptcha, settleMpCaptcha } from '@/utils/captcha'
// #endif

const store = useAppStore()

// ==================== Stage tracking ====================
const currentStep = ref<number>(0) // 0:login 1:verify 2:questionnaire 3:profile

// ==================== Stage 0: Login state ====================
const authMode = ref<'login' | 'register'>('login')
const loginMethod = ref<'phone' | 'wechat'>('phone')
const phoneOrWechatInput = ref('')
// 登录方式（仅 login + phone 下）：密码 / 短信验证码
const loginType = ref<'password' | 'sms'>('password')
const loginPassword = ref('')
const loginSmsCode = ref('')
const loginSmsCountdown = ref(0)
const submitting = ref(false)
// 微信小程序 captcha4 组件显隐
const mpCaptchaVisible = ref(false)
// 注册补充字段（后端必填）
const realName = ref('')
const regPassword = ref('')

// ==================== Stage 1: Verify state ====================
const selectedSchool = ref(MOCK_SCHOOLS[0])
const emailPrefix = ref('')
const verificationCode = ref('')
const isCodeSent = ref(false)
const countdown = ref(0)
const verifyError = ref('')
const verifyTab = ref<'unified' | 'chsi'>('unified')
const studentId = ref('202600135')
const unifiedPassword = ref('')
const smsCode = ref('')
const chsiCode = ref('')
const smsCountdown = ref(0)

// ==================== Stage 2: Questionnaire state ====================
const answers = ref<Record<string, string[]>>({
  interests: [],
  activity_prefs: [],
  personality: []
})

// ==================== Stage 3: Profile state ====================
const nickname = ref('')
const age = ref(20)
const gender = ref<GenderType>('FEMALE')
const selectedAvatarIdx = ref(0)
const phone = ref('')
const wechat = ref('')
const emergencyName = ref('')
const emergencyPhone = ref('')
const showSkipModal = ref(false)

// ==================== Avatar presets ====================
const femaleAvatars = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80'
]

const maleAvatars = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80'
]

// ==================== Timer references ====================
let countdownTimer: ReturnType<typeof setInterval> | null = null
let smsTimer: ReturnType<typeof setInterval> | null = null
let loginSmsTimer: ReturnType<typeof setInterval> | null = null

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (smsTimer) clearInterval(smsTimer)
  if (loginSmsTimer) clearInterval(loginSmsTimer)
})

// ==================== Helper: navigate to home ====================
function goHome() {
  uni.switchTab({ url: '/pages/home/home' })
}

// ==================== Stage 0: Login methods ====================
// 微信登录暂未开放（后端无对应接口）
function handleWechatDisabled() {
  uni.showToast({ title: '微信登录敬请期待，请使用手机号', icon: 'none' })
}

function isValidPhone(p: string) {
  return /^1\d{10}$/.test(p)
}

// 账号密码登录
async function handlePasswordLogin() {
  if (!isValidPhone(phoneOrWechatInput.value)) {
    uni.showToast({ title: '请输入正确的11位中国手机号！', icon: 'none' })
    return
  }
  if (!loginPassword.value.trim()) {
    uni.showToast({ title: '请输入登录密码', icon: 'none' })
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    await store.loginWithPassword(phoneOrWechatInput.value, loginPassword.value)
    uni.showToast({ title: '登录成功', icon: 'success' })
    goHome()
  } catch {
    // 错误信息已由 request 层 toast
  } finally {
    submitting.value = false
  }
}

// 图形验证码统一入口：H5 走 ct4.js；微信小程序走原生 captcha4 组件；其它端降级
async function requestCaptcha() {
  // #ifdef MP-WEIXIN
  if (!CAPTCHA_ID) {
    uni.showToast({ title: '未配置图形验证码', icon: 'none' })
    throw new Error('NO_CAPTCHA_ID')
  }
  const p = beginMpCaptcha()
  mpCaptchaVisible.value = true
  await nextTick()
  triggerMpShowCaptcha()
  return await p
  // #endif
  // #ifndef MP-WEIXIN
  return await getCaptchaResult()
  // #endif
}

// #ifdef MP-WEIXIN
function triggerMpShowCaptcha() {
  const inst = getCurrentInstance()
  const comp = (inst?.proxy as any)?.selectComponent?.('#aliCaptcha')
  if (comp && typeof comp.showCaptcha === 'function') comp.showCaptcha()
}
function onCaptchaReady() {
  // 组件就绪后兜底弹出
  triggerMpShowCaptcha()
}
function onCaptchaSuccess(e: any) {
  settleMpCaptcha(true, e?.detail)
  mpCaptchaVisible.value = false
}
function onCaptchaError(e: any) {
  settleMpCaptcha(false, e?.detail)
  mpCaptchaVisible.value = false
}
function onCaptchaClose() {
  settleMpCaptcha(false)
  mpCaptchaVisible.value = false
}
// #endif

// 发送短信验证码（先过阿里云图形验证码）
async function handleSendLoginSms() {
  if (loginSmsCountdown.value > 0) return
  if (!isValidPhone(phoneOrWechatInput.value)) {
    uni.showToast({ title: '请输入正确的11位中国手机号！', icon: 'none' })
    return
  }
  try {
    const captcha = await requestCaptcha()
    await userApi.getSmsCode({ ...captcha, phone_number: phoneOrWechatInput.value })
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    startLoginSmsCountdown()
  } catch {
    // 用户取消图形验证 / 平台不支持 / 下发失败：相关提示已在各自处理
  }
}

function startLoginSmsCountdown() {
  loginSmsCountdown.value = 60
  if (loginSmsTimer) clearInterval(loginSmsTimer)
  loginSmsTimer = setInterval(() => {
    if (loginSmsCountdown.value <= 1) {
      if (loginSmsTimer) clearInterval(loginSmsTimer)
      loginSmsCountdown.value = 0
      return
    }
    loginSmsCountdown.value--
  }, 1000)
}

// 短信验证码登录
async function handleSmsLogin() {
  if (!isValidPhone(phoneOrWechatInput.value)) {
    uni.showToast({ title: '请输入正确的11位中国手机号！', icon: 'none' })
    return
  }
  if (!loginSmsCode.value.trim()) {
    uni.showToast({ title: '请输入短信验证码', icon: 'none' })
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    const ok = await store.loginWithSms(phoneOrWechatInput.value, loginSmsCode.value)
    if (ok) {
      uni.showToast({ title: '登录成功', icon: 'success' })
      goHome()
    } else {
      // 未注册，引导去注册流程
      uni.showToast({ title: '该手机号未注册，请先完成注册', icon: 'none', duration: 2000 })
      phone.value = phoneOrWechatInput.value
      authMode.value = 'register'
    }
  } catch {
    // 错误信息已由 request 层 toast
  } finally {
    submitting.value = false
  }
}

function handlePhoneRegister() {
  if (!isValidPhone(phoneOrWechatInput.value)) {
    uni.showToast({ title: '请输入正确的11位中国手机号！', icon: 'none' })
    return
  }
  phone.value = phoneOrWechatInput.value
  currentStep.value = 1
}

// ==================== Stage 1: Email code (legacy) ====================
function handleSendCode() {
  if (!emailPrefix.value.trim()) {
    verifyError.value = '请输入邮箱前缀'
    return
  }
  verifyError.value = ''
  isCodeSent.value = true
  countdown.value = 60
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    if (countdown.value <= 1) {
      if (countdownTimer) clearInterval(countdownTimer)
      countdown.value = 0
      return
    }
    countdown.value--
  }, 1000)
}

function handleMailVerify() {
  if (verificationCode.value === '1234' || verificationCode.value === '8888') {
    verifyError.value = ''
    currentStep.value = 2
  } else {
    verifyError.value = "验证码错误，试一试'1234'或者'8888'快速通过"
  }
}

// ==================== Stage 1: SMS countdown ====================
function handleSendVerifySms() {
  if (smsCountdown.value > 0) return
  verifyError.value = ''
  smsCountdown.value = 60
  smsCode.value = '888888'
  if (smsTimer) clearInterval(smsTimer)
  smsTimer = setInterval(() => {
    if (smsCountdown.value <= 1) {
      if (smsTimer) clearInterval(smsTimer)
      smsCountdown.value = 0
      return
    }
    smsCountdown.value--
  }, 1000)
}

function handleVerifyStep1() {
  verifyError.value = ''
  if (verifyTab.value === 'unified') {
    if (!studentId.value.trim()) {
      verifyError.value = '请输入统一认证账号（学号）'
      return
    }
    if (!unifiedPassword.value.trim()) {
      verifyError.value = '请输入统一认证密码'
      return
    }
    if (!smsCode.value.trim()) {
      verifyError.value = '请输入短信验证码'
      return
    }
    if (smsCode.value === '888888' || smsCode.value === '1234' || smsCode.value === '8888' || smsCode.value.length >= 4) {
      emailPrefix.value = studentId.value
      currentStep.value = 2
    } else {
      verifyError.value = "短信验证码错误！用演示码'888888'快速登录。"
    }
  } else {
    if (!chsiCode.value.trim()) {
      verifyError.value = '请输入16位学信网在线验证码'
      return
    }
    const cleanedChsi = chsiCode.value.trim().toUpperCase()
    if (cleanedChsi === '1234ABCD5678WXYZ' || cleanedChsi === '1234' || cleanedChsi.length >= 4) {
      emailPrefix.value = 'chsi_' + cleanedChsi.slice(0, 8)
      currentStep.value = 2
    } else {
      verifyError.value = "学信网验证码无效！用演示码'1234ABCD5678WXYZ'快速通过。"
    }
  }
}

// ==================== Stage 2: Questionnaire methods ====================
function handleToggleOption(questionId: string, option: string) {
  const selected = answers.value[questionId] || []
  const index = selected.indexOf(option)
  if (index >= 0) {
    answers.value[questionId] = selected.filter((item) => item !== option)
  } else {
    answers.value[questionId] = [...selected, option]
  }
}

function handleFinishQuestionnaire() {
  if (answers.value.interests.length === 0) {
    uni.showToast({ title: '请至少选择一项你感兴趣的爱好！', icon: 'none' })
    return
  }
  if (answers.value.activity_prefs.length === 0) {
    uni.showToast({ title: '请至少选择一个活动偏好！', icon: 'none' })
    return
  }
  if (answers.value.personality.length === 0) {
    uni.showToast({ title: '请至少选择一个符合你性格的标签！', icon: 'none' })
    return
  }
  currentStep.value = 3
}

// ==================== Stage 3: Profile methods ====================
// 提交注册：组装 RegisterParam 调后端注册（成功后即登录 + IM 登录）
async function submitRegister() {
  if (!nickname.value.trim()) {
    uni.showToast({ title: '请输入你的专属昵称！', icon: 'none' })
    return
  }
  if (!realName.value.trim()) {
    uni.showToast({ title: '请输入真实姓名', icon: 'none' })
    return
  }
  if (regPassword.value.trim().length < 6) {
    uni.showToast({ title: '登录密码至少 6 位', icon: 'none' })
    return
  }
  if (!phone.value) {
    uni.showToast({ title: '注册手机号缺失，请返回首页重新开始', icon: 'none' })
    return
  }
  if (submitting.value) return
  submitting.value = true

  const avatarSet = gender.value === 'MALE' ? maleAvatars : femaleAvatars
  const finalAvatar = avatarSet[selectedAvatarIdx.value] || avatarSet[0]
  const param: RegisterParam = {
    phone: phone.value,
    password: regPassword.value,
    nickname: nickname.value.trim(),
    name: realName.value.trim(),
    gender: gender.value === 'OTHER' ? 'UNKNOWN' : gender.value,
    interestTags: answers.value.interests,
    imageUrl: finalAvatar,
  }

  try {
    await store.registerUser(param)
    uni.showToast({ title: '注册完成，欢迎加入滴答！', icon: 'success', duration: 1500 })
    setTimeout(() => goHome(), 800)
  } catch {
    // 错误信息已由 request 层 toast（如字段校验失败 code:404）
  } finally {
    submitting.value = false
  }
}

function handleFormSubmit() {
  submitRegister()
}

// 跳过紧急联系人填写（姓名/密码/昵称为后端必填，仍需完成）
function handleSkip() {
  showSkipModal.value = false
  submitRegister()
}

// ==================== Stage indicator helpers ====================
// Show dots for steps 1-3 (verify, questionnaire, profile)
const stageLabels = ['', '学籍校验', '偏好问卷', '个人名片']
</script>

<template>
  <view class="verify-container">
    <scroll-view scroll-y class="verify-scroll" :scroll-with-animation="true">
      <!-- ==================== STAGE 0: LOGIN ==================== -->
      <view v-if="currentStep === 0" class="stage-content stage-login">
        <view class="stage-inner">
          <!-- App branding -->
          <view class="branding-row">
            <view class="brand-icon">滴</view>
            <text class="brand-name">滴答</text>
          </view>
          <text class="brand-desc">实名制高校潮流社交活动平台。在这里呼叫合拍的搭子，轻松拼游。</text>

          <!-- Login/Register toggle -->
          <view class="toggle-row">
            <view
              class="toggle-btn"
              :class="{ active: authMode === 'login' }"
              @tap="authMode = 'login'"
            >
              <text>已注册用户登录</text>
            </view>
            <view
              class="toggle-btn"
              :class="{ active: authMode === 'register' }"
              @tap="authMode = 'register'"
            >
              <text>新用户注册认证</text>
            </view>
          </view>

          <!-- WeChat / Phone method toggle -->
          <view class="method-toggle-row">
            <view
              class="method-btn"
              :class="{ active: loginMethod === 'wechat' }"
              @tap="loginMethod = 'wechat'"
            >
              <text>微信关联</text>
            </view>
            <view
              class="method-btn"
              :class="{ active: loginMethod === 'phone' }"
              @tap="loginMethod = 'phone'"
            >
              <text>手机快捷键</text>
            </view>
          </view>

          <!-- Login mode content -->
          <template v-if="authMode === 'login'">
            <!-- WeChat login (disabled, 后端暂无接口) -->
            <view v-if="loginMethod === 'wechat'" class="login-card wechat-card">
              <view class="card-icon-wrap wechat-icon-bg">
                <text class="card-icon-emoji">&#10003;</text>
              </view>
              <text class="card-title">微信登录敬请期待</text>
              <text class="card-desc">当前暂未开放微信登录，请使用手机号登录</text>
              <view class="card-btn disabled-btn" @tap="handleWechatDisabled">
                <text>暂未开放</text>
              </view>
            </view>

            <!-- Phone login (existing user) -->
            <view v-else class="phone-login-area">
              <view class="phone-input-wrap">
                <text class="phone-prefix">+86 中国</text>
                <input
                  type="number"
                  placeholder="输入已注册手机号（如 13988886666）"
                  v-model="phoneOrWechatInput"
                  maxlength="11"
                  class="phone-input"
                />
              </view>

              <!-- 登录方式：密码 / 短信验证码 -->
              <view class="toggle-row">
                <view
                  class="toggle-btn"
                  :class="{ active: loginType === 'password' }"
                  @tap="loginType = 'password'"
                >
                  <text>密码登录</text>
                </view>
                <view
                  class="toggle-btn"
                  :class="{ active: loginType === 'sms' }"
                  @tap="loginType = 'sms'"
                >
                  <text>短信验证码</text>
                </view>
              </view>

              <!-- 密码登录 -->
              <template v-if="loginType === 'password'">
                <view class="input-card">
                  <text class="input-label">登录密码</text>
                  <input
                    type="password"
                    v-model="loginPassword"
                    placeholder="请输入登录密码"
                    class="input-field"
                  />
                </view>
                <view class="card-btn primary-btn" @tap="handlePasswordLogin">
                  <text>{{ submitting ? '登录中...' : '登录' }}</text>
                </view>
              </template>

              <!-- 短信验证码登录 -->
              <template v-else>
                <view class="sms-row">
                  <view class="input-card sms-input-card">
                    <text class="input-label">短信验证码（6位）</text>
                    <input
                      type="number"
                      v-model="loginSmsCode"
                      placeholder="请输入 6 位短信验证码"
                      maxlength="6"
                      class="input-field"
                    />
                  </view>
                  <view class="sms-btn" :class="{ disabled: loginSmsCountdown > 0 }" @tap="handleSendLoginSms">
                    <text>{{ loginSmsCountdown > 0 ? loginSmsCountdown + 's' : '获取验证码' }}</text>
                  </view>
                </view>
                <view class="info-tip">
                  <text>提示：获取验证码需完成图形验证（仅 H5 支持）。未注册手机号将引导去注册。</text>
                </view>
                <view class="card-btn primary-btn" @tap="handleSmsLogin">
                  <text>{{ submitting ? '登录中...' : '登录' }}</text>
                </view>
              </template>
            </view>
          </template>

          <!-- Register mode content -->
          <template v-else>
            <!-- WeChat register (disabled, 后端暂无接口) -->
            <view v-if="loginMethod === 'wechat'" class="login-card register-card">
              <view class="card-icon-wrap register-icon-bg">
                <text class="card-icon-emoji">&#9786;</text>
              </view>
              <text class="card-title">微信注册敬请期待</text>
              <text class="card-desc">当前暂未开放微信注册，请使用手机号注册</text>
              <view class="card-btn disabled-btn" @tap="handleWechatDisabled">
                <text>暂未开放</text>
              </view>
            </view>

            <!-- Phone register -->
            <view v-else class="phone-login-area">
              <view class="phone-input-wrap">
                <text class="phone-prefix">+86 中国</text>
                <input
                  type="number"
                  placeholder="请输入您的注册手机号"
                  v-model="phoneOrWechatInput"
                  maxlength="11"
                  class="phone-input"
                />
              </view>
              <view class="info-tip warn-tip">
                <text>提示：由于是新用户，获取验证码后将引导您去进行 高校统一认证学籍校验 噢！</text>
              </view>
              <view class="card-btn primary-btn" @tap="handlePhoneRegister">
                <text>获取验证码注册，并开启学籍校验</text>
              </view>
            </view>
          </template>

          <!-- Bottom security badge -->
          <view class="security-badge">
            <text class="security-badge-icon">&#128737;</text>
            <text>仅支持实名认证通过的在校生进入校园安全防区</text>
          </view>
        </view>
      </view>

      <!-- ==================== STAGE 1: VERIFY ==================== -->
      <view v-if="currentStep === 1" class="stage-content stage-verify">
        <view class="stage-inner">
          <!-- Header -->
          <view class="stage-header">
            <text class="stage-badge">第一步：学籍校验</text>
          </view>
          <text class="stage-title">学生身份验证</text>
          <text class="stage-desc">为保障真实安全的社交环境，需完成校园身份认证，该步骤不可跳过。</text>

          <!-- Verify tab toggle -->
          <view class="toggle-row">
            <view
              class="toggle-btn"
              :class="{ active: verifyTab === 'unified' }"
              @tap="verifyTab = 'unified'"
            >
              <text>学校统一认证</text>
            </view>
            <view
              class="toggle-btn"
              :class="{ active: verifyTab === 'chsi' }"
              @tap="verifyTab = 'chsi'"
            >
              <text>学信网报告</text>
            </view>
          </view>

          <!-- Unified auth form -->
          <template v-if="verifyTab === 'unified'">
            <view class="form-group">
              <view class="input-card">
                <text class="input-label">统一认证账号（学号）</text>
                <input
                  type="text"
                  v-model="studentId"
                  placeholder="请输入您的学号"
                  class="input-field"
                />
              </view>

              <view class="input-card">
                <text class="input-label">统一认证密码</text>
                <input
                  type="password"
                  v-model="unifiedPassword"
                  placeholder="请输入高校门户密码"
                  class="input-field"
                />
              </view>

              <view class="sms-row">
                <view class="input-card sms-input-card">
                  <text class="input-label">短信验证码（6位）</text>
                  <input
                    type="number"
                    v-model="smsCode"
                    placeholder="请输入 6 位短信验证码"
                    maxlength="6"
                    class="input-field"
                  />
                </view>
                <view class="sms-btn" :class="{ disabled: smsCountdown > 0 }" @tap="handleSendVerifySms">
                  <text>{{ smsCountdown > 0 ? smsCountdown + 's' : '获取验证码' }}</text>
                </view>
              </view>

              <text class="form-hint">
                校验账号密码后，将向统一认证绑定的手机号发送 6 位短信验证码（演示码 888888）。
              </text>
            </view>
          </template>

          <!-- CHSI form -->
          <template v-else>
            <view class="form-group">
              <view class="input-card">
                <text class="input-label">学信网在线验证码（16位）</text>
                <input
                  type="text"
                  v-model="chsiCode"
                  placeholder="报告右上角的 16 位在线验证码"
                  maxlength="19"
                  class="input-field"
                />
              </view>
              <text class="form-hint">
                登录学信网 (chsi.com.cn) 申请《教育部学籍在线验证报告》，输入报告上的 16 位在线验证码（演示码 1234ABCD5678WXYZ）。
              </text>
            </view>
          </template>

          <!-- Error message -->
          <view v-if="verifyError" class="error-msg">
            <text>⚠️ {{ verifyError }}</text>
          </view>

          <!-- Action button + dots -->
          <view class="stage-footer">
            <view class="card-btn primary-btn" @tap="handleVerifyStep1">
              <text>验证并继续</text>
            </view>
            <!-- Stage indicator dots: 3 dots represent steps 1-3 -->
            <view class="stage-dots">
              <view class="dot active"></view>
              <view class="dot"></view>
              <view class="dot"></view>
            </view>
          </view>
        </view>
      </view>

      <!-- ==================== STAGE 2: QUESTIONNAIRE ==================== -->
      <view v-if="currentStep === 2" class="stage-content stage-questionnaire">
        <view class="stage-inner">
          <!-- Header -->
          <view class="stage-header">
            <text class="stage-badge">第二步：偏好问卷</text>
          </view>
          <text class="stage-title">构建你的专属校园画像</text>
          <text class="stage-desc">简单定制社交偏置，以配对相同活性的同行伴侣！</text>

          <!-- Questions -->
          <view class="questions-list">
            <view
              v-for="q in QUESTIONNAIRE_QUESTIONS"
              :key="q.id"
              class="question-card"
            >
              <text class="q-dimension">专题维度 · MATCH PREFER</text>
              <text class="q-text">{{ q.text }}</text>
              <view class="q-options">
                <view
                  v-for="opt in q.options"
                  :key="opt"
                  class="q-option"
                  :class="{ selected: (answers[q.id] || []).includes(opt) }"
                  @tap="handleToggleOption(q.id, opt)"
                >
                  <text>{{ opt }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- Action button + dots -->
          <view class="stage-footer">
            <view class="card-btn primary-btn" @tap="handleFinishQuestionnaire">
              <text>下一步：完善个人名片并激活安全系统</text>
            </view>
            <view class="stage-dots">
              <view class="dot done"></view>
              <view class="dot active"></view>
              <view class="dot"></view>
            </view>
          </view>
        </view>
      </view>

      <!-- ==================== STAGE 3: PROFILE ==================== -->
      <view v-if="currentStep === 3" class="stage-content stage-profile">
        <view class="stage-inner">
          <!-- Header with skip button -->
          <view class="profile-header-row">
            <view class="stage-header">
              <text class="stage-badge">第三步：真实名片配置</text>
            </view>
            <view class="skip-link" @tap="showSkipModal = true">
              <text>跳过此步</text>
            </view>
          </view>
          <text class="stage-title">完善个人档案与安全联系人</text>
          <text class="stage-desc">
            填写姓名与紧急联系人信息。紧急联系人号码将成为线下见面时守护你安全的SOS终极依靠（未设置时紧急按钮不可用）。
          </text>

          <!-- Profile form -->
          <view class="profile-form">
            <!-- Nickname -->
            <view class="profile-card">
              <view class="input-card">
                <text class="input-label">昵称</text>
                <input
                  type="text"
                  v-model="nickname"
                  placeholder="请输入用户名/真实昵称"
                  class="input-field"
                />
              </view>

              <view class="input-card">
                <text class="input-label">真实姓名</text>
                <input
                  type="text"
                  v-model="realName"
                  placeholder="请输入真实姓名（用于实名认证）"
                  class="input-field"
                />
              </view>

              <view class="input-card">
                <text class="input-label">登录密码</text>
                <input
                  type="password"
                  v-model="regPassword"
                  placeholder="设置登录密码（至少 6 位）"
                  class="input-field"
                />
              </view>

              <!-- Age + Gender row -->
              <view class="age-gender-row">
                <view class="input-card half-card">
                  <text class="input-label">真实年龄</text>
                  <input
                    type="number"
                    v-model.number="age"
                    placeholder="20"
                    class="input-field"
                  />
                </view>
                <view class="gender-card half-card">
                  <text class="input-label">我的性别</text>
                  <view class="gender-toggle">
                    <view
                      class="gender-btn"
                      :class="{ active: gender === 'FEMALE' }"
                      @tap="gender = 'FEMALE'; selectedAvatarIdx = 0"
                    >
                      <text>女生</text>
                    </view>
                    <view
                      class="gender-btn"
                      :class="{ active: gender === 'MALE' }"
                      @tap="gender = 'MALE'; selectedAvatarIdx = 0"
                    >
                      <text>男生</text>
                    </view>
                  </view>
                </view>
              </view>

              <!-- Avatar selection -->
              <view class="avatar-section">
                <text class="input-label">选择头像</text>
                <view class="avatar-row">
                  <view
                    v-for="(avatar, idx) in (gender === 'MALE' ? maleAvatars : femaleAvatars)"
                    :key="idx"
                    class="avatar-item"
                    :class="{ selected: selectedAvatarIdx === idx }"
                    @tap="selectedAvatarIdx = idx"
                  >
                    <image :src="avatar" mode="aspectFill" class="avatar-img" />
                    <view v-if="selectedAvatarIdx === idx" class="avatar-check">
                      <text>&#10003;</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <!-- Emergency contact -->
            <view class="emergency-card">
              <view class="emergency-header">
                <text class="emergency-icon">&#128737;</text>
                <text class="emergency-title">24小时紧急安全守护人</text>
              </view>
              <text class="emergency-desc">
                如在活动中遇到紧急纠纷或安全威胁，长按屏幕角落悬浮的SOS按钮3s以上。系统将自动调用即时定位并向该联系人发送特战警报。
              </text>
              <view class="emergency-inputs">
                <view class="input-card half-card">
                  <text class="input-label">联系人姓名</text>
                  <input
                    type="text"
                    v-model="emergencyName"
                    placeholder="父母/辅导员"
                    class="input-field"
                  />
                </view>
                <view class="input-card half-card">
                  <text class="input-label">联系电话</text>
                  <input
                    type="number"
                    v-model="emergencyPhone"
                    placeholder="联系电话"
                    class="input-field"
                  />
                </view>
              </view>
            </view>
          </view>

          <!-- Submit button + dots -->
          <view class="stage-footer">
            <view class="card-btn primary-btn submit-btn" @tap="handleFormSubmit">
              <text>绑定学籍信息并进入"滴答"</text>
            </view>
            <view class="stage-dots">
              <view class="dot done"></view>
              <view class="dot done"></view>
              <view class="dot active"></view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- ==================== 微信小程序图形验证码（原生 captcha4 组件） ==================== -->
    <!-- #ifdef MP-WEIXIN -->
    <captcha4
      id="aliCaptcha"
      v-if="mpCaptchaVisible"
      :captchaId="CAPTCHA_ID"
      @ready="onCaptchaReady"
      @success="onCaptchaSuccess"
      @error="onCaptchaError"
      @close="onCaptchaClose"
      @fail="onCaptchaError"
    />
    <!-- #endif -->

    <!-- ==================== SKIP MODAL ==================== -->
    <view v-if="showSkipModal" class="modal-overlay" @tap="showSkipModal = false">
      <view class="modal-card" @tap.stop>
        <view class="modal-icon-wrap">
          <text class="modal-icon">&#9888;</text>
        </view>
        <text class="modal-title">提示</text>
        <text class="modal-desc">如果不完善资料可能会影响你的合拍概率。</text>
        <view class="modal-actions">
          <view class="modal-btn skip-btn" @tap="handleSkip">
            <text>继续跳过</text>
          </view>
          <view class="modal-btn confirm-btn" @tap="showSkipModal = false">
            <text>返回填写</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* ==================== Container ==================== */
.verify-container {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #f5f8fa 0%, #fafbfc 50%, #f0f6ff 100%);
  position: relative;
}

.verify-scroll {
  width: 100%;
  height: 100%;
}

.stage-content {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.stage-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 40rpx 36rpx;
  padding-bottom: 80rpx;
}

.stage-footer {
  margin-top: auto;
  padding-top: 40rpx;
}

/* ==================== Stage: Common ==================== */
.stage-header {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.stage-badge {
  font-size: 22rpx;
  font-weight: 800;
  color: #2563eb;
  background: #eff6ff;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  letter-spacing: 2rpx;
}

.stage-title {
  font-size: 40rpx;
  font-weight: 800;
  color: #262626;
  margin-bottom: 8rpx;
}

.stage-desc {
  font-size: 24rpx;
  color: #a3a3a3;
  line-height: 1.6;
  margin-bottom: 36rpx;
}

/* ==================== Branding ==================== */
.branding-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 12rpx;
  padding-top: 16rpx;
}

.brand-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  color: #fff;
  font-size: 36rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(37, 99, 235, 0.25);
}

.brand-name {
  font-size: 44rpx;
  font-weight: 800;
  color: #262626;
}

.brand-desc {
  font-size: 22rpx;
  color: #737373;
  line-height: 1.6;
  margin-bottom: 36rpx;
}

/* ==================== Toggle Rows ==================== */
.toggle-row {
  display: flex;
  background: #f2f2f2;
  border-radius: 20rpx;
  padding: 6rpx;
  margin-bottom: 28rpx;
  border: 1rpx solid rgba(0, 0, 0, 0.04);
}

.toggle-btn {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  border-radius: 16rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #737373;
  transition: all 0.2s;
}

.toggle-btn.active {
  background: #fff;
  color: #2563eb;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.method-toggle-row {
  display: flex;
  background: rgba(242, 242, 242, 0.6);
  border-radius: 16rpx;
  padding: 4rpx;
  margin-bottom: 28rpx;
  border: 1rpx solid rgba(0, 0, 0, 0.02);
}

.method-btn {
  flex: 1;
  text-align: center;
  padding: 12rpx 0;
  border-radius: 12rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: #a3a3a3;
  transition: all 0.2s;
}

.method-btn.active {
  background: #fff;
  color: #404040;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.04);
}

/* ==================== Login Cards ==================== */
.login-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 36rpx;
}

.wechat-card {
  border: 1rpx solid rgba(16, 185, 129, 0.2);
  background: rgba(240, 253, 244, 0.5);
}

.register-card {
  border: 1rpx solid rgba(37, 99, 235, 0.1);
  background: rgba(239, 246, 255, 0.5);
}

.card-icon-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.wechat-icon-bg {
  background: #10b981;
  color: #fff;
}

.register-icon-bg {
  background: #2563eb;
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.2);
}

.card-icon-emoji {
  font-size: 40rpx;
  font-weight: 900;
}

.card-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #262626;
  margin-bottom: 8rpx;
}

.card-desc {
  font-size: 22rpx;
  color: #a3a3a3;
  text-align: center;
  line-height: 1.5;
  margin-bottom: 28rpx;
}

.card-btn {
  width: 100%;
  text-align: center;
  padding: 26rpx;
  border-radius: 20rpx;
  font-size: 26rpx;
  font-weight: 800;
  color: #fff;
  transition: all 0.15s;
}

.card-btn:active {
  transform: scale(0.98);
}

.wechat-btn {
  background: #10b981;
}

.disabled-btn {
  background: #d4d4d4;
  color: #fff;
}

.primary-btn {
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.25);
}

/* ==================== Phone Login ==================== */
.phone-login-area {
  margin-bottom: 36rpx;
}

.phone-input-wrap {
  position: relative;
  background: #fff;
  border: 1rpx solid #e5e5e5;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  margin-bottom: 20rpx;
}

.phone-prefix {
  font-size: 24rpx;
  color: #a3a3a3;
  font-weight: 600;
  padding-right: 24rpx;
  border-right: 1rpx solid #e5e5e5;
  white-space: nowrap;
}

.phone-input {
  flex: 1;
  height: 80rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: #262626;
  padding-left: 24rpx;
}

.info-tip {
  background: rgba(239, 246, 255, 0.5);
  border: 1rpx solid rgba(37, 99, 235, 0.1);
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
}

.info-tip text {
  font-size: 22rpx;
  color: #2563eb;
  line-height: 1.5;
  font-weight: 600;
}

.warn-tip {
  background: rgba(255, 241, 242, 0.5);
  border: 1rpx solid rgba(244, 63, 94, 0.1);
}

.warn-tip text {
  color: #e11d48;
}

/* ==================== Security Badge ==================== */
.security-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: #f2f2f2;
  padding: 16rpx 24rpx;
  border-radius: 40rpx;
  border: 1rpx solid rgba(0, 0, 0, 0.04);
  margin-top: auto;
}

.security-badge text {
  font-size: 20rpx;
  color: #a3a3a3;
  font-weight: 500;
}

.security-badge-icon {
  font-size: 24rpx;
}

/* ==================== Form Inputs ==================== */
.form-group {
  margin-bottom: 8rpx;
}

.input-card {
  background: #f8f9fa;
  border: 1rpx solid #f0f0f0;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  transition: all 0.2s;
}

.input-label {
  display: block;
  font-size: 22rpx;
  font-weight: 700;
  color: #a3a3a3;
  margin-bottom: 8rpx;
}

.input-field {
  width: 100%;
  font-size: 28rpx;
  font-weight: 700;
  color: #262626;
  background: transparent;
  border: none;
  outline: none;
  padding: 4rpx 0;
}

.sms-row {
  display: flex;
  gap: 16rpx;
  align-items: stretch;
  margin-bottom: 20rpx;
}

.sms-input-card {
  flex: 1;
  margin-bottom: 0;
}

.sms-btn {
  width: 220rpx;
  height: auto;
  min-height: 140rpx;
  background: rgba(239, 246, 255, 0.6);
  border: 1rpx solid rgba(37, 99, 235, 0.1);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
  color: #2563eb;
  transition: all 0.15s;
}

.sms-btn.disabled {
  color: #a3a3a3;
  background: #f2f2f2;
}

.sms-btn:active {
  transform: scale(0.98);
}

.form-hint {
  font-size: 22rpx;
  color: #a3a3a3;
  line-height: 1.6;
  display: block;
  margin-top: 8rpx;
}

/* ==================== Error Message ==================== */
.error-msg {
  background: #fff1f2;
  border: 1rpx solid rgba(244, 63, 94, 0.1);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-top: 20rpx;
}

.error-msg text {
  font-size: 24rpx;
  font-weight: 600;
  color: #e11d48;
}

/* ==================== Stage Dots ==================== */
.stage-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding-top: 28rpx;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #e5e5e5;
  transition: all 0.3s;
}

.dot.active {
  width: 40rpx;
  border-radius: 8rpx;
  background: #2563eb;
}

.dot.done {
  background: #93c5fd;
}

/* ==================== Questionnaire ==================== */
.questions-list {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
  margin-bottom: 8rpx;
}

.question-card {
  background: #fff;
  border: 1rpx solid rgba(0, 0, 0, 0.05);
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
}

.q-dimension {
  display: block;
  font-size: 20rpx;
  color: #a3a3a3;
  font-weight: 700;
  margin-bottom: 8rpx;
}

.q-text {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #262626;
  margin-bottom: 24rpx;
  line-height: 1.4;
}

.q-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.q-option {
  padding: 14rpx 24rpx;
  border-radius: 16rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #737373;
  background: #f5f5f5;
  border: 1rpx solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.q-option.selected {
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 2rpx 8rpx rgba(37, 99, 235, 0.2);
}

/* ==================== Profile ==================== */
.profile-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.skip-link {
  font-size: 24rpx;
  font-weight: 700;
  color: #a3a3a3;
  background: #fff;
  padding: 10rpx 22rpx;
  border-radius: 12rpx;
  border: 1rpx solid rgba(0, 0, 0, 0.06);
  transition: all 0.15s;
}

.skip-link:active {
  background: #f5f5f5;
  color: #2563eb;
}

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 28rpx;
}

.profile-card {
  background: #fff;
  border: 1rpx solid rgba(0, 0, 0, 0.05);
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.02);
}

.age-gender-row {
  display: flex;
  gap: 20rpx;
}

.half-card {
  flex: 1;
  margin-bottom: 0;
}

.gender-card {
  flex: 1;
}

.gender-toggle {
  display: flex;
  background: #f2f2f2;
  border-radius: 16rpx;
  padding: 6rpx;
  border: 1rpx solid rgba(0, 0, 0, 0.04);
}

.gender-btn {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  border-radius: 12rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: #737373;
  transition: all 0.2s;
}

.gender-btn.active {
  background: #fff;
  box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.06);
}

.gender-btn.active:first-child {
  color: #e11d48;
}

.gender-btn.active:last-child {
  color: #2563eb;
}

/* ==================== Avatar Selection ==================== */
.avatar-section {
  margin-top: 24rpx;
}

.avatar-row {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}

.avatar-item {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  border: 4rpx solid transparent;
  transition: all 0.2s;
}

.avatar-item.selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 4rpx rgba(37, 99, 235, 0.15);
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.avatar-check {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36rpx;
  height: 36rpx;
  background: #2563eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx solid #fff;
}

.avatar-check text {
  font-size: 20rpx;
  color: #fff;
  font-weight: 900;
}

/* ==================== Emergency Contact ==================== */
.emergency-card {
  background: #eff6ff;
  border: 1rpx solid rgba(37, 99, 235, 0.1);
  border-radius: 24rpx;
  padding: 32rpx;
}

.emergency-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 12rpx;
}

.emergency-icon {
  font-size: 32rpx;
}

.emergency-title {
  font-size: 26rpx;
  font-weight: 800;
  color: #1e3a5f;
}

.emergency-desc {
  display: block;
  font-size: 22rpx;
  color: #737373;
  line-height: 1.6;
  margin-bottom: 24rpx;
}

.emergency-inputs {
  display: flex;
  gap: 20rpx;
}

.emergency-inputs .half-card {
  background: #fff;
}

/* ==================== Submit Button ==================== */
.submit-btn {
  font-size: 28rpx;
  padding: 30rpx;
  border-radius: 24rpx;
  font-weight: 900;
}

/* ==================== Skip Modal ==================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 40rpx;
}

.modal-card {
  background: #fff;
  border-radius: 32rpx;
  padding: 48rpx 40rpx 36rpx;
  width: 100%;
  max-width: 600rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.15);
  border: 1rpx solid rgba(0, 0, 0, 0.04);
}

.modal-icon-wrap {
  width: 100rpx;
  height: 100rpx;
  border-radius: 24rpx;
  background: #fef3c7;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.modal-icon {
  font-size: 48rpx;
}

.modal-title {
  font-size: 34rpx;
  font-weight: 900;
  color: #171717;
  margin-bottom: 12rpx;
}

.modal-desc {
  font-size: 26rpx;
  color: #737373;
  font-weight: 500;
  line-height: 1.5;
  margin-bottom: 36rpx;
  padding: 0 16rpx;
}

.modal-actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.modal-btn {
  width: 100%;
  text-align: center;
  padding: 24rpx;
  border-radius: 20rpx;
  font-size: 26rpx;
  font-weight: 700;
  transition: all 0.15s;
}

.modal-btn:active {
  transform: scale(0.98);
}

.skip-btn {
  background: #f2f2f2;
  color: #737373;
}

.confirm-btn {
  background: #2563eb;
  color: #fff;
}
</style>
