"use strict";
/* 탭 전환, 버튼 이벤트, 시작 */

/* ---------- 탭 ---------- */
const TABS=["today","week","target","howto","diet","habit"];
function showTab(id){
  if(!TABS.includes(id)) id="today";
  TABS.forEach(t=>{
    $(t).hidden=t!==id;
    $("tab-"+t).setAttribute("aria-selected",t===id?"true":"false");
  });
  if(id==="target") renderTarget();
  if(id==="week") renderWeek();
  try{history.replaceState(null,"","#"+id)}catch(e){}
}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{
  showTab(b.dataset.tab);
  // 아래로 스크롤된 상태에서 탭을 바꾸면 본문 맨 위로
  const top=document.querySelector("main").offsetTop-(getComputedStyle(document.querySelector("nav.tabs")).position==="fixed"?0:document.querySelector("nav.tabs").offsetHeight);
  if(window.scrollY>top) window.scrollTo(0,top);
}));

function renderAll(){
  renderKPIs();renderToday();
  if(!$("week").hidden) renderWeek();
  if(!$("target").hidden) renderTarget();
}

/* ---------- 날짜·주 이동 ---------- */
const todayOrStart=()=>TODAY<PREP0?PREP0:TODAY;
$("prevDay").addEventListener("click",()=>{if(cur>PREP0){cur=addDays(cur,-1);renderToday()}});
$("nextDay").addEventListener("click",()=>{cur=addDays(cur,1);renderToday()});
$("goToday").addEventListener("click",()=>{cur=todayOrStart();renderToday()});
$("prevWeek").addEventListener("click",()=>{if(viewWeek>1){viewWeek--;renderWeek()}});
$("nextWeek").addEventListener("click",()=>{if(viewWeek<36){viewWeek++;renderWeek()}});
$("thisWeek").addEventListener("click",()=>{const I=info(TODAY);viewWeek=I.prep?1:Math.min(36,I.week);renderWeek()});

/* ---------- 기록 ---------- */
const setStatus=t=>{$("storeStatus").textContent=t};
// 잠긴 기록을 수정 모드로 / 수정 취소
function startEdit(kind,focusId){Editing[kind]=cur;renderToday();const el=$(focusId);if(el){el.focus();el.select&&el.select()}}
function cancelEdit(kind){Editing[kind]=null;renderToday()}

function saveWeight(){
  const hasW=typeof (Store.get(cur)||{}).weight==="number";
  if(isLocked("weight",hasW)) return startEdit("weight","wInput");
  const raw=$("wInput").value.trim();
  if(raw===""){
    if(hasW){Editing.weight=null;Store.save(cur,{weight:undefined});setStatus("이 날의 체중 기록을 지웠습니다.")}
    else setStatus("체중을 입력해 주세요.");
    return;
  }
  const v=parseFloat(raw);
  if(!(v>=40&&v<=200)){setStatus("체중은 40~200 사이 숫자로 입력해 주세요.");return}
  Editing.weight=null;
  $("wInput").blur();
  Store.save(cur,{weight:Math.round(v*10)/10});
  setStatus(Store.isRemote()?"저장했습니다. 내 계정에 보관됩니다.":"저장했습니다. 이 브라우저에 보관됩니다.");
}
$("wSave").addEventListener("click",saveWeight);
$("wCancel").addEventListener("click",()=>{cancelEdit("weight");setStatus("수정을 취소했습니다.")});
$("wInput").addEventListener("keydown",e=>{
  if(e.key==="Enter"){e.preventDefault();saveWeight()}
  if(e.key==="Escape"&&Editing.weight===cur) cancelEdit("weight");
});
$("doneBtn").addEventListener("click",()=>{const L=Store.get(cur)||{};if(L.soccer===true)return;Store.save(cur,{done:!L.done})});
// 축구: true=다녀옴, false=일요일 안 감, null=기록 없음(다시 누르면 해제)
$("soccerBtn").addEventListener("click",()=>{const L=Store.get(cur)||{};Store.save(cur,{soccer:L.soccer===true?null:true})});
$("noSoccerBtn").addEventListener("click",()=>{const L=Store.get(cur)||{};Store.save(cur,{soccer:L.soccer===false?null:false})});

/* ---------- 측정 결과 ---------- */
$("metricsPanel").addEventListener("submit",e=>{
  e.preventDefault();
  if(isLocked("metrics",!!(Store.get(cur)||{}).metrics)){$("mStatus").textContent="";return startEdit("metrics","m_pullup")}
  const out={}, bad=[];
  METRICS.forEach(f=>{
    const raw=$("m_"+f.key).value.trim();
    if(raw==="") return;                       // 비운 항목은 저장하지 않음
    const v=Number(raw);
    if(!Number.isFinite(v)||v<f.min||v>f.max) bad.push(f.name+" "+f.min+"~"+f.max+f.unit);
    else out[f.key]=v;
  });
  if(bad.length){$("mStatus").textContent="범위를 확인하세요: "+bad.join(", ");return}
  Editing.metrics=null;
  if(document.activeElement) document.activeElement.blur();
  Store.save(cur,{metrics:out});
  $("mStatus").textContent=Object.keys(out).length?"저장했습니다. 다음 날부터 처방에 반영됩니다.":"측정 기록을 비웠습니다.";
});

$("mCancel").addEventListener("click",()=>{cancelEdit("metrics");$("mStatus").textContent="수정을 취소했습니다."});

/* ---------- 컨디션·통증 ---------- */
$("condBad").addEventListener("click",()=>{
  const c=Object.assign({pain:[]},(Store.get(cur)||{}).cond);
  Store.save(cur,{cond:{bad:!c.bad,pain:c.pain||[]}});
});
document.querySelectorAll("[data-pain]").forEach(btn=>btn.addEventListener("click",()=>{
  const c=Object.assign({bad:false,pain:[]},(Store.get(cur)||{}).cond), p=btn.dataset.pain;
  const pain=c.pain.includes(p)?c.pain.filter(x=>x!==p):c.pain.concat(p);
  Store.save(cur,{cond:{bad:!!c.bad,pain}});
}));

/* ---------- 세트 체크·타이머 ---------- */
$("sessBlocks").addEventListener("click",e=>{
  const chip=e.target.closest("[data-set]"), tbtn=e.target.closest("[data-timer]");
  if(chip){
    const i=+chip.dataset.set, k=+chip.dataset.k, b=todayBlocks[i];
    const total=b.circuit?b.rounds:b.sets, done=SetLog.get(cur,i);
    const next=k<done?k:k+1;                     // 체크된 칸을 누르면 그 칸부터 해제
    SetLog.set(cur,i,next);
    renderSession(sessionFor(cur,Store.get));
    if(next>done&&next<total){                  // 마지막 세트가 아니면 휴식 타이머
      const sec=b.circuit?90:restSecondsFor(b.ex);
      const name=(b.circuit?"서킷":((EX[b.ex]||{}).name||""))+" "+next+"/"+total+" 완료";
      Timer.start([{label:"휴식",sec,kind:"easy"}],name,{rest:true});
    }
  }
  if(tbtn){
    const b=todayBlocks[+tbtn.dataset.timer];
    Timer.start(parseRowTimer(b.text,b.note),"로잉 · "+b.text.replace(/\s*\(.*$/,""));
  }
});
$("timerPause").addEventListener("click",()=>Timer.togglePause());
$("timerNext").addEventListener("click",()=>Timer.next());
$("timerPlus").addEventListener("click",()=>Timer.plus(15));
$("timerStop").addEventListener("click",()=>Timer.stop());

/* ---------- 로그인 ---------- */
$("authForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const msg=$("authMsg");msg.textContent="로그인 중…";
  const {error}=await Store.signIn($("authEmailInput").value.trim(),$("authPw").value);
  msg.textContent=error?"로그인 실패: 이메일 또는 비밀번호를 확인하세요.":"";
  if(!error) $("authPw").value="";
});
$("logoutBtn").addEventListener("click",()=>Store.signOut());
function renderAuth(user){
  $("authBox").hidden=!Store.hasAuth();
  $("authForm").hidden=!!user;
  $("authUser").hidden=!user;
  $("authEmail").textContent=user?(user.email||""):"";
}

/* ---------- 화면 크기·날짜 변경 ---------- */
let resizeTimer=null;
window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!$("target").hidden)renderTarget()},200)});
// 자정을 넘겨 다시 열었을 때 '오늘'을 갱신
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState!=="visible") return;
  Timer.resume();
  const prev=TODAY;
  if(refreshToday()){
    if(cur===prev) cur=todayOrStart();   // 어제 '오늘'을 보고 있었다면 새 오늘로
    renderAll();
  }
});

/* ---------- 홈 화면 앱(PWA)·연결 상태 ---------- */
if("serviceWorker" in navigator&&(location.protocol==="https:"||["localhost","127.0.0.1"].includes(location.hostname))){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
let installPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("installBtn").hidden=false});
$("installBtn").addEventListener("click",async()=>{
  if(!installPrompt) return;
  installPrompt.prompt();
  try{await installPrompt.userChoice}catch(e){}
  installPrompt=null;$("installBtn").hidden=true;
});
window.addEventListener("online",()=>Store.retry());
window.addEventListener("offline",()=>setStatus("오프라인입니다. 기록은 이 기기에 저장해 두었다가 연결되면 올립니다."));

/* ---------- 시작 ---------- */
Store.on("change",renderAll);
Store.on("status",setStatus);
Store.on("auth",renderAuth);
renderPlanFacts();renderLibrary();renderDiet();renderRules();
const startTab=(location.hash||"").replace("#","");
showTab(TABS.includes(startTab)?startTab:"today");
renderAll();
window.scrollTo(0,0);
Store.init();
