"use strict";
/* 일정 규칙: 단계별 세션, 축구 반영, 디로드·측정 (DOM과 저장소에 의존하지 않는 순수 로직) */
// 처방 표(PLAN)를 짧게 쓰기 위한 생성 함수: B=근력 블록, R=로잉, C=서킷
const B=(ex,sets,reps,note)=>({ex,sets,reps,note});
const R=(text,note)=>({ex:"row",text,note});
const C=(rounds,items,note)=>({circuit:true,rounds,items,note});
const MOB={ex:"mobility",text:"10분"};
const WALK=t=>({ex:"walk",text:t});
const NOTE=t=>({note:t,plain:true});
const up=(s,a,b)=>s>=2?b:a;

const PLAN={
 1:[
  s=>({kind:"str",title:"근력 A",sub:"당기기 + 하체",blocks:[B("deadhang",3,(20+5*s)+"초"),B("scappull",3,(6+s)+"회"),B("negpull",4,up(s,3,4)+"회","5초 동안 내려오기"),B("pushup",4,(8+s)+"회"),B("boxsquat",3,(12+s)+"회"),B("plank",3,(30+5*s)+"초"),R("피니셔 존2 8분")]}),
  s=>({kind:"int",title:"로잉 인터벌",sub:"30초 강 / 90초 약 + 코어",blocks:[R("워밍업 5분 가볍게"),R("30초 강하게(SPM 24~26) + 90초 천천히 × "+(6+s)+"회"),R("쿨다운 5분"),B("deadbug",3,(8+s)+"회/쪽"),B("birddog",3,"8회/쪽"),B("sideplank",2,(20+5*s)+"초/쪽")]}),
  s=>({kind:"str",title:"근력 B",sub:"밀기 + 하체",blocks:[B("pushup",5,(7+s)+"회","2초 내리고 1초 밀기"),B("pikepush",3,(6+s)+"회"),B("revlunge",3,(8+s)+"회/다리"),B("bridge",3,(15+2*s)+"회"),B("ytw",2,"Y·T·W 각 8회"),B("deadhang",2,(20+5*s)+"초"),R("피니셔 존2 8분")]}),
  s=>({kind:"liss",title:"로잉 존2",sub:"대화 가능한 강도 + 모빌리티",min:20+4*s,blocks:[R("존2 "+(20+4*s)+"분 (SPM 18~22)"),MOB]}),
  s=>({kind:"str",title:"근력 C",sub:"턱걸이 연습 + 전신",blocks:[B("pullup",3,"가능한 개수 −1 (최소 1)","0개면 네거티브로 대체"),B("negpull",3,"3회"),B("pushup",3,"최대의 70%"),B("airsquat",3,(15+s)+"회"),B("slrdl",3,"8회/다리","벽 짚고"),B("sideplank",2,(20+5*s)+"초/쪽"),R("피니셔 존2 8분")]}),
  s=>({kind:"liss",title:"로잉 롱 존2",sub:"이번 주 가장 긴 유산소",min:30+4*s,blocks:[R("존2 "+(30+4*s)+"분 (SPM 18~22)"),MOB]})
 ],
 2:[
  s=>({kind:"str",title:"근력 A",sub:"당기기 + 하체",blocks:[B("pullup",s%2?6:5,up(s,2,3)+"회","세트 사이 2분 휴식"),B("negpull",3,"3회"),B("kneeraise",3,(6+s)+"회"),B("pushup",4,(12+s)+"회"),B("airsquat",4,(15+s)+"회","3초 내려가기"),B("plank",3,(45+5*s)+"초"),R("피니셔 존2 10분")]}),
  s=>({kind:"int",title:"로잉 인터벌",sub:"1분 강 / 1분 약 + 코어",blocks:[R("워밍업 5분 가볍게"),R("1분 강하게(SPM 26~28) + 1분 천천히 × "+(8+s)+"회"),R("쿨다운 5분"),B("deadbug",3,"10회/쪽"),B("sideplank",3,(25+5*s)+"초/쪽"),B("birddog",2,"10회/쪽")]}),
  s=>({kind:"str",title:"근력 B",sub:"밀기 + 한 다리 하체",blocks:[B("pushup",4,(10+s)+"회","맨 아래 1초 정지"),B("pikepush",4,(8+s)+"회"),B("closepush",3,(6+s)+"회"),B("bulgarian",3,(8+s)+"회/다리"),B("slbridge",3,(10+s)+"회/다리"),B("ytw",3,"Y·T·W 각 10회"),R("피니셔 존2 10분")]}),
  s=>({kind:"liss",title:"로잉 존2",sub:"대화 가능한 강도 + 모빌리티",min:30+3*s,blocks:[R("존2 "+(30+3*s)+"분 (SPM 18~22)"),MOB]}),
  s=>({kind:"str",title:"근력 C",sub:"턱걸이 연습 + 전신",blocks:[B("chinup",4,up(s,2,3)+"회"),B("deadhang",3,(40+5*s)+"초"),B("pushup",3,"최대 −2"),B("revlunge",3,(12+s)+"회/다리"),B("slrdl",3,"10회/다리"),B("wallsit",3,(40+5*s)+"초"),B("calf",3,"20회"),R("피니셔 10분","존2 3분 → 30초 강·30초 약 × 4 → 존2 3분")]}),
  s=>({kind:"liss",title:"로잉 롱 존2",sub:"이번 주 가장 긴 유산소",min:40+3*s,blocks:[R("존2 "+(40+3*s)+"분 (SPM 18~22)"),MOB]})
 ],
 3:[
  s=>({kind:"str",title:"근력 A",sub:"당기기 + 하체",blocks:[B("pullup",s%2?6:5,up(s,3,4)+"회","세트 사이 2분 휴식"),B("kneeraise",3,(8+s)+"회"),B("declinepush",4,(8+s)+"회"),B("pushup",3,(15+s)+"회"),B("bulgarian",4,(10+s)+"회/다리"),B("hollow",3,(20+5*s)+"초"),R("피니셔 존2 10분")]}),
  s=>({kind:"int",title:"로잉 템포",sub:"3분 템포 / 1분 약 + 코어",blocks:[R("워밍업 5분 가볍게"),R("3분 템포(SPM 24~26, 힘듦 7/10) + 1분 천천히 × "+up(s,5,6)+"회"),R("쿨다운 5분"),B("mountain",3,(20+4*s)+"회","천천히 통제"),B("sideplank",3,"40초/쪽"),B("deadbug",2,"12회/쪽")]}),
  s=>({kind:"str",title:"근력 B",sub:"밀기 + 한 다리 하체",blocks:[B("pushup",4,(12+s)+"회","3초 내리기"),B("pikepush",4,(8+s)+"회","발을 의자에 올려도 됨"),B("closepush",3,(10+s)+"회"),B("slrdl",4,(10+s)+"회/다리"),B("slbridge",3,(12+s)+"회/다리"),B("ytw",3,"Y·T·W 각 12회"),R("피니셔 존2 10분")]}),
  s=>({kind:"liss",title:"로잉 존2",sub:"대화 가능한 강도 + 모빌리티",min:35+3*s,blocks:[R("존2 "+(35+3*s)+"분 (SPM 18~22)"),MOB]}),
  s=>({kind:"str",title:"근력 C",sub:"친업 + 전신 서킷",blocks:[B("chinup",4,up(s,3,4)+"회"),C(up(s,3,4),["푸시업바 푸시업 10회","맨몸 스쿼트 20회","리버스 런지 10회/다리","플랭크 40초","로잉 250m"],"라운드 사이 90초 휴식"),B("deadhang",2,"최대 시간")]}),
  s=>({kind:"liss",title:"로잉 롱 존2",sub:"이번 주 가장 긴 유산소",min:45+2*s,blocks:[R("존2 "+(45+2*s)+"분 (SPM 18~22)"),MOB]})
 ],
 4:[
  s=>({kind:"str",title:"근력 A",sub:"당기기 + 하체",blocks:[B("pullup",s%2?6:5,up(s,4,5)+"회","세트 사이 2분 휴식"),B("chinup",2,"최대 −1"),B("kneeraise",3,(10+s)+"회"),B("declinepush",4,(10+s)+"회"),B("bulgarian",4,(12+s)+"회/다리"),B("hollow",3,(30+5*s)+"초"),R("피니셔 존2 10분")]}),
  s=>({kind:"int",title:"로잉 피라미드",sub:"강도 올렸다 내리기 + 코어",blocks:[R("워밍업 5분 가볍게"),R(s>=2?"1-2-3-3-2-1분 강하게 (사이 1분 천천히)":"1-2-3-2-1분 강하게 (사이 1분 천천히)","강하게 = SPM 24~28"),R("쿨다운 5분"),B("sideplank",3,"45초/쪽"),B("mountain",3,(30+4*s)+"회","천천히 통제")]}),
  s=>({kind:"str",title:"근력 B",sub:"밀기 + 한 다리 하체",blocks:[B("pushup",4,(15+s)+"회"),B("pikepush",4,(10+s)+"회","발을 의자에 올리기"),B("closepush",3,(12+s)+"회"),B("slrdl",4,"12회/다리"),B("revlunge",3,(12+s)+"회/다리","3초 내려가기"),B("ytw",3,"Y·T·W 각 12회"),R("피니셔 존2 10분")]}),
  s=>({kind:"liss",title:"로잉 존2",sub:"대화 가능한 강도 + 모빌리티",min:40+2*s,blocks:[R("존2 "+(40+2*s)+"분 (SPM 18~22)"),MOB]}),
  s=>({kind:"str",title:"근력 C",sub:"턱걸이 + 전신 서킷",blocks:[B("pullup",3,"3회"),C(up(s,4,5),["풀업 3회","푸시업바 푸시업 12회","맨몸 스쿼트 20회","리버스 런지 10회/다리","할로우 홀드 30초","로잉 300m"],"라운드 사이 90초 휴식")]}),
  s=>({kind:"liss",title:"로잉 롱 존2",sub:"이번 주 가장 긴 유산소",min:50,blocks:[R("존2 50분 (SPM 18~22)","한 번에 어렵다면 25분 × 2"),MOB]})
 ]
};
const REST={kind:"rest",title:"휴식",sub:"걷기 + 회복",blocks:[WALK("30~40분"),MOB]};
const LEG=new Set(["boxsquat","airsquat","revlunge","bulgarian","slrdl","wallsit","calf","bridge","slbridge"]);
function upperOnly(x){
  const blocks=x.blocks.filter(b=>!(b.ex&&LEG.has(b.ex))).map(b=>b.circuit?Object.assign({},b,{items:(it=>it.some(t=>/플랭크|할로우/.test(t))?it:it.concat(["플랭크 40초"]))(b.items.filter(t=>!/스쿼트|런지/.test(t)))}):b);
  return Object.assign({},x,{sub:"상체·코어 · 주말 축구 대비 하체 제외",blocks});
}
// 하체 운동이 들어 있는 세션인지 (서킷은 스쿼트·런지 포함 여부로 판단)
function hasLegWork(x){
  return x.blocks.some(b=>(b.ex&&LEG.has(b.ex))||(b.circuit&&b.items.some(t=>/스쿼트|런지/.test(t))));
}
const RECOVERY=(why)=>({kind:"rec",title:"회복",sub:why,blocks:[R("존2 20~25분 아주 가볍게 (SPM 18~20)","다리가 무거우면 걷기 30분으로 대신"),MOB,NOTE("폼롤러가 있으면 종아리·허벅지 앞뒤 1분씩")]});
const SOCCER=(sub)=>({kind:"soccer",title:"축구",sub,blocks:[
  NOTE("시작 전 10분: 가볍게 조깅 + 무릎·발목 돌리기, 레그 스윙"),
  NOTE("물 1.5L 이상. 경기 중 20~30분마다 몇 모금"),
  NOTE("끝나고 5분 걷기 + 종아리·햄스트링·고관절 스트레칭"),
  NOTE("무릎·발목이 찌르듯 아프면 바로 쉬기")]});
const LIGHT_SAT={kind:"liss",title:"가벼운 로잉",sub:"축구 전날 · 다리 아끼기",min:30,blocks:[R("존2 30분 (SPM 18~20)"),MOB]};
// log(d) → 그날 기록 {weight, done, soccer} 또는 undefined. 일정 계산은 기록에만 의존하는 순수 함수.
function soccerOf(log,d){const v=log(d);return v?v.soccer:undefined}
function plannedFor(log,s,I,P,step){
  // 요일별 기본 틀: 일 축구 / 월 회복 / 화 근력A / 수 존2 / 목 근력B / 금 근력C(상체) / 토 가벼운 로잉
  const p=P.n, d=I.dow;
  if(d===6){
    if(soccerOf(log,s)===false) return Object.assign({},PLAN[p][5](step),{sub:"축구 안 가는 일요일 · 긴 로잉으로 대체"});
    return SOCCER("일요일 08:00~12:00 · 운동 완료로 처리");
  }
  if(d===0){
    if(soccerOf(log,addDays(s,-1))===false){return Object.assign({},PLAN[p][1](step),{sub:"어제 축구를 쉬어서 인터벌로 강도 채우기"})}
    return RECOVERY("축구 다음 날 · 피로 풀기");
  }
  if(d===1) return PLAN[p][0](step);
  if(d===2) return PLAN[p][3](step);
  if(d===3) return PLAN[p][2](step);
  if(d===4) return upperOnly(PLAN[p][4](step));
  return LIGHT_SAT;
}
function testDay(label){
  return {kind:"test",title:"체력 측정",sub:label,blocks:[
    NOTE("아침 공복 체중 · 배꼽 높이 허리둘레 측정 → 아래 '측정 결과 기록'에 입력"),
    R("워밍업 5분 가볍게"),
    B("pullup",1,"최대 개수","반동 없이 턱이 바 위로"),
    B("pushup",1,"최대 개수","3분 쉬고 시작"),
    B("plank",1,"최대 시간","3분 쉬고 시작"),
    R("10분 최대 거리 (m 기록)","처음 2분은 아껴서, 일정한 페이스로"),
    MOB]};
}
const PREP={
 "2026-10-14":{kind:"prep",title:"준비 1일차",sub:"장비 세팅 · 로잉 맛보기",blocks:[R("기술 연습 10분 아주 가볍게","팔만 → 팔+허리 → 전체 순서로 끊어서 연습"),NOTE("체중계·줄자 준비, 식단 탭의 장보기 목록 확인")]},
 "2026-10-15":{kind:"prep",title:"준비 2일차",sub:"로잉 기술 + 모빌리티",blocks:[R("기술 연습 15분 (SPM 18~20)"),MOB]},
 "2026-10-16":{kind:"prep",title:"준비 3일차",sub:"걷기 + 장보기",blocks:[WALK("30분"),NOTE("장보기 (식단 탭 목록)")]},
 "2026-10-17":testDay("기준 측정 · 이 숫자가 출발점입니다"),
 "2026-10-18":SOCCER("준비 주간 일요일 · 저녁에 밀프렙(계란 삶기·고구마 굽기·현미밥 소분)")
};
function deloadify(sess){
  if(sess.kind==="int") return {kind:"liss",title:"로잉 존2 + 코어",sub:"디로드 · 인터벌 쉬는 주",blocks:[R("존2 25분 (SPM 18~22)"),B("deadbug",2,"8회/쪽"),B("birddog",2,"8회/쪽")]};
  if(sess.kind!=="str") return sess;
  return Object.assign({},sess,{blocks:sess.blocks.map(b=>{
    if(b.circuit) return Object.assign({},b,{rounds:Math.max(2,b.rounds-1)});
    if(b.sets) return Object.assign({},b,{sets:Math.max(2,b.sets-1)});
    return b;})});
}
// 그날 운동을 한 것으로 볼지: 직접 완료 체크했거나 축구를 했으면 완료
// (done은 사용자가 누른 값 그대로 저장하고, 축구는 화면·집계에서만 완료로 계산 → 축구 체크를 풀면 원래 상태로 돌아감)
const isDone=v=>!!(v&&(v.done||v.soccer===true));

// 측정·컨디션 반영 전의 기본 일정 (최종 일정은 session.js의 sessionFor)
function scheduledSession(s,log=()=>undefined){
  const I=info(s);
  if(I.prep){
    const base=PREP[s]||PREP[PREP0];
    if(soccerOf(log,s)===true&&base.kind!=="soccer") return Object.assign({week:0,replaced:base.title},SOCCER("주중 축구 · 운동 완료로 처리"));
    if(s==="2026-10-18"&&soccerOf(log,s)===false) return {week:0,kind:"prep",title:"준비 5일차",sub:"밀프렙 + 휴식",blocks:[WALK("30분"),NOTE("계란 삶기 · 고구마 굽기 · 현미밥 소분 · 닭가슴살 준비 (3~4일치)")]};
    return Object.assign({week:0},base);
  }
  const after=!!I.after;
  const P=after?PHASES[3]:phaseOf(I.week);
  const wp=after?8:I.week-(P.n-1)*9, deload=!after&&wp===9, step=after?3:(deload?1:Math.floor((wp-1)/2));
  const meta={week:after?37:I.week,phase:P,deload,step};
  let x;
  if(deload&&I.dow===5) x=testDay(I.week===36?"최종 측정 · 기준 측정과 비교해 보세요":P.n+"단계 마무리 측정");
  else{ x=plannedFor(log,s,I,P,step); if(deload) x=deloadify(x); }
  // 주중 축구 반영
  if(I.dow!==6){
    if(soccerOf(log,s)===true) return Object.assign({},SOCCER("주중 축구 · 운동 완료로 처리"),meta,{replaced:x.title});
    const prev=addDays(s,-1);
    if(I.dow>0&&soccerOf(log,prev)===true&&(x.kind==="int"||(x.kind==="str"&&hasLegWork(x)))){
      return Object.assign({},RECOVERY("어제 축구 · 계획됐던 "+x.title+"는 이번엔 건너뜀"),meta);
    }
    if(I.dow===5&&x.kind!=="test"){
      let n=0;for(let i=0;i<5;i++){if(soccerOf(log,addDays(s,-5+i))===true)n++}
      if(n>=2) return Object.assign({},REST,{sub:"이번 주 주중 축구 "+n+"회 · 내일 축구 전 회복"},meta);
    }
  }
  return Object.assign({},x,meta);
}
function minutesOf(x){
  if(x.kind==="str") return "약 60분";
  if(x.kind==="int") return "약 45분";
  if(x.kind==="liss") return x.min?"약 "+(x.min+10)+"분":"약 35분";
  if(x.kind==="test") return "약 50분";
  if(x.kind==="rest") return "걷기 30~40분";
  if(x.kind==="rec") return "약 35분";
  if(x.kind==="soccer") return "경기 시간";
  return "15~30분";
}

/* 근력일은 앞뒤로 워밍업·쿨다운을 붙여 보여줌 */
function fullBlocks(x){
  if(x.kind==="str") return [{ex:"warmup",text:"10분"}].concat(x.blocks,[{ex:"cooldown",text:"5분"}]);
  return x.blocks;
}
