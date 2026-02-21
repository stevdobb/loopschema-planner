const CACHE_NAME = 'loopschema-planner-v2'
const APP_SHELL_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './pwa-icon.svg',
  './share-card.svg',
  './404.html',
]

function isSameOrigin(requestUrl) {
  return requestUrl.origin === self.location.origin
}

function isNavigationRequest(request) {
  return request.mode === 'navigate'
}

function isStaticAssetRequest(requestUrl, request) {
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'font' || request.destination === 'image') {
    return true
  }
  return requestUrl.pathname.includes('/assets/')
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_CACHE)).catch(() => undefined),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(request.url)
  if (!isSameOrigin(requestUrl)) {
    return
  }

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', cloned)).catch(() => undefined)
          return response
        })
        .catch(async () => {
          const cached = await caches.match('./index.html')
          return cached || Response.error()
        }),
    )
    return
  }

  if (!isStaticAssetRequest(requestUrl, request)) {
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }
        const cloned = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned)).catch(() => undefined)
        return response
      })
    }),
  )
})
