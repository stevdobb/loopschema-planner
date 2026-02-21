<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { cn } from '@/lib/utils'
import 'litepicker/dist/css/litepicker.css'

interface Props {
  modelValue?: string
  min?: string
  max?: string
  placeholder?: string
  class?: string
  lang?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  min: '',
  max: '',
  placeholder: '',
  lang: 'en-US',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
let picker: any = null
let isInternalUpdate = false

function updateFromModel(value: string) {
  if (!picker) {
    return
  }

  if (!value) {
    if (typeof picker.clearSelection === 'function') {
      picker.clearSelection()
    }
    if (inputRef.value) {
      inputRef.value.value = ''
    }
    return
  }

  if (typeof picker.setDate === 'function') {
    picker.setDate(value, true)
  }
}

onMounted(async () => {
  const module = await import('litepicker')
  const Litepicker = (module as any).default ?? module

  picker = new Litepicker({
    element: inputRef.value,
    singleMode: true,
    autoApply: true,
    allowRepick: true,
    format: 'YYYY-MM-DD',
    minDate: props.min || null,
    maxDate: props.max || null,
    lang: props.lang,
    dropdowns: {
      minYear: 2020,
      maxYear: 2100,
      months: true,
      years: true,
    },
    setup: (instance: any) => {
      instance.on('selected', (date: any) => {
        const formatted = date ? String(date.format('YYYY-MM-DD')) : ''
        isInternalUpdate = true
        emit('update:modelValue', formatted)
        queueMicrotask(() => {
          isInternalUpdate = false
        })
      })

      instance.on('clear:selection', () => {
        isInternalUpdate = true
        emit('update:modelValue', '')
        queueMicrotask(() => {
          isInternalUpdate = false
        })
      })
    },
  })

  updateFromModel(props.modelValue)
})

onBeforeUnmount(() => {
  if (picker && typeof picker.destroy === 'function') {
    picker.destroy()
  }
})

watch(
  () => props.modelValue,
  (value) => {
    if (isInternalUpdate) {
      return
    }
    updateFromModel(value)
  },
)

watch(
  () => [props.min, props.max, props.lang],
  () => {
    if (!picker || typeof picker.setOptions !== 'function') {
      return
    }

    picker.setOptions({
      minDate: props.min || null,
      maxDate: props.max || null,
      lang: props.lang,
    })
  },
)
</script>

<template>
  <input
    ref="inputRef"
    :value="modelValue"
    type="text"
    readonly
    :placeholder="placeholder"
    :class="
      cn(
        'h-10 w-full rounded-xl border border-border bg-white px-3 text-sm font-medium outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300',
        $props.class,
      )
    "
  />
</template>
