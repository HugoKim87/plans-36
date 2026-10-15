"use strict";
/* 화면 그리기: 오늘·주간표·목표 체중·운동법·식단·생활습관 */

/* ---------- 운동 블록 ---------- */
function howHTML(id){
  const x=EX[id];if(!x) return "";
  let h='<div class="lbl">방법</div><ol>'+x.steps.map(s=>"<li>"+esc(s)+"</li>").join("")+"</ol>";
  if(x.cues) h+='<div class="lbl">포인트</div><ul>'+x.cues.map(s=>"<li>"+esc(s)+"</li>").join("")+"</ul>";
  if(x.avoid) h+='<div class="lbl">흔한 실수</div><ul>'+x.avoid.map(s=>"<li>"+esc(s)+"</li>").join("")+"</ul>";
  const ea=[];if(x.easier) ea.push("<b>쉽게</b> "+esc(x.easier));if(x.harder) ea.push("<b>어렵게</b> "+esc(x.harder));
  if(ea.length) h+="<p>"+ea.join(" · ")+"</p>";
  if(x.yt){
    const u=q=>"https://www.youtube.com/results?search_query="+encodeURIComponent(q);
    h+='<p class="vids"><a class="vid" href="'+u(x.yt[0])+'" target="_blank" rel="noopener">▶ 영상 보기</a><a class="vid alt" href="'+u(x.yt[1])+'" target="_blank" rel="noopener">영어 영상</a></p>';
  }
  return h;
}
// 블록 아래 도구: 세트 체크(2세트 이상 근력·서킷) / 로잉 타이머
function blockTools(b,i,date){
  if(b.ex==="row"){
    const segs=parseRowTimer(b.text,b.note);
    return segs?'<div class="btools"><button class="tbtn" type="button" data-timer="'+i+'">▶ 타이머 '+mmss(totalSec(segs))+'</button></div>':"";
  }
  const n=b.circuit?b.rounds:b.sets;
  if(!n||n<2) return "";
  const done=SetLog.get(date,i);
  let h='<div class="btools"><span class="small muted">'+(b.circuit?"라운드":"세트")+'</span>';
  for(let k=0;k<n;k++) h+='<button class="setchip" type="button" data-set="'+i+'" data-k="'+k+'" aria-pressed="'+(k<done)+'" aria-label="'+(k+1)+'번째 완료">'+(k+1)+'</button>';
  return h+'</div>';
}
function blockRow(b,i,date){
  return '<div class="bitem">'+blockBody(b,i)+blockTools(b,i,date)+'</div>';
}
function blockBody(b,i){
  const n=String(i+1);
  if(b.plain){return '<div class="blk plain"><span class="bn num">'+n+'</span><span>'+esc(b.note)+'</span></div>'}
  if(b.circuit){
    return '<details class="blk"><summary><span class="bn num">'+n+'</span><span class="bname"><span class="nm">전신 서킷</span><small>'+esc(b.note||"")+'</small></span><span class="bdose">'+b.rounds+'라운드</span></summary><div class="how"><div class="lbl">한 라운드</div><ol>'+b.items.map(s=>"<li>"+esc(s)+"</li>").join("")+'</ol><p class="small">각 동작 방법과 영상은 운동법 탭에 있습니다.</p></div></details>';
  }
  const x=EX[b.ex]||{name:b.ex};
  const dose=b.sets?(b.sets>1?b.sets+"세트 × ":"")+b.reps:(b.text||"");
  const nm=b.ex==="row"?"로잉":x.name;
  const sub=b.note?"<small>"+esc(b.note)+"</small>":"";
  return '<details class="blk"><summary><span class="bn num">'+n+'</span><span class="bname"><span class="nm">'+esc(nm)+'</span>'+sub+'</span><span class="bdose">'+esc(dose)+'</span></summary><div class="how">'+howHTML(b.ex)+'</div></details>';
}

/* ---------- 시작·최종 체중 문구 ---------- */
function renderPlanFacts(){
  const set=(cls,v)=>document.querySelectorAll(cls).forEach(e=>{e.textContent=v});
  set(".js-start",START_WEIGHT.toFixed(1));
  set(".js-start-date",START_WEIGHED);
  set(".js-final",TARGET[36].toFixed(1));
  set(".js-final-bmi",bmi(TARGET[36]));
}

/* ---------- KPIs ---------- */
function renderKPIs(){
  const I=info(TODAY);
  const wk=I.prep?0:Math.min(I.week,36);
  const P=phaseOf(Math.max(1,wk));
  const lw=Store.latest();
  const tgt=I.prep?TARGET[1]:I.after?TARGET[36]:TARGET[wk];
  $("kpis").innerHTML=[
    ['지금', I.prep?"준비 주간":I.after?"플랜 완료":"W"+wk+" / 36", I.prep?"10/19(월) 시작":I.after?"유지기":P.n+"단계 "+P.name],
    ['이번 주 목표', '<span class="num">'+tgt.toFixed(1)+'</span>kg', I.prep?"1주차 목표":"주 평균 기준"],
    ['최근 체중', lw?'<span class="num">'+lw.w.toFixed(1)+'</span>kg':"—", lw?md(lw.date)+" 기록":"오늘 탭에서 기록"],
    ['최종 목표', '<span class="num">'+TARGET[36].toFixed(1)+'</span>kg', "6/27 · BMI "+bmi(TARGET[36])]
  ].map(a=>'<div class="kpi"><span class="k">'+a[0]+'</span><span class="v">'+a[1]+'</span><span class="s">'+a[2]+'</span></div>').join("");
}

/* ---------- today ---------- */
let cur=TODAY<PREP0?PREP0:TODAY;   // 오늘 탭에서 보고 있는 날짜
function renderToday(){
  resetEditingOnDateChange();
  const x=sessionFor(cur,Store.get), I=info(cur), L=Store.get(cur)||{};
  const PH=I.prep?PHASES[0]:I.after?PHASES[3]:phaseOf(I.week);
  renderDayHeader(I,PH);
  renderBanners(x,I);
  renderSession(x);
  renderMetricsForm(x,L);
  renderLogButtons(L);
  renderWeekCheck(I);
  renderTodayDiet(I,PH,L);
}

function renderDayHeader(I,PH){
  const isDeloadWeek=!I.prep&&!I.after&&(I.week-(PH.n-1)*9)===9;
  let meta;
  if(I.prep) meta="준비 주간 · 10월 19일 월요일 시작";
  else if(I.after) meta="플랜 완료 후 · 유지기";
  else meta="W"+I.week+" · "+PH.n+"단계 "+PH.name+(isDeloadWeek?" · 디로드 주":"");
  if(cur===TODAY) meta="오늘 · "+meta;
  $("dayLabel").textContent=longDate(cur);
  $("dayMeta").textContent=meta;
  $("prevDay").disabled=cur<=PREP0;
}

const BANNER={
  test:["test","측정일","아래 '측정 결과 기록'에 입력하면 다음 측정 전까지의 운동이 그 기록에 맞게 조정됩니다. 체중은 오늘 기록 칸에 입력하세요."],
  deload:["deload","디로드 주","세트를 줄였습니다. 70% 힘으로 자세를 다듬는 주입니다. 토요일에 체력 측정이 있습니다."],
  brk:["break","설 연휴 다이어트 브레이크 (2/6~2/14)","유지 칼로리 약 2,500kcal까지 먹어도 됩니다. 명절 음식은 1인분씩, 단백질은 평소대로. 2/8(월)·2/9(화) 연휴엔 운동 대신 걷기 40분도 괜찮습니다. 체중이 0.5~1kg 오르는 건 수분과 음식 무게입니다."],
  after:["info","36주 완료","4단계 마지막 주 운동을 유지하면서 식사는 1,800kcal에서 2주마다 100kcal씩 늘려 체중이 멈추는 지점을 찾으세요. 표준체중(약 69kg)을 이어서 노린다면 1단계 방식으로 다시 시작합니다."]
};
function renderBanners(x,I){
  const bn=$("dayBanners");bn.innerHTML="";
  const add=([cls,title,body])=>bn.appendChild(el("div",{class:"banner "+cls},"<b>"+esc(title)+"</b><span>"+esc(body)+"</span>"));
  if(x.kind==="test") add(BANNER.test);
  if(x.deload&&x.kind!=="test") add(BANNER.deload);
  if(isBreak(cur)) add(BANNER.brk);
  if(I.after) add(BANNER.after);
  if(x.replaced) add(["info","축구로 대체","원래 계획: "+x.replaced+". 축구로 충분하니 따로 하지 않아도 됩니다."]);
  if(x.condition&&x.condition.bad) add(["break","컨디션 나쁨","오늘은 가벼운 로잉과 모빌리티만 합니다. 잠을 충분히 자고 물을 넉넉히 드세요."]);
  if(x.condition&&x.condition.pain) add(["break",x.condition.pain.map(painName).join("·")+" 통증 반영",x.condition.changes.length?"바뀐 동작: "+x.condition.changes.join(", ")+". 통증이 없는 범위에서만 움직이세요.":"부담되는 동작이 없어 그대로 진행합니다. 통증이 없는 범위에서만 움직이세요."]);
  const lasting=persistentPain(cur,Store.get);
  if(lasting.length) add(["warn",lasting.map(painName).join("·")+" 통증이 4일 중 3일 이상","같은 부위 통증이 이어지고 있습니다. 운동 강도를 낮추고, 붓기·저림이 있거나 계속 아프면 병원(정형외과) 진료를 받아보세요."]);
}

let todayBlocks=[];   // 오늘 탭에 그려진 블록 (세트·타이머 버튼이 참조)
function renderSession(x){
  const adapted=x.adapted&&x.adapted.notes.length
    ?'<div class="adapted">'+esc(x.adapted.label)+' 측정 반영: '+esc(x.adapted.notes.join(" · "))+'</div>':"";
  $("sessHead").innerHTML='<div class="row"><span class="chip '+x.kind+'">'+KIND[x.kind]+'</span><span class="chip">'+minutesOf(x)+'</span></div><h2>'+esc(x.title)+'</h2><p class="muted">'+esc(x.sub)+'</p>'+adapted;
  // 저장 버튼 등으로 다시 그릴 때 펼쳐 둔 운동 설명이 접히지 않게 유지
  const box=$("sessBlocks");
  const open=box.dataset.date===cur?[...box.querySelectorAll("details")].map(d=>d.open):[];
  todayBlocks=fullBlocks(x);
  box.innerHTML=todayBlocks.map((b,i)=>blockRow(b,i,cur)).join("");
  box.dataset.date=cur;
  box.querySelectorAll("details").forEach((d,i)=>{if(open[i])d.open=true});
}

/* 저장된 기록은 잠그고 '수정'을 눌러야 바꿀 수 있게 함.
 * Editing.weight / Editing.metrics = 수정 중인 날짜 (다른 날로 이동하면 자동으로 다시 잠김) */
const Editing={weight:null,metrics:null};
const isLocked=(kind,hasValue)=>hasValue&&Editing[kind]!==cur;
let shownDate=null;
// 보고 있는 날짜가 바뀌면 수정 상태를 모두 해제 (돌아와도 잠긴 상태로 보이게)
function resetEditingOnDateChange(){
  if(shownDate!==cur){Editing.weight=null;Editing.metrics=null;shownDate=cur}
}

function renderMetricsForm(x,L){
  const panel=$("metricsPanel"), show=x.kind==="test";
  panel.hidden=!show;
  if(!show) return;
  const m=L.metrics||{}, locked=isLocked("metrics",!!L.metrics);
  // 수정 중에 다른 이유로 다시 그려질 때 입력 중인 값은 지우지 않음
  const keepTyping=panel.dataset.date===cur&&!locked&&panel.dataset.locked==="false";
  if(!keepTyping){
    $("metricsFields").innerHTML=METRICS.map(f=>'<label class="mfield" for="m_'+f.key+'">'+esc(f.name)+' ('+f.unit+')<input id="m_'+f.key+'" type="number" inputmode="decimal" min="'+f.min+'" max="'+f.max+'" step="any" value="'+(typeof m[f.key]==="number"?m[f.key]:"")+'"></label>').join("");
  }
  panel.querySelectorAll("#metricsFields input").forEach(i=>{i.disabled=locked});
  panel.classList.toggle("locked",locked);
  $("mSave").textContent=locked?"측정 결과 수정":"측정 결과 저장";
  $("mSave").classList.toggle("primary",!locked);
  $("mCancel").hidden=!(L.metrics&&!locked);
  panel.dataset.date=cur;
  panel.dataset.locked=String(locked);
}

function renderLogButtons(L){
  const wi=$("wInput"), hasW=typeof L.weight==="number", wLocked=isLocked("weight",hasW);
  if(document.activeElement!==wi||wLocked) wi.value=hasW?L.weight.toFixed(1):"";
  wi.disabled=wLocked;
  $("wSave").textContent=wLocked?"수정":"저장";
  $("wSave").classList.toggle("primary",!wLocked);
  $("wCancel").hidden=!(hasW&&!wLocked);
  const db=$("doneBtn");
  const bySoccer=L.soccer===true;
  db.setAttribute("aria-pressed",isDone(L)?"true":"false");
  db.textContent=bySoccer?"✓ 운동 완료 (축구)":L.done?"✓ 운동 완료":"운동 완료 표시";
  db.disabled=bySoccer;   // 축구로 완료된 날은 축구 체크를 풀어야 바뀜
  db.title=bySoccer?"축구를 체크해서 자동으로 완료 처리됐습니다. 바꾸려면 축구 체크를 해제하세요.":"";
  const isSun=dowOf(cur)===6;
  const sb1=$("soccerBtn"), sb2=$("noSoccerBtn");
  sb1.setAttribute("aria-pressed",L.soccer===true?"true":"false");
  sb1.textContent=(L.soccer===true?"✓ ":"⚽ ")+(isSun?"축구 다녀옴":"오늘 축구함");
  sb2.hidden=!isSun;
  sb2.setAttribute("aria-pressed",L.soccer===false?"true":"false");
  sb2.textContent=(L.soccer===false?"✓ ":"")+"이번 주 안 감";
  const c=L.cond||{};
  $("condBad").setAttribute("aria-pressed",c.bad?"true":"false");
  document.querySelectorAll("[data-pain]").forEach(b=>b.setAttribute("aria-pressed",(c.pain||[]).includes(b.dataset.pain)?"true":"false"));
  const yPain=((Store.get(addDays(cur,-1))||{}).cond||{}).pain||[];
  $("condHint").textContent=yPain.length&&!(c.pain||[]).length?"어제 "+yPain.map(painName).join("·")+" 통증을 기록했어요. 오늘도 아프면 눌러주세요.":"누르면 오늘 운동이 바로 바뀝니다. 다시 누르면 해제됩니다.";
  $("soccerHint").textContent=isSun
    ?"안 가는 날은 '이번 주 안 감'을 누르면 긴 로잉으로 바뀌고, 내일은 회복 대신 인터벌이 됩니다."
    :"주중에 축구를 했다면 누르세요. 오늘은 완료로 처리되고, 내일 하체·인터벌은 회복으로 바뀝니다.";
}

function renderWeekCheck(I){
  const wc=$("weekCheck");
  if(I.prep){
    wc.innerHTML='<h3>시작 전 점검</h3><p class="small">10/17(토) 기준 측정에서 턱걸이·푸시업·플랭크·로잉 10분 거리·허리둘레를 재고 그날 화면의 측정 칸에 입력하세요. 1주차 목표 주 평균은 <b class="num">'+TARGET[1].toFixed(1)+'kg</b>입니다.</p>';
    return;
  }
  if(I.after){wc.innerHTML='<h3>유지기</h3><p class="small">주 평균이 ±1kg 안에서 유지되면 성공입니다.</p>';return}
  const t=TARGET[I.week], a=Store.weekAvg(I.week);
  let state='<span class="chip">기록 전</span>';
  if(a){const d=a.avg-t; state=d<=0?'<span class="chip good">목표 달성 중</span>':d<=1?'<span class="chip warn">목표 근접 (+'+d.toFixed(1)+')</span>':'<span class="chip bad">목표보다 +'+d.toFixed(1)+'kg</span>'}
  const row=(k,v)=>'<div class="row between"><span>'+k+'</span><span class="num strong">'+v+'</span></div>';
  wc.innerHTML='<h3>W'+I.week+' 점검</h3>'
    +row("목표 주 평균",t.toFixed(1)+" kg")
    +row("내 주 평균",a?a.avg.toFixed(1)+" kg <span class='muted small'>("+a.n+"일)</span>":"—")
    +row("운동 완료",Store.weekDone(I.week)+" / 7일")
    +'<div>'+state+'</div><p class="small muted">2주 연속 목표보다 1kg 이상 높거나 1.5kg 이상 낮으면 식단 칼로리가 자동으로 조정됩니다.</p>';
}

/* ---------- 오늘 식단 + 기록 ---------- */
const sgn=n=>(n>0?"+":"")+n;
const MSTAT=[["plan","✓ 계획대로"],["skip","건너뜀"],["custom","다르게 먹음"]];
function itemChip(it,slot,idx){
  const f=itemFood(it), q=+it.q||1;
  return '<span class="mitem">'+esc(f.name)+(q!==1?' ×'+q:'')+' <span class="num">'+fmt(Math.round(itemKcal(it)))+'</span>'
    +'<button type="button" class="mdel" data-mdel="'+idx+'" data-slot="'+esc(slot)+'" aria-label="'+esc(f.name)+' 빼기">×</button></span>';
}
function mealRow(s,e){
  const adj=s.adj.map(a=>'<div class="madj">'+esc(a.text)+' <span class="num">('+sgn(a.k)+')</span></div>').join("");
  const ctl=MSTAT.map(([m,label])=>'<button type="button" class="mbtn" data-mstat="'+m+'" data-slot="'+esc(s.t)+'" aria-pressed="'+(!!e&&e.m===m)+'">'+label+'</button>').join("");
  let custom="";
  if(e&&e.m==="custom"){
    const items=e.items||[];
    custom='<div class="mcustom">'+items.map((it,i)=>itemChip(it,s.t,i)).join("")
      +'<button type="button" class="madd" data-madd="'+esc(s.t)+'">+ 음식 추가</button>'
      +(items.length?'<span class="small muted num">먹은 양 '+fmt(entryIntake(e).k)+'kcal</span>':'')+'</div>';
  }
  return '<div class="meal'+(e?" logged":"")+'"><span class="t">'+esc(s.t)+'</span><div><div class="n">'+esc(s.name)+'</div><div class="i">'+esc(s.items)+'</div>'
    +(s.alt?'<div class="alt">'+esc(s.alt)+'</div>':'')+adj+'</div><span class="k">'+fmt(r10(s.kcal))+'kcal · '+Math.round(s.p)+'g</span>'
    +'<div class="mctl">'+ctl+'</div>'+custom+'</div>';
}
function extraRow(x){
  const k=x.reduce((s,it)=>s+itemKcal(it),0);
  return '<div class="meal extra"><span class="t">추가 간식·음료</span><div class="mcustom">'+x.map((it,i)=>itemChip(it,"__x",i)).join("")
    +'<button type="button" class="madd" data-madd="__x">+ 간식·음료 추가</button></div><span class="k">'+(x.length?fmt(Math.round(k))+'kcal':'')+'</span></div>';
}
function renderIntakeSummary(plan,di,S){
  const target=plan.target, eaten=di.kcal;
  // 아직 기록 안 한 끼니는 계획대로 먹는다고 가정한 예상치
  const projected=eaten+plan.slots.filter(s=>!S[s.t]).reduce((a,s)=>a+s.kcal,0);
  const pct=Math.min(100,target?eaten/target*100:0), over=eaten>target+100;
  $("intakeSum").innerHTML=!di.logged&&!eaten?'<p class="small muted">끼니마다 <b>계획대로 / 건너뜀 / 다르게 먹음</b>을 눌러 기록하면 오늘 먹은 칼로리를 계산합니다.</p>':
    '<div class="row between"><span class="strong">먹은 양 <span class="num">'+fmt(eaten)+'</span> / '+fmt(r10(target))+'kcal</span><span class="small muted">단백질 <span class="num">'+di.protein+'</span> / '+Math.round(plan.protein)+'g · 기록 '+di.logged+'/'+di.slots+'끼</span></div>'
    +'<div class="ibar'+(over?" over":"")+'"><i style="width:'+pct.toFixed(1)+'%"></i></div>'
    +(di.complete?'<p class="small '+(over?"bad-t":"muted")+'">'+(over?"목표보다 약 "+fmt(r10(eaten-target))+"kcal 더 먹었어요. 내일 하루로 맞추려 하지 말고 평소대로 돌아가면 됩니다.":"오늘 기록 완료. 목표 대비 "+sgn(r10(eaten-target))+"kcal")+'</p>'
      :'<p class="small muted">남은 끼니를 계획대로 먹으면 하루 약 '+fmt(r10(projected))+'kcal</p>');
}
function renderTodayDiet(I,P,L){
  const plan=planSlots(cur,Store.get), b=plan.basis, M=L.meals||{}, S=M.s||{};
  const notes=[];
  if(b.brk) notes.push("설 브레이크: 명절 음식 1~2끼를 더해 하루 약 2,500kcal까지 먹어도 됩니다.");
  else if(P.n>1) notes.push(P.n+"단계 조정: "+P.adjText);
  if(b.est) notes.push("실측 소모량 약 "+fmt(b.est.tdee)+"kcal 기준 권장 "+fmt(b.est.recommended)+"kcal → "+sgn(b.shift)+"kcal 보정");
  if(b.auto) notes.push("체중 보정 "+sgn(b.shift)+"kcal: "+b.auto.why);
  if(!notes.length) notes.push("아래 식단 그대로 먹으면 됩니다.");
  $("dietChip").textContent=b.brk?"브레이크 · 약 2,500kcal":P.n+"단계 · 하루 약 "+fmt(r10(plan.total))+"kcal"+(b.est?" (실측 보정)":b.auto?" (체중 보정)":"");
  $("dietNote").textContent=notes.join(" · ");
  $("todayMeals").innerHTML=plan.slots.map(s=>mealRow(s,S[s.t])).join("")+extraRow(M.x||[])
    +'<div class="mealtotal"><span>계획 합계</span><span class="num">약 '+fmt(r10(plan.total))+'kcal · 단백질 '+Math.round(plan.protein)+'g</span></div>';
  renderIntakeSummary(plan,dayIntake(cur,M),S);
}

/* ---------- 음식 선택 시트 ---------- */
const FoodSheet={slot:null,q:1,cat:0,query:""};
function renderFoodSheet(){
  const fs=FoodSheet, isX=fs.slot==="__x";
  $("fsTitle").textContent=isX?"간식·음료 추가":"음식 추가 · "+fs.slot;
  document.querySelectorAll("#fsQty [data-q]").forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.q===fs.q)));
  // 고정 음식 + 최근 자주 먹은 음식 (중복 제거, 최대 8개)
  const pinned=(PINNED_FOODS[fs.slot]||[]).map(id=>FOOD_BY_ID[id]).filter(Boolean);
  const freq=pinned.concat(frequentFoods(cur,Store.get).filter(f=>!pinned.includes(f))).slice(0,8);
  $("fsFreq").innerHTML=!fs.query&&freq.length?'<span class="small muted">자주 먹는 것</span>'+freq.map(f=>'<button type="button" class="fchip" data-food="'+f.id+'">'+esc(f.name)+'</button>').join(""):"";
  $("fsCats").innerHTML=fs.query?"":FOOD_CATS.map((c,i)=>'<button type="button" class="fcat" data-cat="'+i+'" aria-pressed="'+(i===fs.cat)+'">'+esc(c)+'</button>').join("");
  const q=fs.query.replace(/\s/g,"");
  const list=q?FOODS.filter(f=>f.name.replace(/\s/g,"").includes(q)):FOODS.filter(f=>f.cat===fs.cat);
  $("fsList").innerHTML=list.length?list.map(f=>'<button type="button" class="frow" data-food="'+f.id+'"><span>'+esc(f.name)+'</span><span class="num muted">'+fmt(Math.round(f.kcal*fs.q))+'kcal · '+Math.round(f.p*fs.q)+'g</span></button>').join("")
    :'<p class="small muted">찾는 음식이 없어요. 아래 \'직접 입력\'으로 추가하세요.</p>';
}
function openFoodSheet(slot){
  const catFor={"점심":0,"저녁":0,"__x":3};
  Object.assign(FoodSheet,{slot,q:1,query:"",cat:slot in catFor?catFor[slot]:2});
  $("fsSearch").value="";$("fcMsg").textContent="";
  renderFoodSheet();
  $("foodSheet").hidden=false;document.body.classList.add("fs-open");
}
function closeFoodSheet(){$("foodSheet").hidden=true;document.body.classList.remove("fs-open")}

/* ---------- 실측 소모량 (식단 탭) ---------- */
function renderEnergyPanel(){
  const e=energyEstimate(TODAY,Store.get), box=$("energyPanel");
  if(e.ready){
    box.innerHTML='<h3>내 실제 하루 소모량</h3><p class="big num">약 '+fmt(e.tdee)+'kcal</p>'
      +'<p class="small muted">최근 14일 평균 섭취 '+fmt(e.intake)+'kcal · 체중 변화 '+(e.weekChange>0?"+":"")+e.weekChange.toFixed(2)+'kg/주</p>'
      +(e.recommended?'<p class="small">이번 주 목표 감량 '+e.weeklyLoss.toFixed(1)+'kg에 맞춘 권장 섭취는 <b class="num">'+fmt(e.recommended)+'kcal</b>입니다. 오늘 식단에 자동 반영됩니다 (한 번에 ±250kcal까지).</p>':'');
  }else{
    box.innerHTML='<h3>내 실제 하루 소모량</h3><p class="small">'+esc(e.why)+'</p>'
      +'<p class="small muted num">최근 14일 기록: 식단 전체 '+e.intakeDays+'/'+EST.minIntake+'일 · 체중 '+e.weightDays+'/'+EST.minWeights+'일</p>'
      +'<p class="small muted">기록이 모이면 평균 섭취량과 체중 변화로 실제 소모량을 역산해 목표 칼로리를 맞춥니다. 그전까지는 체중 추이로 ±100kcal씩 조정합니다.</p>';
  }
}

/* ---------- week ---------- */
let viewWeek=(()=>{const I=info(TODAY);return I.prep?1:Math.min(36,I.week)})();
function renderWeek(){
  const w=viewWeek, P=phaseOf(w), wp=w-(P.n-1)*9;
  $("weekLabel").textContent="W"+w+" · "+md(weekStart(w))+"~"+md(addDays(weekStart(w),6));
  $("weekSub").textContent=P.n+"단계 "+P.name+" ("+P.from+"~"+P.to+"주차) · "+P.goal+(wp===9?" · 디로드 주":"")+" · 목표 주 평균 "+TARGET[w].toFixed(1)+"kg";
  $("prevWeek").disabled=w<=1;$("nextWeek").disabled=w>=36;
  const box=$("weekDays");box.innerHTML="";
  for(let i=0;i<7;i++){
    const d=addDays(weekStart(w),i), x=sessionFor(d,Store.get), L=Store.get(d)||{};
    const items=fullBlocks(x).filter(b=>b.ex!=="warmup"&&b.ex!=="cooldown").map(b=>{
      if(b.plain) return esc(b.note);
      if(b.circuit) return "전신 서킷 "+b.rounds+"라운드";
      const nm=b.ex==="row"?"로잉":(EX[b.ex]||{}).name||b.ex;
      const dose=b.sets?(b.sets>1?b.sets+"×":"")+b.reps:b.text;
      return esc(nm)+" <span class='num'>"+esc(dose)+"</span>";
    });
    const card=el("button",{class:"day"+(d===TODAY?" today":""),type:"button"});
    card.innerHTML='<div class="dh"><span class="dd">'+KD[i]+' '+md(d)+'</span><span class="chip '+x.kind+'">'+KIND[x.kind]+'</span></div><div><b>'+esc(x.title)+'</b> <span class="muted small">'+esc(x.sub)+'</span></div><ul>'+items.map(t=>"<li>"+t+"</li>").join("")+'</ul>'+(L.soccer===true?'<span class="done">⚽ 축구</span>':"")+(isDone(L)&&L.soccer!==true?'<span class="done">✓ 완료</span>':"")+(typeof L.weight==="number"?'<span class="small muted">체중 <span class="num">'+L.weight.toFixed(1)+'</span>kg</span>':"")+(L.meals&&dayIntake(d,L.meals).complete?'<span class="small muted">섭취 <span class="num">'+fmt(dayIntake(d,L.meals).kcal)+'</span>kcal</span>':"");
    card.addEventListener("click",()=>{cur=d;showTab("today");renderToday();window.scrollTo(0,0)});
    box.appendChild(card);
  }
}

/* ---------- target chart & table ---------- */
let tipTimer=null;
function renderTarget(){
  const bw=$("chartBox").clientWidth||640;
  const W=Math.max(320,Math.min(640,Math.round(bw))),H=W<480?240:270,L=40,Rr=14,Tp=16,Bt=40;
  const xt=W<480?[0,12,24,36]:[0,9,18,27,36];
  // 세로축: 목표 범위를 5kg 단위로 감싸기 (기록이 범위를 벗어나면 함께 넓힘)
  const recs=[];for(let w=1;w<=36;w++){const a=Store.weekAvg(w);if(a)recs.push(a.avg)}
  const lo=Math.min(TARGET[36],...recs), hi=Math.max(TARGET[0],...recs);
  const ymin=Math.floor((lo-1)/5)*5, ymax=Math.ceil((hi+1)/5)*5;
  const yticks=[];for(let v=ymin;v<=ymax;v+=5) yticks.push(v);
  const x=w=>L+(W-L-Rr)*w/36, y=v=>Tp+(H-Tp-Bt)*(ymax-v)/(ymax-ymin);
  let g="";
  yticks.forEach(v=>{g+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)" stroke-width="1"/><text x="'+(L-8)+'" y="'+(y(v)+4)+'" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono,monospace">'+v+'</text>'});
  xt.forEach(w=>{const lab=w===0?"10/19":md(addDays(START,w*7-1));g+='<text x="'+x(w)+'" y="'+(H-Bt+18)+'" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono,monospace">W'+w+'</text><text x="'+x(w)+'" y="'+(H-Bt+32)+'" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="IBM Plex Mono,monospace">'+lab+'</text>'});
  const I=info(TODAY);
  if(I.week>=1&&I.week<=36){g+='<line x1="'+x(I.week)+'" x2="'+x(I.week)+'" y1="'+Tp+'" y2="'+(H-Bt)+'" stroke="var(--muted)" stroke-dasharray="3 4" stroke-width="1"/><text x="'+(x(I.week)+5)+'" y="'+(Tp+10)+'" font-size="11" fill="var(--ink-2)">이번 주</text>'}
  const tp=TARGET.map((v,i)=>(i?"L":"M")+x(i).toFixed(1)+" "+y(v).toFixed(1)).join(" ");
  g+='<path d="'+tp+'" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linejoin="round"/>';
  g+='<text x="'+(x(36)-4)+'" y="'+(y(TARGET[36])-14)+'" text-anchor="end" font-size="12" font-weight="600" fill="var(--ink)" font-family="IBM Plex Mono,monospace">'+TARGET[36].toFixed(1)+'kg</text>';
  const pts=[];for(let w=1;w<=36;w++){const a=Store.weekAvg(w);if(a)pts.push([w,a.avg])}
  if(pts.length>1) g+='<path d="'+pts.map((p,i)=>(i?"L":"M")+x(p[0]).toFixed(1)+" "+y(Math.max(ymin,Math.min(ymax,p[1]))).toFixed(1)).join(" ")+'" fill="none" stroke="var(--accent)" stroke-width="2"/>';
  pts.forEach(p=>{g+='<circle cx="'+x(p[0])+'" cy="'+y(Math.max(ymin,Math.min(ymax,p[1])))+'" r="5" fill="var(--accent)" stroke="var(--surface)" stroke-width="2"/>'});
  for(let w=0;w<=36;w++){g+='<rect data-w="'+w+'" x="'+(x(w)-8)+'" y="'+Tp+'" width="16" height="'+(H-Tp-Bt)+'" fill="transparent"/>'}
  const box=$("chartBox");
  box.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="주별 목표 체중 그래프: '+START_WEIGHT+'kg에서 36주차 '+TARGET[36]+'kg까지">'+g+'</svg><div class="tip" hidden></div>';
  const tip=box.querySelector(".tip"), svg=box.querySelector("svg");
  svg.querySelectorAll("rect[data-w]").forEach(r=>{
    const show=()=>{const w=+r.dataset.w, a=Store.weekAvg(w);
      tip.innerHTML="W"+w+" 목표 "+TARGET[w].toFixed(1)+"kg"+(a?" · 내 평균 "+a.avg.toFixed(1)+"kg":"");
      const bb=svg.getBoundingClientRect(), sc=bb.width/W;
      tip.style.left=Math.min(bb.width-70,Math.max(70,x(w)*sc))+"px";tip.style.top=(y(TARGET[w])*sc)+"px";tip.hidden=false};
    r.addEventListener("mouseenter",show);
    r.addEventListener("touchstart",()=>{show();clearTimeout(tipTimer);tipTimer=setTimeout(()=>{tip.hidden=true},2500)},{passive:true});
    r.addEventListener("mouseleave",()=>{tip.hidden=true});
  });
  // milestones
  const ends=[["10월 말","2026-10-31"],["11월 말","2026-11-30"],["12월 말","2026-12-31"],["1월 말","2027-01-31"],["2월 말","2027-02-28"],["3월 말","2027-03-31"],["4월 말","2027-04-30"],["5월 말","2027-05-31"],["6월 27일","2027-06-27"]];
  $("milestones").innerHTML=ends.map((e,i)=>{const w=info(e[1]).week;return '<div class="ms'+(i===ends.length-1?" final":"")+'"><span class="m">'+e[0]+' · W'+w+'</span><span class="v">'+TARGET[w].toFixed(1)+'kg</span><span class="m">BMI '+bmi(TARGET[w])+'</span></div>'}).join("");
  // table
  let rows='<thead><tr><th>주차</th><th>기간</th><th>단계</th><th class="n">목표</th><th class="n">주간 −</th><th class="n">BMI</th><th class="n">내 평균</th><th class="n">차이</th></tr></thead><tbody>';
  for(let w=1;w<=36;w++){
    const P=phaseOf(w), a=Store.weekAvg(w), s=weekStart(w);
    const note=(w-(P.n-1)*9===9?" · 디로드":"")+(w===17?" · 설 브레이크":"");
    const d=a?a.avg-TARGET[w]:null;
    rows+='<tr class="'+(w===I.week?"cur ":"")+(w>1&&P.from===w?"phase-start":"")+'"><td>W'+w+'</td><td>'+md(s)+'~'+md(addDays(s,6))+'</td><td>'+P.n+'단계'+note+'</td><td class="n">'+TARGET[w].toFixed(1)+'</td><td class="n">'+(TARGET[w-1]-TARGET[w]).toFixed(1)+'</td><td class="n">'+bmi(TARGET[w])+'</td><td class="n">'+(a?a.avg.toFixed(1):"—")+'</td><td class="n">'+(d==null?"—":(d>0?"+":"")+d.toFixed(1))+'</td></tr>';
  }
  $("targetTable").innerHTML=rows+"</tbody>";
  renderFitTable();
}

function renderFitTable(){
  const ms=TESTS.map(t=>(Store.get(t.date)||{}).metrics||null);
  let h='<thead><tr><th>항목</th>'+TESTS.map(t=>'<th class="n">'+t.label+'<br><span class="muted">'+md(t.date)+'</span></th>').join("")+'<th class="n">변화</th></tr></thead><tbody>';
  METRICS.forEach(f=>{
    const vals=ms.map(m=>m&&typeof m[f.key]==="number"?m[f.key]:null);
    const got=vals.filter(v=>v!=null);
    let change="—",cls="";
    if(got.length>=2){
      const d=Math.round((got[got.length-1]-got[0])*10)/10;
      change=(d>0?"+":"")+d+f.unit;
      if(d!==0) cls=(d>0)!==!!f.lowerIsBetter?"up":"down";
    }
    h+='<tr><td>'+esc(f.name)+'</td>'+vals.map(v=>'<td class="n">'+(v==null?"—":v+f.unit)+'</td>').join("")+'<td class="n '+cls+'">'+change+'</td></tr>';
  });
  $("fitTable").innerHTML=h+"</tbody>";
}

/* ---------- library ---------- */
function renderLibrary(){
  const groups={};Object.keys(EX).forEach(k=>{const g=EX[k].group;(groups[g]=groups[g]||[]).push(k)});
  const order=["로잉","당기기 · 턱걸이 바","밀기 · 푸시업 바","하체","코어","준비·회복"];
  const lib=$("library");lib.innerHTML="";
  order.forEach(g=>{
    lib.appendChild(el("div",{class:"group-title"},"<h2>"+esc(g)+"</h2><span class='small muted'>"+groups[g].length+"개</span>"));
    const grid=el("div",{class:"lib"});
    groups[g].forEach(k=>{const x=EX[k];grid.appendChild(el("div",{class:"card",id:"ex-"+k},"<h3>"+esc(x.name)+"</h3><div class='tg'>"+esc(x.tg)+"</div>"+howHTML(k)))});
    lib.appendChild(grid);
  });
}

/* ---------- diet tab ---------- */
function renderDiet(){
  let t='<thead><tr><th>단계</th><th>기간</th><th class="n">하루 칼로리</th><th class="n">단백질</th><th class="n">지방</th><th class="n">탄수화물</th><th>식단 조정</th></tr></thead><tbody>';
  PHASES.forEach(P=>{t+='<tr><td>'+P.n+'단계 '+P.name+'</td><td>'+md(weekStart(P.from))+'~'+md(addDays(weekStart(P.to),6))+'</td><td class="n">'+fmt(P.kcal)+'</td><td class="n">'+P.p+'g</td><td class="n">'+P.f+'g</td><td class="n">'+P.c+'g</td><td class="wrap-cell">'+P.adjText+'</td></tr>'});
  t+='<tr><td>설 브레이크</td><td>2/6~2/14</td><td class="n">약 2,500</td><td class="n">150~160g</td><td class="n">—</td><td class="n">—</td><td class="wrap-cell">유지 칼로리. 명절 음식 1인분씩</td></tr>';
  $("phaseTable").innerHTML=t+"</tbody>";
  const wm=$("weekMenu");wm.innerHTML="";
  MENU.forEach((menu,i)=>{
    const k=menu.reduce((s,m)=>s+m.kcal,0), p=menu.reduce((s,m)=>s+m.p,0);
    wm.appendChild(el("div",{class:"panel"},'<div class="row between mb-xs"><h3>'+KD[i]+'요일</h3><span class="num small muted">약 '+fmt(r10(k))+'kcal · '+Math.round(p)+'g</span></div><div class="meals">'+menu.map(m=>'<div class="meal compact"><span class="t">'+esc(m.t)+'</span><div><div class="n">'+esc(m.name)+'</div><div class="i">'+esc(m.items)+'</div></div></div>').join("")+'</div>'));
  });
}

/* ---------- habits ---------- */
function renderRules(){$("rules").innerHTML=RULES.map(r=>"<li><b>"+esc(r[0])+"</b>"+esc(r[1])+"</li>").join("")}

