<template>
  <view class="chat-page">
    <!-- ==================== CONVERSATION LIST VIEW ==================== -->
    <template v-if="!store.activeConvId">
      <!-- Top Tabs -->
      <view class="chat-tabs">
        <view
          :class="['chat-tab', { active: chatTab === 'p2p' }]"
          @click="chatTab = 'p2p'"
        >
          <text class="chat-tab-text">私聊搭子</text>
        </view>
        <view
          :class="['chat-tab', { active: chatTab === 'group' }]"
          @click="chatTab = 'group'"
        >
          <text class="chat-tab-text">活动群聊</text>
        </view>
        <!-- Group Join Requests Button -->
        <view class="join-requests-btn" @click="showJoinRequestsModal = true">
          <text class="join-requests-text">群聊申请查看</text>
          <view v-if="pendingRequestCount > 0" class="pending-badge">
            <text class="badge-text">{{ pendingRequestCount }}</text>
          </view>
        </view>
      </view>

      <!-- Conversation List -->
      <scroll-view scroll-y class="conv-list">
        <view v-if="filteredConversations.length === 0" class="empty-state">
          <text class="empty-icon">💬</text>
          <text class="empty-text">{{ chatTab === 'p2p' ? '暂无私聊搭子' : '暂无活动群聊' }}</text>
          <text class="empty-sub">
            {{ chatTab === 'p2p' ? '去首页匹配一个新搭子吧' : '参与或发起一个活动即可创建群聊' }}
          </text>
        </view>

        <view
          v-for="conv in filteredConversations"
          :key="conv.id"
          class="conv-item"
          @click="openConversation(conv.id)"
        >
          <view class="conv-avatar-wrap">
            <image :src="conv.avatar" class="conv-avatar" mode="aspectFill" />
            <view v-if="conv.isGroup" class="group-badge">
              <text class="group-badge-text">群</text>
            </view>
          </view>
          <view class="conv-info">
            <view class="conv-top-row">
              <text class="conv-name">{{ conv.name }}</text>
              <text class="conv-time">{{ conv.lastMessageTime }}</text>
            </view>
            <view class="conv-bottom-row">
              <text class="conv-last-msg">{{ truncateText(conv.lastMessage, 36) }}</text>
              <view v-if="conv.unreadCount > 0" class="unread-badge">
                <text class="unread-text">{{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}</text>
              </view>
            </view>
          </view>
        </view>
      </scroll-view>
    </template>

    <!-- ==================== ACTIVE CHAT ROOM ==================== -->
    <template v-else>
      <!-- Chat Header -->
      <view class="chat-header">
        <view class="chat-header-left" @click="closeConversation">
          <text class="back-arrow">&#8592;</text>
        </view>
        <view class="chat-header-center">
          <text class="chat-header-name">{{ activeConversation?.name || '' }}</text>
          <view class="online-indicator">
            <view class="online-dot" />
            <text class="online-text">在线</text>
          </view>
        </view>
        <view class="chat-header-right">
          <view class="header-btn review-btn" @click="showReviewModal = true">
            <text class="header-btn-text">匿名匿评</text>
          </view>
          <view class="header-btn disconnect-btn" @click="showZeroSugarModal = true">
            <text class="header-btn-text">零糖断联</text>
          </view>
        </view>
      </view>

      <!-- Messages List -->
      <scroll-view
        scroll-y
        class="messages-list"
        :scroll-into-view="scrollIntoViewId"
        :scroll-with-animation="true"
      >
        <view class="messages-inner">
          <view
            v-for="msg in activeConversation?.messages"
            :key="msg.id"
            :id="'msg-' + msg.id"
          >
            <!-- System Message -->
            <view v-if="msg.senderId === 'system'" class="msg-system">
              <text class="msg-system-text">{{ msg.text }}</text>
            </view>

            <!-- Sent Message (current user) -->
            <view
              v-else-if="msg.senderId === store.userProfile?.uid"
              class="msg-sent-wrap"
            >
              <view class="msg-sent">
                <text class="msg-sent-text">{{ msg.text }}</text>
              </view>
              <image
                :src="msg.senderAvatar"
                class="msg-sent-avatar"
                mode="aspectFill"
              />
            </view>

            <!-- Received Message -->
            <view v-else class="msg-received-wrap">
              <image
                :src="msg.senderAvatar"
                class="msg-received-avatar"
                mode="aspectFill"
              />
              <view class="msg-received">
                <text class="msg-received-sender">{{ msg.senderName }}</text>
                <text class="msg-received-text">{{ msg.text }}</text>
              </view>
            </view>
          </view>
          <view id="msg-bottom" style="height: 20rpx;" />
        </view>
      </scroll-view>

      <!-- Quick Reply Buttons -->
      <view class="quick-replies">
        <scroll-view scroll-x :show-scrollbar="false">
          <view class="quick-reply-list">
            <view
              v-for="qr in quickReplies"
              :key="qr"
              class="quick-reply-item"
              @click="sendQuickReply(qr)"
            >
              <text class="quick-reply-text">{{ qr }}</text>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- AI Assistant Panel -->
      <view v-if="showAiPanel" class="ai-panel">
        <view class="ai-panel-header">
          <text class="ai-panel-title">AI 助手</text>
          <view class="ai-panel-close" @click="showAiPanel = false">
            <text class="ai-close-text">✕</text>
          </view>
        </view>
        <view class="ai-panel-actions">
          <view class="ai-btn" @click="fetchIcebreaker">
            <text class="ai-btn-text">破冰话题推荐</text>
          </view>
          <view class="ai-btn" @click="fetchVenue">
            <text class="ai-btn-text">约会地点推荐</text>
          </view>
        </view>
        <!-- Loading -->
        <view v-if="aiLoading" class="ai-loading">
          <view class="ai-spinner" />
          <text class="ai-loading-text">AI 思考中...</text>
        </view>
        <!-- Icebreaker Results -->
        <view v-if="aiIcebreakerResult && !aiLoading" class="ai-result-card" @click="injectAiText(aiIcebreakerResult)">
          <text class="ai-result-label">破冰话题</text>
          <text class="ai-result-text">{{ aiIcebreakerResult }}</text>
          <text class="ai-result-hint">点击填入输入框</text>
        </view>
        <!-- Venue Results -->
        <view v-if="aiVenueResult && !aiLoading" class="ai-result-card" @click="injectAiText(aiVenueResult)">
          <text class="ai-result-label">推荐地点</text>
          <text class="ai-result-text">{{ aiVenueResult }}</text>
          <text class="ai-result-hint">点击填入输入框</text>
        </view>
      </view>

      <!-- Bottom Input Bar -->
      <view class="msg-input-bar">
        <view class="sparkles-btn" @click="showAiPanel = !showAiPanel">
          <text class="sparkles-icon">{{ showAiPanel ? '✨' : '✨' }}</text>
        </view>
        <input
          v-model="newMessage"
          class="msg-input"
          placeholder="输入消息..."
          confirm-type="send"
          @confirm="sendMessage"
        />
        <view class="msg-send-btn" @click="sendMessage">
          <text class="msg-send-btn-text">发送</text>
        </view>
      </view>
    </template>

    <!-- ==================== MODALS ==================== -->

    <!-- Zero Sugar Confirmation Modal -->
    <view v-if="showZeroSugarModal" class="modal-overlay" @click="showZeroSugarModal = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">确认开启零糖断联？</text>
        <view class="modal-warning">
          <text class="warning-icon">⚠️</text>
          <text class="warning-text">开启后，本次会话将被永久销毁，对方无法再向您发送任何消息。您的信用评分将扣除 2 分。此操作不可撤销。</text>
        </view>
        <view class="modal-actions">
          <view class="modal-btn cancel-btn" @click="showZeroSugarModal = false">
            <text class="modal-btn-text">取消</text>
          </view>
          <view class="modal-btn confirm-danger-btn" @click="confirmZeroSugar">
            <text class="modal-btn-text-white">确认断联</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Review Modal -->
    <view v-if="showReviewModal" class="modal-overlay" @click="showReviewModal = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">匿名匿评</text>
        <text class="modal-subtitle">对本次搭子体验进行评价</text>
        <view class="star-row">
          <text
            v-for="s in 5"
            :key="s"
            :class="s <= reviewRating ? 'star filled' : 'star'"
            @click="reviewRating = s"
          >★</text>
        </view>
        <textarea
          v-model="reviewComment"
          class="review-textarea"
          placeholder="写下你的评价（匿名发送）..."
          :maxlength="200"
        />
        <view class="modal-actions">
          <view class="modal-btn cancel-btn" @click="showReviewModal = false">
            <text class="modal-btn-text">取消</text>
          </view>
          <view class="modal-btn confirm-btn" @click="submitReview">
            <text class="modal-btn-text-white">提交评价</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Group Join Requests Dashboard Modal -->
    <view v-if="showJoinRequestsModal" class="modal-overlay" @click="showJoinRequestsModal = false">
      <view class="modal-card modal-card-wide" @click.stop>
        <text class="modal-title">群聊申请管理</text>

        <!-- Received / Sent Tabs -->
        <view class="request-tabs">
          <view
            :class="['request-tab', { active: joinRequestsTab === 'received' }]"
            @click="joinRequestsTab = 'received'"
          >
            <text class="request-tab-text">收到的申请</text>
            <view v-if="receivedRequests.length > 0" class="req-badge-sm">
              <text class="req-badge-text">{{ receivedRequests.length }}</text>
            </view>
          </view>
          <view
            :class="['request-tab', { active: joinRequestsTab === 'sent' }]"
            @click="joinRequestsTab = 'sent'"
          >
            <text class="request-tab-text">发出的申请</text>
          </view>
        </view>

        <!-- Received Requests -->
        <scroll-view v-if="joinRequestsTab === 'received'" scroll-y class="request-list">
          <view v-if="receivedRequests.length === 0" class="req-empty">
            <text class="req-empty-text">暂无收到的申请</text>
          </view>
          <view v-for="req in receivedRequests" :key="req.id" class="req-card">
            <image :src="req.requesterAvatar" class="req-avatar" mode="aspectFill" />
            <view class="req-info">
              <text class="req-name">{{ req.requesterName }}</text>
              <text class="req-activity">{{ req.activityTitle }}</text>
              <view :class="['req-status', 'status-' + req.status]">
                <text class="req-status-text">{{ statusLabel(req.status) }}</text>
              </view>
            </view>
            <view v-if="req.status === 'pending'" class="req-actions">
              <view class="req-btn reject-btn" @click="processRequest(req.id, false)">
                <text class="req-btn-reject">拒绝</text>
              </view>
              <view class="req-btn approve-btn" @click="processRequest(req.id, true)">
                <text class="req-btn-approve">批准</text>
              </view>
            </view>
          </view>
        </scroll-view>

        <!-- Sent Requests -->
        <scroll-view v-if="joinRequestsTab === 'sent'" scroll-y class="request-list">
          <view v-if="sentRequests.length === 0" class="req-empty">
            <text class="req-empty-text">暂无发出的申请</text>
          </view>
          <view v-for="req in sentRequests" :key="req.id" class="req-card">
            <image :src="req.requesterAvatar" class="req-avatar" mode="aspectFill" />
            <view class="req-info">
              <text class="req-name">{{ req.activityTitle }}</text>
              <view :class="['req-status', 'status-' + req.status]">
                <text class="req-status-text">{{ statusLabel(req.status) }}</text>
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="modal-actions modal-actions-center">
          <view class="modal-btn cancel-btn" @click="showJoinRequestsModal = false">
            <text class="modal-btn-text">关闭</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()

// Tab
const chatTab = ref<'p2p' | 'group'>('p2p')

// New message input
const newMessage = ref<string>('')

// Scroll control
const scrollIntoViewId = ref<string>('')

// Quick replies
const quickReplies = ['什么时候出发？', '地点确认了吗？', '好的没问题！', '待会见~', '不好意思可能晚一点', '需要我带什么吗？']

// AI Panel
const showAiPanel = ref<boolean>(false)
const aiLoading = ref<boolean>(false)
const aiIcebreakerResult = ref<string>('')
const aiVenueResult = ref<string>('')

// Zero Sugar Modal
const showZeroSugarModal = ref<boolean>(false)

// Review Modal
const showReviewModal = ref<boolean>(false)
const reviewRating = ref<number>(0)
const reviewComment = ref<string>('')

// Join Requests Modal
const showJoinRequestsModal = ref<boolean>(false)
const joinRequestsTab = ref<'received' | 'sent'>('received')

// Computed: filtered conversations by tab
const filteredConversations = computed(() => {
  if (chatTab.value === 'p2p') {
    return store.conversations.filter((c) => !c.isGroup)
  }
  return store.conversations.filter((c) => c.isGroup)
})

// Computed: active conversation
const activeConversation = computed(() => {
  if (!store.activeConvId) return null
  return store.conversations.find((c) => c.id === store.activeConvId) || null
})

// Computed: pending request count
const pendingRequestCount = computed(() => {
  return store.groupJoinRequests.filter((r) => r.status === 'pending').length
})

// Computed: received requests (requests where current user is the activity owner)
const receivedRequests = computed(() => {
  if (!store.userProfile) return []
  return store.groupJoinRequests.filter((r) => r.ownerId === store.userProfile!.uid)
})

// Computed: sent requests (requests sent by current user)
const sentRequests = computed(() => {
  if (!store.userProfile) return []
  return store.groupJoinRequests.filter((r) => r.requesterId === store.userProfile!.uid)
})

// Scroll to bottom when messages change
watch(
  () => activeConversation.value?.messages.length,
  () => {
    nextTick(() => {
      scrollIntoViewId.value = ''
      nextTick(() => {
        scrollIntoViewId.value = 'msg-bottom'
      })
    })
  }
)

// Open a conversation
function openConversation(convId: string) {
  store.activeConvId = convId
  // Clear unread
  const updated = store.conversations.map((c) => {
    if (c.id === convId) return { ...c, unreadCount: 0 }
    return c
  })
  // Reset AI results
  aiIcebreakerResult.value = ''
  aiVenueResult.value = ''
  showAiPanel.value = false
  nextTick(() => {
    scrollIntoViewId.value = 'msg-bottom'
  })
}

// Close conversation
function closeConversation() {
  store.activeConvId = null
}

// Send message
function sendMessage() {
  const text = newMessage.value.trim()
  if (!text || !store.activeConvId) return
  store.handleSendMessage(store.activeConvId, text)
  newMessage.value = ''
  nextTick(() => {
    scrollIntoViewId.value = ''
    nextTick(() => {
      scrollIntoViewId.value = 'msg-bottom'
    })
  })
}

// Send quick reply
function sendQuickReply(text: string) {
  if (!store.activeConvId) return
  store.handleSendMessage(store.activeConvId, text)
  nextTick(() => {
    scrollIntoViewId.value = ''
    nextTick(() => {
      scrollIntoViewId.value = 'msg-bottom'
    })
  })
}

// Zero sugar
function confirmZeroSugar() {
  if (!store.activeConvId) return
  store.handleDisconnectConversation(store.activeConvId)
  showZeroSugarModal.value = false
  store.activeConvId = null
}

// Review
function submitReview() {
  if (reviewRating.value === 0) {
    uni.showToast({ title: '请先选择评分', icon: 'none' })
    return
  }
  store.addCreditLog(1, `对搭子进行匿名评价：${reviewRating.value}星`)
  uni.showToast({ title: '匿名评价已提交', icon: 'success' })
  showReviewModal.value = false
  reviewRating.value = 0
  reviewComment.value = ''
}

// Process join request
function processRequest(reqId: string, approve: boolean) {
  store.handleProcessJoinRequest(reqId, approve)
}

// Status label
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return map[status] || status
}

// AI: Icebreaker
async function fetchIcebreaker() {
  aiLoading.value = true
  aiIcebreakerResult.value = ''
  try {
    const interests = store.userProfile?.interests?.join(', ') || '校园生活'
    const res = await uni.request({
      url: '/api/gemini/icebreaker',
      method: 'POST',
      data: {
        userInterests: interests,
        peerName: activeConversation.value?.name || '搭子',
        context: '大学校园社交'
      }
    })
    const data = res.data as any
    aiIcebreakerResult.value = data?.text || data?.result || '要不要一起喝杯咖啡聊聊最近在忙什么？'
  } catch {
    aiIcebreakerResult.value = '要不要一起喝杯咖啡聊聊最近在忙什么？'
  } finally {
    aiLoading.value = false
  }
}

// AI: Venue
async function fetchVenue() {
  aiLoading.value = true
  aiVenueResult.value = ''
  try {
    const interests = store.userProfile?.interests?.join(', ') || '校园生活'
    const res = await uni.request({
      url: '/api/gemini/venue',
      method: 'POST',
      data: {
        userInterests: interests,
        peerName: activeConversation.value?.name || '搭子',
        context: '大学校园周边'
      }
    })
    const data = res.data as any
    aiVenueResult.value = data?.text || data?.result || '推荐学校西门莫扎咖啡，安静适合聊天，人均25元。'
  } catch {
    aiVenueResult.value = '推荐学校西门莫扎咖啡，安静适合聊天，人均25元。'
  } finally {
    aiLoading.value = false
  }
}

// Inject AI result into message input
function injectAiText(text: string) {
  newMessage.value = text
  aiIcebreakerResult.value = ''
  aiVenueResult.value = ''
  showAiPanel.value = false
  uni.showToast({ title: '已填入输入框', icon: 'success', duration: 1200 })
}

// Truncate text
function truncateText(text: string, maxLen: number): string {
  if (!text) return ''
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text
}
</script>

<style lang="scss" scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

// ================== TABS ==================
.chat-tabs {
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 16rpx 24rpx;
  border-bottom: 1px solid #eee;

  .chat-tab {
    padding: 14rpx 32rpx;
    margin-right: 16rpx;
    border-radius: 32rpx;
    background-color: #f5f5f5;

    &.active {
      background-color: #2563eb;

      .chat-tab-text {
        color: #fff;
        font-weight: 600;
      }
    }

    .chat-tab-text {
      font-size: 28rpx;
      color: #666;
    }
  }

  .join-requests-btn {
    margin-left: auto;
    display: flex;
    align-items: center;
    padding: 10rpx 20rpx;
    background-color: #fef3c7;
    border-radius: 24rpx;
    position: relative;

    .join-requests-text {
      font-size: 24rpx;
      color: #d97706;
    }

    .pending-badge {
      position: absolute;
      top: -12rpx;
      right: -12rpx;
      min-width: 36rpx;
      height: 36rpx;
      background-color: #ef4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 6rpx;

      .badge-text {
        font-size: 20rpx;
        color: #fff;
        font-weight: 600;
      }
    }
  }
}

// ================== CONVERSATION LIST ==================
.conv-list {
  flex: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 160rpx 48rpx;

  .empty-icon {
    font-size: 96rpx;
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
    text-align: center;
  }
}

.conv-item {
  display: flex;
  align-items: center;
  padding: 24rpx 28rpx;
  background-color: #fff;
  border-bottom: 1px solid #f5f5f5;

  .conv-avatar-wrap {
    position: relative;

    .conv-avatar {
      width: 96rpx;
      height: 96rpx;
      border-radius: 50%;
    }

    .group-badge {
      position: absolute;
      bottom: -4rpx;
      right: -4rpx;
      width: 36rpx;
      height: 36rpx;
      background-color: #2563eb;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3rpx solid #fff;

      .group-badge-text {
        font-size: 18rpx;
        color: #fff;
      }
    }
  }

  .conv-info {
    flex: 1;
    margin-left: 20rpx;
    overflow: hidden;

    .conv-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .conv-name {
        font-size: 30rpx;
        font-weight: 600;
        color: #1a1a1a;
        max-width: 400rpx;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .conv-time {
        font-size: 22rpx;
        color: #bbb;
        flex-shrink: 0;
      }
    }

    .conv-bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8rpx;

      .conv-last-msg {
        font-size: 26rpx;
        color: #999;
        max-width: 440rpx;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .unread-badge {
        min-width: 36rpx;
        height: 36rpx;
        background-color: #ef4444;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .unread-text {
          font-size: 20rpx;
          color: #fff;
          font-weight: 600;
        }
      }
    }
  }
}

// ================== CHAT HEADER ==================
.chat-header {
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 20rpx 24rpx;
  border-bottom: 1px solid #eee;

  .chat-header-left {
    padding: 8rpx 12rpx;

    .back-arrow {
      font-size: 40rpx;
      color: #2563eb;
      font-weight: 600;
    }
  }

  .chat-header-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;

    .chat-header-name {
      font-size: 30rpx;
      font-weight: 600;
      color: #1a1a1a;
    }

    .online-indicator {
      display: flex;
      align-items: center;
      margin-top: 4rpx;

      .online-dot {
        width: 12rpx;
        height: 12rpx;
        background-color: #22c55e;
        border-radius: 50%;
        margin-right: 8rpx;
      }

      .online-text {
        font-size: 20rpx;
        color: #22c55e;
      }
    }
  }

  .chat-header-right {
    display: flex;
    gap: 10rpx;

    .header-btn {
      padding: 8rpx 16rpx;
      border-radius: 16rpx;

      .header-btn-text {
        font-size: 20rpx;
      }
    }

    .review-btn {
      background-color: #eff6ff;

      .header-btn-text {
        color: #2563eb;
      }
    }

    .disconnect-btn {
      background-color: #fef2f2;

      .header-btn-text {
        color: #ef4444;
      }
    }
  }
}

// ================== MESSAGES ==================
.messages-list {
  flex: 1;
  background-color: #f0f0f0;
}

.messages-inner {
  padding: 20rpx 24rpx;
}

.msg-system {
  text-align: center;
  margin: 16rpx 0;

  .msg-system-text {
    font-size: 22rpx;
    color: #aaa;
    background-color: #e8e8e8;
    padding: 8rpx 24rpx;
    border-radius: 20rpx;
    display: inline-block;
  }
}

.msg-sent-wrap {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  margin: 16rpx 0;

  .msg-sent {
    max-width: 480rpx;
    background-color: #2563eb;
    border-radius: 20rpx 4rpx 20rpx 20rpx;
    padding: 18rpx 24rpx;
    margin-right: 12rpx;

    .msg-sent-text {
      font-size: 28rpx;
      color: #fff;
      line-height: 1.5;
    }
  }

  .msg-sent-avatar {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    flex-shrink: 0;
  }
}

.msg-received-wrap {
  display: flex;
  align-items: flex-start;
  margin: 16rpx 0;

  .msg-received-avatar {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .msg-received {
    max-width: 480rpx;
    background-color: #fff;
    border-radius: 4rpx 20rpx 20rpx 20rpx;
    padding: 18rpx 24rpx;
    margin-left: 12rpx;

    .msg-received-sender {
      font-size: 20rpx;
      color: #2563eb;
      font-weight: 500;
      display: block;
      margin-bottom: 4rpx;
    }

    .msg-received-text {
      font-size: 28rpx;
      color: #333;
      line-height: 1.5;
    }
  }
}

// ================== QUICK REPLIES ==================
.quick-replies {
  background-color: #fff;
  border-top: 1px solid #f0f0f0;
  padding: 12rpx 0;

  .quick-reply-list {
    display: flex;
    padding: 0 20rpx;

    .quick-reply-item {
      flex-shrink: 0;
      padding: 10rpx 22rpx;
      margin-right: 14rpx;
      background-color: #f0f5ff;
      border-radius: 24rpx;
      border: 1px solid #dbeafe;

      .quick-reply-text {
        font-size: 24rpx;
        color: #2563eb;
      }
    }
  }
}

// ================== AI PANEL ==================
.ai-panel {
  background-color: #fff;
  border-top: 1px solid #f0f0f0;
  padding: 20rpx 24rpx;
  max-height: 360rpx;
  overflow-y: auto;

  .ai-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;

    .ai-panel-title {
      font-size: 28rpx;
      font-weight: 600;
      color: #1a1a1a;
    }

    .ai-panel-close {
      padding: 4rpx 12rpx;

      .ai-close-text {
        font-size: 28rpx;
        color: #999;
      }
    }
  }

  .ai-panel-actions {
    display: flex;
    gap: 16rpx;
    margin-bottom: 16rpx;

    .ai-btn {
      flex: 1;
      padding: 14rpx 0;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 20rpx;
      text-align: center;

      .ai-btn-text {
        font-size: 24rpx;
        color: #fff;
        font-weight: 500;
      }
    }
  }

  .ai-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24rpx 0;

    .ai-spinner {
      width: 40rpx;
      height: 40rpx;
      border: 4rpx solid #e5e7eb;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 16rpx;
    }

    .ai-loading-text {
      font-size: 24rpx;
      color: #999;
    }
  }

  .ai-result-card {
    background-color: #f8f9ff;
    border-radius: 12rpx;
    padding: 20rpx;
    margin-bottom: 12rpx;
    border: 1px solid #e0e7ff;

    .ai-result-label {
      font-size: 20rpx;
      color: #667eea;
      font-weight: 500;
      margin-bottom: 8rpx;
      display: block;
    }

    .ai-result-text {
      font-size: 26rpx;
      color: #333;
      line-height: 1.5;
      display: block;
    }

    .ai-result-hint {
      font-size: 20rpx;
      color: #bbb;
      margin-top: 8rpx;
      display: block;
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

// ================== MESSAGE INPUT ==================
.msg-input-bar {
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 16rpx 20rpx;
  border-top: 1px solid #eee;

  .sparkles-btn {
    width: 68rpx;
    height: 68rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12rpx;

    .sparkles-icon {
      font-size: 40rpx;
    }
  }

  .msg-input {
    flex: 1;
    height: 68rpx;
    background-color: #f5f5f5;
    border-radius: 34rpx;
    padding: 0 28rpx;
    font-size: 28rpx;
  }

  .msg-send-btn {
    margin-left: 16rpx;
    padding: 14rpx 32rpx;
    background-color: #2563eb;
    border-radius: 34rpx;

    .msg-send-btn-text {
      font-size: 26rpx;
      color: #fff;
      font-weight: 500;
    }
  }
}

// ================== MODALS ==================
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  width: 600rpx;
  max-height: 80vh;
  overflow-y: auto;

  &.modal-card-wide {
    width: 640rpx;
  }

  .modal-title {
    font-size: 34rpx;
    font-weight: 700;
    color: #1a1a1a;
    text-align: center;
    display: block;
    margin-bottom: 8rpx;
  }

  .modal-subtitle {
    font-size: 24rpx;
    color: #999;
    text-align: center;
    display: block;
    margin-bottom: 24rpx;
  }

  .modal-warning {
    display: flex;
    background-color: #fef2f2;
    border-radius: 12rpx;
    padding: 20rpx;
    margin: 20rpx 0;

    .warning-icon {
      font-size: 36rpx;
      margin-right: 16rpx;
      flex-shrink: 0;
    }

    .warning-text {
      font-size: 24rpx;
      color: #991b1b;
      line-height: 1.5;
      flex: 1;
    }
  }

  .star-row {
    display: flex;
    justify-content: center;
    gap: 12rpx;
    margin-bottom: 24rpx;

    .star {
      font-size: 52rpx;
      color: #ddd;

      &.filled {
        color: #f59e0b;
      }
    }
  }

  .review-textarea {
    width: 100%;
    height: 140rpx;
    background-color: #f5f5f5;
    border-radius: 12rpx;
    padding: 20rpx;
    font-size: 26rpx;
    box-sizing: border-box;
  }

  .modal-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 28rpx;

    &.modal-actions-center {
      justify-content: center;
    }

    .modal-btn {
      padding: 18rpx 48rpx;
      border-radius: 32rpx;
      text-align: center;

      &.cancel-btn {
        background-color: #f5f5f5;
      }

      &.confirm-btn {
        background-color: #2563eb;
      }

      &.confirm-danger-btn {
        background-color: #ef4444;
      }

      .modal-btn-text {
        font-size: 28rpx;
        color: #666;
        font-weight: 500;
      }

      .modal-btn-text-white {
        font-size: 28rpx;
        color: #fff;
        font-weight: 500;
      }
    }
  }
}

// ================== JOIN REQUESTS ==================
.request-tabs {
  display: flex;
  justify-content: center;
  gap: 20rpx;
  margin: 20rpx 0;

  .request-tab {
    display: flex;
    align-items: center;
    padding: 12rpx 28rpx;
    border-radius: 24rpx;
    background-color: #f5f5f5;

    &.active {
      background-color: #2563eb;

      .request-tab-text {
        color: #fff;
      }
    }

    .request-tab-text {
      font-size: 26rpx;
      color: #666;
    }

    .req-badge-sm {
      margin-left: 10rpx;
      min-width: 32rpx;
      height: 32rpx;
      background-color: #ef4444;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      .req-badge-text {
        font-size: 18rpx;
        color: #fff;
        font-weight: 600;
      }
    }
  }
}

.request-list {
  max-height: 500rpx;
}

.req-empty {
  text-align: center;
  padding: 60rpx 0;

  .req-empty-text {
    font-size: 26rpx;
    color: #ccc;
  }
}

.req-card {
  display: flex;
  align-items: center;
  padding: 20rpx;
  margin-bottom: 12rpx;
  background-color: #f9fafb;
  border-radius: 12rpx;

  .req-avatar {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .req-info {
    flex: 1;
    margin-left: 16rpx;

    .req-name {
      font-size: 26rpx;
      font-weight: 600;
      color: #1a1a1a;
      display: block;
    }

    .req-activity {
      font-size: 22rpx;
      color: #999;
      margin-top: 4rpx;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 320rpx;
    }

    .req-status {
      margin-top: 4rpx;

      .req-status-text {
        font-size: 20rpx;
        padding: 2rpx 12rpx;
        border-radius: 8rpx;
      }

      &.status-pending .req-status-text {
        color: #d97706;
        background-color: #fef3c7;
      }

      &.status-approved .req-status-text {
        color: #16a34a;
        background-color: #dcfce7;
      }

      &.status-rejected .req-status-text {
        color: #dc2626;
        background-color: #fef2f2;
      }
    }
  }

  .req-actions {
    display: flex;
    gap: 12rpx;
    flex-shrink: 0;

    .req-btn {
      padding: 10rpx 20rpx;
      border-radius: 16rpx;

      &.reject-btn {
        background-color: #f5f5f5;

        .req-btn-reject {
          font-size: 22rpx;
          color: #999;
        }
      }

      &.approve-btn {
        background-color: #2563eb;

        .req-btn-approve {
          font-size: 22rpx;
          color: #fff;
        }
      }
    }
  }
}
</style>
