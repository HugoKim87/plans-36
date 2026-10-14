# 36주 홈트 감량 플랜

로잉머신 · 푸시업 바 · 턱걸이 바 · 맨몸 운동으로 진행하는 36주(2026.10.19 ~ 2027.06.27) 감량 플랜입니다.
빌드 과정 없이 `index.html` 파일 하나로 동작합니다.

## 기능

- **오늘**: 날짜별 운동(세트·횟수, 운동 이름을 누르면 방법 표시)과 식단, 체중·운동 완료 기록
- **주간표**: 1~36주차 요일별 운동 한눈에 보기
- **목표 체중**: 100kg → 78kg 주별·월별 목표 그래프와 표, 내 주 평균 비교
- **운동법**: 로잉 자세, 턱걸이·푸시업·하체·코어 동작 설명
- **식단**: 단계별 칼로리·탄단지, 요일별 메뉴, 장보기, 바꿔 먹기
- **생활습관**: 수면·수분·걷기·정체기 대응 규칙

## GitHub Pages로 배포

1. 이 폴더의 파일(`index.html`, `config.js`, `supabase.sql`, `README.md`)을 저장소 루트에 올립니다.
2. 저장소 **Settings → Pages**에서 Source를 `Deploy from a branch`, 브랜치 `main` / 폴더 `/ (root)`로 지정합니다.
3. 잠시 후 `https://<아이디>.github.io/<저장소명>/` 주소로 접속합니다.

로컬에서 볼 때는 `index.html`을 브라우저로 바로 열면 됩니다.

## 기록 저장 방식

- **Supabase 설정 시**: 로그인하면 체중·운동 완료 기록이 내 계정에만 저장되어 휴대폰·PC 어디서든 이어집니다.
- **설정 안 했거나 로그인 전**: 브라우저 `localStorage`(키: `plan36-log-v1`)에 저장됩니다. 로그인하면 그동안의 기록이 서버로 합쳐집니다.

### Supabase 설정 (약 5분)

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다 (무료 플랜으로 충분).
2. **SQL Editor**에 `supabase.sql` 내용을 붙여넣고 Run → `workout_log` 테이블과 RLS 정책이 생성됩니다.
3. **Authentication → Users → Add user → Create new user**로 내 이메일·비밀번호 계정을 만듭니다. `Auto Confirm User`를 체크하세요.
4. 다른 사람이 가입하지 못하게 **Authentication → Sign In / Providers**에서 `Allow new users to sign up`을 끕니다.
5. **Project Settings → API**에서 `Project URL`과 `anon public` key를 복사해 `config.js`에 넣고 커밋합니다.
6. 페이지의 **오늘 → 오늘 기록** 칸에서 로그인합니다. 로그인 상태는 브라우저에 유지됩니다.

> `anon` key는 공개 저장소에 올라가도 괜찮습니다. RLS 정책 때문에 로그인한 본인 행만 읽고 쓸 수 있습니다.
> `service_role` key는 모든 보안을 우회하므로 절대 `config.js`나 저장소에 넣지 마세요.

기록 데이터는 Supabase **Table Editor → workout_log**에서 직접 보거나 CSV로 내보낼 수 있습니다.

## 수정하기

플랜 내용은 모두 `index.html`의 `<script>` 안에 데이터로 들어 있습니다.

| 바꾸고 싶은 것 | 찾을 곳 |
|---|---|
| 시작일·종료일 | `const START`, `const END` |
| 시작 체중·주별 감량 비율 | `const TARGET` |
| 단계별 칼로리·조정 | `const PHASES` |
| 요일별 운동 구성 | `const PLAN` (단계 1~4, 월~토) |
| 운동 설명 | `const EX` |
| 식단 메뉴 | `const BF`, `DIN`, `MENU` |
| 생활습관 규칙 | `const RULES` |

> 칼로리는 일반 제품 기준 근사치입니다. 지병이 있거나 복용 중인 약이 있다면 시작 전 의사와 상의하세요.
