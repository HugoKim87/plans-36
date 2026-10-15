/* 오프라인용 서비스 워커
 * - 앱 파일(같은 주소): 네트워크 우선, 단 3초 안에 응답이 없거나 실패하면 저장본 (신호가 약해도 화면이 바로 뜨게)
 * - 외부(Supabase 라이브러리 CDN, 구글 폰트): 저장본 우선, 뒤에서 갱신
 * - Supabase 데이터 요청은 건드리지 않음 (기록 동기화는 앱이 직접 처리)
 * - 설치 때 파일을 하나씩 저장 → 일부 파일을 못 받아도 나머지는 오프라인에서 열림
 * 파일을 추가·삭제하거나 index.html의 라이브러리 주소를 바꾸면 VERSION과 아래 목록을 함께 고치세요.
 */
const VERSION="plan36-v6";
const SHELL=[
  "./","index.html","config.js","manifest.webmanifest","css/style.css",
  "js/util.js","js/data.js","js/plan.js","js/adapt.js","js/condition.js","js/session.js","js/diet.js",
  "js/store.js","js/timer.js","js/ui.js","js/main.js",
  "icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/apple-touch-icon.png"
];
const EXTERNAL=["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"];
const NET_TIMEOUT=3000;

self.addEventListener("install",e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(VERSION);
    await Promise.allSettled(SHELL.map(u=>c.add(new Request(u,{cache:"reload"}))));
    await Promise.allSettled(EXTERNAL.map(async u=>{
      const res=await fetch(new Request(u,{mode:"no-cors"}));
      if(res&&(res.ok||res.type==="opaque")) await c.put(u,res);
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

function fromCache(req){
  return caches.match(req,{ignoreSearch:true}).then(r=>r||(req.mode==="navigate"?caches.match("index.html"):undefined));
}
// 한 번 느리거나 끊겼다고 판단하면 30초 동안은 나머지 파일도 기다리지 않고 저장본 사용 (뒤에서 갱신)
let degradedUntil=0;
const markDegraded=()=>{degradedUntil=Date.now()+30000};
function update(req){
  return fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy))}return res});
}
function networkFirst(req){
  if(Date.now()<degradedUntil){
    return fromCache(req).then(hit=>{
      const net=update(req).then(r=>{degradedUntil=0;return r}).catch(()=>{markDegraded();return Response.error()});
      return hit||net;
    });
  }
  return new Promise(resolve=>{
    let done=false;
    const fallback=()=>fromCache(req).then(r=>{if(!done&&r){done=true;markDegraded();resolve(r)}return r});
    const timer=setTimeout(fallback,NET_TIMEOUT);              // 3초 지나면 저장본으로
    fetch(req).then(res=>{
      clearTimeout(timer);
      if(res.ok){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy))}
      if(!done){done=true;resolve(res)}
    }).catch(()=>{
      clearTimeout(timer);markDegraded();
      fallback().then(r=>{if(!done){done=true;resolve(r||Response.error())}});
    });
  });
}

self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET") return;
  const url=new URL(req.url);
  if(url.hostname.endsWith("supabase.co")) return;
  if(url.origin===location.origin){e.respondWith(networkFirst(req));return}
  e.respondWith(
    caches.open(VERSION).then(c=>c.match(req,{ignoreVary:true}).then(hit=>{
      const net=fetch(req).then(res=>{if(res&&(res.ok||res.type==="opaque"))c.put(req,res.clone());return res}).catch(()=>hit||Response.error());
      return hit||net;
    }))
  );
});
