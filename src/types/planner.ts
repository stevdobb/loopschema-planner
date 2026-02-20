export type RaceType = 'marathon' | 'half-marathon' | '10k' | '5k' | 'custom'

export type PlanMode = 'date' | 'weeks'

export interface PlannerForm {
  raceType: RaceType
  customDistanceKm: number
  goalTime: string
  mode: PlanMode
  raceDate: string
  trainingWeeks: number
  daysPerWeek: number
}

export interface TrainingSession {
  id: string
  dateISO: string
  weekday: string
  title: string
  type: 'easy' | 'recovery' | 'tempo' | 'interval' | 'long' | 'race'
  distanceKm: number
  pace: string
  description: string
}

export interface TrainingWeek {
  weekNumber: number
  startDateISO: string
  endDateISO: string
  focus: string
  totalDistanceKm: number
  sessions: TrainingSession[]
}

export interface TrainingPlan {
  raceLabel: string
  distanceKm: number
  goalTimeMinutes: number
  targetPaceMinPerKm: number
  startDateISO: string
  endDateISO: string
  totalWeeks: number
  daysPerWeek: number
  weeks: TrainingWeek[]
}

export interface SavedPlanEntry {
  id: string
  name: string
  createdAtISO: string
  form: PlannerForm
  plan: TrainingPlan
}
