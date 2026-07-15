<template>
  <!-- SOS Floating Button -->
  <view
    class="sos-container"
    :style="containerStyle"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
  >
    <!-- Progress Ring -->
    <view class="progress-ring" :class="{ 'progress-ring--active': isPressing }"></view>

    <!-- Button Body -->
    <view class="sos-btn" :class="{ 'sos-btn--pressing': isPressing }">
      <text class="sos-icon">&#x1F6E1;</text>
      <text class="sos-text">{{ isPressing ? remainingSeconds : 'SOS' }}</text>
    </view>
  </view>

  <!-- Screen Border Glow (when modal is shown) -->
  <view class="border-glow" v-if="showModal"></view>

  <!-- Confirmation Modal -->
  <view class="modal-mask" v-if="showModal" @tap="handleCancelSOS">
    <view class="modal-card" @tap.stop>
      <view class="modal-shield">
        <text class="modal-shield-icon">!</text>
      </view>
      <text class="modal-title">🚨 即将拨打电话给紧急联系人</text>
      <text class="modal-description">
        系统已锁定并获取了您当前的精确定位。即将自动拨打电话呼叫您的紧急联系人：
        <text class="modal-contact">{{ emergencyName }}（{{ emergencyPhone }}）</text>
        ，并发送持续 SOS 防卫联动报警和实时地图轨迹！
      </text>

      <view class="location-card">
        <text class="location-pin">⌾</text>
        <text class="location-text">{{ gpsInfo }}</text>
      </view>

      <!-- Action Buttons -->
      <view class="modal-actions">
        <view class="modal-btn modal-btn--cancel" @tap="handleCancelSOS">
          <text>误触取消</text>
        </view>
        <view class="modal-btn modal-btn--confirm" @tap="handleConfirmSOS">
          <text>➤ 立刻发送</text>
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

const remainingSeconds = computed(() => Math.max(1, Math.ceil(3 - pressProgress.value * 0.03)))

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
  posX.value = screenWidth.value - btnW - 18
  posY.value = screenHeight.value - btnH - 96
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
$blue: #2563eb;

/* Container */
.sos-container {
  position: fixed;
  z-index: 999;
  width: 128rpx;
  height: 128rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Progress Ring */
.progress-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 128rpx;
  height: 128rpx;
  pointer-events: none;
  box-sizing: border-box;
  border: 6rpx solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;

  &--active {
    border-color: #ffffff;
    animation: sosRingPulse 0.6s ease-in-out infinite alternate;
  }
}

@keyframes sosRingPulse {
  from { transform: scale(0.96); opacity: 0.55; }
  to { transform: scale(1); opacity: 1; }
}

/* Button */
.sos-btn {
  width: 108rpx;
  height: 108rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $red-light, $red);
  box-shadow: 0 0 0 18rpx rgba(239, 68, 68, 0.08), 0 10rpx 28rpx rgba(220, 38, 38, 0.5);
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
  font-size: 30rpx;
  color: #ffffff;
  line-height: 1;
}

.sos-text {
  font-size: 20rpx;
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
  background-color: rgba(3, 7, 18, 0.68);
  backdrop-filter: blur(8rpx);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  box-sizing: border-box;
}

.modal-card {
  width: 100%;
  max-width: 620rpx;
  box-sizing: border-box;
  background: linear-gradient(160deg, #100d0f 0%, #070708 100%);
  border: 2rpx solid rgba(239, 32, 48, 0.7);
  border-radius: 38rpx;
  padding: 38rpx 36rpx 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 26rpx;
  box-shadow: 0 28rpx 80rpx rgba(0, 0, 0, 0.48), inset 0 0 48rpx rgba(239, 32, 48, 0.05);

  &--success {
    align-items: center;
    text-align: center;
  }
}

.modal-shield {
  width: 78rpx;
  height: 78rpx;
  border-radius: 50%;
  border: 3rpx solid #ef233c;
  background: rgba(239, 35, 60, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-shield-icon {
  width: 34rpx;
  height: 42rpx;
  border: 3rpx solid #ef233c;
  border-radius: 9rpx 9rpx 14rpx 14rpx;
  color: #ef233c;
  font-size: 25rpx;
  font-weight: 900;
  text-align: center;
  line-height: 38rpx;
}

.modal-title {
  font-size: 29rpx;
  font-weight: 800;
  color: #ff3150;
  text-align: center;
}

.modal-description {
  font-size: 23rpx;
  line-height: 1.75;
  color: #a8a8ad;
  text-align: center;
}

.modal-contact {
  color: #f4f4f5;
  font-weight: 800;
}

.location-card {
  width: 100%;
  box-sizing: border-box;
  min-height: 76rpx;
  padding: 18rpx 24rpx;
  border-radius: 24rpx;
  background: #17171a;
  border: 1rpx solid #27272a;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.location-pin {
  color: #ff3150;
  font-size: 30rpx;
}

.location-text {
  flex: 1;
  color: #c7c7cc;
  font-size: 22rpx;
  word-break: break-all;
}

/* Modal actions */
.modal-actions {
  width: 100%;
  display: flex;
  gap: 24rpx;
}

.modal-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 27rpx;
  font-weight: 600;

  &--cancel {
    background-color: #151518;
    color: #d4d4d8;
    border: 2rpx solid #34343a;
  }

  &--confirm {
    background: linear-gradient(135deg, #ff1738, #e80020);
    color: #ffffff;
    box-shadow: 0 4rpx 16rpx rgba(220, 38, 38, 0.3);
  }

  &--close {
    background-color: #2563eb;
    color: #ffffff;
    width: 100%;
  }
}

@media screen and (max-width: 360px) {
  .modal-mask { padding: 36rpx; }
  .modal-card { padding-left: 28rpx; padding-right: 28rpx; }
  .modal-actions { gap: 16rpx; }
  .modal-btn { font-size: 24rpx; }
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
