import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { generatePlan, isValidISODate } from '@/lib/planner'
import type { PlannerForm, RaceType, SavedPlanEntry, TrainingPlan } from '@/types/planner'

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

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function isRaceType(value: unknown): value is RaceType {
  return value === 'marathon' || value === 'half-marathon' || value === '10k' || value === '5k' || value === 'custom'
}

function isValidStoredForm(value: PlannerForm | null): value is PlannerForm {
  if (!value) {
    return false
  }

  const hasMode = value.mode === 'date' || value.mode === 'weeks'
  return (
    isRaceType(value.raceType) &&
    hasMode &&
    Number.isFinite(Number(value.customDistanceKm)) &&
    typeof value.goalTime === 'string' &&
    typeof value.raceDate === 'string' &&
    Number.isFinite(Number(value.trainingWeeks)) &&
    Number.isFinite(Number(value.daysPerWeek))
  )
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

function isValidSavedPlanEntry(value: SavedPlanEntry | null): value is SavedPlanEntry {
  if (!value) {
    return false
  }

  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0 &&
    typeof value.createdAtISO === 'string' &&
    Number.isFinite(new Date(value.createdAtISO).getTime()) &&
    isValidStoredForm(value.form) &&
    isValidStoredPlan(value.plan)
  )
}

function createSavedPlanId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const usePlannerStore = defineStore('planner', () => {
  const form = useStorage<PlannerForm>('mtp-form', DEFAULT_FORM)
  const plan = useStorage<TrainingPlan | null>('mtp-plan', null)
  const savedPlans = useStorage<SavedPlanEntry[]>('mtp-saved-plans', [])
  const lastError = useStorage<string>('mtp-error', '')

  if (!isValidStoredForm(form.value)) {
    form.value = deepClone(DEFAULT_FORM)
  }

  if (plan.value && !isValidStoredPlan(plan.value)) {
    plan.value = null
    lastError.value = 'Opgeslagen planning bevatte ongeldige datums en is verwijderd. Genereer een nieuw schema.'
  }

  if (!Array.isArray(savedPlans.value)) {
    savedPlans.value = []
  } else {
    const sanitized = savedPlans.value.filter((entry) => isValidSavedPlanEntry(entry))
    if (sanitized.length !== savedPlans.value.length) {
      savedPlans.value = sanitized
    }
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

  function saveCurrentPlan(name: string) {
    if (!plan.value || !isValidStoredPlan(plan.value)) {
      throw new Error('Genereer eerst een planning voordat je opslaat.')
    }

    const normalizedName = name.trim().replace(/\s+/g, ' ')
    if (!normalizedName) {
      throw new Error('Geef een naam op voor de planning.')
    }

    const nextEntry: SavedPlanEntry = {
      id: createSavedPlanId(),
      name: normalizedName,
      createdAtISO: new Date().toISOString(),
      form: deepClone(form.value),
      plan: deepClone(plan.value),
    }

    savedPlans.value = [nextEntry, ...savedPlans.value]
    lastError.value = ''
  }

  function loadSavedPlan(planId: string) {
    const entry = savedPlans.value.find((item) => item.id === planId)
    if (!entry) {
      throw new Error('Opgeslagen planning niet gevonden.')
    }
    if (!isValidSavedPlanEntry(entry)) {
      throw new Error('Opgeslagen planning is ongeldig en kan niet worden geladen.')
    }

    form.value = deepClone(entry.form)
    plan.value = deepClone(entry.plan)
    lastError.value = ''
  }

  function deleteSavedPlan(planId: string) {
    savedPlans.value = savedPlans.value.filter((entry) => entry.id !== planId)
  }

  function reset() {
    form.value = { ...DEFAULT_FORM }
    plan.value = null
    lastError.value = ''
  }

  return {
    form,
    plan,
    savedPlans,
    hasPlan,
    lastError,
    generate,
    saveCurrentPlan,
    loadSavedPlan,
    deleteSavedPlan,
    reset,
  }
})
