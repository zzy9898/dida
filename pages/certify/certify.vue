<template>
  <view class="page">
    <!-- Header -->
    <view class="header">
      <view class="back-btn" @tap="handleBack">
        <text class="back-icon">&#x2190;</text>
      </view>
      <text class="header-title">身份认证</text>
      <view class="header-placeholder"></view>
    </view>

    <scroll-view class="body" scroll-y="true">
      <!-- Overall status banner -->
      <view class="banner" :class="{ 'banner--done': allVerified }">
        <text class="banner-title">{{ allVerified ? '认证已完成' : '完成认证解锁全部功能' }}</text>
        <text class="banner-desc">
          {{ allVerified
            ? '你已通过实名认证与学籍认证'
            : '实名认证 + 学籍认证均通过后，方可发帖、加好友等' }}
        </text>
      </view>

      <!-- 实名认证 -->
      <view class="card">
        <view class="card-head">
          <text class="card-title">实名认证</text>
          <text class="status-tag" :class="idVerified ? 'status-tag--ok' : 'status-tag--todo'">
            {{ idVerified ? '已认证' : '未认证' }}
          </text>
        </view>
        <template v-if="!idVerified">
          <view class="field">
            <text class="field-label">真实姓名</text>
            <input v-model="idForm.name" class="field-input" placeholder="请输入身份证上的姓名" />
          </view>
          <view class="field">
            <text class="field-label">身份证号</text>
            <input
              v-model="idForm.idCard"
              class="field-input"
              placeholder="请输入 18 位身份证号"
              maxlength="24"
              @blur="normalizeIdCardInput"
            />
          </view>
          <view class="submit-btn" :class="{ 'submit-btn--loading': idLoading }" @tap="submitIdcard">
            <text>{{ idLoading ? '认证中...' : '提交实名认证' }}</text>
          </view>
        </template>
        <view v-else class="done-hint">
          <text class="done-hint-text">实名信息已核验通过</text>
        </view>
      </view>

      <!-- 学籍认证 -->
      <view class="card">
        <view class="card-head">
          <text class="card-title">学籍认证</text>
          <text class="status-tag" :class="schoolVerified ? 'status-tag--ok' : 'status-tag--todo'">
            {{ schoolVerified ? '已认证' : '未认证' }}
          </text>
        </view>
        <template v-if="!schoolVerified">
          <view class="field">
            <text class="field-label">学信网在线验证码</text>
            <input v-model="schoolForm.verifyCode" class="field-input" placeholder="请输入学信网在线验证码" />
          </view>
          <text class="field-tip">在学信网「在线验证报告」中获取验证码</text>
          <view class="submit-btn" :class="{ 'submit-btn--loading': schoolLoading }" @tap="submitSchool">
            <text>{{ schoolLoading ? '认证中...' : '提交学籍认证' }}</text>
          </view>
        </template>
        <view v-else class="done-hint">
          <text class="done-hint-text">学籍信息已核验通过</text>
        </view>
      </view>

      <view class="bottom-spacer"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import * as userApi from '@/api/user'

const store = useAppStore()

const idVerified = computed(() => !!store.userProfile?.isIdVerified)
const schoolVerified = computed(() => !!store.userProfile?.isSchoolVerified)
const allVerified = computed(() => idVerified.value && schoolVerified.value)

const idForm = reactive({ name: '', idCard: '' })
const schoolForm = reactive({ verifyCode: '' })
const idLoading = ref(false)
const schoolLoading = ref(false)

function handleBack() {
  uni.navigateBack({ delta: 1 })
}

function normalizeIdCard(value: string) {
  return value
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[ｘＸ]/g, 'X')
    .replace(/\s+/g, '')
    .toUpperCase()
}

function normalizeIdCardInput() {
  idForm.idCard = normalizeIdCard(idForm.idCard)
}

function isValidMainlandIdCard(value: string) {
  if (!/^\d{17}[\dX]$/.test(value)) return false
  const year = Number(value.slice(6, 10))
  const month = Number(value.slice(10, 12))
  const day = Number(value.slice(12, 14))
  const birthday = new Date(year, month - 1, day)
  if (year < 1800 || birthday.getFullYear() !== year || birthday.getMonth() !== month - 1 || birthday.getDate() !== day) return false
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  const sum = weights.reduce((total, weight, index) => total + Number(value[index]) * weight, 0)
  return value[17] === checkCodes[sum % 11]
}
async function submitIdcard() {
  if (idLoading.value) return
  const name = idForm.name.trim()
  const idCard = normalizeIdCard(idForm.idCard)
  idForm.idCard = idCard
  if (!name) return uni.showToast({ title: '请输入真实姓名', icon: 'none' })
  if (!isValidMainlandIdCard(idCard)) return uni.showToast({ title: '身份证号格式或校验位不正确', icon: 'none' })
  const uid = store.userProfile?.uid
  if (!uid) return uni.showToast({ title: '请先登录', icon: 'none' })

  idLoading.value = true
  try {
    await userApi.verifyIdcard(uid, name, idCard)
    await store.refreshUserInfo()
    uni.showToast({ title: '实名认证成功', icon: 'success' })
  } catch {
    /* request 层已提示（404「验证失败」等） */
  } finally {
    idLoading.value = false
  }
}

async function submitSchool() {
  if (schoolLoading.value) return
  const verifyCode = schoolForm.verifyCode.trim()
  if (!verifyCode) return uni.showToast({ title: '请输入学信网验证码', icon: 'none' })
  const uid = store.userProfile?.uid
  if (!uid) return uni.showToast({ title: '请先登录', icon: 'none' })

  schoolLoading.value = true
  try {
    await userApi.verifySchool(uid, verifyCode)
    await store.refreshUserInfo()
    uni.showToast({ title: '学籍认证成功', icon: 'success' })
  } catch {
    /* request 层已提示 */
  } finally {
    schoolLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #fff;
  padding: 24rpx 32rpx;
  border-bottom: 1px solid #eee;

  .back-btn {
    width: 56rpx;
    height: 56rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    .back-icon {
      font-size: 40rpx;
      color: #1a1a1a;
    }
  }

  .header-title {
    font-size: 34rpx;
    font-weight: 700;
    color: #1a1a1a;
  }

  .header-placeholder {
    width: 56rpx;
  }
}

.body {
  flex: 1;
}

.banner {
  margin: 24rpx;
  padding: 32rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #2563eb, #4f83f6);

  &.banner--done {
    background: linear-gradient(135deg, #16a34a, #4ade80);
  }

  .banner-title {
    font-size: 32rpx;
    font-weight: 700;
    color: #fff;
    display: block;
  }

  .banner-desc {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.9);
    margin-top: 12rpx;
    display: block;
    line-height: 1.5;
  }
}

.card {
  background-color: #fff;
  margin: 0 24rpx 20rpx;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);

  .card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24rpx;

    .card-title {
      font-size: 30rpx;
      font-weight: 700;
      color: #1a1a1a;
    }

    .status-tag {
      padding: 4rpx 18rpx;
      font-size: 22rpx;
      border-radius: 10rpx;

      &--ok {
        color: #16a34a;
        background-color: #dcfce7;
      }

      &--todo {
        color: #d97706;
        background-color: #fffbeb;
      }
    }
  }
}

.field {
  margin-bottom: 20rpx;

  .field-label {
    font-size: 26rpx;
    color: #666;
    margin-bottom: 10rpx;
    display: block;
  }

  .field-input {
    height: 80rpx;
    background-color: #f5f5f5;
    border-radius: 12rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
  }
}

.field-tip {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin: -8rpx 0 20rpx;
}

.submit-btn {
  height: 84rpx;
  border-radius: 42rpx;
  background-color: #2563eb;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8rpx;

  text {
    font-size: 28rpx;
    color: #fff;
    font-weight: 600;
  }

  &--loading {
    opacity: 0.6;
  }
}

.done-hint {
  padding: 12rpx 0;

  .done-hint-text {
    font-size: 26rpx;
    color: #16a34a;
  }
}

.bottom-spacer {
  height: 40rpx;
}
</style>
