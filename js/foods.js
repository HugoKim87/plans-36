"use strict";
/* 음식 검색: 앱 기본 목록(FOODS) + 식약처 음식 DB(data/foods-kr.json, 처음 검색할 때 불러옴)
 *
 * - 결과 종류: app(기본 목록) · kr(식약처 음식) · online(식약처 상품, 서버 함수로 검색)
 * - kr·online 음식을 기록할 때는 이름·칼로리·단백질을 함께 저장 → 데이터가 바뀌어도 지난 기록은 그대로
 */
const normName=s=>String(s||"").toLowerCase().replace(/[\s·ㆍ()\[\],.\-_/]/g,"");

// 앱 기본 목록과 이름이 같은 식약처 음식(업체 없는 일반 메뉴)은 검색에서 숨김
// 괄호 설명은 빼고 비교: '설렁탕 (밥 포함)' = '설렁탕'
let appKeys=null;
const appKeySet=()=>appKeys||(appKeys=new Set(FOODS.flatMap(f=>[normName(f.name),normName(f.name.replace(/\(.*?\)/g,""))])));
const dupOfApp=f=>!f.brand&&appKeySet().has(f.key);

const KrFoods=(function(){
  let list=null, loading=null, version="";
  function load(){
    if(list) return Promise.resolve(list);
    if(loading) return loading;
    loading=fetch("data/foods-kr.json").then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}).then(d=>{
      const brands=[""].concat(d.b||[]);
      version=d.v||"";
      list=d.f.map(([name,b,kcal,p,serv])=>({name,brand:brands[b]||"",kcal,p,serv,key:normName(name),bkey:normName(brands[b]||"")}));
      return list;
    }).catch(e=>{loading=null;throw e});
    return loading;
  }
  return {load,ready:()=>!!list,all:()=>list||[],version:()=>version};
})();

// 관련도: 이름이 같음 < 이름이 검색어로 시작 < 단어가 검색어로 시작 < 포함 / 같은 순위면 업체 없는 일반 메뉴, 짧은 이름 먼저
function matchRank(name,key,q){
  if(key===q) return 0;
  if(key.startsWith(q)) return 1;
  if(String(name).toLowerCase().split(/\s+/).some(w=>normName(w).startsWith(q))) return 2;
  return 3;
}
function searchFoods(query,limit=60){
  const q=normName(query);
  if(!q) return [];
  const app=FOODS.filter(f=>normName(f.name).includes(q))
    .map(f=>({type:"app",id:f.id,name:f.name,kcal:f.kcal,p:f.p,rank:matchRank(f.name,normName(f.name),q)}))
    .sort((a,b)=>a.rank-b.rank||a.name.length-b.name.length);
  const kr=KrFoods.all().filter(f=>(f.key.includes(q)||(f.bkey&&f.bkey.includes(q)))&&!dupOfApp(f))
    .map(f=>({type:"kr",name:f.name,brand:f.brand,serv:f.serv,kcal:f.kcal,p:f.p,rank:f.key.includes(q)?matchRank(f.name,f.key,q):4}))
    .sort((a,b)=>a.rank-b.rank||(!!a.brand-!!b.brand)||a.name.length-b.name.length)
    .slice(0,Math.max(0,limit-app.length));
  return app.concat(kr);
}

// 온라인 상품 결과: 이름·업체·제공량이 같으면 하나만
function dedupeOnline(items){
  const seen=new Set();
  return items.filter(x=>{const k=normName(x.name)+"|"+normName(x.brand)+"|"+normName(x.serv);if(seen.has(k))return false;seen.add(k);return true});
}

// 검색 결과 → 기록용 항목 (q = 몇 인분)
function foodItem(r,q){
  if(r.type==="app") return {f:r.id,q};
  const label=r.name+(r.brand?" · "+r.brand:"")+(r.serv?" ("+r.serv+")":"");
  return {f:r.type,n:label,k:Math.round(r.kcal),p:Math.round(r.p*10)/10,q};
}
