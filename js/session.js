"use strict";
/* 최종 일정 = 기본 일정(plan.js) → 측정 반영(adapt.js) → 컨디션 반영(condition.js)
 * 화면은 이 함수만 사용한다. log(d)는 그날 기록을 돌려주는 함수.
 */
function sessionFor(s,log=()=>undefined){
  let x=scheduledSession(s,log);
  x=applyCalibration(x,s,log);
  x=applyCondition(x,s,log);
  return x;
}
