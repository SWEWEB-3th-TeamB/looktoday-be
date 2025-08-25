// utils/locationLookup.js
const locationMap = require('../data/locationMap');

// --- 1) 시/도 이름 정규화 (별칭 → 정식 키) ---
const SI_ALIAS = new Map([
  // 광역시/특별시
  ['서울', '서울특별시'], ['서울시', '서울특별시'], ['서울특별시', '서울특별시'],
  ['부산', '부산광역시'], ['부산시', '부산광역시'], ['부산광역시', '부산광역시'],
  ['인천', '인천광역시'], ['인천시', '인천광역시'], ['인천광역시', '인천광역시'],
  ['광주', '광주광역시'], ['광주시', '광주광역시'], ['광주광역시', '광주광역시'],
  ['대전', '대전광역시'], ['대전시', '대전광역시'], ['대전광역시', '대전광역시'],
  ['울산', '울산광역시'], ['울산시', '울산광역시'], ['울산광역시', '울산광역시'],

  // 특별자치
  ['세종', '세종특별자치시'], ['세종시', '세종특별자치시'], ['세종특별자치시', '세종특별자치시'],
  ['강원', '강원특별자치도'], ['강원도', '강원특별자치도'], ['강원특별자치도', '강원특별자치도'],
  ['전북', '전북특별자치도'], ['전북도', '전북특별자치도'], ['전라북도', '전북특별자치도'], ['전북특별자치도', '전북특별자치도'],
  ['제주', '제주특별자치도'], ['제주도', '제주특별자치도'], ['제주특별자치도', '제주특별자치도'],

  // 도
  ['경기', '경기도'], ['경기도', '경기도'],
  ['충북', '충청북도'], ['충청북도', '충청북도'],
  ['충남', '충청남도'], ['충청남도', '충청남도'],
  ['전남', '전라남도'], ['전라남도', '전라남도'],
  ['경북', '경상북도'], ['경상북도', '경상북도'],
  ['경남', '경상남도'], ['경상남도', '경상남도'],

  // 특수
  ['이어도', '이어도'],
]);

function normSi(siRaw = '') {
  const s = String(siRaw).trim();
  if (!s) return '';
  const noSpace = s.replace(/\s+/g, '');
  // 별칭 매핑 먼저
  if (SI_ALIAS.has(s)) return SI_ALIAS.get(s);
  if (SI_ALIAS.has(noSpace)) return SI_ALIAS.get(noSpace);
  // 맵에 키가 직접 있으면 그대로
  if (locationMap[s]) return s;
  if (locationMap[noSpace]) return noSpace;
  // 기본: 원문 반환 (최후)
  return s;
}

// --- 2) 구/군/시 이름 정규화 ---
function normGu(guRaw = '') {
  let g = String(guRaw).trim().replace(/\s+/g, '');
  if (!g) return '';
  // 접미사가 없으면 일반적으로 붙여보기 (강남 → 강남구)
  if (!/[구군시]$/.test(g)) {
    // heuristic: 세종/이어도 등 예외는 그대로
    if (!['세종특별자치시', '이어도'].includes(g)) {
      // 가장 흔한 '구'를 우선 시도
      g = g + '구';
    }
  }
  return g;
}

// --- 3) 핵심: 시/구로 좌표 조회 ---
/**
 * @param {string} siRaw  예: '서울', '경기', '부산광역시'
 * @param {string} guRaw  예: '강남구', '수원시', '세종'(빈 가능)
 * @returns { lat, lon, nx, ny, si, gu } | null
 */
function getLatLonBySiGu(siRaw, guRaw) {
  const si = normSi(siRaw);
  const guInput = String(guRaw ?? '').trim();
  const gu = guInput ? normGu(guInput) : '';

  const list = locationMap[si];
  if (!list || !Array.isArray(list) || list.length === 0) return null;

  // 3-1) 구/군이 없는 단일 지역(세종/이어도 등)
  if (!gu) {
    // district === null 이거나 유일 원소면 그걸 반환
    const single = list.length === 1 ? list[0] : list.find(v => v.district == null);
    if (single) {
      return {
        lat: single.lat, lon: single.lon, nx: single.nx, ny: single.ny,
        si, gu: single.district ?? null,
      };
    }
    // 구가 없는데 후보가 여러 개면 null
    return null;
  }

  // 3-2) 완전 일치 먼저 (가장 정확)
  let found = list.find(item => item.district === gu);
  if (found) {
    return {
      lat: found.lat, lon: found.lon, nx: found.nx, ny: found.ny,
      si, gu: found.district,
    };
  }

  // 3-3) 접두사 일치 (예: '강남' → '강남구', '수원' → '수원시')
  found = list.find(item => typeof item.district === 'string' && item.district.startsWith(gu.replace(/[구군시]$/, '')));
  if (found) {
    return {
      lat: found.lat, lon: found.lon, nx: found.nx, ny: found.ny,
      si, gu: found.district,
    };
  }

  // 3-4) 소문자/공백 제거 느슨한 매칭
  const slim = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
  found = list.find(item => slim(item.district) === slim(gu));
  if (found) {
    return {
      lat: found.lat, lon: found.lon, nx: found.nx, ny: found.ny,
      si, gu: found.district,
    };
  }

  return null;
}

// --- 4) "서울 강남구" 같은 한 줄 쿼리 지원 ---
/**
 * @param {string} query 예: '서울 강남구', '경기 수원시', '세종특별자치시'
 * @returns { lat, lon, nx, ny, si, gu } | null
 */
function getByQuery(query = '') {
  const q = String(query).trim().replace(/\s+/g, ' ');
  if (!q) return null;

  // 가장 먼저 시/도 후보를 찾아본다
  // 길이가 긴 이름부터 비교(전북특별자치도 등) → 오매칭 방지
  const siKeys = Object.keys(locationMap).sort((a, b) => b.length - a.length);
  for (const siKey of siKeys) {
    if (q.includes(siKey)) {
      const rest = q.replace(siKey, '').trim(); // 남은 부분을 구/군 후보로
      const res = getLatLonBySiGu(siKey, rest);
      if (res) return res;
    }
  }

  // 별칭 기반으로도 탐색
  for (const [alias, full] of SI_ALIAS.entries()) {
    if (q.includes(alias)) {
      const rest = q.replace(alias, '').trim();
      const res = getLatLonBySiGu(full, rest);
      if (res) return res;
    }
  }

  // 끝까지 못 찾으면 null
  return null;
}

// --- 5) 선택: 특정 시/도의 구/군 목록 얻기 (UI 드롭다운용) ---
function listDistricts(siRaw = '') {
  const si = normSi(siRaw);
  const list = locationMap[si];
  if (!list) return [];
  return list.map(v => v.district).filter(v => v); // null 제외
}

module.exports = {
  getLatLonBySiGu,
  getByQuery,
  listDistricts,
  normSi,
  normGu,
};
