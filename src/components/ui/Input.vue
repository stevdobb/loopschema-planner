<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  modelValue?: string | number
  type?: string
  min?: string | number
  max?: string | number
  step?: string | number
  placeholder?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const value = computed({
  get: () => props.modelValue,
  set: (next) => {
    if (props.type === 'number') {
      if (next === '' || next === null || next === undefined) {
        emit('update:modelValue', '')
        return
      }
      const parsed = Number(next)
      emit('update:modelValue', Number.isFinite(parsed) ? parsed : '')
      return
    }
    emit('update:modelValue', String(next ?? ''))
  },
})
</script>

<template>
  <input
    v-model="value"
    :type="type"
    :min="min"
    :max="max"
    :step="step"
    :placeholder="placeholder"
    :class="
      cn(
        'h-10 w-full rounded-xl border border-border bg-card/40 px-3 text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/35',
        $props.class,
      )
    "
  />
</template>
