/* 오프라인용 서비스 워커
 * - 앱 파일(같은 주소): 네트워크 우선 → 실패하면 저장본. 배포하면 다음 접속 때 바로 새 버전.
 * - 외부 라이브러리·폰트: 저장본 우선, 뒤에서 갱신.
 * - Supabase API 요청은 건드리지 않음 (기록 동기화는 앱이 직접 처리).
 * 파일을 추가·삭제하면 VERSION을 올리세요.
 */
const VERSION="plan36-v3";
const SHELL=[
  "./","index.html","config.js","manifest.webmanifest","css/style.css",
  "js/util.js","js/data.js","js/plan.js","js/adapt.js","js/condition.js","js/session.js",
  "js/store.js","js/timer.js","js/ui.js","js/main.js",
  "icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/apple-touch-icon.png"
];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET") return;
  const url=new URL(req.url);
  if(url.hostname.endsWith("supabase.co")) return;            // 데이터 요청은 통과
  if(url.origin===location.origin){
    e.respondWith(
      fetch(req).then(res=>{
        if(res.ok){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy))}
        return res;
      }).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||(req.mode==="navigate"?caches.match("index.html"):undefined)))
    );
    return;
  }
  // 외부(라이브러리 CDN, 구글 폰트): 저장본 우선 + 뒤에서 갱신
  e.respondWith(
    caches.open(VERSION).then(c=>c.match(req).then(hit=>{
      const net=fetch(req).then(res=>{if(res&&(res.ok||res.type==="opaque"))c.put(req,res.clone());return res}).catch(()=>hit);
      return hit||net;
    }))
  );
});
