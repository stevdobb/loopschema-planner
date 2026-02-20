import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { generatePlan, isValidISODate } from '@/lib/planner'
import type { PlannerForm, TrainingPlan } from '@/types/planner'

function defaultRaceDateISO() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 112)
  return date.toISOString().slice(0, 10)
}

const DEFAULT_FORM: PlannerForm = {
  raceType: 'marathon',
  customDistanceKm: 15,
  goalTime: '03:45',
  mode: 'date',
  raceDate: defaultRaceDateISO(),
  trainingWeeks: 16,
  daysPerWeek: 4,
}

function isValidStoredPlan(value: TrainingPlan | null): value is TrainingPlan {
  if (!value) {
    return false
  }
  if (!isValidISODate(value.startDateISO) || !isValidISODate(value.endDateISO)) {
    return false
  }
  if (!Array.isArray(value.weeks)) {
    return false
  }

  return value.weeks.every((week) => {
    if (!isValidISODate(week.startDateISO) || !isValidISODate(week.endDateISO)) {
      return false
    }
    if (!Array.isArray(week.sessions)) {
      return false
    }
    return week.sessions.every((session) => isValidISODate(session.dateISO))
  })
}

export const usePlannerStore = defineStore('planner', () => {
  const form = useStorage<PlannerForm>('mtp-form', DEFAULT_FORM)
  const plan = useStorage<TrainingPlan | null>('mtp-plan', null)
  const lastError = useStorage<string>('mtp-error', '')

  if (plan.value && !isValidStoredPlan(plan.value)) {
    plan.value = null
    lastError.value = 'Opgeslagen planning bevatte ongeldige datums en is verwijderd. Genereer een nieuw schema.'
  }

  const hasPlan = computed(() => Boolean(plan.value && plan.value.weeks.length))

  function generate() {
    try {
      plan.value = generatePlan(form.value)
      lastError.value = ''
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Onbekende fout bij genereren van schema.'
      throw error
    }
  }

  function reset() {
    form.value = { ...DEFAULT_FORM }
    plan.value = null
    lastError.value = ''
  }

  return {
    form,
    plan,
    hasPlan,
    lastError,
    generate,
    reset,
  }
})
