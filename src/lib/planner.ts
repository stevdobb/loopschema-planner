import type { AppLocale, PlannerForm, RaceType, TrainingPlan, TrainingSession, TrainingWeek } from '@/types/planner'

const WEEKDAY_LABELS: Record<AppLocale, readonly string[]> = {
  nl: ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
}

const DAY_PATTERNS: Record<number, number[]> = {
  2: [2, 6],
  3: [1, 3, 6],
  4: [1, 2, 4, 6],
  5: [1, 2, 3, 4, 6],
  6: [0, 1, 2, 3, 4, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
}

const RACE_LABELS: Record<AppLocale, Record<RaceType, string>> = {
  nl: {
    marathon: 'Marathon',
    'half-marathon': 'Halve Marathon',
    '10k': '10 km',
    '5k': '5 km',
    custom: 'Eigen afstand',
  },
  en: {
    marathon: 'Marathon',
    'half-marathon': 'Half Marathon',
    '10k': '10 km',
    '5k': '5 km',
    custom: 'Custom distance',
  },
  fr: {
    marathon: 'Marathon',
    'half-marathon': 'Semi-marathon',
    '10k': '10 km',
    '5k': '5 km',
    custom: 'Distance personnalisee',
  },
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

function weeklyFocus(phase: WeekPhase, weeksToRace: number, locale: AppLocale) {
  if (locale === 'en') {
    if (phase === 'race') {
      return 'Race week: sharply reduce volume, keep legs fresh, and arrive at the start with confidence.'
    }
    if (phase === 'taper') {
      if (weeksToRace <= 1) {
        return 'Final taper week: short and light stimuli with plenty of recovery so you start fully rested.'
      }
      if (weeksToRace === 2) {
        return 'Taper week: clearly cut volume, keep quality short, and prioritize recovery.'
      }
      return 'Early taper: controlled reduction in training load while keeping rhythm.'
    }
    if (phase === 'recovery') {
      return 'Recovery week: lower volume so you can come back stronger.'
    }
    if (phase === 'peak') {
      return 'Peak block: race-specific sessions with controlled high load.'
    }
    if (phase === 'base') {
      return 'Build the base: easy kilometers, technique, and consistent routine.'
    }
    return 'Build phase: more quality around tempo and interval with gradual volume increase.'
  }

  if (locale === 'fr') {
    if (phase === 'race') {
      return "Semaine de course: reduis fortement le volume, garde des jambes fraiches et arrive confiant au depart."
    }
    if (phase === 'taper') {
      if (weeksToRace <= 1) {
        return "Derniere semaine d'affutage: stimuli courts et legers avec beaucoup de recuperation pour arriver repose."
      }
      if (weeksToRace === 2) {
        return "Semaine d'affutage: reduis clairement le volume, garde la qualite courte et priorise la recuperation."
      }
      return 'Affutage precoce: baisse controlee de la charge tout en gardant le rythme.'
    }
    if (phase === 'recovery') {
      return 'Semaine de recuperation: moins de volume pour revenir plus fort.'
    }
    if (phase === 'peak') {
      return "Bloc de pic: seances specifiques course avec une charge elevee controlee."
    }
    if (phase === 'base') {
      return 'Construction de base: kilometres faciles, technique et regularite.'
    }
    return 'Phase de progression: plus de qualite tempo et intervalle avec hausse graduelle du volume.'
  }

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

function sessionDescription(type: TrainingSession['type'], distanceKm: number, raceLabel: string, locale: AppLocale) {
  if (locale === 'en') {
    if (type === 'easy') {
      return `Easy run of ${distanceKm} km. Keep a conversational pace and focus on relaxed form, cadence, and breathing.`
    }
    if (type === 'recovery') {
      return `Recovery run of ${distanceKm} km. Run very easy, keep heart rate low, and actively recover from harder workouts.`
    }
    if (type === 'tempo') {
      return `Tempo workout of ${distanceKm} km including warm-up and cool-down. Run the core near target race pace to improve lactate tolerance.`
    }
    if (type === 'interval') {
      return `Interval session totaling ${distanceKm} km. Start with 10-15 min warm-up, then short faster repeats with easy recoveries.`
    }
    if (type === 'long') {
      return `Long run of ${distanceKm} km. Practice your fueling plan and keep the pace controlled to build endurance.`
    }
    return `${raceLabel} race day. Start controlled, hold steady pacing, and finish stronger if you still have energy left.`
  }

  if (locale === 'fr') {
    if (type === 'easy') {
      return `Sortie facile de ${distanceKm} km. Reste en aisance respiratoire et travaille la foullee, la cadence et la respiration.`
    }
    if (type === 'recovery') {
      return `Sortie recuperation de ${distanceKm} km. Cours tres doucement, garde une frequence cardiaque basse et recupere activement.`
    }
    if (type === 'tempo') {
      return `Seance tempo de ${distanceKm} km avec echauffement et retour au calme. Le bloc principal est proche de l'allure cible course.`
    }
    if (type === 'interval') {
      return `Seance fractionnee de ${distanceKm} km au total. Commence par 10-15 min d'echauffement puis des repetitions rapides avec recuperation facile.`
    }
    if (type === 'long') {
      return `Sortie longue de ${distanceKm} km. Teste ton plan d'hydratation/alimentation et garde une allure controlee pour l'endurance.`
    }
    return `Jour de course ${raceLabel}. Pars prudemment, garde un rythme regulier et accelere a la fin si tu en as encore.`
  }

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

function sessionTitle(type: TrainingSession['type'], locale: AppLocale) {
  if (locale === 'en') {
    if (type === 'easy') return 'Easy run'
    if (type === 'recovery') return 'Recovery run'
    if (type === 'tempo') return 'Tempo run'
    if (type === 'interval') return 'Interval training'
    if (type === 'long') return 'Long run'
    return 'Race'
  }

  if (locale === 'fr') {
    if (type === 'easy') return 'Sortie facile'
    if (type === 'recovery') return 'Sortie recuperation'
    if (type === 'tempo') return 'Tempo'
    if (type === 'interval') return 'Fractionne'
    if (type === 'long') return 'Sortie longue'
    return 'Course'
  }

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

function raceName(raceType: RaceType, distanceKm: number, locale: AppLocale) {
  if (raceType === 'custom') {
    if (locale === 'en') return `Custom race (${distanceKm} km)`
    if (locale === 'fr') return `Course personnalisee (${distanceKm} km)`
    return `Eigen wedstrijd (${distanceKm} km)`
  }
  return RACE_LABELS[locale][raceType]
}

export function generatePlan(form: PlannerForm, locale: AppLocale = 'nl'): TrainingPlan {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = today
  const startMonday = startOfWeekMonday(startDate)

  const goalTimeMinutes = parseGoalTimeToMinutes(form.goalTime)
  if (!goalTimeMinutes || goalTimeMinutes <= 0) {
    if (locale === 'en') {
      throw new Error('Goal time is invalid. Use format hh:mm or hh:mm:ss (e.g. 03:45).')
    }
    if (locale === 'fr') {
      throw new Error("Le temps objectif est invalide. Utilise le format hh:mm ou hh:mm:ss (ex. 03:45).")
    }
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
  let totalWeeks: number
  if (form.mode === 'date') {
    if (!form.raceDate) {
      if (locale === 'en') throw new Error('Choose a race date or switch to training weeks.')
      if (locale === 'fr') throw new Error('Choisis une date de course ou passe en mode semaines.')
      throw new Error('Kies een wedstrijddatum of schakel over naar trainingsweken.')
    }
    if (!isValidISODate(form.raceDate)) {
      if (locale === 'en') throw new Error('Race date is invalid. Choose a valid date.')
      if (locale === 'fr') throw new Error('La date de course est invalide. Choisis une date valide.')
      throw new Error('Wedstrijddatum is ongeldig. Kies een geldige datum.')
    }

    endDate = new Date(form.raceDate)
    endDate.setHours(0, 0, 0, 0)
    if (endDate <= today) {
      if (locale === 'en') throw new Error('Race date must be after today.')
      if (locale === 'fr') throw new Error("La date de course doit etre apres aujourd'hui.")
      throw new Error('Wedstrijddatum moet na vandaag liggen.')
    }

    const weekMs = 1000 * 60 * 60 * 24 * 7
    const diffMs = endDate.getTime() - startMonday.getTime()
    totalWeeks = clamp(Math.floor(diffMs / weekMs) + 1, 2, 52)
  } else {
    totalWeeks = safeTrainingWeeks
    endDate = addDays(startMonday, totalWeeks * 7 - 1)
  }

  const peakLong = getPeakLongRun(distanceKm, form.raceType)
  const initialLong = clamp(roundToHalf(peakLong * 0.55), 5, peakLong - 2)
  const taperWeeks = getTaperWeeks(form.raceType, distanceKm, totalWeeks)
  const buildWeeks = Math.max(1, totalWeeks - taperWeeks - 1)
  const raceLabel = raceName(form.raceType, roundToHalf(distanceKm), locale)

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
        weekday: WEEKDAY_LABELS[locale][trainingDate.getDay()],
        title: sessionTitle(adaptedType, locale),
        type: adaptedType,
        status: 'planned',
        distanceKm: distance,
        pace: sessionPace(adaptedType, targetPaceMinPerKm),
        description: sessionDescription(adaptedType, distance, raceLabel, locale),
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
        weekday: WEEKDAY_LABELS[locale][endDate.getDay()],
        title: locale === 'en' ? `Race: ${raceName(form.raceType, raceDistance, locale)}` : locale === 'fr' ? `Course: ${raceName(form.raceType, raceDistance, locale)}` : `Wedstrijd: ${raceName(form.raceType, raceDistance, locale)}`,
        type: 'race',
        status: 'planned',
        distanceKm: raceDistance,
        pace: formatPace(targetPaceMinPerKm),
        description: sessionDescription('race', raceDistance, raceName(form.raceType, raceDistance, locale), locale),
      })
    }

    sessions.sort((a, b) => a.dateISO.localeCompare(b.dateISO))

    const totalDistanceKm = roundToHalf(sessions.reduce((sum, session) => sum + session.distanceKm, 0))

    weeks.push({
      weekNumber,
      startDateISO: formatISO(weekStart),
      endDateISO: formatISO(weekEnd),
      focus: weeklyFocus(phase, weeksToRace, locale),
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

export function formatDateLong(dateISO: string, locale: AppLocale = 'nl') {
  if (!isValidISODate(dateISO)) {
    if (locale === 'en') return 'Unknown date'
    if (locale === 'fr') return 'Date inconnue'
    return 'Onbekende datum'
  }

  const date = new Date(dateISO)
  const localeTag = locale === 'en' ? 'en-GB' : locale === 'fr' ? 'fr-FR' : 'nl-NL'
  return new Intl.DateTimeFormat(localeTag, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatPaceValue(paceMinPerKm: number) {
  return formatPace(paceMinPerKm)
}
