<template>
  <image :src="src" :style="sizeStyle" class="app-icon" mode="aspectFit" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Feather 风格线性图标（24x24 viewBox）
const PATHS: Record<string, string> = {
  heart:
    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  comment:
    '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  star:
    '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  search:
    '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
}

const props = defineProps<{
  name: 'heart' | 'comment' | 'star' | 'search'
  active?: boolean
  size?: number // rpx
  color?: string // 未选中描边色
  activeColor?: string // 选中填充色
}>()

const DEFAULT_ACTIVE: Record<string, string> = {
  heart: '#e53e3e',
  star: '#f59e0b',
  comment: '#999999',
}

const src = computed(() => {
  const inner = PATHS[props.name] || ''
  const idle = props.color || '#999999'
  const on = props.activeColor || DEFAULT_ACTIVE[props.name] || '#2563eb'
  const stroke = props.active ? on : idle
  const fill = props.active ? on : 'none'
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ` +
    `fill="${fill}" stroke="${stroke}" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
})

const sizeStyle = computed(() => {
  const s = (props.size || 40) + 'rpx'
  return `width:${s};height:${s};`
})
</script>

<style scoped>
.app-icon {
  display: block;
}
</style>
