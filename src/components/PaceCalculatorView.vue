<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, ArrowUp, ChevronLeft } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import type { AppLocale } from '@/types/planner'

interface Props {
  locale: AppLocale
}

const props = defineProps<Props>()
const emit = defineEmits<{ (event: 'back-to-planner'): void }>()

type UnitMode = 'km' | 'mi'

type DistancePreset = {
  value: string
  km: number
  mile: number
  label: {
    nl: string
    en: string
    fr: string
  }
}

const distancePresets: DistancePreset[] = [
  {
    value: 'marathon',
    km: 42.195,
    mile: 26.219,
    label: {
      nl: 'Volledige marathon',
      en: 'Full marathon',
      fr: 'Marathon complet',
    },
  },
  {
    value: 'half-marathon',
    km: 21.0975,
    mile: 13.109,
    label: {
      nl: 'Halve marathon',
      en: 'Half marathon',
      fr: 'Semi-marathon',
    },
  },
  {
    value: '10k',
    km: 10,
    mile: 6.214,
    label: {
      nl: '10 km',
      en: '10 km',
      fr: '10 km',
    },
  },
  {
    value: '5k',
    km: 5,
    mile: 3.107,
    label: {
      nl: '5 km',
      en: '5 km',
      fr: '5 km',
    },
  },
  {
    value: 'custom',
    km: 12,
    mile: 7.456,
    label: {
      nl: 'Eigen afstand',
      en: 'Custom distance',
      fr: 'Distance perso',
    },
  },
]

const labels = computed(() => {
  if (props.locale === 'en') {
    return {
      title: 'Marathon Pace Calculator',
      subtitle: 'Calculate split times, speed and pacing strategy.',
      back: 'Back to planner',
      distance: 'Distance',
      units: 'Units',
      kilometers: 'Kilometers',
      miles: 'Miles',
      runBalance: 'Run balance',
      allowFade: 'Allow fade',
      flat: 'Flat',
      competitive: 'Competitive',
      firstHalf: 'First half',
      secondHalf: 'Second half',
      targetTime: 'Target time',
      splitPace: 'Split pace',
      split: 'Split #',
      splitTime: 'Split time',
      cumulative: 'Cumulative time',
      speed: 'Speed',
      halfway: 'Halfway',
      customDistance: 'Custom distance',
      customDistancePlaceholder: 'E.g. 15.5',
    }
  }

  if (props.locale === 'fr') {
    return {
      title: 'Calculateur d allure marathon',
      subtitle: 'Calcule les splits, la vitesse et ta strategie d allure.',
      back: 'Retour au planificateur',
      distance: 'Distance',
      units: 'Unites',
      kilometers: 'Kilometres',
      miles: 'Miles',
      runBalance: 'Equilibre de course',
      allowFade: 'Laisser baisser',
      flat: 'Stable',
      competitive: 'Competitif',
      firstHalf: 'Premiere moitie',
      secondHalf: 'Deuxieme moitie',
      targetTime: 'Temps cible',
      splitPace: 'Allure split',
      split: 'Split #',
      splitTime: 'Temps split',
      cumulative: 'Temps cumule',
      speed: 'Vitesse',
      halfway: 'Mi-course',
      customDistance: 'Distance perso',
      customDistancePlaceholder: 'Ex. 15,5',
    }
  }

  return {
    title: 'Marathon Pace Calculator',
    subtitle: 'Bereken split-tijden, snelheid en pacingstrategie.',
    back: 'Terug naar planner',
    distance: 'Afstand',
    units: 'Eenheden',
    kilometers: 'Kilometers',
    miles: 'Mijlen',
    runBalance: 'Run balance',
    allowFade: 'Late fade',
    flat: 'Vlak',
    competitive: 'Competitief',
    firstHalf: 'Eerste helft',
    secondHalf: 'Tweede helft',
    targetTime: 'Doeltijd',
    splitPace: 'Split tempo',
    split: 'Split #',
    splitTime: 'Split tijd',
    cumulative: 'Cumulatieve tijd',
    speed: 'Snelheid',
    halfway: 'Halverwege',
    customDistance: 'Eigen afstand',
    customDistancePlaceholder: 'Bijv. 15,5',
  }
})

const localeTag = computed(() => {
  if (props.locale === 'en') return 'en-GB'
  if (props.locale === 'fr') return 'fr-FR'
  return 'nl-NL'
})

const unitMode = ref<UnitMode>('km')
const distancePreset = ref(distancePresets[0].value)
const runBalance = ref(50)
const targetHours = ref(4)
const targetMinutes = ref(0)
const targetSeconds = ref(0)
const customDistanceKm = ref(12)
const KM_PER_MILE = 1.609344

const selectedDistancePreset = computed(() => distancePresets.find((item) => item.value === distancePreset.value) ?? distancePresets[0])
const distanceUnitSuffix = computed(() => (unitMode.value === 'km' ? 'km' : 'mi'))
const speedSuffix = computed(() => (unitMode.value === 'km' ? 'km/h' : 'mph'))
const isCustomDistance = computed(() => distancePreset.value === 'custom')

function normalizeCustomDistance(value: number) {
  if (!Number.isFinite(value)) return 1
  return clamp(value, 1, 250)
}

function roundDistance(value: number) {
  return Math.round(value * 10) / 10
}

const customDistanceForUnit = computed({
  get: () => roundDistance(unitMode.value === 'km' ? customDistanceKm.value : customDistanceKm.value / KM_PER_MILE),
  set: (value: number) => {
    const safeValue = normalizeCustomDistance(value)
    customDistanceKm.value = unitMode.value === 'km' ? safeValue : safeValue * KM_PER_MILE
  },
})

const distanceUnitTotal = computed(() => {
  if (isCustomDistance.value) {
    return unitMode.value === 'km' ? customDistanceKm.value : customDistanceKm.value / KM_PER_MILE
  }
  return unitMode.value === 'km' ? selectedDistancePreset.value.km : selectedDistancePreset.value.mile
})

const totalTimeSeconds = computed(() => (targetHours.value * 3600) + (targetMinutes.value * 60) + targetSeconds.value)

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function setTimeFromTotal(seconds: number) {
  const normalized = clamp(Math.round(seconds), 60, 99 * 3600 + 59 * 60 + 59)
  targetHours.value = Math.floor(normalized / 3600)
  const remaining = normalized % 3600
  targetMinutes.value = Math.floor(remaining / 60)
  targetSeconds.value = remaining % 60
}

function adjustTime(part: 'hours' | 'minutes' | 'seconds', delta: number) {
  const scale = part === 'hours' ? 3600 : part === 'minutes' ? 60 : 1
  setTimeFromTotal(totalTimeSeconds.value + delta * scale)
}

function formatDuration(valueSeconds: number) {
  const total = Math.max(0, Math.round(valueSeconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatSplit(valueSeconds: number) {
  const total = Math.max(0, Math.round(valueSeconds))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatPace(valueSecondsPerUnit: number) {
  return `${formatSplit(valueSecondsPerUnit)} /${distanceUnitSuffix.value}`
}

function formatSpeed(segmentDistance: number, segmentSeconds: number) {
  const speed = segmentSeconds > 0 ? (segmentDistance / segmentSeconds) * 3600 : 0
  return `${new Intl.NumberFormat(localeTag.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(speed)} ${speedSuffix.value}`
}

const firstHalfShare = computed(() => {
  const tilt = (50 - runBalance.value) / 100
  return clamp(0.5 + tilt * 0.08, 0.46, 0.54)
})

const firstHalfDistance = computed(() => distanceUnitTotal.value / 2)
const secondHalfDistance = computed(() => distanceUnitTotal.value / 2)
const firstHalfTimeSeconds = computed(() => totalTimeSeconds.value * firstHalfShare.value)
const secondHalfTimeSeconds = computed(() => totalTimeSeconds.value - firstHalfTimeSeconds.value)

const firstHalfPaceSeconds = computed(() => firstHalfTimeSeconds.value / Math.max(firstHalfDistance.value, 0.001))
const secondHalfPaceSeconds = computed(() => secondHalfTimeSeconds.value / Math.max(secondHalfDistance.value, 0.001))

interface SplitRow {
  label: string
  splitTime: string
  distance: string
  cumulative: string
  speed: string
  highlight?: boolean
}

const splitRows = computed<SplitRow[]>(() => {
  const totalUnits = distanceUnitTotal.value
  const wholeSplits = Math.floor(totalUnits)
  const remainder = totalUnits - wholeSplits
  const halfPoint = totalUnits / 2

  let cumulativeTime = 0
  let splitIndex = 0
  const rows: SplitRow[] = []

  const addSegment = (start: number, end: number) => {
    const length = end - start
    if (length <= 0) return

    splitIndex += 1
    const midpoint = start + length / 2
    const paceSeconds = midpoint <= halfPoint ? firstHalfPaceSeconds.value : secondHalfPaceSeconds.value
    const segmentSeconds = paceSeconds * length
    const previousTime = cumulativeTime
    cumulativeTime += segmentSeconds

    rows.push({
      label: String(splitIndex),
      splitTime: formatSplit(segmentSeconds),
      distance: `${new Intl.NumberFormat(localeTag.value, { maximumFractionDigits: 3 }).format(start)} - ${new Intl.NumberFormat(localeTag.value, { maximumFractionDigits: 3 }).format(end)}`,
      cumulative: formatDuration(cumulativeTime),
      speed: formatSpeed(length, segmentSeconds),
    })

    if (start < halfPoint && end >= halfPoint) {
      const halfSegmentLength = halfPoint - start
      const halfTime = previousTime + (halfSegmentLength * paceSeconds)
      const halfSegmentSeconds = halfSegmentLength * paceSeconds
      rows.push({
        label: labels.value.halfway,
        splitTime: formatSplit(Math.max(1, halfSegmentSeconds)),
        distance: `${new Intl.NumberFormat(localeTag.value, { maximumFractionDigits: 3 }).format(start)} - ${new Intl.NumberFormat(localeTag.value, { maximumFractionDigits: 3 }).format(halfPoint)}`,
        cumulative: formatDuration(halfTime),
        speed: formatSpeed(Math.max(halfSegmentLength, 0.001), Math.max(halfSegmentSeconds, 1)),
        highlight: true,
      })
    }
  }

  for (let i = 0; i < wholeSplits; i += 1) {
    addSegment(i, i + 1)
  }

  if (remainder > 0.0001) {
    addSegment(wholeSplits, totalUnits)
  }

  return rows
})

const distanceOptionLabels = computed(() => distancePresets.map((item) => ({ value: item.value, label: item.label[props.locale] })))

function handleCustomDistanceInput(event: Event) {
  const target = event.target as HTMLInputElement | null
  customDistanceForUnit.value = Number(target?.value ?? '')
}
</script>

<template>
  <section class="space-y-4">
    <Card class="pace-header-card p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-foreground md:text-3xl">{{ labels.title }}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{{ labels.subtitle }}</p>
        </div>
        <Button type="button" variant="outline" @click="emit('back-to-planner')">
          <ChevronLeft class="h-4 w-4" />
          {{ labels.back }}
        </Button>
      </div>
    </Card>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,46%),minmax(0,54%)]">
      <div class="space-y-4">
        <Card class="pace-panel p-4">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <p class="mb-2 text-sm font-semibold text-muted-foreground">{{ labels.distance }}</p>
              <select
                v-model="distancePreset"
                class="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm font-medium outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
              >
                <option v-for="option in distanceOptionLabels" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <div v-if="isCustomDistance" class="mt-2">
                <input
                  :value="customDistanceForUnit"
                  type="number"
                  min="1"
                  max="250"
                  step="0.1"
                  class="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm font-medium outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300"
                  :placeholder="labels.customDistancePlaceholder"
                  @input="handleCustomDistanceInput"
                />
                <p class="mt-1 text-xs text-muted-foreground">{{ labels.customDistance }} ({{ distanceUnitSuffix }})</p>
              </div>
            </div>

            <div>
              <p class="mb-2 text-sm font-semibold text-muted-foreground">{{ labels.units }}</p>
              <div class="grid grid-cols-2 gap-2">
                <Button type="button" :variant="unitMode === 'mi' ? 'secondary' : 'outline'" @click="unitMode = 'mi'">{{ labels.miles }}</Button>
                <Button type="button" :variant="unitMode === 'km' ? 'secondary' : 'outline'" @click="unitMode = 'km'">{{ labels.kilometers }}</Button>
              </div>
            </div>
          </div>
        </Card>

        <Card class="pace-panel p-4">
          <p class="mb-3 text-sm font-semibold text-muted-foreground">{{ labels.targetTime }}</p>
          <div class="grid grid-cols-3 gap-3">
            <div class="time-col">
              <button type="button" class="time-adjust" @click="adjustTime('hours', 1)"><ArrowUp class="h-4 w-4" /></button>
              <div class="time-value">{{ String(targetHours).padStart(2, '0') }}</div>
              <button type="button" class="time-adjust" @click="adjustTime('hours', -1)"><ArrowDown class="h-4 w-4" /></button>
            </div>
            <div class="time-col">
              <button type="button" class="time-adjust" @click="adjustTime('minutes', 1)"><ArrowUp class="h-4 w-4" /></button>
              <div class="time-value">{{ String(targetMinutes).padStart(2, '0') }}</div>
              <button type="button" class="time-adjust" @click="adjustTime('minutes', -1)"><ArrowDown class="h-4 w-4" /></button>
            </div>
            <div class="time-col">
              <button type="button" class="time-adjust" @click="adjustTime('seconds', 1)"><ArrowUp class="h-4 w-4" /></button>
              <div class="time-value">{{ String(targetSeconds).padStart(2, '0') }}</div>
              <button type="button" class="time-adjust" @click="adjustTime('seconds', -1)"><ArrowDown class="h-4 w-4" /></button>
            </div>
          </div>
        </Card>

        <Card class="pace-panel p-4">
          <p class="text-sm font-semibold text-muted-foreground">{{ labels.runBalance }}</p>
          <input v-model.number="runBalance" type="range" min="0" max="100" class="mt-3 w-full" />
          <div class="mt-1 flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>{{ labels.allowFade }}</span>
            <span>{{ labels.flat }}</span>
            <span>{{ labels.competitive }}</span>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <div class="half-card">
              <p class="text-sm font-semibold text-muted-foreground">{{ labels.firstHalf }}</p>
              <p class="mt-1 text-xs text-muted-foreground">{{ (firstHalfShare * 100).toFixed(1) }}%</p>
              <p class="mt-3 text-xl font-bold text-foreground">{{ labels.splitPace }}</p>
              <p class="mt-1 text-sm font-semibold text-foreground">{{ formatPace(firstHalfPaceSeconds) }}</p>
              <p class="mt-3 text-xs text-muted-foreground">{{ formatDuration(firstHalfTimeSeconds) }}</p>
            </div>
            <div class="half-card">
              <p class="text-sm font-semibold text-muted-foreground">{{ labels.secondHalf }}</p>
              <p class="mt-1 text-xs text-muted-foreground">{{ (100 - firstHalfShare * 100).toFixed(1) }}%</p>
              <p class="mt-3 text-xl font-bold text-foreground">{{ labels.splitPace }}</p>
              <p class="mt-1 text-sm font-semibold text-foreground">{{ formatPace(secondHalfPaceSeconds) }}</p>
              <p class="mt-3 text-xs text-muted-foreground">{{ formatDuration(secondHalfTimeSeconds) }}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card class="pace-panel p-0">
        <div class="overflow-x-auto">
          <table class="pace-table min-w-[760px]">
            <thead>
              <tr>
                <th>{{ labels.split }}</th>
                <th>{{ labels.splitTime }}</th>
                <th>{{ labels.distance }}</th>
                <th>{{ labels.cumulative }}</th>
                <th>{{ labels.speed }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in splitRows"
                :key="`${row.label}-${index}`"
                :class="row.highlight ? 'pace-row-highlight' : ''"
              >
                <td>{{ row.label }}</td>
                <td>{{ row.splitTime }}</td>
                <td>{{ row.distance }}</td>
                <td>{{ row.cumulative }}</td>
                <td>{{ row.speed }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </section>
</template>

<style scoped>
.pace-header-card,
.pace-panel {
  border-color: rgba(148, 163, 184, 0.25);
}

.time-col {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
}

.time-adjust {
  display: grid;
  place-items: center;
  width: 2.1rem;
  height: 1.7rem;
  border-radius: 0.65rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  color: rgb(39 39 42);
  transition: all 0.2s ease;
}

.time-adjust:hover {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.45);
}

.time-value {
  font-size: clamp(2.2rem, 6vw, 4rem);
  line-height: 1;
  font-weight: 800;
  letter-spacing: -0.04em;
  min-width: 2ch;
  text-align: center;
}

.half-card {
  border: 1px solid rgba(148, 163, 184, 0.26);
  border-radius: 0.95rem;
  background: rgba(248, 250, 252, 0.72);
  padding: 0.85rem;
}

.pace-table {
  width: 100%;
  border-collapse: collapse;
}

.pace-table th,
.pace-table td {
  text-align: left;
  padding: 0.58rem 0.68rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  font-size: 0.9rem;
}

.pace-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(241, 245, 249, 0.95);
  font-weight: 800;
}

.pace-table tbody tr:nth-child(even) {
  background: rgba(248, 250, 252, 0.65);
}

.pace-row-highlight {
  color: #1d4ed8;
  font-weight: 700;
}

:global(.theme-weather) .pace-panel,
:global(.theme-weather) .pace-header-card {
  background: rgba(18, 79, 152, 0.58);
  border-color: rgba(156, 205, 255, 0.34);
}

:global(.theme-weather) .time-adjust {
  color: #eaf3ff;
  border-color: rgba(156, 205, 255, 0.38);
  background: rgba(17, 84, 161, 0.45);
}

:global(.theme-weather) .half-card {
  background: rgba(17, 84, 161, 0.44);
  border-color: rgba(156, 205, 255, 0.32);
}

:global(.theme-weather) .pace-table th {
  background: rgba(14, 63, 124, 0.96);
}

:global(.theme-weather) .pace-table tbody tr:nth-child(even) {
  background: rgba(17, 84, 161, 0.34);
}

:global(.theme-weather) .pace-row-highlight {
  color: #bfdbfe;
}

@media (max-width: 880px) {
  .time-value {
    font-size: clamp(1.8rem, 12vw, 3rem);
  }
}
</style>
