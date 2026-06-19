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
          v-for="cat in categories"
          :key="cat"
          :class="['tab-item', { active: forumCategory === cat }]"
          @click="changeCategory(cat)"
        >
          <text class="tab-text">{{ cat }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- Post List -->
    <scroll-view scroll-y class="post-list" @scrolltolower="loadMore" :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
      <view v-if="filteredPosts.length === 0" class="empty-state">
        <text class="empty-icon">📝</text>
        <text class="empty-text">暂无相关帖子</text>
        <text class="empty-sub">换个分类看看，或者去发布你的第一条帖子吧</text>
      </view>

      <view v-for="post in filteredPosts" :key="post.id" class="post-card">
        <!-- Author Row -->
        <view class="post-author-row">
          <image :src="post.authorAvatar" class="author-avatar" mode="aspectFill" />
          <view class="author-info">
            <view class="author-name-row">
              <text class="author-name">{{ post.authorName }}</text>
              <text v-if="post.authorVerified" class="verified-badge">已认证</text>
            </view>
            <text class="post-meta">{{ post.school }} · {{ post.createdAt }}</text>
          </view>
          <view class="post-category-tag">
            <text class="category-text">{{ post.category || '综合' }}</text>
          </view>
        </view>

        <!-- Content -->
        <view class="post-body">
          <text class="post-title">{{ post.title }}</text>
          <text class="post-content">{{ post.content }}</text>
          <view v-if="post.images && post.images.length > 0" class="post-images" :class="{ 'single-image': post.images.length === 1, 'multi-image': post.images.length > 1 }">
            <image
              v-for="(img, idx) in post.images"
              :key="idx"
              :src="img"
              class="post-image"
              mode="aspectFill"
              @click="previewImage(post.images, idx)"
            />
          </view>
        </view>

        <!-- Actions -->
        <view class="post-actions">
          <view class="action-item" @click="toggleLike(post)">
            <text :class="likedPosts[post.id] ? 'action-icon liked' : 'action-icon'">
              {{ likedPosts[post.id] ? '❤️' : '🤍' }}
            </text>
            <text :class="likedPosts[post.id] ? 'action-text liked-text' : 'action-text'">{{ post.likes }}</text>
          </view>
          <view class="action-item" @click="toggleComments(post.id)">
            <text class="action-icon">💬</text>
            <text class="action-text">{{ post.comments.length }}</text>
          </view>
          <view class="action-item" @click="sharePost(post)">
            <text class="action-icon">🔗</text>
            <text class="action-text">分享</text>
          </view>
        </view>

        <!-- Comment Section -->
        <view v-if="expandedComments[post.id]" class="comments-section">
          <view class="comments-divider" />
          <view v-for="comment in post.comments" :key="comment.id" class="comment-item">
            <image :src="comment.authorAvatar" class="comment-avatar" mode="aspectFill" />
            <view class="comment-body">
              <view class="comment-header">
                <text class="comment-author">{{ comment.authorName }}</text>
                <text class="comment-time">{{ comment.createdAt }}</text>
              </view>
              <text class="comment-text">{{ comment.content }}</text>
            </view>
          </view>
          <view v-if="post.comments.length === 0" class="no-comments">
            <text class="no-comments-text">暂无评论，快来抢沙发吧</text>
          </view>

          <!-- Comment Input -->
          <view class="comment-input-row">
            <input
              v-model="newCommentTexts[post.id]"
              class="comment-input"
              placeholder="写下你的评论..."
              confirm-type="send"
              @confirm="addComment(post)"
            />
            <view class="send-btn" @click="addComment(post)">
              <text class="send-btn-text">发送</text>
            </view>
          </view>
        </view>
      </view>

      <view class="list-bottom">
        <text class="bottom-text">-- 已经到底啦 --</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import type { Post, Comment } from '@/data/types'

const store = useAppStore()

// Category state
const categories = ['最新发布', '热门推荐', '求助吐槽', '美味探店', '运动打卡', '自学研习', '桌游社交']
const forumCategory = ref<string>('最新发布')

// Local liked posts tracking
const likedPosts = reactive<Record<string, boolean>>({})

// New comment texts per post
const newCommentTexts = reactive<Record<string, string>>({})

// Which posts have expanded comments
const expandedComments = reactive<Record<string, boolean>>({})

// Refresh state
const refreshing = ref<boolean>(false)

// Keyword mapping for category filtering
const categoryKeywords: Record<string, string[]> = {
  '求助吐槽': ['求助', '吐槽', '坑', '避雷', '排雷', '生气', '差评', '翻车'],
  '美味探店': ['咖啡', '探店', '美食', '吃', '餐厅', '食堂', '甜品', '奶茶', '外卖', '小吃', '猫咖'],
  '运动打卡': ['运动', '跑步', '健身', '羽毛球', '篮球', '游泳', '网球', '打卡', '夜跑', '操场', '球友', '配速'],
  '自学研习': ['自习', '学习', '复习', '考试', '图书馆', '期末', '研习', '论文', '刷题', '自修', '抱团复习'],
  '桌游社交': ['桌游', '游戏', '社交', '聚会', '狼人', '剧本', '阿瓦隆', '血染', '轰趴', 'party', '组队']
}

// Filtered posts computed
const filteredPosts = computed<Post[]>(() => {
  let list = store.postList.filter((p) => !p.isDraft)

  if (forumCategory.value === '最新发布') {
    return list
  }

  if (forumCategory.value === '热门推荐') {
    return [...list].sort((a, b) => b.likes - a.likes)
  }

  const keywords = categoryKeywords[forumCategory.value] || []
  return list.filter((post) => {
    if (post.category === forumCategory.value) return true
    if (keywords.length === 0) return true
    const searchText = (post.title + ' ' + post.content).toLowerCase()
    return keywords.some((kw) => searchText.includes(kw.toLowerCase()))
  })
})

// Initialize liked posts from store data
function initLikedPosts() {
  if (!store.userProfile) return
  const uid = store.userProfile.uid
  const nickname = store.userProfile.nickname
  store.postList.forEach((post) => {
    if (post.likedBy) {
      likedPosts[post.id] = post.likedBy.includes(uid) || post.likedBy.includes(nickname)
    }
    if (!(post.id in newCommentTexts)) {
      newCommentTexts[post.id] = ''
    }
    if (!(post.id in expandedComments)) {
      expandedComments[post.id] = false
    }
  })
}

onMounted(() => {
  initLikedPosts()
})

// Change category
function changeCategory(cat: string) {
  forumCategory.value = cat
}

// Toggle like
function toggleLike(post: Post) {
  const wasLiked = likedPosts[post.id]
  likedPosts[post.id] = !wasLiked

  const updatedList = store.postList.map((p) => {
    if (p.id === post.id) {
      const newLikes = wasLiked ? Math.max(0, p.likes - 1) : p.likes + 1
      const newLikedBy = wasLiked
        ? p.likedBy.filter((id) => id !== store.userProfile?.uid && id !== store.userProfile?.nickname)
        : [...p.likedBy, store.userProfile?.uid || store.userProfile?.nickname || '']
      return { ...p, likes: newLikes, likedBy: newLikedBy }
    }
    return p
  })
  store.updatePostList(updatedList)

  if (!wasLiked) {
    uni.showToast({ title: '已点赞', icon: 'none', duration: 1500 })
  }
}

// Toggle comment visibility
function toggleComments(postId: string) {
  expandedComments[postId] = !expandedComments[postId]
}

// Add comment
function addComment(post: Post) {
  const text = (newCommentTexts[post.id] || '').trim()
  if (!text) {
    uni.showToast({ title: '请输入评论内容', icon: 'none' })
    return
  }
  if (!store.userProfile) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  const newComment: Comment = {
    id: `com_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    authorName: store.userProfile.nickname,
    authorAvatar: store.userProfile.avatar,
    content: text,
    createdAt: '刚刚'
  }

  const updatedList = store.postList.map((p) => {
    if (p.id === post.id) {
      return { ...p, comments: [...p.comments, newComment] }
    }
    return p
  })
  store.updatePostList(updatedList)
  newCommentTexts[post.id] = ''
  uni.showToast({ title: '评论成功', icon: 'success', duration: 1500 })
}

// Share post
function sharePost(post: Post) {
  uni.showToast({ title: '分享功能开发中...', icon: 'none' })
}

// Preview image
function previewImage(images: string[], current: number) {
  uni.previewImage({
    urls: images,
    current: String(current)
  })
}

// Load more
function loadMore() {
  // Placeholder for pagination
}

// Pull to refresh
function onRefresh() {
  refreshing.value = true
  initLikedPosts()
  setTimeout(() => {
    refreshing.value = false
    uni.showToast({ title: '已刷新', icon: 'success', duration: 1000 })
  }, 800)
}
</script>

<style lang="scss" scoped>
.forum-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.forum-header {
  background-color: #fff;
  padding: 24rpx 32rpx;
  border-bottom: 1px solid #eee;

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
  padding: 20rpx 24rpx;
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
  }

  .author-info {
    flex: 1;
    margin-left: 18rpx;

    .author-name-row {
      display: flex;
      align-items: center;

      .author-name {
        font-size: 28rpx;
        font-weight: 600;
        color: #1a1a1a;
      }

      .verified-badge {
        margin-left: 10rpx;
        padding: 2rpx 12rpx;
        font-size: 20rpx;
        color: #2563eb;
        background-color: #eff6ff;
        border-radius: 8rpx;
        border: 1px solid #bfdbfe;
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

.comments-section {
  margin-top: 20rpx;

  .comments-divider {
    height: 1px;
    background-color: #f0f0f0;
    margin-bottom: 20rpx;
  }

  .comment-item {
    display: flex;
    margin-bottom: 20rpx;

    .comment-avatar {
      width: 56rpx;
      height: 56rpx;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .comment-body {
      flex: 1;
      margin-left: 16rpx;
      background-color: #f8f9fa;
      border-radius: 12rpx;
      padding: 16rpx 20rpx;

      .comment-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8rpx;

        .comment-author {
          font-size: 24rpx;
          font-weight: 600;
          color: #2563eb;
        }

        .comment-time {
          font-size: 20rpx;
          color: #bbb;
        }
      }

      .comment-text {
        font-size: 26rpx;
        color: #444;
        line-height: 1.5;
      }
    }
  }

  .no-comments {
    text-align: center;
    padding: 30rpx 0;

    .no-comments-text {
      font-size: 24rpx;
      color: #ccc;
    }
  }

  .comment-input-row {
    display: flex;
    align-items: center;
    margin-top: 20rpx;

    .comment-input {
      flex: 1;
      height: 68rpx;
      background-color: #f5f5f5;
      border-radius: 34rpx;
      padding: 0 28rpx;
      font-size: 26rpx;
    }

    .send-btn {
      margin-left: 16rpx;
      padding: 12rpx 32rpx;
      background-color: #2563eb;
      border-radius: 34rpx;

      .send-btn-text {
        font-size: 26rpx;
        color: #fff;
        font-weight: 500;
      }
    }
  }
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
