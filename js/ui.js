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
function blockRow(b,i){
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
}

function renderSession(x){
  const adapted=x.adapted&&x.adapted.notes.length
    ?'<div class="adapted">'+esc(x.adapted.label)+' 측정 반영: '+esc(x.adapted.notes.join(" · "))+'</div>':"";
  $("sessHead").innerHTML='<div class="row"><span class="chip '+x.kind+'">'+KIND[x.kind]+'</span><span class="chip">'+minutesOf(x)+'</span></div><h2>'+esc(x.title)+'</h2><p class="muted">'+esc(x.sub)+'</p>'+adapted;
  // 저장 버튼 등으로 다시 그릴 때 펼쳐 둔 운동 설명이 접히지 않게 유지
  const box=$("sessBlocks");
  const open=box.dataset.date===cur?[...box.querySelectorAll("details")].map(d=>d.open):[];
  box.innerHTML=fullBlocks(x).map(blockRow).join("");
  box.dataset.date=cur;
  box.querySelectorAll("details").forEach((d,i)=>{if(open[i])d.open=true});
}

function renderMetricsForm(x,L){
  const panel=$("metricsPanel"), show=x.kind==="test";
  panel.hidden=!show;
  if(!show) return;
  // 입력 중인 칸은 다시 그리지 않음 (같은 날짜를 보고 있는 동안)
  if(panel.dataset.date===cur&&panel.contains(document.activeElement)) return;
  const m=L.metrics||{};
  $("metricsFields").innerHTML=METRICS.map(f=>'<label class="mfield" for="m_'+f.key+'">'+esc(f.name)+' ('+f.unit+')<input id="m_'+f.key+'" type="number" inputmode="decimal" min="'+f.min+'" max="'+f.max+'" step="any" value="'+(typeof m[f.key]==="number"?m[f.key]:"")+'"></label>').join("");
  panel.dataset.date=cur;
}

function renderLogButtons(L){
  const wi=$("wInput");
  if(document.activeElement!==wi) wi.value=typeof L.weight==="number"?L.weight.toFixed(1):"";
  const db=$("doneBtn");
  db.setAttribute("aria-pressed",L.done?"true":"false");
  db.textContent=L.done?"✓ 운동 완료":"운동 완료 표시";
  const isSun=dowOf(cur)===6;
  const sb1=$("soccerBtn"), sb2=$("noSoccerBtn");
  sb1.setAttribute("aria-pressed",L.soccer===true?"true":"false");
  sb1.textContent=(L.soccer===true?"✓ ":"⚽ ")+(isSun?"축구 다녀옴":"오늘 축구함");
  sb2.hidden=!isSun;
  sb2.setAttribute("aria-pressed",L.soccer===false?"true":"false");
  sb2.textContent=(L.soccer===false?"✓ ":"")+"이번 주 안 감";
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

function renderTodayDiet(I,P,L){
  const menu=MENU[I.dow], brk=isBreak(cur);
  const base=menu.reduce((s,m)=>s+m.kcal,0), prot=menu.reduce((s,m)=>s+m.p,0);
  const soccerWeekday=L.soccer===true&&I.dow!==6, soccerSunday=I.dow===6&&L.soccer!==false;
  const auto=calorieAdjust(cur,Store.get);
  const notes=[brk?"아래 식단에 명절 음식 1~2끼를 더해도 됩니다.":(P.adj?P.n+"단계 조정: "+P.adjText+" (아래 합계에 반영)":"아래 식단 그대로 먹으면 됩니다.")];
  if(auto) notes.push("자동 조정 "+(auto.kcal>0?"+":"")+auto.kcal+"kcal: "+auto.why+" → "+auto.how);
  if(soccerWeekday) notes.push("축구한 날: 저녁 밥 1/2공기 또는 바나나 1개 + 우유 추가 (+300kcal, 합계에 반영)");
  if(soccerSunday) notes.push("축구 가는 날: 아침에 바나나 1개 추가, 점심 자유식은 경기 후에.");
  const target=brk?2500:P.kcal+(auto?auto.kcal:0);
  $("dietChip").textContent=brk?"브레이크 · 약 2,500kcal":P.n+"단계 · 하루 "+fmt(target)+"kcal"+(auto?" (조정)":"");
  $("dietNote").textContent=notes.join(" · ");
  const meals=menu.map(m=>'<div class="meal"><span class="t">'+esc(m.t)+'</span><div><div class="n">'+esc(m.name)+'</div><div class="i">'+esc(m.items)+'</div>'+(m.alt?'<div class="alt">'+esc(m.alt)+'</div>':'')+'</div><span class="k">'+r10(m.kcal)+'kcal · '+Math.round(m.p)+'g</span></div>').join("");
  const tot=(brk?base:base-P.adj+(auto?auto.kcal:0))+(soccerWeekday?300:0);
  $("todayMeals").innerHTML=meals+'<div class="mealtotal"><span>합계</span><span class="num">약 '+fmt(r10(tot))+'kcal · 단백질 '+Math.round(prot)+'g</span></div>';
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
    card.innerHTML='<div class="dh"><span class="dd">'+KD[i]+' '+md(d)+'</span><span class="chip '+x.kind+'">'+KIND[x.kind]+'</span></div><div><b>'+esc(x.title)+'</b> <span class="muted small">'+esc(x.sub)+'</span></div><ul>'+items.map(t=>"<li>"+t+"</li>").join("")+'</ul>'+(L.soccer===true?'<span class="done">⚽ 축구</span>':"")+(L.done&&L.soccer!==true?'<span class="done">✓ 완료</span>':"")+(typeof L.weight==="number"?'<span class="small muted">체중 <span class="num">'+L.weight.toFixed(1)+'</span>kg</span>':"");
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
  const ymin=76,ymax=101;
  const x=w=>L+(W-L-Rr)*w/36, y=v=>Tp+(H-Tp-Bt)*(ymax-v)/(ymax-ymin);
  let g="";
  [80,85,90,95,100].forEach(v=>{g+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)" stroke-width="1"/><text x="'+(L-8)+'" y="'+(y(v)+4)+'" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono,monospace">'+v+'</text>'});
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
  box.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="주별 목표 체중 그래프: 100kg에서 36주차 '+TARGET[36]+'kg까지">'+g+'</svg><div class="tip" hidden></div>';
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

