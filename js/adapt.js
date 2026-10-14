"use strict";
/* 측정 반영: 체력 측정 결과로 다음 측정 전까지의 처방을 조정하고, 체중 추이로 칼로리를 조정
 *
 * - 측정값이 하나도 없으면 기본 일정(plan.js)과 완전히 같은 결과를 낸다.
 * - 한 번에 늘어나는 양은 최대 +20%, 줄어드는 양은 최대 −40%로 제한한다.
 * - 측정값 형태: log(date).metrics = { pullup, pushup, plank, row10, waist }
 */

/* ---------- 측정일과 항목 ---------- */
const TESTS=[
  {date:"2026-10-17",label:"기준"},
  {date:"2026-12-19",label:"W9"},
  {date:"2027-02-20",label:"W18"},
  {date:"2027-04-24",label:"W27"},
  {date:"2027-06-26",label:"W36"}
];
const METRICS=[
  {key:"pullup",name:"턱걸이",unit:"회",min:0,max:50},
  {key:"pushup",name:"푸시업",unit:"회",min:0,max:150},
  {key:"plank",name:"플랭크",unit:"초",min:0,max:900},
  {key:"row10",name:"로잉 10분",unit:"m",min:500,max:4000},
  {key:"waist",name:"허리둘레",unit:"cm",min:50,max:200,lowerIsBetter:true}
];
const isTestDate=s=>TESTS.some(t=>t.date===s);
// 플랜 숫자가 전제하는 측정값 (측정 순서별). 실제 값과의 비율로 처방을 늘리거나 줄인다.
const EXPECTED={pushup:[15,21,27,32,36],plank:[45,60,75,90,100]};
const SCALE_MIN=0.6, SCALE_MAX=1.2;

const metricsOf=(log,d)=>{const v=log(d);return v&&v.metrics?v.metrics:null};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- 이 날짜에 적용할 기준 측정 ---------- */
function calibrationFor(date,log){
  // date 이전(당일 제외)의 가장 최근 측정 + 그 직전 측정
  const done=TESTS.map((t,i)=>({...t,i,m:metricsOf(log,t.date)})).filter(t=>t.m&&t.date<date);
  if(!done.length) return null;
  const cur=done[done.length-1], prev=done.length>1?done[done.length-2]:null;
  const m=cur.m, cal={from:cur, notes:[]};
  const ratio=(key)=>typeof m[key]==="number"?clamp(m[key]/EXPECTED[key][cur.i],SCALE_MIN,SCALE_MAX):null;
  cal.push=ratio("pushup");
  cal.core=ratio("plank");
  cal.pushMax=typeof m.pushup==="number"?m.pushup:null;
  if(typeof m.pullup==="number"){
    const p=m.pullup;
    cal.pullTrack=p===0?"neg":p<=4?"base":p<=9?"plus1":"plus2";
    cal.pullStalled=!!(prev&&typeof prev.m.pullup==="number"&&p<=prev.m.pullup&&p>0);
    if(cal.pullStalled&&cal.pullTrack!=="base") cal.pullTrack="base";
  }
  if(typeof m.row10==="number") cal.split=300000/m.row10;   // 500m당 초
  return cal;
}

/* ---------- 처방 조정 ---------- */
const PUSH_FAMILY=new Set(["pushup","closepush","declinepush","pikepush"]);
const CORE_HOLD=new Set(["plank","sideplank","hollow"]);
const fmtSplit=sec=>{const t=Math.round(sec);return Math.floor(t/60)+":"+String(t%60).padStart(2,"0")};
const splitRange=(base,a,b)=>fmtSplit(base+a)+"~"+fmtSplit(base+b);

// "8회", "30초/쪽" 같은 처방 숫자에 배율 적용
function scaleReps(reps,f,unit){
  const m=/^(\d+)(회|초)(.*)$/.exec(reps);
  if(!m||m[2]!==unit) return reps;
  let n=Number(m[1])*f;
  n=unit==="초"?Math.max(10,Math.round(n/5)*5):Math.max(3,Math.round(n));
  return n+m[2]+m[3];
}
function addReps(reps,k){
  const m=/^(\d+)회(.*)$/.exec(reps);
  return m?(Number(m[1])+k)+"회"+m[2]:reps;
}
function rowTarget(text,split){
  if(/워밍업|쿨다운|최대 거리/.test(text)) return null;
  if(/템포/.test(text)) return splitRange(split,5,10);
  if(/강하게/.test(text)) return splitRange(split,-5,0);
  if(/존2/.test(text)) return splitRange(split,15,20);
  return null;
}
function adjustBlock(b,cal){
  if(b.plain) return b;
  if(b.circuit) return Object.assign({},b,{items:b.items.map(t=>adjustCircuitItem(t,cal))});
  let nb=b;
  if(b.ex==="row"&&cal.split){
    const tg=rowTarget(b.text,cal.split);
    if(tg) nb=Object.assign({},b,{note:(b.note?b.note+" · ":"")+"목표 스플릿 "+tg+"/500m"});
  }
  if(!b.sets||typeof b.reps!=="string") return nb;
  if(PUSH_FAMILY.has(b.ex)&&cal.push){
    if(b.ex==="pushup"&&cal.pushMax!=null){
      if(/^최대의 70%/.test(b.reps)) return Object.assign({},b,{reps:Math.max(3,Math.round(cal.pushMax*0.7))+"회"});
      if(/^최대 −2/.test(b.reps)) return Object.assign({},b,{reps:Math.max(3,cal.pushMax-2)+"회"});
    }
    return Object.assign({},b,{reps:scaleReps(b.reps,cal.push,"회")});
  }
  if(CORE_HOLD.has(b.ex)&&cal.core) return Object.assign({},b,{reps:scaleReps(b.reps,cal.core,"초")});
  if((b.ex==="pullup"||b.ex==="chinup")&&cal.pullTrack){
    if(cal.pullTrack==="neg") return Object.assign({},b,{ex:"negpull",reps:"3회",note:"턱걸이 0개 단계: 5초 하강 네거티브로 대체"});
    if(cal.pullTrack==="plus1") return Object.assign({},b,{reps:addReps(b.reps,1)});
    if(cal.pullTrack==="plus2") return Object.assign({},b,{reps:addReps(b.reps,2)});
  }
  return nb;
}
function adjustCircuitItem(t,cal){
  const m=/^(.*?)(\d+)(회|초)(.*)$/.exec(t);
  if(!m) return t;
  const [,name,num,unit,rest]=m;
  if(/푸시업/.test(name)&&cal.push) return name+scaleReps(num+unit,cal.push,"회")+rest;
  if(/플랭크|할로우/.test(name)&&cal.core) return name+scaleReps(num+unit,cal.core,"초")+rest;
  if(/풀업/.test(name)&&cal.pullTrack==="neg") return "네거티브 풀업 "+num+unit+rest;
  return t;
}
function calibrationNotes(cal){
  const pct=f=>(f>=1?"+":"")+Math.round((f-1)*100)+"%";
  const n=[];
  if(cal.push&&Math.abs(cal.push-1)>=0.05) n.push("푸시업 계열 "+pct(cal.push));
  if(cal.core&&Math.abs(cal.core-1)>=0.05) n.push("버티기 시간 "+pct(cal.core));
  if(cal.pullTrack==="neg") n.push("턱걸이는 네거티브 위주");
  if(cal.pullTrack==="plus1") n.push("턱걸이 +1회");
  if(cal.pullTrack==="plus2") n.push("턱걸이 +2회");
  if(cal.pullStalled) n.push("턱걸이 기록 정체로 난도 유지");
  if(cal.split) n.push("로잉 기준 스플릿 "+fmtSplit(cal.split)+"/500m");
  return n;
}

/* ---------- 측정 반영 단계 (session.js의 파이프라인에서 호출) ---------- */
function applyCalibration(x,s,log){
  if(x.kind==="test"||x.kind==="soccer"||x.kind==="prep") return x;
  const cal=calibrationFor(s,log);
  if(!cal) return x;
  return Object.assign({},x,{blocks:x.blocks.map(b=>adjustBlock(b,cal)),adapted:{label:cal.from.label,notes:calibrationNotes(cal)}});
}

/* ---------- 체중 기반 칼로리 조정 ---------- */
function weekAvgOf(log,w){
  if(w<1||w>36) return null;
  const s=weekStart(w);let sum=0,n=0;
  for(let i=0;i<7;i++){const v=log(addDays(s,i));if(v&&typeof v.weight==="number"){sum+=v.weight;n++}}
  return n?{avg:Math.round(sum/n*10)/10,n}:null;
}
// 지난 두 주의 주 평균(각 2일 이상 기록)이 모두 목표보다 1kg 이상 높으면 −100, 1.5kg 이상 낮으면 +100
function calorieAdjust(date,log){
  const I=info(date);
  if(I.prep||I.after||I.week<3||isBreak(date)) return null;
  const a=weekAvgOf(log,I.week-1), b=weekAvgOf(log,I.week-2);
  if(!a||!b||a.n<2||b.n<2) return null;
  const d1=a.avg-TARGET[I.week-1], d2=b.avg-TARGET[I.week-2];
  if(d1>=1&&d2>=1) return {kcal:-100,why:"최근 2주 평균이 목표보다 1kg 이상 높음",how:"간식의 하루견과를 빼세요"};
  if(d1<=-1.5&&d2<=-1.5) return {kcal:100,why:"최근 2주 평균이 목표보다 1.5kg 이상 낮음",how:"바나나 1개를 더하세요"};
  return null;
}
