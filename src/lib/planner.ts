import type { PlannerForm, RaceType, TrainingPlan, TrainingSession, TrainingWeek } from '@/types/planner'

const WEEKDAY_NL = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'] as const

const DAY_PATTERNS: Record<number, number[]> = {
  2: [2, 6],
  3: [1, 3, 6],
  4: [1, 2, 4, 6],
  5: [1, 2, 3, 4, 6],
  6: [0, 1, 2, 3, 4, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
}

const RACE_LABELS: Record<RaceType, string> = {
  marathon: 'Marathon',
  'half-marathon': 'Halve Marathon',
  '10k': '10 km',
  '5k': '5 km',
  custom: 'Custom afstand',
}

type WeekPhase = 'base' | 'build' | 'peak' | 'recovery' | 'taper' | 'race'

interface WeekLoadProfile {
  longRunFactor: number
  volumeFactor: number
  qualityFactor: number
}

function roundToHalf(value: number) {
  return Math.round(value * 2) / 2
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatISO(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function isValidISODate(dateISO: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    return false
  }

  const parsed = new Date(dateISO)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === dateISO
}

function startOfWeekMonday(date: Date) {
  const copy = new Date(date)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setHours(0, 0, 0, 0)
  copy.setDate(copy.getDate() + diff)
  return copy
}

function weeksBetween(start: Date, end: Date) {
  const diffMs = end.getTime() - start.getTime()
  const days = Math.max(7, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  return clamp(Math.ceil(days / 7), 2, 52)
}

function parseGoalTimeToMinutes(goalTime: string) {
  const cleaned = goalTime.trim()
  if (!cleaned) {
    return null
  }

  const parts = cleaned.split(':').map((part) => Number(part))
  if (parts.some((part) => Number.isNaN(part) || part < 0)) {
    return null
  }

  if (parts.length === 2) {
    const [hours, minutes] = parts
    if (minutes >= 60) {
      return null
    }
    return hours * 60 + minutes
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    if (minutes >= 60 || seconds >= 60) {
      return null
    }
    return hours * 60 + minutes + seconds / 60
  }

  return null
}

function formatPace(minPerKm: number) {
  const minutes = Math.floor(minPerKm)
  const seconds = Math.round((minPerKm - minutes) * 60)
  const normalizedMinutes = seconds === 60 ? minutes + 1 : minutes
  const normalizedSeconds = seconds === 60 ? 0 : seconds
  return `${normalizedMinutes}:${String(normalizedSeconds).padStart(2, '0')} min/km`
}

function paceRange(minPerKm: number, fastDelta: number, slowDelta: number) {
  const fast = formatPace(Math.max(2.5, minPerKm + fastDelta))
  const slow = formatPace(minPerKm + slowDelta)
  return `${fast} - ${slow}`
}

function getDistanceKm(raceType: RaceType, customDistanceKm: number) {
  if (raceType === 'marathon') {
    return 42.195
  }
  if (raceType === 'half-marathon') {
    return 21.097
  }
  if (raceType === '10k') {
    return 10
  }
  if (raceType === '5k') {
    return 5
  }

  return clamp(customDistanceKm || 10, 1, 100)
}

function getPeakLongRun(distanceKm: number, raceType: RaceType) {
  if (raceType === 'marathon') {
    return 32
  }
  if (raceType === 'half-marathon') {
    return 20
  }
  if (raceType === '10k') {
    return 13
  }
  if (raceType === '5k') {
    return 8
  }

  return clamp(roundToHalf(distanceKm * 0.75), 6, 34)
}

function getTaperWeeks(raceType: RaceType, distanceKm: number, totalWeeks: number) {
  let targetTaperWeeks = 1
  if (raceType === 'marathon' || distanceKm >= 35) {
    targetTaperWeeks = 3
  } else if (raceType === 'half-marathon' || distanceKm >= 15) {
    targetTaperWeeks = 2
  }

  // Keep enough room for build and race weeks in short plans.
  return clamp(targetTaperWeeks, 1, Math.max(1, totalWeeks - 2))
}

function weekPhaseFor(weekNumber: number, totalWeeks: number, taperWeeks: number): WeekPhase {
  if (weekNumber === totalWeeks) {
    return 'race'
  }

  const weeksToRace = totalWeeks - weekNumber
  if (weeksToRace <= taperWeeks) {
    return 'taper'
  }

  const peakBlockEnabled = totalWeeks >= 8
  const peakStartWeek = Math.max(1, totalWeeks - taperWeeks - 3)
  if (peakBlockEnabled && weekNumber >= peakStartWeek) {
    return 'peak'
  }

  if (weekNumber % 4 === 0) {
    return 'recovery'
  }

  if (weekNumber <= Math.ceil(totalWeeks * 0.4)) {
    return 'base'
  }

  return 'build'
}

function getWeekLoadProfile(phase: WeekPhase, weeksToRace: number): WeekLoadProfile {
  if (phase === 'race') {
    return {
      longRunFactor: 0.42,
      volumeFactor: 0.52,
      qualityFactor: 0.72,
    }
  }

  if (phase === 'taper') {
    if (weeksToRace <= 1) {
      return {
        longRunFactor: 0.52,
        volumeFactor: 0.58,
        qualityFactor: 0.78,
      }
    }

    if (weeksToRace === 2) {
      return {
        longRunFactor: 0.68,
        volumeFactor: 0.74,
        qualityFactor: 0.88,
      }
    }

    return {
      longRunFactor: 0.82,
      volumeFactor: 0.88,
      qualityFactor: 0.94,
    }
  }

  if (phase === 'recovery') {
    return {
      longRunFactor: 0.8,
      volumeFactor: 0.84,
      qualityFactor: 0.88,
    }
  }

  if (phase === 'peak') {
    return {
      longRunFactor: 1.04,
      volumeFactor: 1.03,
      qualityFactor: 1.02,
    }
  }

  if (phase === 'base') {
    return {
      longRunFactor: 0.94,
      volumeFactor: 0.95,
      qualityFactor: 0.9,
    }
  }

  return {
    longRunFactor: 1,
    volumeFactor: 1,
    qualityFactor: 1,
  }
}

function weeklyFocus(phase: WeekPhase, weeksToRace: number) {
  if (phase === 'race') {
    return 'Raceweek: volume sterk omlaag, benen fris houden en vertrouwen meenemen naar de start.'
  }

  if (phase === 'taper') {
    if (weeksToRace <= 1) {
      return 'Laatste taperweek: korte, lichte prikkels en veel herstel zodat je volledig uitgerust start.'
    }
    if (weeksToRace === 2) {
      return 'Taperweek: volume duidelijk terugschalen, kwaliteit kort houden en herstel prioriteren.'
    }
    return 'Vroege taper: trainingsbelasting gecontroleerd afbouwen met behoud van ritme.'
  }

  if (phase === 'recovery') {
    return 'Herstelweek: minder volume zodat je sterker terugkomt.'
  }

  if (phase === 'peak') {
    return 'Piekblok: wedstrijdspecifieke trainingen en gecontroleerd hoge belasting.'
  }

  if (phase === 'base') {
    return 'Basis opbouwen: rustige kilometers, techniek en consistente trainingsroutine.'
  }

  return 'Opbouw: meer kwaliteit rond tempo en interval met geleidelijke volumestijging.'
}

function sessionDescription(type: TrainingSession['type'], distanceKm: number, raceLabel: string) {
  if (type === 'easy') {
    return `Rustige duurloop van ${distanceKm} km. Praattempo aanhouden en focussen op ontspannen loopstijl, cadans en ademhaling.`
  }
  if (type === 'recovery') {
    return `Herstelrun van ${distanceKm} km. Heel rustig lopen, lage hartslag houden en actief herstellen van eerdere intensieve trainingen.`
  }
  if (type === 'tempo') {
    return `Tempobloktraining van ${distanceKm} km met in- en uitlopen. De kern loop je rond je beoogde wedstrijdtempo voor betere lactaattolerantie.`
  }
  if (type === 'interval') {
    return `Intervalsessie over ${distanceKm} km totaal. Start met 10-15 min inlopen, daarna korte snellere herhalingen met rustige herstelpauzes.`
  }
  if (type === 'long') {
    return `Lange duurloop van ${distanceKm} km. Eet/drink volgens wedstrijdplan en houd het tempo gecontroleerd zodat je uithouding groeit.`
  }

  return `${raceLabel} wedstrijddag. Rustig starten, pacing strak houden en het laatste deel gecontroleerd versnellen als je nog over hebt.`
}

function sessionTitle(type: TrainingSession['type']) {
  if (type === 'easy') {
    return 'Easy run'
  }
  if (type === 'recovery') {
    return 'Herstelrun'
  }
  if (type === 'tempo') {
    return 'Tempo run'
  }
  if (type === 'interval') {
    return 'Interval training'
  }
  if (type === 'long') {
    return 'Lange duurloop'
  }

  return 'Wedstrijd'
}

function chooseSessionTypes(daysPerWeek: number) {
  if (daysPerWeek <= 2) {
    return ['easy', 'long'] as const
  }
  if (daysPerWeek === 3) {
    return ['easy', 'tempo', 'long'] as const
  }
  if (daysPerWeek === 4) {
    return ['easy', 'interval', 'tempo', 'long'] as const
  }
  if (daysPerWeek === 5) {
    return ['recovery', 'easy', 'interval', 'tempo', 'long'] as const
  }
  if (daysPerWeek === 6) {
    return ['recovery', 'easy', 'interval', 'easy', 'tempo', 'long'] as const
  }
  return ['recovery', 'easy', 'interval', 'easy', 'tempo', 'easy', 'long'] as const
}

function sessionTypeForPhase(type: TrainingSession['type'], phase: WeekPhase, weeksToRace: number) {
  if (phase === 'race') {
    if (type === 'long' || type === 'tempo' || type === 'interval') {
      return 'easy' as const
    }
  }

  if (phase === 'taper' && weeksToRace <= 1 && type === 'interval') {
    return 'tempo' as const
  }

  return type
}

function sessionDistance(
  type: TrainingSession['type'],
  longRunKm: number,
  distanceKm: number,
  profile: WeekLoadProfile,
  phase: WeekPhase,
) {
  const base = longRunKm * profile.volumeFactor
  const minFactor = phase === 'race' ? 0.6 : phase === 'taper' ? 0.8 : 1

  if (type === 'long') {
    if (phase === 'race') {
      return roundToHalf(clamp(longRunKm * 0.55, 4, Math.max(8, distanceKm * 0.25)))
    }
    return roundToHalf(longRunKm)
  }
  if (type === 'recovery') {
    const minKm = 4 * minFactor
    const maxKm = Math.max(minKm + 1, Math.max(6 * minFactor, distanceKm * 0.35))
    return roundToHalf(clamp(base * 0.35, minKm, maxKm))
  }
  if (type === 'easy') {
    const minKm = 5 * minFactor
    const maxKm = Math.max(minKm + 1.5, Math.max(10 * minFactor, distanceKm * 0.5))
    return roundToHalf(clamp(base * 0.5, minKm, maxKm))
  }
  if (type === 'interval') {
    const minKm = 5 * minFactor
    const maxKm = Math.max(minKm + 2, Math.max(12 * minFactor, distanceKm * 0.55))
    return roundToHalf(clamp(base * 0.55 * profile.qualityFactor, minKm, maxKm))
  }
  if (type === 'tempo') {
    const minKm = 5 * minFactor
    const maxKm = Math.max(minKm + 2.5, Math.max(14 * minFactor, distanceKm * 0.65))
    return roundToHalf(clamp(base * 0.6 * profile.qualityFactor, minKm, maxKm))
  }

  return roundToHalf(distanceKm)
}

function sessionPace(type: TrainingSession['type'], targetPace: number) {
  if (type === 'recovery') {
    return paceRange(targetPace, 0.45, 1.25)
  }
  if (type === 'easy' || type === 'long') {
    return paceRange(targetPace, 0.3, type === 'long' ? 1.1 : 0.95)
  }
  if (type === 'tempo') {
    return paceRange(targetPace, -0.12, 0.22)
  }
  if (type === 'interval') {
    return paceRange(targetPace, -0.7, 0.08)
  }

  return formatPace(targetPace)
}

function raceName(raceType: RaceType, distanceKm: number) {
  if (raceType === 'custom') {
    return `Custom race (${distanceKm} km)`
  }
  return RACE_LABELS[raceType]
}

export function generatePlan(form: PlannerForm): TrainingPlan {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const goalTimeMinutes = parseGoalTimeToMinutes(form.goalTime)
  if (!goalTimeMinutes || goalTimeMinutes <= 0) {
    throw new Error('Doeltijd is ongeldig. Gebruik formaat uu:mm of uu:mm:ss (bijv. 03:45).')
  }

  const safeCustomDistance = Number.isFinite(Number(form.customDistanceKm)) ? Number(form.customDistanceKm) : 10
  const safeTrainingWeeks = clamp(
    Number.isFinite(Number(form.trainingWeeks)) ? Math.round(Number(form.trainingWeeks)) : 16,
    2,
    52,
  )
  const safeDaysPerWeek = clamp(Number.isFinite(Number(form.daysPerWeek)) ? Math.round(Number(form.daysPerWeek)) : 4, 2, 7)

  const distanceKm = getDistanceKm(form.raceType, safeCustomDistance)
  const targetPaceMinPerKm = goalTimeMinutes / distanceKm

  let endDate: Date
  if (form.mode === 'date') {
    if (!form.raceDate) {
      throw new Error('Kies een wedstrijddatum of schakel over naar trainingsweken.')
    }
    if (!isValidISODate(form.raceDate)) {
      throw new Error('Wedstrijddatum is ongeldig. Kies een geldige datum.')
    }

    endDate = new Date(form.raceDate)
    endDate.setHours(0, 0, 0, 0)
    if (endDate <= today) {
      throw new Error('Wedstrijddatum moet na vandaag liggen.')
    }
  } else {
    endDate = addDays(today, safeTrainingWeeks * 7)
  }

  const startDate = today
  const totalWeeks = form.mode === 'weeks' ? safeTrainingWeeks : weeksBetween(startDate, endDate)
  const startMonday = startOfWeekMonday(startDate)
  const peakLong = getPeakLongRun(distanceKm, form.raceType)
  const initialLong = clamp(roundToHalf(peakLong * 0.55), 5, peakLong - 2)
  const taperWeeks = getTaperWeeks(form.raceType, distanceKm, totalWeeks)
  const buildWeeks = Math.max(1, totalWeeks - taperWeeks - 1)
  const raceLabel = raceName(form.raceType, roundToHalf(distanceKm))

  const sessionTypes = chooseSessionTypes(safeDaysPerWeek)
  const dayPattern = DAY_PATTERNS[safeDaysPerWeek]

  const weeks: TrainingWeek[] = []

  for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex += 1) {
    const weekNumber = weekIndex + 1
    const weekStart = addDays(startMonday, weekIndex * 7)
    const weekEnd = addDays(weekStart, 6)
    const weeksToRace = totalWeeks - weekNumber
    const phase = weekPhaseFor(weekNumber, totalWeeks, taperWeeks)
    const loadProfile = getWeekLoadProfile(phase, weeksToRace)
    const cappedBuildIndex = Math.min(weekIndex, buildWeeks - 1)
    const progression = buildWeeks <= 1 ? 1 : cappedBuildIndex / (buildWeeks - 1)
    const buildLongRun = initialLong + (peakLong - initialLong) * progression
    const longRunKm = roundToHalf(clamp(buildLongRun * loadProfile.longRunFactor, 4, peakLong))

    const sessions: TrainingSession[] = []

    sessionTypes.forEach((type, idx) => {
      const weekdayNumber = dayPattern[idx]
      const dayOffset = weekdayNumber === 0 ? 6 : weekdayNumber - 1
      const trainingDate = addDays(weekStart, dayOffset)

      if (trainingDate < startDate || trainingDate > endDate) {
        return
      }

      const adaptedType = sessionTypeForPhase(type, phase, weeksToRace)
      const distance = sessionDistance(adaptedType, longRunKm, distanceKm, loadProfile, phase)
      sessions.push({
        id: `${weekNumber}-${idx}-${adaptedType}`,
        dateISO: formatISO(trainingDate),
        weekday: WEEKDAY_NL[trainingDate.getDay()],
        title: sessionTitle(adaptedType),
        type: adaptedType,
        distanceKm: distance,
        pace: sessionPace(adaptedType, targetPaceMinPerKm),
        description: sessionDescription(adaptedType, distance, raceLabel),
      })
    })

    if (phase === 'race') {
      const raceDistance = roundToHalf(distanceKm)
      const raceDateISO = formatISO(endDate)
      const onRaceDaySessionIndex = sessions.findIndex((session) => session.dateISO === raceDateISO)

      if (onRaceDaySessionIndex >= 0) {
        sessions.splice(onRaceDaySessionIndex, 1)
      }

      sessions.push({
        id: `${weekNumber}-race`,
        dateISO: raceDateISO,
        weekday: WEEKDAY_NL[endDate.getDay()],
        title: `Wedstrijd: ${raceName(form.raceType, raceDistance)}`,
        type: 'race',
        distanceKm: raceDistance,
        pace: formatPace(targetPaceMinPerKm),
        description: sessionDescription('race', raceDistance, raceName(form.raceType, raceDistance)),
      })
    }

    sessions.sort((a, b) => a.dateISO.localeCompare(b.dateISO))

    const totalDistanceKm = roundToHalf(sessions.reduce((sum, session) => sum + session.distanceKm, 0))

    weeks.push({
      weekNumber,
      startDateISO: formatISO(weekStart),
      endDateISO: formatISO(weekEnd),
      focus: weeklyFocus(phase, weeksToRace),
      totalDistanceKm,
      sessions,
    })
  }

  return {
    raceLabel,
    distanceKm: roundToHalf(distanceKm),
    goalTimeMinutes,
    targetPaceMinPerKm,
    startDateISO: formatISO(startDate),
    endDateISO: formatISO(endDate),
    totalWeeks,
    daysPerWeek: safeDaysPerWeek,
    weeks,
  }
}

export function formatGoalTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = Math.floor(minutes % 60)
  const secs = Math.round((minutes % 1) * 60)
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function formatDateLong(dateISO: string) {
  if (!isValidISODate(dateISO)) {
    return 'Onbekende datum'
  }

  const date = new Date(dateISO)
  return new Intl.DateTimeFormat('nl-NL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatPaceValue(paceMinPerKm: number) {
  return formatPace(paceMinPerKm)
}
