// 식약처 식품영양성분DB(공공데이터포털) 상품 검색 중계 함수
//
// - 앱(GitHub Pages)에서 로그인한 사용자만 호출 (Supabase 기본 JWT 검사)
// - 공공데이터포털 인증키는 Supabase 비밀값 MFDS_API_KEY 에만 보관 (앱·저장소에 넣지 않음)
// - 요청: POST {"q":"햇반"}            → 응답: {"items":[{name,brand,serv,kcal,p}], "total":n}
//         POST {"q":"햇반","debug":true} → 원본 응답의 첫 항목 필드 이름까지 함께 (연결 점검용)
// - kcal·p(단백질 g)는 1회 제공량(제품 중량) 기준. 중량 정보가 없으면 영양성분 기준량(보통 100g) 기준
// - 앱에 이미 들어 있는 '음식'은 빼고 가공식품 위주로 돌려줌

const API = "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo03/getFoodNtrCpntDbInq03";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

// API 버전에 따라 필드 이름이 달라도 찾도록 후보를 차례로 확인
const pick = (o, keys) => { for (const k of keys) if (o[k] != null && String(o[k]).trim() !== "") return o[k]; return null; };
const num = (v) => { const n = parseFloat(String(v ?? "").replace(/,/g, "")); return Number.isFinite(n) ? n : null; };
const amount = (v) => { const m = String(v ?? "").match(/([\d.]+)\s*(g|ml|mL)/); return m ? { n: parseFloat(m[1]), u: m[2].toLowerCase() } : null; };

export function normalize(it) {
  const name = pick(it, ["FOOD_NM_KR", "foodNm", "FOOD_NM", "DESC_KOR"]);
  const kcal = num(pick(it, ["AMT_NUM1", "enerc", "NUTR_CONT1"]));
  if (!name || kcal == null) return null;
  const prot = num(pick(it, ["AMT_NUM3", "prot", "NUTR_CONT3"])) ?? 0;
  const base = amount(pick(it, ["SERVING_SIZE", "nutConSrtrQua", "NUTRI_AMOUNT_SERVING"])) ?? { n: 100, u: "g" };
  const weight = amount(pick(it, ["Z10500", "foodSize", "FOOD_WEIGHT", "SERVING_WT"]));
  const brand = pick(it, ["MAKER_NM", "mfrNm", "IMP_MANFC_NM", "DISTRB_NM", "MAKER_NAME"]) ?? "";
  const group = String(pick(it, ["DB_GRP_NM", "DB_CLASS_NM", "dataCdNm"]) ?? "");
  const f = weight ? weight.n / base.n : 1;
  return {
    name: String(name).replace(/_/g, " ").trim(),
    brand: ["해당없음", "-"].includes(String(brand).trim()) ? "" : String(brand).trim(),
    serv: weight ? `${Math.round(weight.n)}${weight.u}` : `${base.n}${base.u}`,
    kcal: Math.round(kcal * f),
    p: Math.round(prot * f * 10) / 10,
    group,
  };
}

export function parseItems(text) {
  let j;
  try { j = JSON.parse(text); } catch {
    // 인증키 오류 등은 XML로 올 때가 있음
    // 구체적인 원인(인증키 오류 등)을 먼저, 없으면 일반 메시지
    const tag = (t) => (text.match(new RegExp(`<${t}>([^<]*)<`)) || [])[1];
    throw new Error(tag("returnAuthMsg") || tag("resultMsg") || tag("errMsg") || "응답을 해석하지 못했습니다");
  }
  const header = j.header ?? j.response?.header ?? {};
  if (header.resultCode && !["00", "0", "INFO-000"].includes(String(header.resultCode))) throw new Error(header.resultMsg || `오류 코드 ${header.resultCode}`);
  const body = j.body ?? j.response?.body ?? {};
  let items = body.items ?? [];
  if (!Array.isArray(items)) items = items.item ?? [];
  if (!Array.isArray(items)) items = [items];
  return { items, total: Number(body.totalCount ?? items.length) };
}

export async function handle(req, { key = globalThis.Deno?.env.get("MFDS_API_KEY"), fetchImpl = fetch } = {}) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let q = "", debug = false;
  try {
    if (req.method === "POST") { const b = await req.json(); q = String(b.q ?? ""); debug = b.debug === true; }
    else q = new URL(req.url).searchParams.get("q") ?? "";
  } catch { return json({ error: "요청 형식이 올바르지 않습니다" }, 400); }
  q = q.trim();
  if (q.length < 1 || q.length > 40) return json({ error: "검색어는 1~40자로 입력하세요" }, 400);
  if (!key) return json({ error: "MFDS_API_KEY 비밀값이 설정되지 않았습니다" }, 500);

  const url = `${API}?serviceKey=${key.includes("%") ? key : encodeURIComponent(key)}&pageNo=1&numOfRows=50&type=json&FOOD_NM_KR=${encodeURIComponent(q)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal });
    const text = await res.text();
    if (!res.ok) return json({ error: `공공데이터포털 응답 ${res.status}`, detail: text.slice(0, 200) }, 502);
    const { items, total } = parseItems(text);
    const out = items.map(normalize).filter((x) => x && x.group !== "음식");
    return json({ items: out.map(({ group, ...x }) => x), total, ...(debug ? { sampleKeys: items[0] ? Object.keys(items[0]) : [], sample: items[0] ?? null } : {}) });
  } catch (e) {
    const msg = e?.name === "AbortError" ? "공공데이터포털 응답이 늦습니다 (8초 초과)" : String(e?.message ?? e);
    return json({ error: msg }, 502);
  } finally { clearTimeout(timer); }
}

if (globalThis.Deno) Deno.serve((req) => handle(req));
