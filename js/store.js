"use strict";
/* 기록 저장소: 브라우저(localStorage) + Supabase(로그인 시)
 *
 * - 모든 기록은 먼저 브라우저에 저장하고, 로그인 상태면 Supabase에도 올린다.
 * - Supabase가 설정돼 있으면 저장한 날짜를 항상 '미전송' 목록에 넣고, 서버에 올라가면 뺀다.
 *   오프라인으로 앱을 연 경우에도 기록은 이 기기에 쌓였다가 연결되면 올라간다.
 * - 서버 기록을 불러올 때 미전송 날짜는 이 기기 값을 우선한다 (서버 값으로 덮어쓰지 않음).
 * - 연결 복구·앱 다시 열기·30초마다(밀린 기록이 있을 때) sync()로 다시 시도한다.
 * - 기록 형태: { "2026-10-19": { weight, done, soccer: true|false|null,
 *                                metrics: {pullup,pushup,plank,row10,waist}, cond: {bad, pain:[...]},
 *                                meals: {s:{끼니:기록}, x:[추가 음식]} } }   (식단 형태는 diet.js 참고)
 */
const Store=(function(){
  const LKEY="plan36-log-v1", DIRTY_KEY="plan36-dirty-v1", TABLE="workout_log";
  const CFG=window.PLAN36_CONFIG||{};
  const configured=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey);
  // mode: local(설정 없음·로그인 안 함) | offline(로그인했지만 서버 연결 안 됨) | remote(서버와 동기화 중)
  let logs={}, mode="local", sb=null, user=null, chain=Promise.resolve(), syncing=null;
  const OFFLINE_MSG="오프라인입니다. 기록은 이 기기에 저장해 두었다가 연결되면 자동으로 올립니다.";
  const NO_SERVER_MSG="서버에 연결하지 못했습니다. 이 기기에 저장해 두었다가 연결되면 자동으로 올립니다.";
  const offlineMsg=()=>navigator.onLine===false?OFFLINE_MSG:NO_SERVER_MSG;
  const listeners={change:[],status:[],auth:[]};
  const emit=(ev,arg)=>listeners[ev].forEach(fn=>fn(arg));

  /* --- 브라우저 저장 --- */
  const readJSON=(k,def)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):def}catch(e){return def}};
  const writeJSON=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  const dirty=()=>new Set(readJSON(DIRTY_KEY,[]));
  const hasMeals=m=>!!(m&&(Object.keys(m.s||{}).length||(m.x||[]).length));
  const setDirty=set=>writeJSON(DIRTY_KEY,[...set]);

  /* --- 행 변환 --- */
  const toRow=(date,v)=>({user_id:user.id,date,
    weight:typeof v.weight==="number"?v.weight:null,
    done:!!v.done,
    soccer:typeof v.soccer==="boolean"?v.soccer:null,
    metrics:v.metrics&&Object.keys(v.metrics).length?v.metrics:null,
    cond:v.cond&&(v.cond.bad||(v.cond.pain||[]).length)?v.cond:null,
    meals:hasMeals(v.meals)?v.meals:null});
  const fromRow=r=>({weight:r.weight==null?undefined:Number(r.weight),done:!!r.done,
    soccer:typeof r.soccer==="boolean"?r.soccer:undefined,
    metrics:r.metrics&&typeof r.metrics==="object"?r.metrics:undefined,
    cond:r.cond&&typeof r.cond==="object"?r.cond:undefined,
    meals:r.meals&&typeof r.meals==="object"?r.meals:undefined});

  function setStatus(t){emit("status",t)}

  async function pushDates(dates){
    if(!sb||!user||!dates.length) return true;
    const rows=dates.filter(d=>logs[d]).map(d=>toRow(d,logs[d]));
    const {error}=await sb.from(TABLE).upsert(rows,{onConflict:"user_id,date"});
    if(error){
      setStatus(navigator.onLine===false?OFFLINE_MSG:"서버 저장 실패 (이 기기에는 저장됨, 잠시 후 다시 올립니다): "+error.message);
      return false;
    }
    const set=dirty();dates.forEach(d=>set.delete(d));setDirty(set);
    return true;
  }

  async function loadRemote(){
    const {data,error}=await sb.from(TABLE).select("date,weight,done,soccer,metrics,cond,meals").order("date");
    if(error){
      // 오프라인 등: 이 기기 기록으로 계속 쓰고, 저장은 미전송 목록에 쌓아 둠
      mode="offline";logs=readJSON(LKEY,{});
      setStatus(offlineMsg());
      emit("change");
      return false;
    }
    const remote={};
    data.forEach(r=>{remote[r.date]=fromRow(r)});
    // 브라우저에만 있는 날짜 + 아직 못 올린 날짜는 브라우저 값을 우선해 서버로 올림
    const local=readJSON(LKEY,{}), pending=dirty();
    const toPush=Object.keys(local).filter(d=>!remote[d]||pending.has(d));
    toPush.forEach(d=>{remote[d]=local[d]});
    logs=remote;writeJSON(LKEY,logs);mode="remote";
    emit("change");
    if(toPush.length){
      const set=dirty();toPush.forEach(d=>set.add(d));setDirty(set);
      if(await pushDates(toPush)) setStatus(pending.size?"연결되어 밀린 기록 "+toPush.length+"건을 올렸습니다.":"기록은 Supabase 내 계정에 저장됩니다. 다른 기기에서 로그인해도 보입니다.");
    }else setStatus("기록은 Supabase 내 계정에 저장됩니다. 다른 기기에서 로그인해도 보입니다.");
    return true;
  }

  function useLocal(msg){
    mode="local";logs=readJSON(LKEY,{});
    setStatus(msg);emit("change");
  }

  // supabase 라이브러리: 오프라인으로 열어 못 받았으면 연결된 뒤 다시 불러옴
  function loadLib(){
    if(window.supabase) return Promise.resolve(true);
    const tag=document.querySelector("script[data-supabase]");
    if(!tag) return Promise.resolve(false);
    return new Promise(res=>{
      const sc=document.createElement("script");
      sc.src=tag.src;sc.onload=()=>res(!!window.supabase);sc.onerror=()=>res(false);
      document.head.appendChild(sc);
    });
  }
  async function connect(){
    if(sb) return true;
    if(!(await loadLib())) return false;
    sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
    let session=null;
    try{session=(await sb.auth.getSession()).data.session}catch(e){session=null}
    user=session?session.user:null;
    emit("auth",user);
    sb.auth.onAuthStateChange((_ev,sess)=>{
      const prevId=user&&user.id;
      user=sess?sess.user:null;
      if((user&&user.id)===prevId) return;   // 토큰 갱신 등 같은 사용자 이벤트는 무시
      emit("auth",user);
      if(user) loadRemote(); else useLocal("로그인하면 기록이 계정에 저장됩니다. 지금은 이 기기에만 저장됩니다.");
    });
    return true;
  }

  async function init(){
    if(!configured){useLocal("기록은 이 브라우저에 저장됩니다. (다른 기기와 공유되지 않음)");return}
    if(!(await connect())){
      mode="offline";logs=readJSON(LKEY,{});
      setStatus(offlineMsg());emit("change");
      return;
    }
    if(user) await loadRemote();
    else useLocal("로그인하면 기록이 계정에 저장됩니다. 지금은 이 기기에만 저장됩니다.");
  }

  // 연결 복구·앱 다시 열기·주기적으로 호출: 서버 연결과 밀린 기록 올리기 (동시에 한 번만)
  function sync(){
    if(!configured||navigator.onLine===false) return Promise.resolve();
    if(syncing) return syncing;
    syncing=(async()=>{
      if(!(await connect())||!user) return;
      if(mode!=="remote") await loadRemote();
      else{
        const pending=[...dirty()];
        if(pending.length&&await pushDates(pending)) setStatus("연결되어 밀린 기록 "+pending.length+"건을 올렸습니다.");
      }
    })().finally(()=>{syncing=null});
    return syncing;
  }

  function save(date,patch){
    const next=Object.assign({},logs[date]||{},patch);
    if(next.weight===undefined) delete next.weight;
    if(next.metrics&&!Object.keys(next.metrics).length) delete next.metrics;
    if(next.cond&&!next.cond.bad&&!(next.cond.pain||[]).length) delete next.cond;
    if(next.meals&&!hasMeals(next.meals)) delete next.meals;
    logs=Object.assign({},logs,{[date]:next});
    writeJSON(LKEY,logs);
    emit("change");
    if(configured){
      const set=dirty();set.add(date);setDirty(set);   // 로그인 전·오프라인이어도 표시 → 연결·로그인되면 올라감
      if(mode==="remote") chain=chain.then(()=>pushDates([date]));
    }
  }

  return {
    init, save, sync,
    hasPending:()=>configured&&dirty().size>0,
    get:d=>logs[d],
    isRemote:()=>mode==="remote",
    on:(ev,fn)=>listeners[ev].push(fn),
    signIn:(email,password)=>sb.auth.signInWithPassword({email,password}),
    signOut:()=>sb.auth.signOut(),
    hasAuth:()=>!!sb,
    weekAvg:w=>weekAvgOf(d=>logs[d],w),
    weekDone(w){
      let n=0;for(let i=0;i<7;i++){if(isDone(logs[addDays(weekStart(w),i)]))n++}
      return n;
    },
    latest(){
      const keys=Object.keys(logs).filter(k=>logs[k]&&typeof logs[k].weight==="number").sort();
      const k=keys[keys.length-1];
      return k?{date:k,w:logs[k].weight}:null;
    }
  };
})();
