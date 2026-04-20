import { TEST_ITEMS, AGE_GROUPS } from '../data/testItems';

// 점수 가중치
export const SCORE_WEIGHTS = {
  '+': 1,
  '+F': 1,
  '+NO': 1,
  '±': 0.5,
  '-': 0,
};

// 연령(년+월) → 소수 년수 변환
export function ageToDecimal(years, months) {
  return Number(years || 0) + Number(months || 0) / 12;
}

// 소수 년수 → "X년 Y개월" 표현
export function decimalToAgeStr(decimal) {
  if (!decimal || decimal <= 0) return '-';
  const years = Math.floor(decimal);
  const months = Math.round((decimal - years) * 12);
  if (years === 0) return `${months}개월`;
  if (months === 0) return `${years}세`;
  return `${years}세 ${months}개월`;
}

// 기저선(basal) 찾기: 연속으로 모든 문항이 통과된 마지막 연령구간
export function findBasal(scores) {
  let basalItemId = 0;
  for (const group of AGE_GROUPS) {
    const [start, end] = group.range;
    const groupItems = TEST_ITEMS.filter(i => i.id >= start && i.id <= end);
    const allPassed = groupItems.every(item => {
      const s = scores[item.id];
      return s === '+' || s === '+F' || s === '+NO';
    });
    if (allPassed) {
      basalItemId = end;
    } else {
      break;
    }
  }
  return basalItemId;
}

// 총점 계산 (기본점 + 가산점)
export function calculateRawScore(scores) {
  const basalItemId = findBasal(scores);

  let baseScore = 0;
  let additionalScore = 0;

  for (const item of TEST_ITEMS) {
    if (item.id <= basalItemId) {
      // 기저선 이하: 모두 만점 처리
      baseScore += 1;
    } else {
      const s = scores[item.id];
      additionalScore += SCORE_WEIGHTS[s] || 0;
    }
  }

  return { baseScore, additionalScore, total: baseScore + additionalScore };
}

// SA(사회연령) 산출: 총 점수를 연령등가치로 변환
// 각 문항의 ageEquiv가 오름차순 정렬되어 있으므로,
// 총 점수 위치의 문항 ageEquiv를 보간하여 SA를 구함
export function calculateSA(rawTotal) {
  const items = TEST_ITEMS;
  const n = items.length;

  if (rawTotal <= 0) return 0;
  if (rawTotal >= n) return items[n - 1].ageEquiv;

  const lowerIdx = Math.floor(rawTotal) - 1;
  const upperIdx = Math.ceil(rawTotal) - 1;
  const frac = rawTotal - Math.floor(rawTotal);

  if (lowerIdx < 0) return items[0].ageEquiv * rawTotal;
  if (upperIdx >= n) return items[n - 1].ageEquiv;

  const lower = items[lowerIdx].ageEquiv;
  const upper = items[upperIdx].ageEquiv;
  return lower + (upper - lower) * frac;
}

// SQ(사회지수) = SA / CA × 100
export function calculateSQ(sa, caYears, caMonths) {
  const ca = ageToDecimal(caYears, caMonths);
  if (!ca || ca <= 0) return null;
  return Math.round((sa / ca) * 100);
}

// 영역별 점수 집계
export function calculateCategoryScores(scores) {
  const categories = ['C', 'S', 'SHG', 'SHD', 'SHE', 'L', 'O', 'SD'];
  const result = {};

  for (const cat of categories) {
    const items = TEST_ITEMS.filter(i => i.category === cat);
    let passed = 0;
    let total = items.length;
    for (const item of items) {
      passed += SCORE_WEIGHTS[scores[item.id]] || 0;
    }
    result[cat] = { passed, total, pct: total > 0 ? Math.round((passed / total) * 100) : 0 };
  }

  return result;
}

// 전체 결과 한번에 산출
export function computeResult(scores, caYears, caMonths) {
  const { baseScore, additionalScore, total } = calculateRawScore(scores);
  const sa = calculateSA(total);
  const sq = calculateSQ(sa, caYears, caMonths);
  const categoryScores = calculateCategoryScores(scores);
  const basalItemId = findBasal(scores);

  return {
    baseScore: Math.round(baseScore),
    additionalScore: Math.round(additionalScore * 10) / 10,
    total: Math.round(total * 10) / 10,
    sa: Math.round(sa * 100) / 100,
    saStr: decimalToAgeStr(sa),
    sq,
    categoryScores,
    basalItemId,
  };
}
