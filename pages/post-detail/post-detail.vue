<template>
  <view class="page">
    <scroll-view
      scroll-y
      class="scroll"
      :scroll-into-view="scrollTarget"
      :scroll-with-animation="true"
      @scrolltolower="loadMoreComments"
    >
      <template v-if="detail">
        <!-- Author -->
        <view class="author-row">
          <image :src="detail.userImageUrl" class="avatar" mode="aspectFill" />
          <view class="author-info">
            <text class="author-name">{{ detail.userNickname }}</text>
            <text class="post-meta">{{ detail.categoryName }} · {{ formatTime(detail.createTime) }}</text>
          </view>
          <view v-if="detail.canDelete" class="delete-btn" @tap="onDeletePost">
            <text class="delete-text">删除</text>
          </view>
        </view>

        <!-- Body -->
        <view class="body">
          <text class="title">{{ detail.title }}</text>
          <text class="content">{{ detail.content }}</text>
          <view v-if="detail.media && detail.media.length" class="media">
            <image
              v-for="(m, idx) in detail.media"
              :key="idx"
              :src="m.url"
              class="media-img"
              mode="widthFix"
              @tap="previewImage(idx)"
            />
          </view>
          <view v-if="detail.locationName" class="location">
            <text class="location-text">📍 {{ detail.locationName }}</text>
          </view>
          <view class="stat-row">
            <text class="stat-text">{{ detail.viewCount }} 浏览</text>
          </view>
        </view>

        <!-- Comments -->
        <view id="comments-anchor" class="comments">
          <text class="comments-title">评论 {{ detail.commentCount }}</text>

          <view v-if="comments.length === 0 && !commentsLoading" class="no-comments">
            <text class="no-comments-text">还没有评论，来抢沙发吧</text>
          </view>

          <view v-for="c in comments" :key="c.id" class="comment">
            <image :src="c.userImageUrl" class="comment-avatar" mode="aspectFill" />
            <view class="comment-main">
              <view class="comment-head">
                <text class="comment-author">{{ c.userNickname }}</text>
                <view class="comment-like" @tap="toggleCommentLike(c)">
                  <app-icon name="heart" :active="c.liked" :size="32" />
                  <text :class="c.liked ? 'clike-count liked' : 'clike-count'">{{ c.likeCount }}</text>
                </view>
              </view>
              <text class="comment-text">{{ c.content }}</text>
              <view class="comment-foot">
                <text class="comment-time">{{ formatTime(c.createTime) }}</text>
                <text class="comment-action" @tap="startReply(c)">回复</text>
                <text v-if="c.canDelete" class="comment-action" @tap="onDeleteComment(c)">删除</text>
              </view>

              <!-- Replies -->
              <view v-if="c.replyCount > 0" class="replies">
                <view v-for="r in (repliesMap[c.id] || [])" :key="r.id" class="reply">
                  <image :src="r.userImageUrl" class="reply-avatar" mode="aspectFill" />
                  <view class="reply-main">
                    <view class="reply-head">
                      <text class="reply-author">{{ r.userNickname }}</text>
                      <text v-if="r.replyUserNickname" class="reply-to">回复 {{ r.replyUserNickname }}</text>
                      <view class="reply-like" @tap="toggleCommentLike(r)">
                        <app-icon name="heart" :active="r.liked" :size="28" />
                        <text :class="r.liked ? 'clike-count liked' : 'clike-count'">{{ r.likeCount }}</text>
                      </view>
                    </view>
                    <text class="reply-text">{{ r.content }}</text>
                    <view class="reply-foot">
                      <text class="comment-time">{{ formatTime(r.createTime) }}</text>
                      <text class="comment-action" @tap="startReply(r, c)">回复</text>
                      <text v-if="r.canDelete" class="comment-action" @tap="onDeleteComment(r, c)">删除</text>
                    </view>
                  </view>
                </view>
                <view
                  v-if="!repliesAllLoaded[c.id] && c.replyCount > (repliesMap[c.id]?.length || 0)"
                  class="reply-toggle"
                  @tap="loadAllReplies(c)"
                >
                  <text class="reply-toggle-text">查看更多 {{ c.replyCount - (repliesMap[c.id]?.length || 0) }} 条回复 ▾</text>
                </view>
              </view>
            </view>
          </view>

          <view v-if="comments.length > 0" class="list-bottom">
            <text class="bottom-text">{{ commentsNoMore ? '-- 没有更多评论了 --' : '加载中...' }}</text>
          </view>
        </view>
      </template>

      <view v-else class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>
    </scroll-view>

    <!-- Bottom action / comment bar -->
    <view v-if="detail" class="bottom-bar">
      <input
        class="comment-input"
        v-model="commentText"
        :placeholder="replyTarget ? `回复 ${replyTarget.userNickname}` : '写下你的评论...'"
        confirm-type="send"
        @confirm="submitComment"
      />
      <view v-if="replyTarget" class="cancel-reply" @tap="cancelReply">
        <text class="cancel-reply-text">✕</text>
      </view>
      <view class="bar-action" @tap="togglePostLike">
        <app-icon name="heart" :active="detail.liked" :size="44" />
        <text :class="detail.liked ? 'bar-count liked' : 'bar-count'">{{ detail.likeCount }}</text>
      </view>
      <view class="bar-action" @tap="togglePostFavorite">
        <app-icon name="star" :active="detail.favorited" :size="44" />
        <text :class="detail.favorited ? 'bar-count fav' : 'bar-count'">{{ detail.favoriteCount }}</text>
      </view>
      <view class="send-btn" @tap="submitComment">
        <text class="send-btn-text">发送</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import * as postApi from '@/api/post'
import type { PostDetailVO, CommentVO } from '@/data/types'
import { RequestError } from '@/utils/request'

const COMMENT_PAGE_SIZE = 10

const postId = ref<string>('')
const detail = ref<PostDetailVO | null>(null)

const comments = ref<CommentVO[]>([])
const commentPage = ref(1)
const commentTotal = ref(0)
const commentsLoading = ref(false)
const commentsNoMore = ref(false)

const repliesMap = ref<Record<number, CommentVO[]>>({})
const repliesAllLoaded = ref<Record<number, boolean>>({})

const commentText = ref('')
const replyTarget = ref<CommentVO | null>(null)

// 由列表页「评论」图标进入时携带 focus=comments，加载完成后滚动到评论区
const focusComments = ref(false)
const scrollTarget = ref('')

onLoad((query) => {
  postId.value = String(query?.postId || '')
  if (!postId.value) {
    uni.showToast({ title: '帖子不存在', icon: 'none' })
    return
  }
  focusComments.value = query?.focus === 'comments'
  loadDetail()
  loadComments(true)
})

async function loadDetail() {
  try {
    detail.value = await postApi.getPostDetail(postId.value)
    // 详情渲染出来后，锚点才存在，再触发滚动到评论区
    if (focusComments.value) {
      focusComments.value = false
      setTimeout(() => {
        scrollTarget.value = 'comments-anchor'
      }, 300)
    }
  } catch {
    // request 层已提示（如帖子不存在）
    setTimeout(() => uni.navigateBack(), 800)
  }
}

async function loadComments(reset: boolean) {
  if (commentsLoading.value) return
  if (!reset && commentsNoMore.value) return
  commentsLoading.value = true
  const target = reset ? 1 : commentPage.value + 1
  try {
    const res = await postApi.getComments(postId.value, {
      pageNum: target,
      pageSize: COMMENT_PAGE_SIZE,
    })
    commentPage.value = res.pageNum
    commentTotal.value = res.total
    comments.value = reset ? res.records : [...comments.value, ...res.records]
    commentsNoMore.value = comments.value.length >= res.total
    // 自动预加载本批评论中有回复的条目（前两条）
    res.records.filter((c) => c.replyCount > 0).forEach((c) => loadPreviewReplies(c))
  } catch {
    /* request 层已提示 */
  } finally {
    commentsLoading.value = false
  }
}

function loadMoreComments() {
  loadComments(false)
}

// ---- 帖子点赞 / 收藏 / 删除 ----
async function togglePostLike() {
  const d = detail.value
  if (!d) return
  const was = d.liked
  d.liked = !was
  d.likeCount = Math.max(0, d.likeCount + (was ? -1 : 1))
  try {
    await (was ? postApi.unlikePost(d.id) : postApi.likePost(d.id))
  } catch {
    d.liked = was
    d.likeCount = Math.max(0, d.likeCount + (was ? 1 : -1))
  }
}

async function togglePostFavorite() {
  const d = detail.value
  if (!d) return
  const was = d.favorited
  d.favorited = !was
  d.favoriteCount = Math.max(0, d.favoriteCount + (was ? -1 : 1))
  try {
    await (was ? postApi.unfavoritePost(d.id) : postApi.favoritePost(d.id))
    uni.showToast({ title: was ? '已取消收藏' : '已收藏', icon: 'none', duration: 1200 })
  } catch {
    d.favorited = was
    d.favoriteCount = Math.max(0, d.favoriteCount + (was ? 1 : -1))
  }
}

function onDeletePost() {
  const d = detail.value
  if (!d) return
  uni.showModal({
    title: '删除帖子',
    content: '确定要删除这条帖子吗？',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await postApi.deletePost(d.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 800)
      } catch {
        /* request 层已提示 */
      }
    },
  })
}

// ---- 评论 ----
function startReply(target: CommentVO, _root?: CommentVO) {
  replyTarget.value = target
}
function cancelReply() {
  replyTarget.value = null
}

async function submitComment() {
  const content = commentText.value.trim()
  if (!content) {
    uni.showToast({ title: '请输入评论内容', icon: 'none' })
    return
  }
  try {
    await postApi.createComment(postId.value, {
      content,
      parentId: replyTarget.value ? replyTarget.value.id : undefined,
    })
    commentText.value = ''
    replyTarget.value = null
    if (detail.value) detail.value.commentCount += 1
    // 简单起见：重置一级评论并重新拉取，楼中楼随之重置
    repliesMap.value = {}
    repliesAllLoaded.value = {}
    commentsNoMore.value = false
    await loadComments(true)
    uni.showToast({ title: '评论成功', icon: 'success', duration: 1200 })
  } catch (e) {
    const code = (e as RequestError).code
    if (code === 403) {
      uni.showToast({ title: '发表评论需先完成实名与学籍认证', icon: 'none', duration: 2000 })
    } else {
      uni.showToast({ title: (e as Error).message || '评论失败', icon: 'none' })
    }
  }
}

/** 预加载前两条回复（评论加载后自动调用） */
async function loadPreviewReplies(c: CommentVO) {
  if (repliesMap.value[c.id]) return
  try {
    const res = await postApi.getReplies(c.id, { pageNum: 1, pageSize: 2 })
    repliesMap.value = { ...repliesMap.value, [c.id]: res.records }
    if (c.replyCount <= 2) {
      repliesAllLoaded.value = { ...repliesAllLoaded.value, [c.id]: true }
    }
  } catch {
    // 预加载失败静默处理，不影响主流程
  }
}

/** 加载更多：拉取全部回复 */
async function loadAllReplies(c: CommentVO) {
  try {
    const res = await postApi.getReplies(c.id, { pageNum: 1, pageSize: 50 })
    repliesMap.value = { ...repliesMap.value, [c.id]: res.records }
    repliesAllLoaded.value = { ...repliesAllLoaded.value, [c.id]: true }
  } catch {
    /* request 层已提示 */
  }
}

async function toggleCommentLike(c: CommentVO) {
  const was = c.liked
  c.liked = !was
  c.likeCount = Math.max(0, c.likeCount + (was ? -1 : 1))
  try {
    await (was ? postApi.unlikeComment(c.id) : postApi.likeComment(c.id))
  } catch {
    c.liked = was
    c.likeCount = Math.max(0, c.likeCount + (was ? 1 : -1))
  }
}

function onDeleteComment(c: CommentVO, root?: CommentVO) {
  uni.showModal({
    title: '删除评论',
    content: '确定删除这条评论吗？',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await postApi.deleteComment(c.id)
        if (detail.value) detail.value.commentCount = Math.max(0, detail.value.commentCount - 1)
        if (root) {
          // 删的是楼中楼：从缓存移除并回退一级评论回复数
          repliesMap.value = {
            ...repliesMap.value,
            [root.id]: (repliesMap.value[root.id] || []).filter((x) => x.id !== c.id),
          }
          root.replyCount = Math.max(0, root.replyCount - 1)
        } else {
          comments.value = comments.value.filter((x) => x.id !== c.id)
        }
        uni.showToast({ title: '已删除', icon: 'success', duration: 1000 })
      } catch {
        /* request 层已提示 */
      }
    },
  })
}

// ---- 工具 ----
function previewImage(current: number) {
  if (!detail.value) return
  uni.previewImage({
    urls: detail.value.media.map((m) => m.url),
    current: String(current),
  })
}

function formatTime(iso: string): string {
  if (!iso) return ''
  // 截取到秒（前19位），去掉微秒精度，再把 T 换成空格、横杠换成斜杠
  // 这样 "2026-07-20T14:16:00.169913" 在微信小程序 JS 引擎也能正确解析
  const normalized = iso.slice(0, 19).replace('T', ' ').replace(/-/g, '/')
  const d = new Date(normalized)
  if (isNaN(d.getTime())) return iso
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}小时前`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day}天前`
  const p = (n: number) => String(n).padStart(2, '0')
  const md = `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
  // 同年不显示年份
  return d.getFullYear() === now.getFullYear()
    ? md
    : `${d.getFullYear()}-${md}`
}
</script>

<style lang="scss" scoped>
$blue: #2563eb;

.page {
  height: 100vh;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.scroll {
  flex: 1;
  min-height: 0;
}

.loading-state {
  padding: 160rpx 0;
  text-align: center;

  .loading-text {
    font-size: 26rpx;
    color: #bbb;
  }
}

.author-row {
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 28rpx 32rpx;

  .avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    background-color: #f0f0f0;
    flex-shrink: 0;
  }

  .author-info {
    flex: 1;
    min-width: 0;
    margin-left: 20rpx;
    display: flex;
    flex-direction: column;

    .author-name {
      font-size: 30rpx;
      font-weight: 600;
      color: #1a1a1a;
    }

    .post-meta {
      font-size: 22rpx;
      color: #999;
      margin-top: 6rpx;
    }
  }

  .delete-btn {
    padding: 10rpx 24rpx;
    border: 1px solid #eee;
    border-radius: 32rpx;

    .delete-text {
      font-size: 24rpx;
      color: #e53e3e;
    }
  }
}

.body {
  background-color: #fff;
  padding: 8rpx 32rpx 32rpx;

  .title {
    font-size: 36rpx;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.4;
    display: block;
    margin-bottom: 16rpx;
  }

  .content {
    font-size: 30rpx;
    color: #333;
    line-height: 1.7;
    display: block;
  }

  .media {
    margin-top: 24rpx;

    .media-img {
      width: 100%;
      border-radius: 12rpx;
      margin-bottom: 16rpx;
      background-color: #f0f0f0;
    }
  }

  .location {
    margin-top: 12rpx;

    .location-text {
      font-size: 24rpx;
      color: #2563eb;
      background-color: #eff6ff;
      padding: 8rpx 20rpx;
      border-radius: 20rpx;
    }
  }

  .stat-row {
    margin-top: 20rpx;

    .stat-text {
      font-size: 24rpx;
      color: #bbb;
    }
  }
}

.comments {
  background-color: #fff;
  margin-top: 16rpx;
  padding: 28rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));

  .comments-title {
    font-size: 30rpx;
    font-weight: 600;
    color: #1a1a1a;
    display: block;
    margin-bottom: 24rpx;
  }
}

.no-comments {
  text-align: center;
  padding: 60rpx 0;

  .no-comments-text {
    font-size: 26rpx;
    color: #ccc;
  }
}

.comment {
  display: flex;
  margin-bottom: 32rpx;

  .comment-avatar {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    flex-shrink: 0;
    background-color: #f0f0f0;
  }

  .comment-main {
    flex: 1;
    min-width: 0;
    margin-left: 18rpx;

    .comment-head {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .comment-author {
        font-size: 26rpx;
        font-weight: 600;
        color: #555;
      }

      .comment-like {
        display: flex;
        align-items: center;

        .clike-count {
          font-size: 22rpx;
          color: #999;
          margin-left: 8rpx;
          &.liked { color: #e53e3e; }
        }
      }
    }

    .comment-text {
      font-size: 28rpx;
      color: #1a1a1a;
      line-height: 1.6;
      display: block;
      margin: 8rpx 0;
    }

    .comment-foot {
      display: flex;
      align-items: center;

      .comment-time {
        font-size: 22rpx;
        color: #bbb;
        margin-right: 28rpx;
      }

      .comment-action {
        font-size: 24rpx;
        color: #2563eb;
        margin-right: 28rpx;
      }
    }
  }
}

.replies {
  margin-top: 18rpx;
  background-color: #f7f8fa;
  border-radius: 16rpx;
  padding: 20rpx 22rpx 8rpx;

  .reply {
    display: flex;
    margin-bottom: 24rpx;

    .reply-avatar {
      width: 48rpx;
      height: 48rpx;
      border-radius: 50%;
      flex-shrink: 0;
      background-color: #ececec;
    }

    .reply-main {
      flex: 1;
      min-width: 0;
      margin-left: 16rpx;
    }

    .reply-head {
      display: flex;
      align-items: center;

      .reply-author {
        font-size: 24rpx;
        font-weight: 600;
        color: #555;
        flex-shrink: 0;
      }

      .reply-to {
        font-size: 22rpx;
        color: #999;
        margin-left: 12rpx;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .reply-like {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        margin-left: 12rpx;

        .clike-count {
          font-size: 22rpx;
          color: #999;
          margin-left: 8rpx;
          &.liked { color: #e53e3e; }
        }
      }
    }

    .reply-text {
      font-size: 26rpx;
      color: #1a1a1a;
      line-height: 1.6;
      display: block;
      margin: 8rpx 0;
    }

    .reply-foot {
      display: flex;
      align-items: center;

      .comment-time {
        font-size: 20rpx;
        color: #bbb;
        margin-right: 24rpx;
      }

      .comment-action {
        font-size: 20rpx;
        color: #2563eb;
        margin-right: 24rpx;
      }
    }
  }

  .reply-toggle {
    padding: 8rpx 0 14rpx;

    .reply-toggle-text {
      font-size: 24rpx;
      color: #2563eb;
    }
  }
}

.list-bottom {
  text-align: center;
  padding: 20rpx 0;

  .bottom-text {
    font-size: 22rpx;
    color: #ccc;
  }
}

.bottom-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  border-top: 1px solid #eee;
  gap: 16rpx;

  .comment-input {
    flex: 1;
    min-width: 0;
    height: 68rpx;
    background-color: #f5f5f5;
    border-radius: 34rpx;
    padding: 0 28rpx;
    font-size: 26rpx;
  }

  .cancel-reply {
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    .cancel-reply-text {
      font-size: 28rpx;
      color: #999;
    }
  }

  .bar-action {
    display: flex;
    flex-direction: column;
    align-items: center;

    .bar-count {
      font-size: 20rpx;
      color: #999;
      margin-top: 2rpx;
      &.liked { color: #e53e3e; }
      &.fav { color: #f59e0b; }
    }
  }

  .send-btn {
    padding: 14rpx 28rpx;
    background-color: $blue;
    border-radius: 34rpx;
    flex-shrink: 0;

    .send-btn-text {
      font-size: 26rpx;
      color: #fff;
      font-weight: 500;
    }
  }
}
</style>
