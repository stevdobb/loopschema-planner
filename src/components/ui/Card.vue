<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{ class?: string }>()
</script>

<template>
  <section :class="cn('rounded-2xl border border-border bg-card/95 text-card-foreground shadow-soft backdrop-blur-sm', $props.class)">
    <slot />
  </section>
</template>
