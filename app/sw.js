// Growth service worker. Кэш приложения + офлайн + самообновление.
// При изменении статики (шрифты/иконки/vendor) — поднять версию кэша.
const CACHE = "growth-v2";
const SHELL = [
  "./", "./index.html", "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "./fonts/fonts.css",
  "./fonts/hanken-grotesk-latin-wght-normal.woff2",
  "./fonts/hanken-grotesk-latin-ext-wght-normal.woff2",
  "./fonts/hanken-grotesk-cyrillic-ext-wght-normal.woff2",
  "./fonts/jetbrains-mono-latin-wght-normal.woff2",
  "./fonts/jetbrains-mono-latin-ext-wght-normal.woff2",
  "./fonts/jetbrains-mono-cyrillic-wght-normal.woff2",
  "./fonts/jetbrains-mono-cyrillic-ext-wght-normal.woff2",
  "./vendor/js-yaml.min.js",
  "./vendor/marked.min.js",
  // CSS
  "./css/tokens.css",
  "./css/base.css",
  "./css/components.css",
  "./css/app.css",
  "./css/kinds/vocabulary.css",
  "./css/kinds/doc.css",
  "./css/kinds/roadmap.css",
  "./css/kinds/tasks.css",
  "./css/kinds/sport.css",
  // JS
  "./js/main.js",
  "./js/boot.js",
  "./js/pwa.js",
  "./js/app.js",
  "./js/core/state.js",
  "./js/core/vendor.js",
  "./js/core/conn.js",
  "./js/core/dav.js",
  "./js/core/config.js",
  "./js/core/md.js",
  "./js/core/theme.js",
  "./js/core/dates.js",
  "./js/ui/dom.js",
  "./js/ui/modal.js",
  "./js/ui/files.js",
  "./js/kinds/vocabulary.js",
  "./js/kinds/doc.js",
  "./js/kinds/notes.js",
  "./js/kinds/checklist.js",
  "./js/kinds/roadmap.js",
  "./js/kinds/doclist.js",
  "./js/kinds/fallback.js",
  "./js/kinds/tasks.js",
  "./js/kinds/sport.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                       // запись на WebDAV не трогаем
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // запросы к воркеру/Mail.ru — всегда сеть

  // навигация и index.html — network-first, чтобы обновления доезжали; офлайн — из кэша
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")) {
    e.respondWith(
      fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
                .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // прочая статика (шрифты, vendor, иконки) — cache-first
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    }))
  );
});
