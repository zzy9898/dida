<template>
  <view class="publish-center">
    <view class="hero">
      <text class="hero-kicker">CREATE TOGETHER</text>
      <text class="hero-title">今天想分享什么？</text>
      <text class="hero-desc">发起一场校友活动，或把校园里的新鲜事分享给大家。</text>
    </view>

    <view class="choice-list">
      <view class="choice-card activity-card" @tap="goActivity">
        <view class="choice-icon activity-icon">旗</view>
        <view class="choice-copy">
          <text class="choice-title">发起校友活动</text>
          <text class="choice-desc">约球、拼车、探店、自习，快速找到同行搭子</text>
          <view class="choice-tags"><text>时间地点</text><text>人数限制</text><text>申请审核</text></view>
        </view>
        <text class="choice-arrow">›</text>
      </view>

      <view class="choice-card post-card" @tap="goPost">
        <view class="choice-icon post-icon">笔</view>
        <view class="choice-copy">
          <text class="choice-title">发布帖子</text>
          <text class="choice-desc">用文字和图片记录校园生活，参与主题讨论</text>
          <view class="choice-tags"><text>图文笔记</text><text>话题分类</text><text>草稿保存</text></view>
        </view>
        <text class="choice-arrow">›</text>
      </view>
    </view>

    <view class="safe-tip"><text class="safe-icon">盾</text><text>发布内容需遵守社区公约，共建真实友善的校友圈</text></view>
    <GlobalSOS v-if="!store.userProfile || !store.userProfile.hideSOS" />
  </view>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import GlobalSOS from '@/components/GlobalSOS.vue'
const store = useAppStore()
function goActivity() { uni.navigateTo({ url: '/pages/publish-activity/publish-activity' }) }
function goPost() { uni.navigateTo({ url: '/pages/publish-post/publish-post' }) }
</script>

<style lang="scss" scoped>
.publish-center { min-height: 100vh; padding: 56rpx 28rpx 180rpx; box-sizing: border-box; background: linear-gradient(180deg,#eef6ff 0,#f8fafc 48%,#fff 100%); }
.hero { padding: 28rpx 12rpx 44rpx; display:flex; flex-direction:column; }
.hero-kicker { color:#2563eb; font-size:20rpx; font-weight:800; letter-spacing:4rpx; margin-bottom:14rpx; }
.hero-title { color:#172033; font-size:48rpx; font-weight:900; margin-bottom:16rpx; }
.hero-desc { color:#6b7280; font-size:26rpx; line-height:1.65; }
.choice-list { display:flex; flex-direction:column; gap:24rpx; }
.choice-card { position:relative; display:flex; align-items:center; padding:34rpx 28rpx; border-radius:28rpx; background:#fff; box-shadow:0 12rpx 34rpx rgba(30,64,175,.09); border:2rpx solid rgba(37,99,235,.08); }
.choice-card:active { transform:scale(.985); }
.choice-icon { width:92rpx; height:92rpx; flex-shrink:0; border-radius:28rpx; display:flex; align-items:center; justify-content:center; color:#fff; font-size:32rpx; font-weight:900; margin-right:24rpx; }
.activity-icon { background:linear-gradient(135deg,#2563eb,#06b6d4); }
.post-icon { background:linear-gradient(135deg,#f43f5e,#f59e0b); }
.choice-copy { flex:1; min-width:0; display:flex; flex-direction:column; }
.choice-title { font-size:32rpx; font-weight:800; color:#1f2937; margin-bottom:10rpx; }
.choice-desc { font-size:23rpx; line-height:1.5; color:#6b7280; margin-bottom:16rpx; }
.choice-tags { display:flex; flex-wrap:wrap; gap:10rpx; }
.choice-tags text { padding:6rpx 12rpx; border-radius:12rpx; background:#f3f6fb; color:#64748b; font-size:19rpx; }
.choice-arrow { font-size:52rpx; color:#cbd5e1; margin-left:12rpx; }
.safe-tip { margin:36rpx 12rpx 0; padding:22rpx 24rpx; display:flex; align-items:center; gap:14rpx; border-radius:18rpx; color:#64748b; background:rgba(255,255,255,.72); font-size:22rpx; line-height:1.5; }
.safe-icon { color:#10b981; font-weight:900; }
</style>

