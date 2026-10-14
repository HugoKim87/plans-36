"use strict";
/* 날짜·숫자·DOM 공통 도구 */
const START="2026-10-19", END="2027-06-27", PREP0="2026-10-14";
const KD=["월","화","수","목","금","토","일"];
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parse=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return ymd(d)};
const utc=s=>{const [y,m,d]=s.split("-").map(Number);return Date.UTC(y,m-1,d)};
const diff=(a,b)=>Math.round((utc(b)-utc(a))/86400000);
const dowOf=s=>(parse(s).getDay()+6)%7;
const md=s=>{const d=parse(s);return (d.getMonth()+1)+"/"+d.getDate()};
const longDate=s=>{const d=parse(s);return (d.getMonth()+1)+"월 "+d.getDate()+"일 ("+KD[dowOf(s)]+")"};
// 오늘 날짜: 자정을 넘겨 열어둔 경우를 위해 refreshToday()로 갱신
let TODAY=ymd(new Date());
function refreshToday(){const t=ymd(new Date());const changed=t!==TODAY;TODAY=t;return changed}

function info(s){
  const d=diff(START,s);
  if(d<0) return {week:0,dow:dowOf(s),prep:true};
  if(d>251) return {week:37,dow:d%7,after:true};
  return {week:Math.floor(d/7)+1,dow:d%7};
}
function weekStart(w){return addDays(START,(w-1)*7)}

/* 숫자 */
const r10=n=>Math.round(n/10)*10;
const fmt=n=>n.toLocaleString("ko-KR");

/* DOM */
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function el(tag,attrs,html){
  const e=document.createElement(tag);
  if(attrs) for(const k in attrs){ if(k==="class") e.className=attrs[k]; else e.setAttribute(k,attrs[k]); }
  if(html!=null) e.innerHTML=html;
  return e;
}
