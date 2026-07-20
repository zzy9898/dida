<template>
  <view class="page">
    <!-- 自定义导航栏 -->
    <view class="nav">
      <view class="nav-bar">
        <view class="nav-back" @tap="handleBack">
          <text class="nav-back-icon">&#x2190;</text>
        </view>
        <text class="nav-title">发布帖子</text>
        <view class="nav-placeholder"></view>
      </view>
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
        <view class="loc-chip" :class="{ 'loc-chip--active': form.location }" @tap="handleChooseLocation">
          <text class="loc-chip-icon">&#x1F4CD;</text>
          <text class="loc-chip-text">{{ form.location || '添加所在位置' }}</text>
          <text v-if="form.location" class="loc-chip-clear" @tap.stop="clearLocation">&#x2715;</text>
        </view>
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
const publishing = ref(false)

interface PublishPostForm {
  title: string
  categoryId: number | null
  content: string
  location: string
  longitude: number | null
  latitude: number | null
}

const form = reactive<PublishPostForm>({
  title: '',
  categoryId: null,
  content: '',
  location: '',
  longitude: null,
  latitude: null
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

function handleBack() {
  // 能返回上一页就返回，否则（栈底 / 从 tab 进入）回到论坛
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/forum/forum' })
  }
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

function handleChooseLocation() {
  // 调用微信原生地图选点（底层为腾讯位置服务）
  uni.chooseLocation({
    success: (res) => {
      // name 为 POI 名称，address 为详细地址；name 可能为空时退回 address
      form.location = res.name || res.address || ''
      form.longitude = res.longitude
      form.latitude = res.latitude
    },
    fail: (err) => {
      // 用户取消不提示；仅在权限被拒时引导
      const msg = err?.errMsg || ''
      if (msg.includes('auth deny') || msg.includes('authorize')) {
        uni.showModal({
          title: '需要位置权限',
          content: '请在设置中开启位置权限后再选择地点',
          confirmText: '去设置',
          success: (r) => {
            if (r.confirm) uni.openSetting()
          },
        })
      }
    },
  })
}

function clearLocation() {
  form.location = ''
  form.longitude = null
  form.latitude = null
}

function appendHashtag(tag: string) {
  if (form.content.includes(tag)) return
  form.content = form.content ? form.content + ' ' + tag : tag
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
      longitude: form.location && form.longitude != null ? form.longitude : undefined,
      latitude: form.location && form.latitude != null ? form.latitude : undefined,
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

.page {
  height: 100vh;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  background-color: $bg;
  display: flex;
  flex-direction: column;
}

/* 自定义导航栏 */
.nav {
  flex-shrink: 0;
  background-color: #ffffff;
  border-bottom: 1rpx solid $border;
  // 留出状态栏高度（刘海/时间信号区），uni-app 内置变量
  padding-top: var(--status-bar-height, 20px);
  z-index: 10;
}

.nav-bar {
  height: 88rpx;
  display: flex;
  align-items: center;
  padding: 0 16rpx;
}

.nav-back {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-back-icon {
  font-size: 44rpx;
  color: $text;
  font-weight: 700;
}

.nav-title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  color: $text;
}

.nav-placeholder {
  width: 72rpx;
  flex-shrink: 0;
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

/* Location chip */
.loc-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  height: 64rpx;
  padding: 0 24rpx;
  background-color: #f2f3f5;
  border-radius: 32rpx;
  box-sizing: border-box;

  &--active {
    background-color: #eff6ff;

    .loc-chip-text {
      color: $blue;
      font-weight: 500;
    }

    .loc-chip-icon {
      opacity: 1;
    }
  }
}

.loc-chip-icon {
  font-size: 28rpx;
  margin-right: 8rpx;
  flex-shrink: 0;
  opacity: 0.6;
}

.loc-chip-text {
  font-size: 26rpx;
  color: $text-secondary;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.loc-chip-clear {
  font-size: 22rpx;
  color: $blue;
  flex-shrink: 0;
  margin-left: 12rpx;
  width: 36rpx;
  height: 36rpx;
  line-height: 36rpx;
  text-align: center;
  border-radius: 50%;
  background-color: rgba(37, 99, 235, 0.12);
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
