const CACHE="bolkhata-v8";
const CORE=["./","index.html","css/tokens.css","css/style.css","js/catalog.js","js/parser.js","js/store.js","js/speech.js","js/scanner.js","js/reports.js","js/app.js"];
self.addEventListener("install",e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting())); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET"||e.request.url.includes("/api/")) return;
  e.respondWith(
    fetch(e.request).then(r=>{ const c=r.clone(); caches.open(CACHE).then(x=>x.put(e.request,c)).catch(()=>{}); return r; })
    .catch(()=>caches.match(e.request).then(m=>m||caches.match("./index.html")))
  );
});
