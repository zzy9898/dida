<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <view class="back-btn" @tap="handleBack">
        <text class="back-icon">&#x2190;</text>
      </view>
      <text class="header-title">发起活动</text>
      <view class="header-placeholder"></view>
    </view>

    <scroll-view class="form-scroll" scroll-y="true">
      <!-- Poster Cover Section -->
      <view class="section">
        <text class="section-label">活动封面</text>
        <view class="cover-area">
          <view class="cover-preview" v-if="form.coverImage">
            <image class="cover-img" :src="form.coverImage" mode="aspectFill" />
            <view class="cover-change-btn" @tap="handlePickCover">
              <text class="cover-change-text">更换封面</text>
            </view>
          </view>
          <view class="cover-upload" v-else @tap="handlePickCover">
            <text class="upload-icon">+</text>
            <text class="upload-text">上传封面</text>
          </view>
        </view>
        <view class="preset-row">
          <view
            class="preset-btn"
            :class="{ 'preset-btn--active': form.category === '咖啡探店' }"
            @tap="handlePreset('咖啡探店', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80')"
          >
            <text class="preset-emoji">&#x2615;</text>
            <text class="preset-label">咖啡探店</text>
          </view>
          <view
            class="preset-btn"
            :class="{ 'preset-btn--active': form.category === '羽毛球/网球' }"
            @tap="handlePreset('羽毛球/网球', 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80')"
          >
            <text class="preset-emoji">&#x1F3F8;</text>
            <text class="preset-label">羽毛球/网球</text>
          </view>
          <view
            class="preset-btn"
            :class="{ 'preset-btn--active': form.category === '极静自修室' }"
            @tap="handlePreset('极静自修室', 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=400&q=80')"
          >
            <text class="preset-emoji">&#x1F4DA;</text>
            <text class="preset-label">极静自修室</text>
          </view>
          <view
            class="preset-btn"
            :class="{ 'preset-btn--active': form.category === '桌游密逃派对' }"
            @tap="handlePreset('桌游密逃派对', 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=400&q=80')"
          >
            <text class="preset-emoji">&#x1F3B2;</text>
            <text class="preset-label">桌游密逃派对</text>
          </view>
        </view>
      </view>

      <!-- Title -->
      <view class="section">
        <text class="section-label">活动标题</text>
        <input
          class="input-field"
          v-model="form.title"
          placeholder="给你的活动起个吸引人的名字吧"
          :maxlength="20"
          placeholder-style="color: #c0c4cc;"
        />
        <text class="char-count">{{ form.title.length }}/20</text>
      </view>

      <!-- Category -->
      <view class="section">
        <text class="section-label">活动分类</text>
        <picker
          mode="selector"
          :range="categoryOptions"
          :value="categoryIndex"
          @change="handleCategoryChange"
        >
          <view class="picker-field">
            <text :class="{ 'picker-placeholder': !form.category }">
              {{ form.category || '请选择活动分类' }}
            </text>
            <text class="picker-arrow">&#x25BC;</text>
          </view>
        </picker>
      </view>

      <!-- Custom Category -->
      <view class="section" v-if="form.category === '自定义'">
        <text class="section-label">自定义分类</text>
        <input
          class="input-field"
          v-model="form.customCategory"
          placeholder="输入你想要的活动分类"
          :maxlength="10"
          placeholder-style="color: #c0c4cc;"
        />
      </view>

      <!-- Attendance Limit -->
      <view class="section">
        <text class="section-label">参与人数上限</text>
        <view class="limit-row">
          <input
            class="input-field input-number"
            v-model="form.limitStr"
            type="number"
            placeholder="1-16"
            :maxlength="2"
            placeholder-style="color: #c0c4cc;"
            @blur="handleLimitBlur"
          />
          <text class="limit-hint">人 (1-16)</text>
        </view>
      </view>

      <!-- Mode Toggle -->
      <view class="section">
        <text class="section-label">活动模式</text>
        <view class="toggle-row">
          <view
            class="toggle-btn"
            :class="{ 'toggle-btn--active': form.mode === 'offline' }"
            @tap="form.mode = 'offline'"
          >
            <text>线下集合</text>
          </view>
          <view
            class="toggle-btn"
            :class="{ 'toggle-btn--active': form.mode === 'online' }"
            @tap="form.mode = 'online'"
          >
            <text>线上对接</text>
          </view>
        </view>
      </view>

      <!-- Start Time -->
      <view class="section">
        <text class="section-label">开始时间</text>
        <input
          class="input-field"
          v-model="form.startTime"
          placeholder="例如：周六下午3点"
          placeholder-style="color: #c0c4cc;"
        />
      </view>

      <!-- End Time -->
      <view class="section">
        <text class="section-label">结束时间</text>
        <input
          class="input-field"
          v-model="form.endTime"
          placeholder="例如：周六下午5点"
          placeholder-style="color: #c0c4cc;"
        />
      </view>

      <!-- Location -->
      <view class="section">
        <text class="section-label">活动地点</text>
        <input
          class="input-field"
          v-model="form.location"
          placeholder="例如：中心校区西门莫扎咖啡馆"
          placeholder-style="color: #c0c4cc;"
        />
      </view>

      <!-- Description -->
      <view class="section">
        <text class="section-label">活动描述</text>
        <textarea
          class="textarea-field"
          v-model="form.description"
          placeholder="详细描述你的活动计划、要求、注意事项等..."
          placeholder-style="color: #c0c4cc;"
          :maxlength="500"
          auto-height
        />
        <text class="char-count">{{ form.description.length }}/500</text>
      </view>

      <!-- Spacer for bottom buttons -->
      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- Bottom Buttons -->
    <view class="bottom-bar">
      <view class="btn-cancel" @tap="handleCancel">
        <text>取消</text>
      </view>
      <view class="btn-publish" @tap="handlePublish">
        <text>发布活动</text>
      </view>
    </view>

    <GlobalSOS v-if="!store.userProfile || !store.userProfile.hideSOS" />
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import GlobalSOS from '@/components/GlobalSOS.vue'
import type { Activity } from '@/data/types'

const store = useAppStore()

const categoryOptions = ['咖啡探店', '羽毛球/网球', '经典电影', '极静自修室', '自定义']

interface PublishActivityForm {
  coverImage: string
  title: string
  category: string
  customCategory: string
  limitStr: string
  limit: number
  mode: 'offline' | 'online'
  startTime: string
  endTime: string
  location: string
  description: string
}

const form = reactive<PublishActivityForm>({
  coverImage: '',
  title: '',
  category: '',
  customCategory: '',
  limitStr: '',
  limit: 0,
  mode: 'offline',
  startTime: '',
  endTime: '',
  location: '',
  description: ''
})

const categoryIndex = computed(() => {
  const idx = categoryOptions.indexOf(form.category)
  return idx >= 0 ? idx : 0
})

function handleBack() {
  uni.navigateBack()
}

function handlePickCover() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      form.coverImage = res.tempFilePaths[0]
    },
    fail: () => {
      uni.showToast({ title: '取消选择', icon: 'none' })
    }
  })
}

function handlePreset(category: string, imageUrl: string) {
  form.category = category
  form.coverImage = imageUrl
  form.customCategory = ''
}

function handleCategoryChange(e: any) {
  const idx = Number(e.detail.value)
  form.category = categoryOptions[idx]
  if (form.category !== '自定义') {
    form.customCategory = ''
  }
}

function handleLimitBlur() {
  const num = parseInt(form.limitStr, 10)
  if (isNaN(num) || num < 1) {
    form.limit = 1
    form.limitStr = '1'
  } else if (num > 16) {
    form.limit = 16
    form.limitStr = '16'
  } else {
    form.limit = num
  }
}

function validateForm(): string | null {
  if (!form.coverImage) return '请上传活动封面'
  if (!form.title.trim()) return '请填写活动标题'
  if (!form.category) return '请选择活动分类'
  if (form.category === '自定义' && !form.customCategory.trim()) return '请填写自定义分类'
  const num = parseInt(form.limitStr, 10)
  if (isNaN(num) || num < 1 || num > 16) return '参与人数需在1-16之间'
  if (!form.startTime.trim()) return '请填写开始时间'
  if (!form.location.trim()) return '请填写活动地点'
  if (!form.description.trim()) return '请填写活动描述'
  return null
}

function handlePublish() {
  const error = validateForm()
  if (error) {
    uni.showToast({ title: error, icon: 'none' })
    return
  }

  if (!store.userProfile) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  const finalCategory = form.category === '自定义'
    ? form.customCategory.trim()
    : form.category

  const activity: Activity = {
    id: store.genId('act_'),
    title: form.title.trim(),
    description: form.description.trim(),
    coverImage: form.coverImage,
    time: form.startTime.trim(),
    endTime: form.endTime.trim() || undefined,
    mode: form.mode,
    location: form.location.trim(),
    limit: form.limit,
    joinedCount: 1,
    members: [store.userProfile.uid],
    tags: [finalCategory],
    school: store.userProfile.school,
    creatorUid: store.userProfile.uid,
    creatorName: store.userProfile.nickname,
    creatorAvatar: store.userProfile.avatar
  }

  store.publishActivity(activity)
  uni.showToast({ title: '活动发布成功！', icon: 'success' })
  setTimeout(() => {
    uni.navigateBack()
  }, 800)
}

function handleCancel() {
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
$blue: #2563eb;
$bg: #f8f9fa;
$border: #e5e7eb;
$text: #333333;
$text-secondary: #666666;
$text-placeholder: #c0c4cc;

.page {
  height: 100vh;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  background-color: $bg;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx;
  background-color: #ffffff;
  border-bottom: 1rpx solid $border;
  flex-shrink: 0;
  z-index: 10;
}

.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 40rpx;
  color: $text;
  font-weight: 700;
}

.header-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $text;
}

.header-placeholder {
  width: 64rpx;
}

.form-scroll {
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
}

.section {
  margin-bottom: 32rpx;
}

.section-label {
  font-size: 28rpx;
  font-weight: 600;
  color: $text;
  margin-bottom: 16rpx;
  display: block;
}

/* Cover */
.cover-area {
  margin-bottom: 16rpx;
}

.cover-upload {
  width: 100%;
  height: 320rpx;
  background-color: #ffffff;
  border: 2rpx dashed $border;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.upload-icon {
  font-size: 72rpx;
  color: $text-placeholder;
  line-height: 1;
}

.upload-text {
  font-size: 26rpx;
  color: $text-placeholder;
  margin-top: 12rpx;
}

.cover-preview {
  position: relative;
  width: 100%;
  height: 320rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
}

.cover-change-btn {
  position: absolute;
  bottom: 20rpx;
  right: 20rpx;
  background-color: rgba(0, 0, 0, 0.55);
  border-radius: 32rpx;
  padding: 8rpx 24rpx;
}

.cover-change-text {
  font-size: 24rpx;
  color: #ffffff;
}

/* Preset Buttons */
.preset-row {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.preset-btn {
  flex: 1;
  min-width: 150rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20rpx 12rpx;
  background-color: #ffffff;
  border: 2rpx solid $border;
  border-radius: 16rpx;
  transition: all 0.2s;

  &--active {
    border-color: $blue;
    background-color: #eff6ff;
  }
}

.preset-emoji {
  font-size: 36rpx;
  margin-bottom: 6rpx;
}

.preset-label {
  font-size: 22rpx;
  color: $text-secondary;
}

/* Inputs */
.input-field {
  width: 100%;
  height: 80rpx;
  background-color: #ffffff;
  border: 2rpx solid $border;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: $text;
  box-sizing: border-box;
}

.input-number {
  width: 160rpx;
}

.char-count {
  font-size: 22rpx;
  color: $text-placeholder;
  text-align: right;
  display: block;
  margin-top: 8rpx;
}

/* Picker */
.picker-field {
  width: 100%;
  height: 80rpx;
  background-color: #ffffff;
  border: 2rpx solid $border;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: $text;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-placeholder {
  color: $text-placeholder;
}

.picker-arrow {
  font-size: 24rpx;
  color: $text-placeholder;
}

/* Limit */
.limit-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.limit-hint {
  font-size: 26rpx;
  color: $text-secondary;
}

/* Toggle */
.toggle-row {
  display: flex;
  border-radius: 12rpx;
  overflow: hidden;
  border: 2rpx solid $border;
  width: fit-content;
}

.toggle-btn {
  padding: 16rpx 40rpx;
  font-size: 28rpx;
  color: $text-secondary;
  background-color: #ffffff;
  text-align: center;

  &--active {
    background-color: $blue;
    color: #ffffff;
  }
}

/* Textarea */
.textarea-field {
  width: 100%;
  min-height: 200rpx;
  background-color: #ffffff;
  border: 2rpx solid $border;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: $text;
  box-sizing: border-box;
}

/* Bottom Spacer */
.bottom-spacer {
  height: 32rpx;
}

/* Bottom Bar */
.bottom-bar {
  flex-shrink: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: #ffffff;
  border-top: 1rpx solid $border;
  gap: 24rpx;
  z-index: 10;
}

@media screen and (max-width: 360px) {
  .form-scroll { padding-left: 24rpx; padding-right: 24rpx; }
  .cover-upload, .cover-preview { height: 280rpx; }
  .preset-btn { min-width: 138rpx; }
  .bottom-bar { padding-left: 24rpx; padding-right: 24rpx; gap: 16rpx; }
}

.btn-cancel {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $bg;
  border: 2rpx solid $border;
  border-radius: 44rpx;
  font-size: 30rpx;
  color: $text-secondary;
}

.btn-publish {
  flex: 2;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $blue;
  border-radius: 44rpx;
  font-size: 30rpx;
  color: #ffffff;
  font-weight: 600;
}
</style>
