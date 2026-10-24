// ponytail: stale-while-revalidate; abre al instante sin señal y cada versión nueva se ve en la siguiente apertura
self.addEventListener('fetch', e => {
  if (e.request.method != 'GET') return
  const net = fetch(e.request).then(async r => {
    if (r.ok) await (await caches.open('lm')).put(e.request, r.clone())
    return r
  })
  e.waitUntil(net.catch(() => {}))
  e.respondWith(caches.match(e.request).then(hit => hit || net))
})
