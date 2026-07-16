<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <view class="back-btn" @tap="handleBack">
        <text class="back-icon">&#x2190;</text>
      </view>
      <text class="header-title">发布帖子</text>
      <view class="header-placeholder"></view>
    </view>

    <scroll-view class="form-scroll" scroll-y="true">
      <!-- Photo Grid -->
      <view class="section">
        <text class="section-label">添加图片</text>
        <view class="photo-grid">
          <view
            class="photo-item"
            v-for="(img, idx) in images"
            :key="idx"
          >
            <image class="photo-img" :src="img" mode="aspectFill" />
            <view class="photo-remove" @tap="removeImage(idx)">
              <text class="photo-remove-icon">&#x2715;</text>
            </view>
          </view>
          <view class="photo-add" v-if="images.length < 9" @tap="handlePickImages">
            <text class="photo-add-icon">+</text>
            <text class="photo-add-text">添加</text>
          </view>
        </view>
      </view>

      <!-- Preset Images -->
      <view class="section">
        <text class="section-label">快捷配图</text>
        <view class="preset-img-row">
          <view class="preset-img-btn" @tap="addPresetImage('https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=400&q=80')">
            <image class="preset-thumb" src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=200&q=80" mode="aspectFill" />
            <text class="preset-thumb-label">操场夕阳</text>
          </view>
          <view class="preset-img-btn" @tap="addPresetImage('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=400&q=80')">
            <image class="preset-thumb" src="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=200&q=80" mode="aspectFill" />
            <text class="preset-thumb-label">图书馆自修</text>
          </view>
          <view class="preset-img-btn" @tap="addPresetImage('https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80')">
            <image class="preset-thumb" src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=200&q=80" mode="aspectFill" />
            <text class="preset-thumb-label">猫咪暖阳</text>
          </view>
          <view class="preset-img-btn" @tap="addPresetImage('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80')">
            <image class="preset-thumb" src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=200&q=80" mode="aspectFill" />
            <text class="preset-thumb-label">美味午餐</text>
          </view>
        </view>
      </view>

      <!-- Title -->
      <view class="section">
        <text class="section-label">标题</text>
        <input
          class="input-field"
          v-model="form.title"
          placeholder="给你的帖子起个标题..."
          :maxlength="16"
          placeholder-style="color: #c0c4cc;"
        />
        <text class="char-count">{{ form.title.length }}/16</text>
      </view>

      <!-- Category -->
      <view class="section">
        <text class="section-label">选择分类</text>
        <view v-if="categories.length === 0" class="category-empty">
          <text class="category-empty-text">分类加载中...</text>
        </view>
        <view class="category-grid">
          <view
            class="category-btn"
            :class="{ 'category-btn--active': form.categoryId === cat.id }"
            v-for="cat in categories"
            :key="cat.id"
            @tap="form.categoryId = cat.id"
          >
            <text>{{ cat.name }}</text>
          </view>
        </view>
      </view>

      <!-- Content -->
      <view class="section">
        <text class="section-label">正文内容</text>
        <textarea
          class="textarea-field"
          v-model="form.content"
          placeholder="分享你的校园生活、心情、想法..."
          placeholder-style="color: #c0c4cc;"
          :maxlength="2000"
          auto-height
        />
        <text class="char-count">{{ form.content.length }}/2000</text>
      </view>

      <!-- Voice Recording -->
      <view class="section">
        <text class="section-label">语音转文字</text>
        <view class="voice-btn-wrap">
          <view
            class="voice-btn"
            :class="{ 'voice-btn--recording': isRecording }"
            @tap="handleVoiceRecord"
          >
            <text class="voice-icon">&#x1F3A4;</text>
            <text>{{ isRecording ? '正在录制...' : '按住录音转文字' }}</text>
          </view>
        </view>
        <view class="recording-wave" v-if="isRecording">
          <view class="wave-bar" v-for="i in 5" :key="i" :style="{ animationDelay: (i * 0.15) + 's' }"></view>
        </view>
      </view>

      <!-- Hashtags -->
      <view class="section">
        <text class="section-label">推荐话题</text>
        <view class="hashtag-row">
          <view
            class="hashtag-btn"
            v-for="tag in hashtags"
            :key="tag"
            @tap="appendHashtag(tag)"
          >
            <text>{{ tag }}</text>
          </view>
        </view>
      </view>

      <!-- Location -->
      <view class="section">
        <text class="section-label">位置</text>
        <picker
          mode="selector"
          :range="locationOptions"
          :value="locationIndex"
          @change="handleLocationChange"
        >
          <view class="picker-field">
            <text :class="{ 'picker-placeholder': !form.location }">
              {{ form.location || '不显示位置' }}
            </text>
            <text class="picker-arrow">&#x25BC;</text>
          </view>
        </picker>
      </view>

      <!-- Spacer -->
      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- Bottom Buttons -->
    <view class="bottom-bar">
      <view class="btn-publish" :class="{ 'btn-publish--loading': publishing }" @tap="handlePublish">
        <text>{{ publishing ? '发布中...' : '发布笔记' }}</text>
      </view>
    </view>

    <GlobalSOS v-if="!store.userProfile || !store.userProfile.hideSOS" />
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import GlobalSOS from '@/components/GlobalSOS.vue'
import { uploadPostMedia } from '@/utils/upload'
import { RequestError } from '@/utils/request'
import type { CreatePostParam } from '@/data/types'

const store = useAppStore()

const images = ref<string[]>([])
const isRecording = ref(false)
const publishing = ref(false)

interface PublishPostForm {
  title: string
  categoryId: number | null
  content: string
  location: string
}

const form = reactive<PublishPostForm>({
  title: '',
  categoryId: null,
  content: '',
  location: ''
})

// 动态分类（后端 §4.1）
const categories = computed(() => store.postCategories)

onShow(async () => {
  try {
    const list = await store.loadCategories()
    // 默认选中第一个分类
    if (form.categoryId === null && list.length) form.categoryId = list[0].id
  } catch {
    /* request 层已提示 */
  }
})

const hashtags = ['#跑步打卡', '#操场晚风', '#期末加油', '#自习室', '#猫咖日记', '#食堂干饭', '#校园街拍', '#今日穿搭']

const locationOptions = ['不显示位置', '中心校区图书馆', '风雨操场', '齐园餐厅', '洪家楼教堂', '蒋震图书馆']
const locationIndex = computed(() => {
  const idx = locationOptions.indexOf(form.location)
  return idx >= 0 ? idx : 0
})

function handleBack() {
  uni.switchTab({ url: '/pages/forum/forum' })
}

function handlePickImages() {
  const remaining = 9 - images.value.length
  uni.chooseImage({
    count: remaining,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      images.value = [...images.value, ...res.tempFilePaths]
    },
    fail: () => {
      uni.showToast({ title: '取消选择', icon: 'none' })
    }
  })
}

function removeImage(idx: number) {
  images.value = images.value.filter((_, i) => i !== idx)
}

function addPresetImage(url: string) {
  if (images.value.length >= 9) {
    uni.showToast({ title: '最多添加9张图片', icon: 'none' })
    return
  }
  if (images.value.includes(url)) {
    uni.showToast({ title: '该图片已添加', icon: 'none' })
    return
  }
  images.value = [...images.value, url]
}

function handleLocationChange(e: any) {
  const idx = Number(e.detail.value)
  if (idx === 0) {
    form.location = ''
  } else {
    form.location = locationOptions[idx]
  }
}

function appendHashtag(tag: string) {
  if (form.content.includes(tag)) return
  form.content = form.content ? form.content + ' ' + tag : tag
}

function handleVoiceRecord() {
  if (isRecording.value) return
  isRecording.value = true

  setTimeout(() => {
    isRecording.value = false
    const voiceText = '【语音转文字】今天天气真好，适合出去走走，有没有一起的小伙伴呀？'
    form.content = form.content ? form.content + '\n' + voiceText : voiceText
    uni.showToast({ title: '语音识别完成', icon: 'success' })
  }, 2500)
}

function validateForm(): string | null {
  if (!store.userProfile) return '请先登录'
  if (!form.title.trim()) return '请填写帖子标题'
  if (form.categoryId === null) return '请选择帖子分类'
  if (!form.content.trim()) return '请填写正文内容'
  return null
}

async function handlePublish() {
  if (publishing.value) return
  const error = validateForm()
  if (error) {
    uni.showToast({ title: error, icon: 'none' })
    return
  }

  publishing.value = true
  uni.showLoading({ title: '发布中...', mask: true })
  try {
    // 本地图上传 OSS，预设/远程图透传；无图也可发布（media 选填）
    const media = images.value.length ? await uploadPostMedia(images.value) : undefined

    const param: CreatePostParam = {
      categoryId: form.categoryId as number,
      title: form.title.trim(),
      content: form.content.trim(),
      media,
      locationName: form.location || undefined,
    }

    await store.publishPost(param)
    uni.hideLoading()
    uni.showToast({ title: '发布成功！', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/forum/forum' })
    }, 800)
  } catch (e) {
    uni.hideLoading()
    const code = (e as RequestError).code
    if (code === 403) {
      uni.showToast({ title: '发帖需先完成实名与学籍认证', icon: 'none', duration: 2000 })
    } else {
      uni.showToast({ title: (e as Error).message || '发布失败，请稍后重试', icon: 'none' })
    }
  } finally {
    publishing.value = false
  }
}
</script>

<style lang="scss" scoped>
$blue: #2563eb;
$bg: #f8f9fa;
$border: #e5e7eb;
$text: #333333;
$text-secondary: #666666;
$text-placeholder: #c0c4cc;
$red: #ef4444;

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

/* Photo Grid */
.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.photo-item {
  width: calc((100% - 36rpx) / 4);
  height: 0;
  padding-bottom: calc((100% - 36rpx) / 4);
  position: relative;
  border-radius: 12rpx;
  overflow: hidden;
}

.photo-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.photo-remove {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 40rpx;
  height: 40rpx;
  background-color: rgba(0, 0, 0, 0.55);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-remove-icon {
  font-size: 24rpx;
  color: #ffffff;
  font-weight: 700;
}

.photo-add {
  width: calc((100% - 36rpx) / 4);
  height: 0;
  padding-bottom: calc((100% - 36rpx) / 4);
  position: relative;
  background-color: #ffffff;
  border: 2rpx dashed $border;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.photo-add-icon {
  font-size: 48rpx;
  color: $text-placeholder;
  line-height: 1;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -65%);
}

.photo-add-text {
  font-size: 20rpx;
  color: $text-placeholder;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, 10rpx);
}

/* Preset Images */
.preset-img-row {
  display: flex;
  gap: 16rpx;
  overflow: hidden;
}

.preset-img-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.preset-thumb {
  width: 100%;
  height: 140rpx;
  border-radius: 12rpx;
}

.preset-thumb-label {
  font-size: 20rpx;
  color: $text-secondary;
  text-align: center;
}

/* Input */
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

.char-count {
  font-size: 22rpx;
  color: $text-placeholder;
  text-align: right;
  display: block;
  margin-top: 8rpx;
}

/* Category Grid */
.category-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.category-btn {
  padding: 14rpx 28rpx;
  background-color: #ffffff;
  border: 2rpx solid $border;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: $text-secondary;

  &--active {
    background-color: #eff6ff;
    border-color: $blue;
    color: $blue;
    font-weight: 600;
  }
}

/* Textarea */
.textarea-field {
  width: 100%;
  min-height: 240rpx;
  background-color: #ffffff;
  border: 2rpx solid $border;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: $text;
  box-sizing: border-box;
}

/* Voice */
.voice-btn-wrap {
  display: flex;
  justify-content: center;
}

.voice-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 48rpx;
  background-color: #ffffff;
  border: 2rpx solid $border;
  border-radius: 48rpx;
  font-size: 28rpx;
  color: $text-secondary;

  &--recording {
    background-color: #fef2f2;
    border-color: $red;
    color: $red;
    animation: pulse 0.8s ease-in-out infinite;
  }
}

.voice-icon {
  font-size: 36rpx;
}

.recording-wave {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8rpx;
  height: 60rpx;
  margin-top: 16rpx;
}

.wave-bar {
  width: 8rpx;
  height: 20rpx;
  background-color: $red;
  border-radius: 4rpx;
  animation: waveAnim 0.6s ease-in-out infinite alternate;

  &:nth-child(2) { height: 36rpx; }
  &:nth-child(3) { height: 52rpx; }
  &:nth-child(4) { height: 36rpx; }
  &:nth-child(5) { height: 20rpx; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.85; transform: scale(1.03); }
}

@keyframes waveAnim {
  0% { height: 20%; }
  100% { height: 100%; }
}

/* Hashtags */
.hashtag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.hashtag-btn {
  padding: 10rpx 24rpx;
  background-color: #eff6ff;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: $blue;
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

/* Spacer */
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
  .preset-img-row { gap: 10rpx; }
  .preset-thumb { height: 112rpx; }
  .category-grid, .hashtag-row { gap: 12rpx; }
  .category-btn { padding-left: 22rpx; padding-right: 22rpx; }
  .bottom-bar { padding-left: 24rpx; padding-right: 24rpx; gap: 16rpx; }
}

.btn-publish {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $blue;
  border-radius: 44rpx;
  font-size: 30rpx;
  color: #ffffff;
  font-weight: 600;

  &--loading {
    opacity: 0.6;
  }
}

.category-empty {
  padding: 8rpx 0 16rpx;

  .category-empty-text {
    font-size: 24rpx;
    color: $text-placeholder;
  }
}
</style>
