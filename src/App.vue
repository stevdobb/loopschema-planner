<script setup lang="ts">
import { computed, ref } from 'vue'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Calendar, Download, FileImage, FileText, Goal, Printer, RefreshCcw } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import { formatDateLong, formatGoalTime, formatPaceValue } from '@/lib/planner'
import { usePlannerStore } from '@/stores/planner'
import type { RaceType, TrainingSession } from '@/types/planner'

const planner = usePlannerStore()
const exportElement = ref<HTMLElement | null>(null)
const localError = ref('')
const isExporting = ref(false)

const raceOptions: { label: string; value: RaceType }[] = [
  { label: 'Marathon (42.2 km)', value: 'marathon' },
  { label: 'Halve marathon (21.1 km)', value: 'half-marathon' },
  { label: '10 km', value: '10k' },
  { label: '5 km', value: '5k' },
  { label: 'Custom afstand', value: 'custom' },
]

const dayOptions = [2, 3, 4, 5, 6, 7]
const weekdayHeaders = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'] as const

interface ExportCell {
  title: string
  value: string
  type: TrainingSession['type'] | 'rest'
}

interface ExportWeekRow {
  weekNumber: number
  weekEndShort: string
  totalDistanceKm: number
  cells: ExportCell[]
}

const todayISO = computed(() => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.toISOString().slice(0, 10)
})

const summaryRows = computed(() => {
  if (!planner.plan) {
    return []
  }

  return [
    { label: 'Doelrace', value: planner.plan.raceLabel },
    { label: 'Periode', value: `${formatDateLong(planner.plan.startDateISO)} t/m ${formatDateLong(planner.plan.endDateISO)}` },
    { label: 'Doeltijd', value: formatGoalTime(planner.plan.goalTimeMinutes) },
    { label: 'Doeltempo', value: formatPaceValue(planner.plan.targetPaceMinPerKm) },
    { label: 'Trainingsweken', value: String(planner.plan.totalWeeks) },
    { label: 'Dagen per week', value: String(planner.plan.daysPerWeek) },
  ]
})

function addDays(isoDate: string, days: number) {
  const date = new Date(isoDate)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function formatShortDate(dateISO: string) {
  const date = new Date(dateISO)
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
}

function exportTitle(session: TrainingSession) {
  if (session.type === 'easy') return 'Rustige duurloop'
  if (session.type === 'recovery') return 'Herstelrun'
  if (session.type === 'interval') return 'Snelle duurloop'
  if (session.type === 'tempo') return planner.plan?.raceLabel.toLowerCase().includes('marathon') ? 'Marathon tempo' : 'Tempo run'
  if (session.type === 'long') return 'Lange duurloop'
  return 'Wedstrijd'
}

function exportValue(session: TrainingSession) {
  if (session.type === 'race') {
    return planner.plan?.raceLabel ?? 'Wedstrijd'
  }
  return `${session.distanceKm} km`
}

const exportWeeks = computed<ExportWeekRow[]>(() => {
  if (!planner.plan) {
    return []
  }

  return planner.plan.weeks.map((week) => {
    const sessionsByDate = new Map(week.sessions.map((session) => [session.dateISO, session]))
    const cells: ExportCell[] = []

    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const isoDate = addDays(week.startDateISO, dayOffset)
      const session = sessionsByDate.get(isoDate)

      if (!session) {
        cells.push({
          title: 'Rustdag',
          value: '-',
          type: 'rest',
        })
        continue
      }

      cells.push({
        title: exportTitle(session),
        value: exportValue(session),
        type: session.type,
      })
    }

    return {
      weekNumber: week.weekNumber,
      weekEndShort: formatShortDate(week.endDateISO),
      totalDistanceKm: week.totalDistanceKm,
      cells,
    }
  })
})

function setMode(mode: 'date' | 'weeks') {
  planner.form.mode = mode
}

function generatePlan() {
  localError.value = ''

  try {
    planner.generate()
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Planningsfout'
  }
}

function resetPlanner() {
  planner.reset()
  localError.value = ''
}

function typeBadgeClass(type: TrainingSession['type']) {
  if (type === 'easy') return 'bg-blue-100 text-blue-900'
  if (type === 'recovery') return 'bg-cyan-100 text-cyan-900'
  if (type === 'tempo') return 'bg-indigo-100 text-indigo-900'
  if (type === 'interval') return 'bg-sky-200 text-sky-900'
  if (type === 'long') return 'bg-blue-200 text-blue-950'
  return 'bg-primary/15 text-primary'
}

function exportCellClass(type: ExportCell['type']) {
  if (type === 'race') return 'bg-blue-300/70 text-blue-950'
  if (type === 'interval') return 'bg-sky-300/60 text-sky-950'
  if (type === 'tempo') return 'bg-indigo-200/70 text-indigo-950'
  if (type === 'rest') return 'bg-slate-100 text-slate-700'
  return ''
}

async function capturePlanCanvas() {
  if (!planner.plan) {
    throw new Error('Genereer eerst een planning.')
  }

  if (!exportElement.value) {
    throw new Error('Geen planningselement beschikbaar om te exporteren.')
  }

  isExporting.value = true
  try {
    return await html2canvas(exportElement.value, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      scrollX: 0,
      scrollY: -window.scrollY,
    })
  } finally {
    isExporting.value = false
  }
}

async function downloadImage() {
  localError.value = ''

  try {
    const canvas = await capturePlanCanvas()
    const link = document.createElement('a')
    link.download = `training-plan-${todayISO.value}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Export naar afbeelding mislukt.'
  }
}

async function downloadPdf() {
  localError.value = ''

  try {
    const canvas = await capturePlanCanvas()
    const pdf = new jsPDF('l', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10
    const printableWidth = pageWidth - margin * 2
    const printableHeight = pageHeight - margin * 2

    const imageWidth = printableWidth
    const imageHeight = (canvas.height * imageWidth) / canvas.width
    const imageData = canvas.toDataURL('image/png')

    let remainingHeight = imageHeight
    let yOffset = margin

    pdf.addImage(imageData, 'PNG', margin, yOffset, imageWidth, imageHeight)
    remainingHeight -= printableHeight

    while (remainingHeight > 0) {
      yOffset = margin - (imageHeight - remainingHeight)
      pdf.addPage()
      pdf.addImage(imageData, 'PNG', margin, yOffset, imageWidth, imageHeight)
      remainingHeight -= printableHeight
    }

    pdf.save(`training-plan-${todayISO.value}.pdf`)
  } catch (error) {
    localError.value = error instanceof Error ? error.message : 'Export naar PDF mislukt.'
  }
}

function printPlan() {
  if (!planner.plan) {
    localError.value = 'Genereer eerst een planning om te kunnen printen.'
    return
  }

  window.print()
}
</script>

<template>
  <main class="min-h-screen bg-background pb-16">
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header class="mb-7 rounded-3xl border border-border bg-card px-6 py-9 shadow-soft">
        <p class="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          <Goal class="h-4 w-4" />
          Training Planner
        </p>
        <h1 class="text-4xl font-bold text-foreground md:text-5xl">Marathon & Running Planner</h1>
        <p class="mt-4 max-w-3xl text-sm font-medium leading-relaxed text-muted-foreground md:text-base">
          Vul je doeltijd, wedstrijddatum of aantal trainingsweken in en krijg automatisch een planning voor marathon,
          halve marathon, 10k, 5k of je eigen custom afstand.
        </p>
      </header>

      <div class="grid gap-6 lg:grid-cols-[400px,1fr] print:block">
        <Card class="h-fit p-5 print:hidden">
          <h2 class="mb-4 text-xl font-semibold">Instellingen</h2>

          <div class="space-y-4">
            <div>
              <Label>Doelafstand</Label>
              <select
                v-model="planner.form.raceType"
                class="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option v-for="option in raceOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </div>

            <div v-if="planner.form.raceType === 'custom'">
              <Label>Custom afstand (km)</Label>
              <Input
                :model-value="planner.form.customDistanceKm"
                type="number"
                min="1"
                max="100"
                step="0.5"
                placeholder="Bijv. 15"
                @update:model-value="planner.form.customDistanceKm = Number($event)"
              />
            </div>

            <div>
              <Label>Doeltijd (uu:mm of uu:mm:ss)</Label>
              <Input v-model="planner.form.goalTime" placeholder="03:45 of 01:48:30" />
            </div>

            <div>
              <Label>Plan op basis van</Label>
              <div class="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  :variant="planner.form.mode === 'date' ? 'default' : 'outline'"
                  class="w-full"
                  @click="setMode('date')"
                >
                  <Calendar class="h-4 w-4" />
                  Datum
                </Button>
                <Button
                  type="button"
                  :variant="planner.form.mode === 'weeks' ? 'default' : 'outline'"
                  class="w-full"
                  @click="setMode('weeks')"
                >
                  <RefreshCcw class="h-4 w-4" />
                  Weken
                </Button>
              </div>
            </div>

            <div v-if="planner.form.mode === 'date'">
              <Label>Wedstrijddatum</Label>
              <Input v-model="planner.form.raceDate" type="date" :min="todayISO" />
            </div>

            <div v-else>
              <Label>Aantal trainingsweken</Label>
              <Input
                :model-value="planner.form.trainingWeeks"
                type="number"
                min="2"
                max="52"
                step="1"
                @update:model-value="planner.form.trainingWeeks = Number($event)"
              />
            </div>

            <div>
              <Label>Trainingsdagen per week</Label>
              <select
                v-model.number="planner.form.daysPerWeek"
                class="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option v-for="days in dayOptions" :key="days" :value="days">{{ days }} dagen</option>
              </select>
            </div>

            <div class="grid grid-cols-1 gap-2 pt-1">
              <Button type="button" size="lg" @click="generatePlan">Planning genereren</Button>
              <Button type="button" variant="secondary" @click="resetPlanner">Reset</Button>
            </div>

            <p v-if="localError || planner.lastError" class="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-900">
              {{ localError || planner.lastError }}
            </p>
          </div>
        </Card>

        <section>
          <Card v-if="planner.plan" class="mb-4 p-5 print:hidden">
            <h2 class="mb-3 text-2xl font-bold">Planoverzicht</h2>
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div v-for="row in summaryRows" :key="row.label" class="rounded-lg bg-secondary px-3 py-2">
                <p class="text-xs uppercase tracking-[0.11em] text-muted-foreground">{{ row.label }}</p>
                <p class="text-sm font-semibold text-foreground">{{ row.value }}</p>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" :disabled="isExporting" @click="downloadPdf">
                <FileText class="h-4 w-4" />
                Download PDF
              </Button>
              <Button type="button" variant="outline" :disabled="isExporting" @click="downloadImage">
                <FileImage class="h-4 w-4" />
                Download afbeelding
              </Button>
              <Button type="button" variant="secondary" @click="printPlan">
                <Printer class="h-4 w-4" />
                Afdrukken
              </Button>
            </div>
          </Card>

          <Card v-if="planner.plan" class="mb-4 p-4">
            <div class="mb-3 print:hidden">
              <h2 class="text-2xl font-bold">Exportvoorbeeld per dag</h2>
              <p class="text-sm font-medium text-muted-foreground">
                Dit weekrooster wordt gebruikt voor afbeelding, PDF en print.
              </p>
            </div>

            <div class="overflow-x-auto rounded-lg border border-border">
              <div id="printable-plan" ref="exportElement" class="export-sheet min-w-[1220px]">
                <header class="export-sheet-header">
                  <h3>{{ planner.plan.raceLabel }} Trainingsplanning</h3>
                  <p>
                    {{ formatDateLong(planner.plan.startDateISO) }} t/m {{ formatDateLong(planner.plan.endDateISO) }}
                  </p>
                </header>

                <table class="export-table">
                  <thead>
                    <tr>
                      <th class="week-col">Week</th>
                      <th v-for="day in weekdayHeaders" :key="day">{{ day }}</th>
                      <th class="date-col">Datum</th>
                      <th class="km-col">Totaal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <template v-for="week in exportWeeks" :key="week.weekNumber">
                      <tr class="separator-row">
                        <td colspan="10" />
                      </tr>
                      <tr class="week-row">
                        <td class="week-number">{{ week.weekNumber }}.</td>
                        <td
                          v-for="(cell, cellIndex) in week.cells"
                          :key="`${week.weekNumber}-${cellIndex}`"
                          class="day-cell"
                        >
                          <div class="cell-title">{{ cell.title }}</div>
                          <div :class="['cell-value', exportCellClass(cell.type)]">{{ cell.value }}</div>
                        </td>
                        <td class="week-end-date">{{ week.weekEndShort }}</td>
                        <td class="week-km">{{ week.totalDistanceKm }} km</td>
                      </tr>
                    </template>
                    <tr class="separator-row">
                      <td colspan="10" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Card>

          <Card v-if="planner.plan" class="p-5 print:hidden">
            <div class="mb-5 border-b border-border pb-4">
              <h2 class="text-3xl font-bold">Detailplanning met uitleg</h2>
              <p class="mt-2 text-sm font-medium text-muted-foreground">
                Van {{ formatDateLong(planner.plan.startDateISO) }} tot {{ formatDateLong(planner.plan.endDateISO) }}
              </p>
            </div>

            <div class="space-y-4">
              <article
                v-for="week in planner.plan.weeks"
                :key="week.weekNumber"
                class="animate-rise rounded-xl border border-border bg-white p-4"
                :style="{ animationDelay: `${week.weekNumber * 40}ms` }"
              >
                <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 class="text-lg font-semibold">Week {{ week.weekNumber }}</h3>
                    <p class="text-sm text-muted-foreground">
                      {{ formatDateLong(week.startDateISO) }} - {{ formatDateLong(week.endDateISO) }}
                    </p>
                  </div>
                  <span class="rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{{ week.totalDistanceKm }} km</span>
                </div>

                <p class="mb-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{{ week.focus }}</p>

                <div class="space-y-2">
                  <div
                    v-for="session in week.sessions"
                    :key="session.id"
                    class="rounded-lg border border-border/70 bg-card p-3"
                  >
                    <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <p class="font-semibold text-foreground">
                        {{ session.weekday }} {{ formatDateLong(session.dateISO) }} - {{ session.title }}
                      </p>
                      <span :class="['rounded-full px-2.5 py-1 text-xs font-semibold capitalize', typeBadgeClass(session.type)]">
                        {{ session.type }}
                      </span>
                    </div>
                    <p class="mb-1 text-sm text-foreground">
                      <strong>Afstand:</strong> {{ session.distanceKm }} km · <strong>Tempo:</strong> {{ session.pace }}
                    </p>
                    <p class="text-sm text-muted-foreground">{{ session.description }}</p>
                  </div>
                </div>
              </article>
            </div>
          </Card>

          <Card v-else class="grid min-h-80 place-items-center p-8 text-center">
            <div>
              <Download class="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <h2 class="text-2xl font-bold">Nog geen planning</h2>
              <p class="mt-2 text-sm text-muted-foreground">
                Vul links je instellingen in en klik op <strong>Planning genereren</strong>.
              </p>
            </div>
          </Card>
        </section>
      </div>
    </div>
  </main>
</template>
