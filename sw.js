/* My Notes 서비스 워커 — 화면을 고쳐 올릴 때마다 VERSION을 올리세요 (mynotes-v2, v3 …) */
const VERSION = "mynotes-v3";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png"];
const XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)));
});
self.addEventListener("message", e => { if (e.data === "skip") self.skipWaiting(); });
self.addEventListener("activate", e => {
  // 같은 dh-life.github.io의 다른 앱(영어 노트·가계부) 캐시는 건드리지 않음: mynotes- 로 시작하는 것만 정리
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("mynotes-") && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;                       // 구글 시트로 보내는 POST는 그대로 통과
  const url = new URL(req.url);
  if (req.url === XLSX_URL || (url.origin === location.origin && url.pathname.includes("/icons/"))) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {   // 저장본 우선
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  const scope = new URL(self.registration.scope);
  if (url.origin !== location.origin || !url.pathname.startsWith(scope.pathname)) return;
  e.respondWith((async () => {                            // 화면은 인터넷 우선, 4초 넘으면 저장본
    const cache = await caches.open(VERSION);
    const key = req.mode === "navigate" ? "./index.html" : req;
    const net = fetch(req).then(res => { if (res.ok) cache.put(key, res.clone()); return res; });
    const timeout = new Promise(r => setTimeout(r, 4000));
    try {
      const res = await Promise.race([net, timeout]);
      if (res) return res;
    } catch (err) {}
    const hit = await cache.match(key, { ignoreSearch: true });
    if (hit) return hit;
    return net;
  })());
});
