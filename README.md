# 36주 홈트 감량 플랜

로잉머신 · 푸시업 바 · 턱걸이 바 · 맨몸 운동으로 진행하는 36주(2026.10.19 ~ 2027.06.27) 감량 플랜입니다.
빌드 과정 없이 정적 파일만으로 동작합니다 (GitHub Pages).

## 기능

- **오늘**: 날짜별 운동(세트·횟수, 운동 이름을 누르면 방법과 영상 링크)과 식단, 체중·운동 완료·축구 기록
- **주간표**: 1~36주차 요일별 운동, 축구한 날 ⚽ 표시
- **목표**: 100kg → 78kg 주별·월별 목표 그래프와 표, 내 주 평균 비교
- **운동법**: 로잉 자세, 턱걸이·푸시업·하체·코어 동작 설명과 유튜브 영상 검색 링크
- **식단**: 단계별 칼로리·탄단지, 요일별 메뉴, 장보기, 바꿔 먹기
- **습관**: 수면·수분·걷기·정체기·축구하는 날 규칙

## 한 주의 틀과 축구 규칙

| 일 | 월 | 화 | 수 | 목 | 금 | 토 |
|---|---|---|---|---|---|---|
| 축구 | 회복 | 근력 A | 로잉 존2 | 근력 B | 근력 C (상체·코어) | 가벼운 로잉 |

- 일요일에 **이번 주 안 감**을 누르면 그날은 긴 로잉, 다음 날 월요일은 회복 대신 로잉 인터벌.
- 주중에 **오늘 축구함**을 누르면 그날 운동은 완료 처리, 다음 날이 하체 근력·인터벌이면 회복으로 변경.
- 한 주에 주중 축구가 2회 이상이면 토요일은 휴식.
- 축구한 평일은 식단 합계에 +300kcal.

## 파일 구조

```
index.html          화면 구조(마크업)
config.js           Supabase URL·anon key
css/style.css       스타일 (모바일은 파일 끝 @media 구역)
js/util.js          날짜·숫자·DOM 공통 도구
js/data.js          플랜 데이터: 단계·목표 체중·운동 설명·식단·생활습관 규칙
js/plan.js          일정 규칙: 단계별 세션, 축구 반영, 디로드·측정 (순수 로직)
js/store.js         기록 저장: 브라우저 + Supabase, 실패 시 재전송
js/ui.js            화면 그리기
js/main.js          탭·버튼 이벤트, 시작
supabase.sql        테이블·보안 정책 생성 (처음 1회)
migration-soccer.sql 축구 칼럼 추가 (기존 테이블에 1회)
```

스크립트는 `index.html` 하단에 위 순서대로 로드됩니다.

## 내용 수정하기

| 바꾸고 싶은 것 | 파일 · 위치 |
|---|---|
| 시작 체중·주별 감량 비율 | `js/data.js` → `TARGET` |
| 단계별 칼로리·조정 | `js/data.js` → `PHASES` |
| 운동 설명·영상 검색어 | `js/data.js` → `EX` (`yt: [한국어, 영어]`) |
| 식단 메뉴 | `js/data.js` → `BF`, `DIN`, `MENU` |
| 생활습관 규칙 | `js/data.js` → `RULES` |
| 단계별 세트·횟수 | `js/plan.js` → `PLAN` |
| 요일 배치·축구 규칙 | `js/plan.js` → `plannedFor`, `sessionFor` |
| 시작일·종료일 | `js/util.js` → `START`, `END` |

## GitHub Pages로 배포

1. 이 폴더의 파일과 `css`, `js` 폴더를 저장소 루트에 올립니다 (폴더 구조 그대로).
2. 저장소 **Settings → Pages**에서 Source `Deploy from a branch`, 브랜치 `main` / `/ (root)`.
3. `https://<아이디>.github.io/<저장소명>/` 으로 접속합니다.

## 기록 저장 방식

- **Supabase 설정 + 로그인**: 기록이 내 계정에만 저장되어 휴대폰·PC 어디서든 이어집니다.
- **로그인 전 / Supabase 미설정**: 브라우저 `localStorage`(`plan36-log-v1`)에 저장. 로그인하면 서버로 합쳐집니다.
- **서버 저장 실패 시**: 브라우저에 저장된 값은 유지되고, 다음 접속 때 자동으로 다시 올립니다 (`plan36-dirty-v1`).
- 체중 칸을 비우고 **저장**하면 그날 체중 기록이 지워집니다.

### Supabase 설정

1. [supabase.com](https://supabase.com)에서 프로젝트 생성 (무료 플랜).
2. **SQL Editor**에서 `supabase.sql` 실행. 이미 실행했다면 `migration-soccer.sql`만 실행.
3. **Authentication → Users → Add user** 로 내 계정 생성 (`Auto Confirm User` 체크).
4. **Authentication → Sign In / Providers** 에서 `Allow new users to sign up` 끄기.
5. **Project Settings → API Keys → Legacy API Keys** 의 `anon` key와 Project URL을 `config.js`에 입력.

> `anon` key는 공개 저장소에 올라가도 괜찮습니다 (RLS로 본인 행만 접근).
> `service_role` / secret key는 절대 넣지 마세요.

> 칼로리는 일반 제품 기준 근사치입니다. 지병이 있거나 복용 중인 약이 있다면 시작 전 의사와 상의하세요.
