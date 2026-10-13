// Observ'BF — fonctionnement hors ligne. Changez VERSION à chaque mise à jour publiée.
const VERSION = 'observbf-v3.1.0';
const ASSETS = ['./', './index.html', './css/app.css', './js/app.js', './js/draw.js', './js/qr.js', './lib/xlsx.full.min.js', './lib/qrcode.js', './lib/jsQR.js', './lib/zxing-reader.js', './lib/zxing_reader.wasm',
  './img/logo.webp', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png',
  './fonts/barlow-condensed-latin-600-normal.woff2', './fonts/barlow-condensed-latin-800-normal.woff2', './fonts/barlow-condensed-latin-800-italic.woff2',
  './fonts/barlow-latin-400-normal.woff2', './fonts/barlow-latin-600-normal.woff2', './fonts/barlow-latin-700-normal.woff2'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== VERSION).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // réseau d'abord (mises à jour), cache si hors ligne
  e.respondWith(fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; })
    .catch(() => caches.match(req, {ignoreSearch: true}).then(h => h || caches.match('./index.html'))));
});
