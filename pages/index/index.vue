<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()

onMounted(async () => {
  // 已在内存中（同会话内导航回来）直接进首页
  if (store.userProfile) {
    uni.switchTab({ url: '/pages/home/home' })
    return
  }
  // 尝试用本地令牌恢复登录态（校验 token + 重登 IM）
  const restored = await store.restoreSession()
  if (restored) {
    uni.switchTab({ url: '/pages/home/home' })
  } else {
    uni.redirectTo({ url: '/pages/verify/verify' })
  }
})
</script>

<template>
  <view class="splash">
    <view class="logo-area">
      <view class="logo-icon">滴</view>
      <text class="app-name">滴答</text>
    </view>
    <text class="subtitle">实名制高校潮流社交活动平台</text>
    <text class="loading">加载中...</text>
  </view>
</template>

<style scoped>
.splash {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #eff6ff 0%, #fafbfc 50%, #f0f6ff 100%);
}
.logo-area { display: flex; align-items: center; gap: 10rpx; margin-bottom: 16rpx; }
.logo-icon {
  width: 80rpx; height: 80rpx; border-radius: 24rpx;
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  color: white; font-size: 40rpx; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
}
.app-name { font-size: 48rpx; font-weight: 800; color: #262626; }
.subtitle { font-size: 24rpx; color: #737373; margin-bottom: 32rpx; }
.loading { font-size: 22rpx; color: #a3a3a3; }
</style>
