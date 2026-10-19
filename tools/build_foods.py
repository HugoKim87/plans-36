"""식약처 통합식품영양성분정보 CSV → 앱 내장 음식 DB(data/foods-kr.json)

사용법: python3 tools/build_foods.py <통합식품영양성분정보.csv> data/foods-kr.json
- '음식'(데이터구분코드 D)만 사용 (한식·외식·프랜차이즈 메뉴). 가공식품은 앱의 온라인 상품 검색으로 찾음
- 같은 이름+업체는 하나로 합치고, 1회 제공량(식품중량) 기준 칼로리·단백질은 중앙값
- 띄어쓰기·기호만 다른 이름(예: '계란덮밥' / '계란 덮밥')도 같은 업체면 합침
  단, 칼로리 차이가 크면(25% 초과이면서 40kcal 초과) 다른 기준의 음식으로 보고 따로 둠
- 출력: {"v":기준일, "b":[업체명...], "f":[[이름, 업체번호(0=없음), kcal, 단백질g, 1회 제공량 표기], ...]}
- 제품 전체가 1회 제공량인 메뉴(피자 1판 등)도 있어 앱에서 ¼·½로 조절
식약처 데이터가 갱신되면 새 CSV로 이 스크립트를 다시 돌리면 됨
"""
import csv, json, re, sys, statistics as st

SAME_RATIO, SAME_KCAL = 1.25, 40      # 이 범위 안이면 같은 음식으로 보고 합침


def norm(name):
    return re.sub(r"[\s·ㆍ()\[\],.\-_/]", "", name.lower())


def same_kcal(a, b):
    lo, hi = sorted((a, b))
    return hi - lo <= SAME_KCAL or hi <= lo * SAME_RATIO


def merge_variants(variants):
    """variants: {표기: [(k,p,w,단위)...]} → [(대표 표기, 행 목록)]
    표기별 중앙 칼로리 순으로 정렬해, 가까운 것끼리 묶음 (한 표기는 항상 한 묶음에만)"""
    order = sorted(variants, key=lambda n: st.median(x[0] for x in variants[n]))
    clusters = []
    for n in order:
        k = st.median(x[0] for x in variants[n])
        if clusters and same_kcal(clusters[-1][0], k):
            clusters[-1][1].append(n)
        else:
            clusters.append([k, [n]])
    out = []
    for _, names in clusters:
        # 대표 표기: 데이터가 가장 많은 것 → 띄어쓰기가 많은(읽기 쉬운) 것
        rep = max(names, key=lambda n: (len(variants[n]), n.count(" ")))
        out.append((rep, variants[rep] + [r for n in names if n != rep for r in variants[n]]))   # 대표 표기 행이 앞
    return out


def num(s):
    try:
        return float(str(s).replace(",", "").strip())
    except ValueError:
        return None


def amount(s):
    m = re.match(r"^\s*([\d.]+)\s*(g|ml|mL)\s*$", str(s or ""))
    return (float(m.group(1)), m.group(2).lower()) if m else (None, None)


def main(src, dst):
    groups, dates = {}, []
    with open(src, encoding="utf-8-sig", newline="") as f:
        rd = csv.reader(f)
        H = next(rd)
        ix = {h: i for i, h in enumerate(H)}
        for r in rd:
            if r[ix["데이터구분코드"]] != "D":
                continue
            kcal = num(r[ix["에너지(kcal)"]])
            prot = num(r[ix["단백질(g)"]]) or 0.0
            base, bu = amount(r[ix["영양성분함량기준량"]])
            w, wu = amount(r[ix["식품중량"]])
            if kcal is None or not base:
                continue
            if not w:                      # 1회 제공량이 없으면 기준량(100g)으로
                w, wu = base, bu
            k, p = kcal * w / base, prot * w / base
            if k > 3000 or w > 3000:       # 비정상값 제외
                continue
            name = re.sub(r"\s+", " ", r[ix["식품명"]].replace("_", " ")).strip()
            brand = r[ix["업체명"]].strip()
            if brand in ("해당없음", "-"):
                brand = ""
            groups.setdefault((norm(name), brand), {}).setdefault(name, []).append((k, p, w, wu))
            if r[ix["데이터기준일자"]]:
                dates.append(r[ix["데이터기준일자"]])
    brands = sorted({b for _, b in groups if b})
    bidx = {b: i + 1 for i, b in enumerate(brands)}
    out, merged = [], 0
    for (_, brand), variants in groups.items():
        parts = merge_variants(variants)
        merged += len(variants) - len(parts)
        for name, rows in parts:
            k = st.median(x[0] for x in rows)
            p = st.median(x[1] for x in rows)
            w = st.median(x[2] for x in rows)
            out.append([name, bidx.get(brand, 0), round(k), round(p, 1), f"{round(w)}{rows[0][3]}"])
    out.sort(key=lambda x: (x[0], x[1]))
    data = {"v": max(dates) if dates else "", "b": brands, "f": out}
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(out)} foods ({merged} spacing variants merged), {len(brands)} brands, 기준일 {data['v']}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
