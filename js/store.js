"use strict";
/* 기록 저장소: 브라우저(localStorage) + Supabase(로그인 시)
 *
 * - 모든 기록은 먼저 브라우저에 저장하고, 로그인 상태면 Supabase에도 올린다.
 * - 서버 저장이 실패한 날짜는 '미전송' 목록에 남겨 두고, 다음 접속 때 다시 올린다.
 *   (그래서 네트워크가 끊겨도 기록이 서버 값으로 덮어써지지 않는다)
 * - 기록 형태: { "2026-10-19": { weight, done, soccer: true|false|null,
 *                                metrics: {pullup,pushup,plank,row10,waist}, cond: {bad, pain:[...]},
 *                                meals: {s:{끼니:기록}, x:[추가 음식]} } }   (식단 형태는 diet.js 참고)
 */
const Store=(function(){
  const LKEY="plan36-log-v1", DIRTY_KEY="plan36-dirty-v1", TABLE="workout_log";
  const CFG=window.PLAN36_CONFIG||{};
  let logs={}, mode="local", sb=null, user=null, chain=Promise.resolve();
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
    if(error){setStatus("서버 저장 실패 (이 브라우저에는 저장됨, 다음 접속 때 다시 올립니다): "+error.message);return false}
    const set=dirty();dates.forEach(d=>set.delete(d));setDirty(set);
    return true;
  }

  async function loadRemote(){
    const {data,error}=await sb.from(TABLE).select("date,weight,done,soccer,metrics,cond,meals").order("date");
    if(error){
      useLocal("서버 기록을 불러오지 못해 이 브라우저 기록을 보여줍니다: "+error.message);
      return;
    }
    const remote={};
    data.forEach(r=>{remote[r.date]=fromRow(r)});
    // 브라우저에만 있는 날짜 + 아직 못 올린 날짜는 브라우저 값을 우선해 서버로 올림
    const local=readJSON(LKEY,{}), pending=dirty();
    const toPush=Object.keys(local).filter(d=>!remote[d]||pending.has(d));
    toPush.forEach(d=>{remote[d]=local[d]});
    logs=remote;writeJSON(LKEY,logs);mode="remote";
    if(toPush.length){const set=dirty();toPush.forEach(d=>set.add(d));setDirty(set);await pushDates(toPush)}
    setStatus("기록은 Supabase 내 계정에 저장됩니다. 다른 기기에서 로그인해도 보입니다.");
    emit("change");
  }

  function useLocal(msg){
    mode="local";logs=readJSON(LKEY,{});
    setStatus(msg);emit("change");
  }

  async function init(){
    const configured=!!(CFG.supabaseUrl&&CFG.supabaseAnonKey);
    if(!configured){useLocal("기록은 이 브라우저에 저장됩니다. (다른 기기와 공유되지 않음)");return}
    if(!window.supabase){useLocal("Supabase에 연결하지 못해 이 브라우저에 저장합니다. 네트워크를 확인하세요.");return}
    sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
    const {data}=await sb.auth.getSession();
    user=data.session?data.session.user:null;
    emit("auth",user);
    sb.auth.onAuthStateChange((_ev,session)=>{
      const prevId=user&&user.id;
      user=session?session.user:null;
      if((user&&user.id)===prevId) return;   // 토큰 갱신 등 같은 사용자 이벤트는 무시
      emit("auth",user);
      if(user) loadRemote(); else useLocal("로그인하면 기록이 계정에 저장됩니다. 지금은 이 브라우저에만 저장됩니다.");
    });
    if(user) await loadRemote();
    else useLocal("로그인하면 기록이 계정에 저장됩니다. 지금은 이 브라우저에만 저장됩니다.");
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
    if(mode==="remote"){
      const set=dirty();set.add(date);setDirty(set);
      chain=chain.then(()=>pushDates([date]));
    }
  }

  // 연결이 돌아왔을 때 못 올린 기록 다시 올리기
  async function retry(){
    if(mode!=="remote") return;
    const pending=[...dirty()];
    if(pending.length&&await pushDates(pending)) setStatus("연결이 복구되어 밀린 기록 "+pending.length+"건을 올렸습니다.");
  }

  return {
    init, save, retry,
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
