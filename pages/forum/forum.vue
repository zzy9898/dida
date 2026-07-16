<template>
  <view class="forum-page">
    <!-- Header -->
    <view class="forum-header">
      <text class="forum-title">滴答校园生活论坛</text>
    </view>

    <!-- Category Tabs -->
    <scroll-view scroll-x class="category-tabs" :show-scrollbar="false">
      <view class="tab-list">
        <view
          v-for="tab in tabs"
          :key="tab.id ?? 'all'"
          :class="['tab-item', { active: selectedCategoryId === tab.id }]"
          @click="changeCategory(tab.id)"
        >
          <text class="tab-text">{{ tab.name }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- Post List -->
    <scroll-view
      scroll-y
      class="post-list"
      @scrolltolower="loadMore"
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="post-list-content">
        <view v-if="!loading && posts.length === 0" class="empty-state">
          <text class="empty-icon">📝</text>
          <text class="empty-text">暂无相关帖子</text>
          <text class="empty-sub">换个分类看看，或者去发布你的第一条帖子吧</text>
        </view>

        <view
          v-for="post in posts"
          :key="post.id"
          class="post-card"
          @click="goDetail(post)"
        >
          <!-- Author Row -->
          <view class="post-author-row">
            <image :src="post.userImageUrl" class="author-avatar" mode="aspectFill" />
            <view class="author-info">
              <view class="author-name-row">
                <text class="author-name">{{ post.userNickname }}</text>
              </view>
              <text class="post-meta">{{ post.locationName || post.categoryName }} · {{ formatTime(post.createTime) }}</text>
            </view>
            <view class="post-category-tag">
              <text class="category-text">{{ post.categoryName }}</text>
            </view>
          </view>

          <!-- Content -->
          <view class="post-body">
            <text class="post-title">{{ post.title }}</text>
            <text class="post-content">{{ post.content }}</text>
            <view
              v-if="post.media && post.media.length > 0"
              class="post-images"
              :class="{ 'single-image': post.media.length === 1, 'multi-image': post.media.length > 1 }"
            >
              <image
                v-for="(m, idx) in post.media"
                :key="idx"
                :src="m.url"
                class="post-image"
                mode="aspectFill"
                @click.stop="previewImage(post.media, idx)"
              />
            </view>
          </view>

          <!-- Actions -->
          <view class="post-actions">
            <view class="action-item" @click.stop="toggleLike(post)">
              <text :class="post.liked ? 'action-icon liked' : 'action-icon'">
                {{ post.liked ? '❤️' : '🤍' }}
              </text>
              <text :class="post.liked ? 'action-text liked-text' : 'action-text'">{{ post.likeCount }}</text>
            </view>
            <view class="action-item" @click.stop="goDetail(post)">
              <text class="action-icon">💬</text>
              <text class="action-text">{{ post.commentCount }}</text>
            </view>
            <view class="action-item">
              <text class="action-icon">⭐</text>
              <text class="action-text">{{ post.favoriteCount }}</text>
            </view>
          </view>
        </view>

        <view v-if="posts.length > 0" class="list-bottom">
          <text class="bottom-text">{{ noMore ? '-- 已经到底啦 --' : '加载中...' }}</text>
        </view>
      </view>
    </scroll-view>
    <GlobalSOS v-if="!store.userProfile || !store.userProfile.hideSOS" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import * as postApi from '@/api/post'
import GlobalSOS from '@/components/GlobalSOS.vue'
import type { PostListItemVO, MediaItem } from '@/data/types'

const store = useAppStore()

const PAGE_SIZE = 10

// 分类：[全部] + 后端分类
const selectedCategoryId = ref<number | undefined>(undefined)
const tabs = computed(() => [
  { id: undefined as number | undefined, name: '全部' },
  ...store.postCategories.map((c) => ({ id: c.id as number | undefined, name: c.name })),
])

// 列表 + 分页状态
const posts = ref<PostListItemVO[]>([])
const pageNum = ref(1)
const total = ref(0)
const loading = ref(false)
const refreshing = ref(false)
const noMore = computed(() => posts.value.length >= total.value)

async function loadCategories() {
  try {
    await store.loadCategories()
  } catch {
    // 分类加载失败不阻塞列表（request 层已提示）
  }
}

async function fetchPage(reset: boolean) {
  if (loading.value) return
  if (!reset && noMore.value) return
  loading.value = true
  const targetPage = reset ? 1 : pageNum.value + 1
  try {
    const res = await postApi.getPosts({
      categoryId: selectedCategoryId.value,
      pageNum: targetPage,
      pageSize: PAGE_SIZE,
    })
    pageNum.value = res.pageNum
    total.value = res.total
    posts.value = reset ? res.records : [...posts.value, ...res.records]
  } catch {
    // request 层已 toast
  } finally {
    loading.value = false
  }
}

function changeCategory(id: number | undefined) {
  if (selectedCategoryId.value === id) return
  selectedCategoryId.value = id
  posts.value = []
  total.value = 0
  fetchPage(true)
}

function loadMore() {
  fetchPage(false)
}

async function onRefresh() {
  refreshing.value = true
  await fetchPage(true)
  refreshing.value = false
}

function goDetail(post: PostListItemVO) {
  uni.navigateTo({ url: `/pages/post-detail/post-detail?postId=${post.id}` })
}

async function toggleLike(post: PostListItemVO) {
  const wasLiked = post.liked
  // 乐观更新
  post.liked = !wasLiked
  post.likeCount = Math.max(0, post.likeCount + (wasLiked ? -1 : 1))
  try {
    await (wasLiked ? postApi.unlikePost(post.id) : postApi.likePost(post.id))
  } catch {
    // 回滚
    post.liked = wasLiked
    post.likeCount = Math.max(0, post.likeCount + (wasLiked ? 1 : -1))
  }
}

function previewImage(media: MediaItem[], current: number) {
  uni.previewImage({ urls: media.map((m) => m.url), current: String(current) })
}

/** 后端返回 ISO 时间 → 友好展示 */
function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso.replace(/-/g, '/'))
  if (isNaN(d.getTime())) return iso
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}小时前`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day}天前`
  return iso.slice(0, 10)
}

// 每次进入（含发帖后 switchTab 返回）刷新列表
onShow(() => {
  loadCategories()
  fetchPage(true)
})
</script>

<style lang="scss" scoped>
.forum-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  background-color: #f5f5f5;
}

.forum-header {
  background-color: #fff;
  padding: 24rpx 32rpx;
  border-bottom: 1px solid #eee;
  box-sizing: border-box;

  .forum-title {
    font-size: 36rpx;
    font-weight: 700;
    color: #1a1a1a;
  }
}

.category-tabs {
  background-color: #fff;
  white-space: nowrap;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;

  .tab-list {
    display: flex;
    padding: 16rpx 24rpx;

    .tab-item {
      flex-shrink: 0;
      padding: 12rpx 28rpx;
      margin-right: 16rpx;
      border-radius: 32rpx;
      background-color: #f5f5f5;
      transition: all 0.2s;

      &.active {
        background-color: #2563eb;

        .tab-text {
          color: #fff;
          font-weight: 600;
        }
      }

      .tab-text {
        font-size: 26rpx;
        color: #666;
      }
    }
  }
}

.post-list {
  flex: 1;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
}

.post-list-content {
  padding: 20rpx 24rpx calc(180rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;

  .empty-icon {
    font-size: 80rpx;
    margin-bottom: 24rpx;
  }

  .empty-text {
    font-size: 30rpx;
    color: #999;
    margin-bottom: 12rpx;
  }

  .empty-sub {
    font-size: 24rpx;
    color: #bbb;
  }
}

.post-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  width: 100%;
  box-sizing: border-box;
}

.post-author-row {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;

  .author-avatar {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    flex-shrink: 0;
    background-color: #f0f0f0;
  }

  .author-info {
    flex: 1;
    min-width: 0;
    margin-left: 18rpx;

    .author-name-row {
      display: flex;
      align-items: center;

      .author-name {
        font-size: 28rpx;
        font-weight: 600;
        color: #1a1a1a;
        max-width: 300rpx;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .post-meta {
      font-size: 22rpx;
      color: #999;
      margin-top: 4rpx;
    }
  }

  .post-category-tag {
    padding: 6rpx 18rpx;
    background-color: #fef3c7;
    border-radius: 20rpx;
    flex-shrink: 0;

    .category-text {
      font-size: 22rpx;
      color: #d97706;
    }
  }
}

@media screen and (max-width: 360px) {
  .forum-header { padding: 20rpx 24rpx; }
  .forum-header .forum-title { font-size: 32rpx; }
  .category-tabs .tab-list { padding: 14rpx 20rpx; }
  .category-tabs .tab-list .tab-item { padding: 10rpx 22rpx; margin-right: 12rpx; }
  .post-list-content { padding-left: 18rpx; padding-right: 18rpx; }
  .post-card { padding: 22rpx; }
  .post-author-row .author-info { margin-left: 14rpx; }
  .post-author-row .author-info .author-name-row .author-name { font-size: 26rpx; max-width: 240rpx; }
  .post-author-row .post-category-tag { padding: 5rpx 12rpx; }
  .post-body .post-title { font-size: 29rpx; }
  .post-body .post-content { font-size: 25rpx; }
  .post-actions .action-item { margin-right: 30rpx; }
}

.post-body {
  margin-bottom: 20rpx;

  .post-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #1a1a1a;
    line-height: 1.4;
    display: block;
    margin-bottom: 12rpx;
  }

  .post-content {
    font-size: 28rpx;
    color: #444;
    line-height: 1.6;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  .post-images {
    margin-top: 20rpx;

    &.single-image {
      .post-image {
        width: 100%;
        height: 360rpx;
        border-radius: 12rpx;
      }
    }

    &.multi-image {
      display: flex;
      flex-wrap: wrap;
      gap: 8rpx;

      .post-image {
        width: calc(33.33% - 6rpx);
        height: 220rpx;
        border-radius: 8rpx;
      }
    }
  }
}

.post-actions {
  display: flex;
  align-items: center;
  padding-top: 16rpx;
  border-top: 1px solid #f5f5f5;

  .action-item {
    display: flex;
    align-items: center;
    margin-right: 48rpx;
    padding: 4rpx 8rpx;

    .action-icon {
      font-size: 36rpx;
      &.liked {
        animation: heartBeat 0.3s ease;
      }
    }

    .action-text {
      font-size: 26rpx;
      color: #999;
      margin-left: 8rpx;

      &.liked-text {
        color: #e53e3e;
      }
    }
  }
}

@keyframes heartBeat {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.list-bottom {
  text-align: center;
  padding: 30rpx 0 60rpx;

  .bottom-text {
    font-size: 24rpx;
    color: #ccc;
  }
}
</style>
