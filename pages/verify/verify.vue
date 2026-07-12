<script setup lang="ts">
import { ref, onUnmounted, getCurrentInstance } from 'vue'
import { useAppStore } from '@/stores/app'
import { QUESTIONNAIRE_QUESTIONS } from '@/data/mock'
import type { GenderType, RegisterParam } from '@/data/types'
import * as userApi from '@/api/user'
import { uploadAvatar } from '@/utils/upload'
import { CAPTCHA_ID } from '@/config'
// #ifdef MP-WEIXIN
import { beginMpCaptcha, settleMpCaptcha } from '@/utils/captcha'
// #endif

const store = useAppStore()

// ==================== Stage tracking ====================
const currentStep = ref<number>(0) // 0:login 1:基本信息 2:兴趣选择

// ==================== Stage 0: Login state ====================
const phoneOrWechatInput = ref('')
// 登录方式：密码 / 短信验证码
const loginType = ref<'password' | 'sms'>('password')
const loginPassword = ref('')
const loginSmsCode = ref('')
const loginSmsCountdown = ref(0)
const smsSending = ref(false) // 短信验证流程进行中（防重入）
const submitting = ref(false)

// ==================== Stage 1: Register（基本信息）state ====================
const phone = ref('')            // 由短信登录环节预填，注册时不再输入
const nickname = ref('')
const realName = ref('')         // → RegisterParam.name
const regPassword = ref('')
const gender = ref<GenderType>('FEMALE')
const birthdate = ref('')        // yyyy-MM-dd，后端必填
const avatarLocalPath = ref('')  // 选好的本地图片，仅用于预览；提交时经 OSS 上传换 imageUrl

// 生日最大值：至少 16 岁
const maxBirthdate = (() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 16)
  return d.toISOString().slice(0, 10)
})()

// ==================== Stage 2: 兴趣选择 state ====================
const selectedInterests = ref<string[]>([])

// 兴趣标签选项（复用问卷里的「兴趣爱好」一题）
const interestOptions = QUESTIONNAIRE_QUESTIONS.find((q) => q.id === 'interests')?.options ?? []

// ==================== Timer references ====================
let loginSmsTimer: ReturnType<typeof setInterval> | null = null

onUnmounted(() => {
  if (loginSmsTimer) clearInterval(loginSmsTimer)
})

// ==================== Helper: navigate to home ====================
function goHome() {
  uni.switchTab({ url: '/pages/home/home' })
}

// ==================== UI 切换方法（避免内联赋值，mp-weixin 兼容） ====================
function selectLoginType(t: 'password' | 'sms') {
  loginType.value = t
}
function selectGender(g: GenderType) {
  gender.value = g
}
function onBirthdateChange(e: any) {
  birthdate.value = e.detail.value
}
function goBack() {
  currentStep.value = 1
}
// 兴趣标签多选切换
function toggleInterest(tag: string) {
  const i = selectedInterests.value.indexOf(tag)
  if (i >= 0) selectedInterests.value.splice(i, 1)
  else selectedInterests.value.push(tag)
}
// 选择头像（本地预览，提交时再上传 OSS）
function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: (r) => {
      avatarLocalPath.value = r.tempFilePaths[0]
    },
  })
}

// ==================== Stage 0: Login methods ====================
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

// 图形验证码入口：微信小程序走原生 captcha4 组件；其它端不支持短信登录
async function requestCaptcha() {
  // #ifdef MP-WEIXIN
  if (!CAPTCHA_ID) {
    uni.showToast({ title: '未配置图形验证码', icon: 'none' })
    throw new Error('NO_CAPTCHA_ID')
  }
  const p = beginMpCaptcha()
  showMpCaptcha()
  return await p
  // #endif
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '短信登录请在微信小程序中使用', icon: 'none' })
  throw new Error('CAPTCHA_UNSUPPORTED_PLATFORM')
  // #endif
}

// #ifdef MP-WEIXIN
// 缓存当前页面实例（用于取原生 captcha4 组件）
const mpInstance = getCurrentInstance()
// 组件尚未就绪时点了「获取验证码」，标记待弹出，@ready 后兜底触发
let pendingShow = false
// @close 延迟取消的定时器（成功时组件会先 close 再 success）
let closeTimer: ReturnType<typeof setTimeout> | null = null

// 取原生组件实例：uni-app Vue3 的 proxy 上没有 selectComponent，需走原生页面实例
function getCaptchaComp(): any {
  const proxy = mpInstance?.proxy as any
  const native = proxy?.$scope || proxy?.$mp?.page || proxy
  return native?.selectComponent?.('#aliCaptcha')
}
function showMpCaptcha() {
  const comp = getCaptchaComp()
  if (comp && typeof comp.showCaptcha === 'function') {
    pendingShow = false
    comp.showCaptcha()
  } else {
    pendingShow = true // 等组件 @ready 后再弹
  }
}
function onCaptchaReady() {
  if (pendingShow) showMpCaptcha()
}
function onCaptchaSuccess(e: any) {
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
  const d = e?.detail ?? e
  settleMpCaptcha(true, d)
}
function onCaptchaError(e: any) {
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
  uni.showToast({ title: '图形验证失败，请重试', icon: 'none' })
  settleMpCaptcha(false, e?.detail)
}
function onCaptchaClose() {
  // 成功时组件会「先 @close 再 @success」，故延迟判定：若随后 success/error 到达则不取消
  if (closeTimer) clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    closeTimer = null
    settleMpCaptcha(false)
  }, 300)
}
// #endif

// 发送短信验证码（先过阿里云图形验证码）
async function handleSendLoginSms() {
  if (loginSmsCountdown.value > 0) return
  if (smsSending.value) return // 防重入：验证进行中重复点击会触发 CAPTCHA_RESTARTED
  if (!isValidPhone(phoneOrWechatInput.value)) {
    uni.showToast({ title: '请输入正确的11位中国手机号！', icon: 'none' })
    return
  }
  smsSending.value = true
  try {
    const captcha = await requestCaptcha()
    await userApi.getSmsCode({ ...captcha, phone_number: phoneOrWechatInput.value })
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    startLoginSmsCountdown()
  } catch {
    // 失败均已在各环节给出提示：
    // - 用户取消验证 / 平台不支持 / 未配置：requestCaptcha 已 toast 或属主动取消，静默；
    // - 图形验证报错：onCaptchaError 已 toast；
    // - getSmsCode 失败（参数/网络/服务异常）：request 层已统一 toast 友好文案。
  } finally {
    smsSending.value = false
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
      // 未注册：自动拉起注册流程（手机号预填）
      uni.showToast({ title: '该手机号未注册，请完成注册', icon: 'none', duration: 2000 })
      phone.value = phoneOrWechatInput.value
      currentStep.value = 1
    }
  } catch {
    // 错误信息已由 request 层 toast
  } finally {
    submitting.value = false
  }
}

// ==================== Stage 1: Register（基本信息）methods ====================
// Step 1 校验通过后进入兴趣选择页
function goToInterests() {
  if (!nickname.value.trim()) {
    uni.showToast({ title: '请输入昵称', icon: 'none' })
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
  if (!birthdate.value) {
    uni.showToast({ title: '请选择出生日期', icon: 'none' })
    return
  }
  if (!phone.value) {
    uni.showToast({ title: '注册手机号缺失，请返回首页重新开始', icon: 'none' })
    return
  }
  currentStep.value = 2
}

// 提交注册：组装 RegisterParam 调后端注册（成功后即登录 + IM 登录）
async function submitRegister() {
  if (submitting.value) return
  submitting.value = true

  // 头像：本地图片经 OSS 预签名 URL 上传换 imageUrl（后端未就绪时返回 ''）
  let imageUrl = ''
  if (avatarLocalPath.value) {
    try {
      imageUrl = await uploadAvatar(avatarLocalPath.value)
    } catch {
      // 上传失败不阻断注册，imageUrl 留空
    }
  }

  const param: RegisterParam = {
    phone: phone.value,
    password: regPassword.value,
    nickname: nickname.value.trim(),
    name: realName.value.trim(),
    gender: gender.value === 'OTHER' ? 'UNKNOWN' : gender.value,
    birthdate: birthdate.value || undefined,
    interestTags: selectedInterests.value.length ? selectedInterests.value : undefined,
    imageUrl: imageUrl || undefined,
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

          <!-- Phone login（仅手机号：密码 / 短信验证码） -->
          <view class="phone-login-area">
            <view class="phone-input-wrap">
              <text class="phone-prefix">+86 中国</text>
              <input
                type="number"
                placeholder="请输入手机号"
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
                @tap="selectLoginType('password')"
              >
                <text>密码登录</text>
              </view>
              <view
                class="toggle-btn"
                :class="{ active: loginType === 'sms' }"
                @tap="selectLoginType('sms')"
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
                  <text class="input-label">短信验证码</text>
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
                <text>提示：获取验证码前需完成图形验证。未注册手机号将自动进入注册流程。</text>
              </view>
              <view class="card-btn primary-btn" @tap="handleSmsLogin">
                <text>{{ submitting ? '登录中...' : '登录' }}</text>
              </view>
            </template>
          </view>

          <!-- Bottom security badge -->
          <view class="security-badge">
            <text class="security-badge-icon">&#128737;</text>
            <text>仅支持实名认证通过的在校生进入校园安全防区</text>
          </view>
        </view>
      </view>

      <!-- ==================== STAGE 1: REGISTER（基本信息）==================== -->
      <view v-if="currentStep === 1" class="stage-content stage-profile">
        <view class="stage-inner">
          <view class="stage-header">
            <text class="stage-badge">完善基本信息</text>
          </view>
          <text class="stage-title">创建你的滴答账号</text>
          <text class="stage-desc">填写以下基本信息即可完成注册，无需学籍认证。</text>

          <view class="profile-form">
            <view class="profile-card">
              <!-- Avatar upload（阿里云 OSS 预签名 URL，提交时上传） -->
              <view class="avatar-section">
                <text class="input-label">头像（选填）</text>
                <view class="avatar-upload" @tap="chooseAvatar">
                  <image
                    v-if="avatarLocalPath"
                    :src="avatarLocalPath"
                    mode="aspectFill"
                    class="avatar-preview"
                  />
                  <view v-else class="avatar-placeholder">
                    <text class="avatar-plus">＋</text>
                    <text class="avatar-hint">上传头像</text>
                  </view>
                </view>
              </view>

              <view class="input-card">
                <text class="input-label">昵称</text>
                <input
                  type="text"
                  v-model="nickname"
                  placeholder="请输入昵称"
                  class="input-field"
                />
              </view>

              <view class="input-card">
                <text class="input-label">真实姓名</text>
                <input
                  type="text"
                  v-model="realName"
                  placeholder="请输入真实姓名"
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

              <!-- Gender -->
              <view class="gender-card">
                <text class="input-label">性别</text>
                <view class="gender-toggle">
                  <view
                    class="gender-btn"
                    :class="{ active: gender === 'FEMALE' }"
                    @tap="selectGender('FEMALE')"
                  >
                    <text>女生</text>
                  </view>
                  <view
                    class="gender-btn"
                    :class="{ active: gender === 'MALE' }"
                    @tap="selectGender('MALE')"
                  >
                    <text>男生</text>
                  </view>
                </view>
              </view>

              <!-- Birthdate picker -->
              <picker
                mode="date"
                :value="birthdate"
                start="1960-01-01"
                :end="maxBirthdate"
                @change="onBirthdateChange"
              >
                <view class="input-card">
                  <text class="input-label">出生日期</text>
                  <view class="picker-row">
                    <text :class="['picker-value', { placeholder: !birthdate }]">
                      {{ birthdate || '请选择（必填）' }}
                    </text>
                    <text class="picker-arrow">›</text>
                  </view>
                </view>
              </picker>
            </view>
          </view>

          <view class="stage-footer">
            <view class="card-btn primary-btn submit-btn" @tap="goToInterests">
              <text>下一步，选择兴趣 →</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ==================== STAGE 2: 兴趣选择 ==================== -->
      <view v-if="currentStep === 2" class="stage-content stage-interests">
        <view class="stage-inner">
          <!-- Header with back -->
          <view class="interests-header">
            <view class="back-btn" @tap="goBack">
              <text>‹ 返回修改</text>
            </view>
            <text class="stage-title">选择你的兴趣</text>
            <text class="stage-desc">帮助我们为你匹配合拍的搭子，可跳过</text>
          </view>

          <!-- Interest chips grid -->
          <view class="interests-grid">
            <view
              v-for="tag in interestOptions"
              :key="tag"
              class="interest-chip"
              :class="{ selected: selectedInterests.includes(tag) }"
              @tap="toggleInterest(tag)"
            >
              <text>{{ tag }}</text>
            </view>
          </view>

          <!-- Footer -->
          <view class="stage-footer">
            <view class="card-btn primary-btn submit-btn" @tap="handleFormSubmit">
              <text>{{ submitting ? '注册中...' : '完成注册，进入滴答' }}</text>
            </view>
            <view class="skip-tip" @tap="handleFormSubmit">
              <text>跳过，直接注册</text>
            </view>
          </view>
        </view>
      </view>

    </scroll-view>

    <!-- ==================== 微信小程序图形验证码（原生 captcha4 组件） ==================== -->
    <!-- #ifdef MP-WEIXIN -->
    <captcha4
      id="aliCaptcha"
      :captchaId="CAPTCHA_ID"
      :useNativeButton="false"
      @Ready="onCaptchaReady"
      @Success="onCaptchaSuccess"
      @Error="onCaptchaError"
      @Close="onCaptchaClose"
    />
    <!-- #endif -->

  </view>
</template>

<style scoped>
/* 统一盒模型：让 width:100% + padding 的元素（按钮/弹窗/输入框）不溢出屏幕 */
.verify-container,
.verify-container view,
.verify-container input,
.verify-container scroll-view {
  box-sizing: border-box;
}

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

/* ==================== Login Buttons ==================== */
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

/* ==================== Profile ==================== */
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

.gender-card {
  margin-bottom: 20rpx;
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

.avatar-upload {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  overflow: hidden;
  margin-top: 16rpx;
  border: 2rpx dashed rgba(37, 99, 235, 0.4);
  background: #f8fafc;
}

.avatar-preview {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.avatar-plus {
  font-size: 44rpx;
  color: #2563eb;
  line-height: 1;
}

.avatar-hint {
  font-size: 20rpx;
  color: #94a3b8;
  margin-top: 6rpx;
}

/* ==================== Submit Button ==================== */
.submit-btn {
  font-size: 28rpx;
  padding: 30rpx;
  border-radius: 24rpx;
  font-weight: 900;
}

/* ==================== Picker ==================== */
.picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4rpx 0;
}

.picker-value {
  font-size: 28rpx;
  font-weight: 700;
  color: #262626;
}

.picker-value.placeholder {
  color: #c0c0c0;
  font-weight: 400;
}

.picker-arrow {
  font-size: 36rpx;
  color: #c0c0c0;
}

/* ==================== Interests step ==================== */
.stage-interests {
  background: #fafbfc;
}

.interests-header {
  margin-bottom: 36rpx;
}

.back-btn {
  margin-bottom: 24rpx;
}

.back-btn text {
  font-size: 28rpx;
  color: #2563eb;
  font-weight: 600;
}

.interests-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-bottom: 48rpx;
}

.interest-chip {
  padding: 18rpx 30rpx;
  border-radius: 40rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #737373;
  background: #fff;
  border: 1rpx solid rgba(0, 0, 0, 0.08);
  transition: all 0.15s;
}

.interest-chip.selected {
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 2rpx 8rpx rgba(37, 99, 235, 0.2);
}

.skip-tip {
  text-align: center;
  margin-top: 20rpx;
  font-size: 24rpx;
  color: #a3a3a3;
}

</style>
