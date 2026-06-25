<template>
  <!-- SOS Floating Button -->
  <view
    class="sos-container"
    :style="containerStyle"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Progress Ring -->
    <svg class="progress-ring" viewBox="0 0 120 120">
      <circle
        class="progress-bg"
        cx="60" cy="60" r="56"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        stroke-width="6"
      />
      <circle
        class="progress-fill"
        cx="60" cy="60" r="56"
        fill="none"
        stroke="#ffffff"
        stroke-width="6"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="progressOffset"
        transform="rotate(-90 60 60)"
      />
    </svg>

    <!-- Button Body -->
    <view class="sos-btn" :class="{ 'sos-btn--pressing': isPressing }">
      <text class="sos-icon">&#x26A0;</text>
      <text class="sos-text">SOS</text>
    </view>
  </view>

  <!-- Screen Border Glow (when modal is shown) -->
  <view class="border-glow" v-if="showModal"></view>

  <!-- Confirmation Modal -->
  <view class="modal-mask" v-if="showModal" @tap="handleCancelSOS">
    <view class="modal-card" @tap.stop>
      <view class="modal-header">
        <text class="modal-warn-icon">&#x26A0;</text>
        <text class="modal-title">紧急求助确认</text>
      </view>

      <!-- GPS Info -->
      <view class="modal-info">
        <view class="info-row">
          <text class="info-label">当前位置</text>
          <text class="info-value">{{ gpsInfo }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">紧急联系人</text>
          <text class="info-value">{{ emergencyName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">联系电话</text>
          <text class="info-value info-phone">{{ emergencyPhone }}</text>
        </view>
      </view>

      <!-- Action Buttons -->
      <view class="modal-actions">
        <view class="modal-btn modal-btn--cancel" @tap="handleCancelSOS">
          <text>误触取消</text>
        </view>
        <view class="modal-btn modal-btn--confirm" @tap="handleConfirmSOS">
          <text>立刻发送</text>
        </view>
      </view>
    </view>
  </view>

  <!-- Success State Modal -->
  <view class="modal-mask" v-if="showSuccess" @tap="showSuccess = false">
    <view class="modal-card modal-card--success" @tap.stop>
      <view class="success-check">&#x2713;</view>
      <text class="success-title">已发送</text>
      <view class="success-sms">
        <text class="sms-label">短信内容预览：</text>
        <text class="sms-content">{{ mockSMS }}</text>
      </view>
      <view class="modal-btn modal-btn--close" @tap="showSuccess = false">
        <text>知道了</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()

// Position state
const posX = ref(0)
const posY = ref(0)
const screenWidth = ref(375)
const screenHeight = ref(667)
const buttonSize = 120 // approximate rpx size, used for boundary calc

// Interaction state
const isPressing = ref(false)
const isDragging = ref(false)
const pressStartTime = ref(0)
const pressProgress = ref(0) // 0-100
const showModal = ref(false)
const showSuccess = ref(false)

// GPS and emergency info
const gpsInfo = ref('获取中...')
const emergencyName = ref('')
const emergencyPhone = ref('')

// Touch origin for drag
const touchStartX = ref(0)
const touchStartY = ref(0)
const btnStartX = ref(0)
const btnStartY = ref(0)

// Progress ring
const circumference = 2 * Math.PI * 56 // ~351.86
const progressOffset = computed(() => {
  return circumference - (pressProgress.value / 100) * circumference
})

// Timer refs
let pressTimer: ReturnType<typeof setInterval> | null = null
let progressTimer: ReturnType<typeof setInterval> | null = null

// Mock SMS content
const mockSMS = computed(() => {
  return `【滴答SOS紧急求助】我是${store.userProfile?.nickname || '用户'}，我在校园内遇到了紧急情况，需要你的帮助！当前位置：${gpsInfo.value}。请尽快联系我：${store.userProfile?.phone || ''}。`
})

const containerStyle = computed(() => ({
  left: posX.value + 'px',
  top: posY.value + 'px'
}))

function initPosition() {
  const systemInfo = uni.getSystemInfoSync()
  screenWidth.value = systemInfo.windowWidth || 375
  screenHeight.value = systemInfo.windowHeight || 667

  // Position at bottom-right
  const btnW = 60 // approximate px width for a 120rpx button
  const btnH = 60
  posX.value = screenWidth.value - btnW - 16
  posY.value = screenHeight.value - btnH - 120
}

function handleTouchStart(e: any) {
  const touch = e.touches[0]
  touchStartX.value = touch.clientX
  touchStartY.value = touch.clientY
  btnStartX.value = posX.value
  btnStartY.value = posY.value
  isDragging.value = false
  pressStartTime.value = Date.now()
  isPressing.value = true
  pressProgress.value = 0

  // Start progress timer
  progressTimer = setInterval(() => {
    const elapsed = Date.now() - pressStartTime.value
    pressProgress.value = Math.min((elapsed / 3000) * 100, 100)

    // Check if 3 seconds elapsed
    if (elapsed >= 3000 && !isDragging.value) {
      clearTimers()
      triggerSOS()
    }
  }, 50)

  // Vibrate on press start
  try {
    uni.vibrateShort()
  } catch (e) { /* ignore */ }
}

function handleTouchMove(e: any) {
  const touch = e.touches[0]
  const dx = Math.abs(touch.clientX - touchStartX.value)
  const dy = Math.abs(touch.clientY - touchStartY.value)

  // If moved beyond threshold during press, cancel press and start drag
  if (dx > 8 || dy > 8) {
    if (isPressing.value && !isDragging.value) {
      // Cancel the press, transition to drag
      clearTimers()
      isPressing.value = false
      pressProgress.value = 0
    }
    isDragging.value = true

    // Calculate new position
    let newX = btnStartX.value + (touch.clientX - touchStartX.value)
    let newY = btnStartY.value + (touch.clientY - touchStartY.value)

    // Constrain within screen
    const btnW = 60
    const btnH = 60
    newX = Math.max(0, Math.min(newX, screenWidth.value - btnW))
    newY = Math.max(0, Math.min(newY, screenHeight.value - btnH))

    posX.value = newX
    posY.value = newY
  }
}

function handleTouchEnd(e: any) {
  if (isDragging.value) {
    // End drag, no press action
    isDragging.value = false
    clearTimers()
    isPressing.value = false
    pressProgress.value = 0
    return
  }

  // If still pressing but under 3s, cancel
  clearTimers()
  isPressing.value = false
  pressProgress.value = 0
}

function clearTimers() {
  if (pressTimer) {
    clearInterval(pressTimer)
    pressTimer = null
  }
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

function triggerSOS() {
  isPressing.value = false
  pressProgress.value = 0

  // Check emergency contact
  if (!store.userProfile) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  if (!store.userProfile.emergencyContactName || !store.userProfile.emergencyContactPhone) {
    uni.showToast({ title: '请先设置紧急联系人', icon: 'none', duration: 2000 })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/profile/profile' })
    }, 2000)
    return
  }

  // Vibrate on trigger
  try {
    uni.vibrateLong()
  } catch (e) { /* ignore */ }

  emergencyName.value = store.userProfile.emergencyContactName
  emergencyPhone.value = store.userProfile.emergencyContactPhone

  // Get GPS location
  gpsInfo.value = '获取中...'
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      gpsInfo.value = `${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)}`
    },
    fail: () => {
      gpsInfo.value = '定位失败，请检查权限'
    }
  })

  showModal.value = true
}

function handleCancelSOS() {
  showModal.value = false
  uni.showToast({ title: '已取消', icon: 'none' })
}

function handleConfirmSOS() {
  showModal.value = false
  showSuccess.value = true

  // Vibrate on confirm
  try {
    uni.vibrateLong()
  } catch (e) { /* ignore */ }
}

onMounted(() => {
  initPosition()
})
</script>

<style lang="scss" scoped>
$red: #dc2626;
$red-light: #ef4444;
$red-dark: #b91c1c;

/* Container */
.sos-container {
  position: fixed;
  z-index: 999;
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Progress Ring */
.progress-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 120rpx;
  height: 120rpx;
  pointer-events: none;
}

.progress-bg,
.progress-fill {
  transform-origin: center;
}

.progress-fill {
  transition: stroke-dashoffset 0.05s linear;
  opacity: 0.9;
}

/* Button */
.sos-btn {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $red-light, $red);
  box-shadow: 0 8rpx 24rpx rgba(220, 38, 38, 0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease;

  &--pressing {
    transform: scale(1.08);
    box-shadow: 0 12rpx 32rpx rgba(220, 38, 38, 0.6);
  }
}

.sos-icon {
  font-size: 28rpx;
  color: #ffffff;
  line-height: 1;
}

.sos-text {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 800;
  letter-spacing: 2rpx;
  margin-top: 2rpx;
}

/* Border Glow */
.border-glow {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 998;
  pointer-events: none;
  border: 8rpx solid transparent;
  animation: borderGlow 1s ease-in-out infinite alternate;
  border-radius: 0;
}

@keyframes borderGlow {
  0% {
    border-color: rgba(220, 38, 38, 0.15);
    box-shadow: inset 0 0 60rpx rgba(220, 38, 38, 0.1);
  }
  100% {
    border-color: rgba(220, 38, 38, 0.45);
    box-shadow: inset 0 0 120rpx rgba(220, 38, 38, 0.25);
  }
}

/* Modal */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.55);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx;
}

.modal-card {
  width: 100%;
  max-width: 600rpx;
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  display: flex;
  flex-direction: column;
  gap: 32rpx;

  &--success {
    align-items: center;
    text-align: center;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  justify-content: center;
}

.modal-warn-icon {
  font-size: 48rpx;
  color: $red;
}

.modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: $red;
}

/* Info rows */
.modal-info {
  background-color: #fef2f2;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 26rpx;
  color: #666666;
}

.info-value {
  font-size: 26rpx;
  color: #333333;
  font-weight: 600;
  max-width: 360rpx;
  text-align: right;
  word-break: break-all;
}

.info-phone {
  color: $blue;
  text-decoration: underline;
}

/* Modal actions */
.modal-actions {
  display: flex;
  gap: 24rpx;
}

.modal-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;

  &--cancel {
    background-color: #f5f5f5;
    color: #666666;
    border: 2rpx solid #e5e7eb;
  }

  &--confirm {
    background-color: $red;
    color: #ffffff;
    box-shadow: 0 4rpx 16rpx rgba(220, 38, 38, 0.3);
  }

  &--close {
    background-color: #2563eb;
    color: #ffffff;
    width: 100%;
  }
}

/* Success state */
.success-check {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: #10b981;
  color: #ffffff;
  font-size: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.success-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #10b981;
}

.success-sms {
  width: 100%;
  background-color: #f0fdf4;
  border-radius: 16rpx;
  padding: 24rpx;
  text-align: left;
}

.sms-label {
  font-size: 24rpx;
  color: #666666;
  display: block;
  margin-bottom: 12rpx;
}

.sms-content {
  font-size: 26rpx;
  color: #333333;
  line-height: 1.6;
  word-break: break-all;
}
</style>
