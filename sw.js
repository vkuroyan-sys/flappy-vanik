const CACHE = "flappy-vanik-v10";
const ASSETS = ["./", "index.html", "manifest.webmanifest", "vanik.png", "title.png",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((a) => new Request(a, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const put = (req, res) => {
  if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
  return res;
};

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === location.origin;
  const font = url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com");
  if (!sameOrigin && !font) return;   // таблица рекордов и прочее — всегда напрямую в сеть

  // Страница — сначала сеть (чтобы обновления доходили сразу), офлайн — из кэша
  if (e.request.mode === "navigate" || (sameOrigin && (url.pathname.endsWith("/") || url.pathname.endsWith(".html")))) {
    // cache: "no-cache" — сверяемся с сервером, а не берём страницу из HTTP-кэша браузера (GitHub Pages даёт max-age=600)
    e.respondWith(fetch(url.href, { cache: "no-cache", credentials: "same-origin" }).then((res) => put(e.request, res))
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("index.html"))));
    return;
  }
  // Картинки и шрифты — из кэша, в фоне обновляем
  e.respondWith(caches.match(e.request).then((hit) => {
    const net = fetch(e.request).then((res) => put(e.request, res)).catch(() => hit);
    return hit || net;
  }));
});
