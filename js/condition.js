"use strict";
/* 컨디션·통증 반영
 * - 기록 형태: log(date).cond = { bad: true, pain: ["knee","ankle","back","shoulder"] }
 * - 컨디션 나쁨: 그날 운동을 회복 세션으로 (축구·측정·휴식·준비일은 그대로)
 * - 통증: 해당 부위에 부담이 큰 동작을 대체하거나 뺌
 * - 같은 부위 통증이 최근 4일 중 3일 이상이면 진료 권고
 */
const PAIN_PARTS=[
  {key:"knee",name:"무릎"},
  {key:"ankle",name:"발목"},
  {key:"back",name:"허리"},
  {key:"shoulder",name:"어깨"}
];
const painName=k=>(PAIN_PARTS.find(p=>p.key===k)||{}).name||k;

// 부위별 대체 규칙: 운동 id → 대체 블록(null이면 제외)
const PAIN_SWAP={
  knee:{
    boxsquat:b=>B("bridge",b.sets,"15회"),
    airsquat:b=>B("bridge",b.sets,"15회"),
    revlunge:b=>B("slbridge",b.sets,"10회/다리"),
    bulgarian:b=>B("slbridge",b.sets,"10회/다리"),
    wallsit:b=>B("bridge",b.sets,"15회")
  },
  ankle:{
    calf:()=>null,
    revlunge:b=>B("bridge",b.sets,"15회"),
    bulgarian:b=>B("bridge",b.sets,"15회"),
    slrdl:b=>B("bridge",b.sets,"15회"),
    mountain:b=>B("deadbug",b.sets,"10회/쪽")
  },
  back:{
    slrdl:b=>B("bridge",b.sets,"15회"),
    kneeraise:b=>B("deadbug",b.sets,"10회/쪽"),
    mountain:b=>B("birddog",b.sets,"10회/쪽"),
    hollow:b=>B("deadbug",b.sets,"10회/쪽")
  },
  shoulder:{
    pushup:()=>null, closepush:()=>null, pikepush:()=>null, declinepush:()=>null,
    pullup:()=>null, chinup:()=>null, negpull:()=>null, scappull:()=>null,
    deadhang:()=>null, kneeraise:b=>B("deadbug",b.sets,"10회/쪽"),
    mountain:b=>B("deadbug",b.sets,"10회/쪽"), plank:b=>B("deadbug",b.sets,"10회/쪽"),
    sideplank:b=>B("birddog",b.sets,"10회/쪽")
  }
};
// 서킷 항목 대체 (문자열)
const PAIN_CIRCUIT={
  knee:[[/스쿼트|런지/,"글루트 브릿지 15회"]],
  ankle:[[/런지/,"글루트 브릿지 15회"]],
  back:[[/할로우/,"데드버그 10회/쪽"]],
  shoulder:[[/푸시업|풀업|플랭크/,"데드버그 10회/쪽"]]
};
// 부위별 로잉 주의
const PAIN_ROW_NOTE={
  knee:"무릎: 통증이 없는 범위에서만, 아프면 걷기로 대체",
  ankle:"발목: 발 스트랩을 느슨하게, 아프면 중단",
  back:"허리: 강도를 낮추고 상체를 과하게 젖히지 않기",
  shoulder:"어깨: 팔 당기기를 짧게, 아프면 중단"
};

const condOf=(log,d)=>{const v=log(d);return v&&v.cond?v.cond:null};

function swapBlock(b,parts,changes){
  if(b.plain) return [b];
  if(b.circuit){
    let items=b.items.slice();
    parts.forEach(p=>(PAIN_CIRCUIT[p]||[]).forEach(([re,rep])=>{
      items=items.map(t=>{if(re.test(t)){changes.add(t.replace(/\s*\d.*$/,"")+" → "+rep.replace(/\s*\d.*$/,""));return rep}return t});
    }));
    return [Object.assign({},b,{items:[...new Set(items)]})];
  }
  if(b.ex==="row"){
    const notes=parts.map(p=>PAIN_ROW_NOTE[p]).filter(Boolean);
    return [notes.length?Object.assign({},b,{note:(b.note?b.note+" · ":"")+notes.join(" · ")}):b];
  }
  for(const p of parts){
    const rule=(PAIN_SWAP[p]||{})[b.ex];
    if(!rule) continue;
    const nb=rule(b), from=(EX[b.ex]||{}).name||b.ex;
    if(!nb){changes.add(from+" 제외");return []}
    const out=Object.assign({},nb,{note:painName(p)+" 통증으로 대체"});
    changes.add(from+" → "+((EX[nb.ex]||{}).name||nb.ex));
    return swapBlock(out,parts.filter(q=>q!==p),changes);   // 다른 부위 규칙도 이어서 검사
  }
  return [b];
}

// 최근 4일(오늘 포함) 중 같은 부위 통증이 3일 이상인 부위
function persistentPain(s,log){
  const count={};
  for(let i=0;i<4;i++){const c=condOf(log,addDays(s,-i));(c&&c.pain||[]).forEach(p=>{count[p]=(count[p]||0)+1})}
  return Object.keys(count).filter(p=>count[p]>=3);
}

/* ---------- 컨디션 반영 단계 ---------- */
function applyCondition(x,s,log){
  const c=condOf(log,s);
  const keep=x.kind==="test"||x.kind==="soccer"||x.kind==="prep"||x.kind==="rest";
  if(!c||keep) return x;
  if(c.bad&&x.kind!=="rec"){
    return Object.assign({},RECOVERY("컨디션 나쁨 · 오늘은 회복만, 계획됐던 "+x.title+"는 건너뜀"),
      {week:x.week,phase:x.phase,deload:x.deload,step:x.step,condition:{bad:true}});
  }
  const parts=(c.pain||[]).filter(p=>PAIN_SWAP[p]);
  if(!parts.length) return x;
  const changes=new Set();
  const blocks=x.blocks.flatMap(b=>swapBlock(b,parts,changes));
  return Object.assign({},x,{blocks,condition:{pain:parts,changes:[...changes]}});
}
