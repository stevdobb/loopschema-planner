import type { AppLocale } from '@/types/planner'

export const SUPPORTED_LOCALES: AppLocale[] = ['nl', 'en', 'fr']
export const DEFAULT_LOCALE: AppLocale = 'nl'

function stripSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '')
}

function baseSegments() {
  const base = typeof import.meta !== 'undefined' ? import.meta.env.BASE_URL || '/' : '/'
  return stripSlashes(base).split('/').filter(Boolean)
}

function hasLocaleSegment(segment: string) {
  return SUPPORTED_LOCALES.includes(segment as AppLocale)
}

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return Boolean(value && SUPPORTED_LOCALES.includes(value as AppLocale))
}

export function getLocaleFromUrl(): AppLocale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE
  }

  const parts = window.location.pathname.split('/').filter(Boolean)
  const base = baseSegments()
  const idx = base.length
  const possibleLocale = parts[idx]
  return isAppLocale(possibleLocale) ? possibleLocale : DEFAULT_LOCALE
}

export function syncLocaleInUrl(locale: AppLocale, replace = false) {
  if (typeof window === 'undefined') {
    return
  }

  const url = new URL(window.location.href)
  const allParts = url.pathname.split('/').filter(Boolean)
  const base = baseSegments()

  const tail = allParts.slice(base.length)
  if (hasLocaleSegment(tail[0] || '')) {
    tail[0] = locale
  } else {
    tail.unshift(locale)
  }

  const nextPath = `/${[...base, ...tail].join('/')}`.replace(/\/+/g, '/')
  if (nextPath === url.pathname) {
    return
  }

  if (replace) {
    window.history.replaceState({}, '', `${nextPath}${url.search}${url.hash}`)
  } else {
    window.history.pushState({}, '', `${nextPath}${url.search}${url.hash}`)
  }
}
