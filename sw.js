// RenoReviews.ca service worker: cache-first for the app shell and tools, network-first for HTML so republishes show up.
const V = 'rr-v1'
const ROOT = '/renoreviews-mockup/'
const SHELL = [ROOT, ROOT+'app.js', ROOT+'tools.js', ROOT+'tools/', ROOT+'tools/estimate.html', ROOT+'tools/quote-check.html', ROOT+'tools/checklist.html', ROOT+'tools/funding.html', ROOT+'tools/permit.html', ROOT+'data/companies.json']
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())) })
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())) })
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); return r }).catch(() => caches.match(e.request).then(m => m || caches.match(ROOT))))
})
