/* Service worker – Vân Nguyệt Các. Đổi V khi muốn ép xóa cache cũ. */
const V = 'vnc-v38';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './loading.webp', './mods/mod-core.js', './mods/mod-store.js', './mods/mod-ui.js', './mobile.js', './extras.js'];
const CDN = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com'];

/* Thư viện vật lý (Rigid body): tải sẵn ngay lần đầu để dùng offline mà không cần bật "Rigid" khi có mạng. */
const RB_BASES = ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/', 'https://unpkg.com/three@0.128.0/examples/js/'];
const RB_FILES = ['libs/ammo.wasm.js', 'libs/ammo.wasm.wasm', 'animation/MMDPhysics.js'];

async function precacheRB(c) {
  for (const b of RB_BASES) {
    const ok = await Promise.all(RB_FILES.map(f => fetch(b + f, { mode: 'cors' })
      .then(n => (n && n.ok ? c.put(b + f, n.clone()).then(() => true) : false))
      .catch(() => false)));
    if (ok.every(Boolean)) return; // đủ bộ từ CDN này thì không cần thử CDN dự phòng
  }
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u))).then(() => precacheRB(c)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function navFetch(r) {
  const c = await caches.open(V);
  try {
    const n = await Promise.race([fetch(r), new Promise((_, j) => setTimeout(j, 4000))]);
    if (n && n.ok) c.put('./index.html', n.clone());
    return n;
  } catch (_) {
    return (await c.match('./index.html')) || (await c.match('./')) || Response.error();
  }
}

async function cacheFirst(r) {
  const c = await caches.open(V);
  const m = await c.match(r);
  if (m) return m;
  const n = await fetch(r);
  if (n && (n.ok || n.type === 'opaque')) c.put(r, n.clone());
  return n;
}

async function swr(r) {
  const c = await caches.open(V);
  const m = await c.match(r);
  const p = fetch(r).then(n => { if (n && n.ok) c.put(r, n.clone()); return n; }).catch(() => m || Response.error());
  return m || p;
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (r.mode === 'navigate') { e.respondWith(navFetch(r)); return; }
  if (CDN.includes(u.hostname)) { e.respondWith(cacheFirst(r)); return; }
  if (u.origin === location.origin) { e.respondWith(swr(r)); }
  /* translate.googleapis.com và các nguồn khác: để mạng xử lý, không cache */
});
