"use strict";
/* 식단 계산: 끼니별 계획 칼로리, 하루 섭취량, 실측 소모량 추정, 체중 기반 자동 조정
 * (DOM·저장소에 의존하지 않는 순수 로직. log(d)는 그날 기록을 돌려주는 함수)
 *
 * 식단 기록 형태: log(d).meals = {
 *   s: { "아침": {m:"plan",k,p} | {m:"skip"} | {m:"custom",items:[...]}, ... },   // 끼니별
 *   x: [ ...items ]                                                                 // 추가 간식·음료
 * }
 * item = {f:"jeyukdeop", q:1}  또는 직접 입력 {f:"custom", n:"이름", k:300, p:10, q:1}
 * '계획대로'는 체크한 순간의 계획 칼로리(k,p)를 함께 저장해, 나중에 계획이 바뀌어도 그날 섭취량은 그대로 유지
 */

/* ---------- 체중 기반 자동 조정 (섭취 기록이 부족할 때 사용) ---------- */
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
  if(d1>=1&&d2>=1) return {kcal:-100,why:"최근 2주 평균 체중이 목표보다 1kg 이상 높음"};
  if(d1<=-1.5&&d2<=-1.5) return {kcal:100,why:"최근 2주 평균 체중이 목표보다 1.5kg 이상 낮음"};
  return null;
}

/* ---------- 섭취량 ---------- */
const itemFood=it=>it.f==="custom"?{name:it.n||"직접 입력",kcal:+it.k||0,p:+it.p||0}:(FOOD_BY_ID[it.f]||{name:it.f,kcal:0,p:0});
const itemKcal=it=>itemFood(it).kcal*(+it.q||1);
const itemProt=it=>itemFood(it).p*(+it.q||1);
const slotNames=date=>MENU[dowOf(date)].map(m=>m.t);

function entryIntake(e){
  if(!e||e.m==="skip") return {k:0,p:0};
  if(e.m==="plan") return {k:+e.k||0,p:+e.p||0};
  const items=e.items||[];
  return {k:items.reduce((s,it)=>s+itemKcal(it),0),p:items.reduce((s,it)=>s+itemProt(it),0)};
}
// 하루 섭취: complete = 모든 끼니에 기록이 있음 (다르게 먹음인데 음식이 비어 있으면 미완료)
function dayIntake(date,meals){
  const s=(meals&&meals.s)||{}, x=(meals&&meals.x)||[];
  let k=0,p=0,logged=0;
  const names=slotNames(date);
  names.forEach(t=>{
    const e=s[t];
    if(e&&(e.m!=="custom"||(e.items||[]).length)) logged++;
    const v=entryIntake(e);k+=v.k;p+=v.p;
  });
  x.forEach(it=>{k+=itemKcal(it);p+=itemProt(it)});
  return {kcal:Math.round(k),protein:Math.round(p),logged,slots:names.length,complete:logged===names.length};
}

/* ---------- 실측 소모량 추정 ----------
 * 최근 14일(어제까지)의 평균 섭취량과 체중 추세(최소제곱 기울기)로 하루 소모량을 역산
 *   소모량 = 평균 섭취 − (하루 체중 변화 kg × 7,700kcal)
 * 1주차(수분 감소가 큰 시기)와 설 브레이크 기간은 제외
 */
const EST={days:14,minIntake:10,minWeights:6,minSpan:10,kcalPerKg:7700,minTdee:1600,maxTdee:4200,floor:1500,maxShift:250};
function energyEstimate(date,log){
  if(date<START) return {ready:false,intakeDays:0,weightDays:0,why:"플랜 시작 후 2주차부터 계산합니다."};
  const firstOk=addDays(START,7);
  const intakes=[],weights=[];
  for(let i=EST.days;i>=1;i--){
    const d=addDays(date,-i);
    if(d<firstOk||isBreak(d)) continue;
    const v=log(d)||{};
    if(v.meals){const di=dayIntake(d,v.meals);if(di.complete)intakes.push(di.kcal)}
    if(typeof v.weight==="number") weights.push([EST.days-i,v.weight]);
  }
  const span=weights.length?weights[weights.length-1][0]-weights[0][0]:0;
  const base={ready:false,intakeDays:intakes.length,weightDays:weights.length};
  if(intakes.length<EST.minIntake||weights.length<EST.minWeights||span<EST.minSpan)
    return Object.assign(base,{why:"최근 14일 중 식단 전체 기록 "+EST.minIntake+"일 이상, 체중 기록 "+EST.minWeights+"일 이상이 필요합니다."});
  const n=weights.length, mx=weights.reduce((s,w)=>s+w[0],0)/n, my=weights.reduce((s,w)=>s+w[1],0)/n;
  const slope=weights.reduce((s,w)=>s+(w[0]-mx)*(w[1]-my),0)/weights.reduce((s,w)=>s+(w[0]-mx)**2,0);   // kg/일
  const intake=intakes.reduce((s,k)=>s+k,0)/intakes.length;
  const tdee=intake-slope*EST.kcalPerKg;
  if(!(tdee>=EST.minTdee&&tdee<=EST.maxTdee)) return Object.assign(base,{why:"기록 변동이 커서 이번에는 추정을 보류합니다."});
  const I=info(date);
  if(I.after||I.prep) return Object.assign(base,{ready:true,tdee:Math.round(tdee),intake:Math.round(intake),weekChange:slope*7,recommended:null});
  const weeklyLoss=TARGET[I.week-1]-TARGET[I.week];
  const recommended=Math.max(EST.floor,Math.round((tdee-weeklyLoss*EST.kcalPerKg/7)/50)*50);
  return Object.assign(base,{ready:true,tdee:Math.round(tdee),intake:Math.round(intake),weekChange:slope*7,weeklyLoss,recommended});
}

/* ---------- 끼니별 계획 칼로리 ----------
 * 기본 메뉴 → 단계별 감량 → 축구 → 칼로리 보정(실측 추정 우선, 없으면 체중 기반) 순서로 끼니에 나눠 반영
 */
const PHASE_CUTS={
  1:[],
  2:[{t:"점심",k:-90,text:"점심 밥 1/2공기"}],
  3:[{t:"점심",k:-90,text:"점심 밥 1/2공기"},{t:"간식 16시",k:-60,text:"하루견과 1/2봉"}],
  4:[{t:"점심",k:-90,text:"점심 밥 1/2공기"},{t:"간식 16시",k:-60,text:"하루견과 1/2봉"},{t:"저녁",k:-70,text:"저녁 밥·고구마 1/3 줄이기"}]
};
// 보정용 단계 (필요한 만큼 앞에서부터 적용)
const SHIFT_DOWN=[
  {t:"간식 16시",k:p=>p>=3?-60:-120,text:p=>p>=3?"남은 견과 빼기":"하루견과 빼기"},
  {t:"저녁",k:()=>-70,text:p=>p>=4?"저녁 밥·고구마 1/3 더 줄이기":"저녁 밥·고구마 1/3 줄이기"},
  {t:"아침",k:()=>-70,text:()=>"아침 오트밀·빵·바나나 절반으로"}
];
const SHIFT_UP=[
  {t:"간식 16시",k:()=>90,text:()=>"바나나 1개 추가"},
  {t:"저녁 후",k:()=>85,text:()=>"저지방우유 1잔 추가"},
  {t:"점심",k:()=>100,text:()=>"밥 1/3공기 더"}
];

function planSlots(date,log=()=>undefined){
  const I=info(date), dow=dowOf(date), L=log(date)||{}, brk=isBreak(date);
  const P=I.prep?PHASES[0]:I.after?PHASES[3]:phaseOf(I.week);
  const slots=MENU[dow].map(m=>Object.assign({},m,{adj:[]}));
  const byName=t=>slots.find(s=>s.t===t);
  const add=(t,k,text,kind)=>{const s=byName(t);if(s){s.kcal+=k;s.adj.push({k,text,kind})}};
  const basis={phase:P,brk,soccer:null,est:null,auto:null,shift:0};

  if(!brk){
    PHASE_CUTS[P.n].forEach(c=>add(c.t,c.k,c.text,"phase"));
    // 칼로리 보정: 실측 추정이 되면 그 값을, 아니면 체중 기반 ±100
    const est=energyEstimate(date,log);
    const now=slots.reduce((s,x)=>s+x.kcal,0);
    let want=0;
    if(est.ready&&est.recommended){basis.est=est;want=Math.max(-EST.maxShift,Math.min(EST.maxShift,est.recommended-now))}
    else{const a=calorieAdjust(date,log);if(a){basis.auto=a;want=a.kcal}}
    // 필요한 방향으로, 목표에 더 가까워지는 단계만 적용 (지나치지 않게)
    let left=want;
    const steps=left<0?SHIFT_DOWN:SHIFT_UP, dir=Math.sign(left);
    for(const st of steps){
      if(Math.sign(left)!==dir||Math.abs(left)<35) break;
      const k=st.k(P.n);
      if(Math.abs(left-k)>=Math.abs(left)) continue;
      add(st.t,k,st.text(P.n),"shift");left-=k;
    }
    basis.shift=want-left;
  }
  // 축구: 소모한 만큼 일부 보충
  if(L.soccer===true&&dow!==6){add("저녁 후",300,"축구한 날: 바나나 1개 + 우유 또는 저녁 밥 1/2공기","soccer");basis.soccer="weekday"}
  if(dow===6&&L.soccer!==false){add("아침",90,"축구 가는 날: 바나나 1개 추가","soccer");basis.soccer="sunday"}

  const total=slots.reduce((s,x)=>s+x.kcal,0), protein=slots.reduce((s,x)=>s+x.p,0);
  return {slots,total:Math.round(total),protein:Math.round(protein),basis,target:brk?2500:Math.round(total)};
}

/* 자주 먹은 음식 (최근 60일, 많이 고른 순) */
function frequentFoods(date,log,limit=8){
  const count={};
  for(let i=0;i<60;i++){
    const m=(log(addDays(date,-i))||{}).meals;if(!m) continue;
    const items=[].concat(...Object.values(m.s||{}).map(e=>e&&e.m==="custom"?e.items||[]:[]),m.x||[]);
    items.forEach(it=>{if(it.f!=="custom"&&FOOD_BY_ID[it.f])count[it.f]=(count[it.f]||0)+1});
  }
  return Object.keys(count).sort((a,b)=>count[b]-count[a]).slice(0,limit).map(id=>FOOD_BY_ID[id]);
}
