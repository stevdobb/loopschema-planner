<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  class?: string
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  type: 'button',
})

const classes = computed(() =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-tight transition focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:pointer-events-none disabled:opacity-60',
    props.variant === 'default' && 'bg-primary text-primary-foreground shadow-soft hover:-translate-y-px hover:brightness-110',
    props.variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    props.variant === 'outline' && 'border border-border bg-card hover:bg-muted/70',
    props.variant === 'ghost' && 'hover:bg-muted/80',
    props.size === 'default' && 'h-10 px-4 text-sm',
    props.size === 'sm' && 'h-9 px-3 text-xs',
    props.size === 'lg' && 'h-11 px-5 text-[15px]',
    props.class,
  ),
)
</script>

<template>
  <button :type="type" :disabled="disabled" :class="classes">
    <slot />
  </button>
</template>
