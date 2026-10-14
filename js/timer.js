"use strict";
/* 운동 타이머: 로잉 구간 타이머 + 세트 사이 휴식 타이머
 * - parseRowTimer(): 로잉 처방 문구 → 구간 목록 (순수 함수)
 * - restSecondsFor(): 운동별 세트 휴식 시간
 * - Timer: 화면 하단 타이머 막대 (시작·일시정지·다음·종료, 소리·진동·화면 켜짐 유지)
 * - SetLog: 오늘 세트 체크 상태 (이 브라우저에만 저장, 7일 지나면 정리)
 */

/* ---------- 구간 해석 ---------- */
const toSec=(n,u)=>Number(n)*(u==="분"?60:1);
const seg=(label,sec,kind)=>({label,sec,kind});   // kind: hard | easy | steady

function parseRowTimer(text,note){
  const t=String(text||""), n=String(note||"");
  let m;
  // 존2 3분 → 30초 강·30초 약 × 4 → 존2 3분 (피니셔 혼합형, 설명이 note에 있음)
  if((m=/존2 (\d+)분 → (\d+)초 강·(\d+)초 약 × (\d+) → 존2 (\d+)분/.exec(n))){
    const out=[seg("존2",toSec(m[1],"분"),"steady")];
    for(let i=0;i<+m[4];i++) out.push(seg("강하게",+m[2],"hard"),seg("천천히",+m[3],"easy"));
    out.push(seg("존2",toSec(m[5],"분"),"steady"));
    return out;
  }
  // 30초 강하게(...) + 90초 천천히 × 6회
  if((m=/(\d+)(초|분) 강하게[^+]*\+ (\d+)(초|분) 천천히 × (\d+)회/.exec(t))){
    const out=[];
    for(let i=0;i<+m[5];i++) out.push(seg("강하게",toSec(m[1],m[2]),"hard"),seg("천천히",toSec(m[3],m[4]),"easy"));
    return out;
  }
  // 3분 템포(...) + 1분 천천히 × 5회
  if((m=/(\d+)분 템포[^+]*\+ (\d+)분 천천히 × (\d+)회/.exec(t))){
    const out=[];
    for(let i=0;i<+m[3];i++) out.push(seg("템포",toSec(m[1],"분"),"hard"),seg("천천히",toSec(m[2],"분"),"easy"));
    return out;
  }
  // 1-2-3-2-1분 강하게 (사이 1분 천천히)
  if((m=/^([\d-]+)분 강하게 \(사이 (\d+)분 천천히\)/.exec(t))){
    const ups=m[1].split("-").map(Number), out=[];
    ups.forEach((u,i)=>{out.push(seg("강하게 "+u+"분",u*60,"hard"));if(i<ups.length-1)out.push(seg("천천히",toSec(m[2],"분"),"easy"))});
    return out;
  }
  // 단일 구간: 존2 N(~M)분, 워밍업·쿨다운, 기술 연습, 10분 최대 거리
  if((m=/(\d+)분 최대 거리/.exec(t))) return [seg("최대 거리",toSec(m[1],"분"),"hard")];
  if((m=/존2 (\d+)(?:~\d+)?분/.exec(t))) return [seg("존2",toSec(m[1],"분"),"steady")];
  if((m=/(워밍업|쿨다운) (\d+)분/.exec(t))) return [seg(m[1],toSec(m[2],"분"),"easy")];
  if((m=/기술 연습 (\d+)분/.exec(t))) return [seg("기술 연습",toSec(m[1],"분"),"easy")];
  return null;
}
const totalSec=segs=>segs.reduce((s,x)=>s+x.sec,0);

const PULL_EX=new Set(["pullup","chinup","negpull","scappull","deadhang"]);
const HOLD_EX=new Set(["plank","sideplank","hollow","wallsit"]);
function restSecondsFor(ex){
  if(PULL_EX.has(ex)) return 120;
  if(HOLD_EX.has(ex)) return 45;
  return 75;
}
const mmss=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};

/* ---------- 세트 체크 상태 ---------- */
const SetLog=(function(){
  const KEY="plan36-sets-v1";
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){return {}}};
  const write=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}};
  function prune(all){
    const cutoff=addDays(TODAY,-7);
    Object.keys(all).forEach(d=>{if(d<cutoff)delete all[d]});
    return all;
  }
  return {
    get:(date,i)=>((read()[date]||{})[i])||0,
    set(date,i,n){const all=prune(read());all[date]=all[date]||{};if(n>0)all[date][i]=n;else delete all[date][i];write(all)}
  };
})();

/* ---------- 타이머 막대 ---------- */
const Timer=(function(){
  let segs=[], idx=0, endAt=0, remainOnPause=null, title="", tick=null, wake=null, audio=null, lastBeep=null, onDone=null;

  function ensureAudio(){
    try{ if(!audio) audio=new (window.AudioContext||window.webkitAudioContext)(); if(audio.state==="suspended") audio.resume(); }catch(e){audio=null}
  }
  function beep(freq,ms,times=1){
    if(!audio) return;
    for(let k=0;k<times;k++){
      try{
        const o=audio.createOscillator(), g=audio.createGain(), t0=audio.currentTime+k*(ms/1000+0.08);
        o.frequency.value=freq; o.connect(g); g.connect(audio.destination);
        g.gain.setValueAtTime(0.25,t0); g.gain.exponentialRampToValueAtTime(0.001,t0+ms/1000);
        o.start(t0); o.stop(t0+ms/1000+0.02);
      }catch(e){}
    }
  }
  const vibrate=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
  async function keepAwake(){
    try{ if("wakeLock" in navigator&&!wake){ wake=await navigator.wakeLock.request("screen"); wake.addEventListener("release",()=>{wake=null}); } }catch(e){wake=null}
  }
  function releaseAwake(){try{wake&&wake.release()}catch(e){} wake=null}

  function cue(kind){
    if(kind==="hard"){beep(880,180,2);vibrate([120,80,120])}
    else{beep(523,250);vibrate(200)}
  }
  function startSeg(i){
    idx=i; endAt=Date.now()+segs[i].sec*1000; remainOnPause=null; lastBeep=null;
    cue(segs[i].kind); render();
  }
  function finish(){
    clearInterval(tick); tick=null; releaseAwake();
    beep(660,500); vibrate([300,100,300]);
    $("timerLabel").textContent="완료";
    $("timerTime").textContent="0:00";
    $("timerSub").textContent=title;
    $("timerPause").hidden=true; $("timerNext").hidden=true; $("timerPlus").hidden=true;
    const cb=onDone; onDone=null; if(cb) cb();
    setTimeout(()=>{ if(!tick) hide(); },4000);
  }
  function loop(){
    if(remainOnPause!=null) return;
    const left=(endAt-Date.now())/1000;
    // 끝나기 3·2·1초 전 짧은 소리
    const whole=Math.ceil(left);
    if(whole<=3&&whole>=1&&lastBeep!==whole){lastBeep=whole;beep(440,90)}
    if(left<=0){ if(idx+1<segs.length) startSeg(idx+1); else return finish(); }
    render();
  }
  function render(){
    const s=segs[idx]; if(!s) return;
    const left=remainOnPause!=null?remainOnPause:(endAt-Date.now())/1000;
    const bar=$("timerBar");
    bar.dataset.kind=s.kind;
    $("timerLabel").textContent=s.label;
    $("timerTime").textContent=mmss(left);
    const rest=totalSec(segs.slice(idx+1))+Math.max(0,left);
    $("timerSub").textContent=title+(segs.length>1?" · "+(idx+1)+"/"+segs.length+" 구간 · 남은 전체 "+mmss(rest):"");
    $("timerPause").textContent=remainOnPause!=null?"계속":"일시정지";
    $("timerProg").style.width=(100*(1-Math.max(0,left)/s.sec))+"%";
  }
  function show(){$("timerBar").hidden=false;document.body.classList.add("timer-on")}
  function hide(){$("timerBar").hidden=true;document.body.classList.remove("timer-on")}

  return {
    // segments: [{label,sec,kind}], name: 막대에 표시할 이름, opts.rest: 휴식 타이머(+15초 버튼 표시)
    start(segments,name,opts={}){
      if(!segments||!segments.length) return;
      ensureAudio(); keepAwake();
      segs=segments; title=name||""; onDone=opts.onDone||null;
      $("timerPause").hidden=false; $("timerNext").hidden=!!opts.rest||segments.length<2; $("timerPlus").hidden=!opts.rest;
      show(); clearInterval(tick); tick=setInterval(loop,200); startSeg(0);
    },
    togglePause(){
      if(!tick) return;
      if(remainOnPause==null){remainOnPause=Math.max(0,(endAt-Date.now())/1000)}
      else{endAt=Date.now()+remainOnPause*1000;remainOnPause=null}
      render();
    },
    next(){ if(!tick) return; if(idx+1<segs.length) startSeg(idx+1); else finish(); },
    plus(sec){ if(!tick) return; if(remainOnPause!=null) remainOnPause+=sec; else endAt+=sec*1000; render(); },
    stop(){ clearInterval(tick); tick=null; onDone=null; releaseAwake(); hide(); },
    // 탭을 다시 열었을 때 화면 켜짐 유지 재요청
    resume(){ if(tick){ keepAwake(); render(); } }
  };
})();
