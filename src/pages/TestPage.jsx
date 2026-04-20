import { useState, useRef, useEffect } from 'react';
import { TEST_ITEMS, AGE_GROUPS, CATEGORY_LABELS, CATEGORY_COLORS } from '../data/testItems';

const SCORE_OPTIONS = [
  { value: '+', label: '+', title: '습관적 수행', color: 'bg-green-500 text-white border-green-500' },
  { value: '+F', label: '+F', title: '제약으로 못하나 평상시 수행', color: 'bg-emerald-400 text-white border-emerald-400' },
  { value: '+NO', label: '+NO', title: '기회 부족이나 곧 수행 가능', color: 'bg-teal-400 text-white border-teal-400' },
  { value: '±', label: '±', title: '불안정·과도기 상태', color: 'bg-amber-400 text-white border-amber-400' },
  { value: '-', label: '−', title: '미수행 또는 강요에 의한 수행', color: 'bg-slate-300 text-slate-600 border-slate-300' },
];

function ScoreButtons({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      {SCORE_OPTIONS.map(opt => (
        <button
          key={opt.value}
          type="button"
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={`
            min-w-[40px] h-9 rounded-lg text-sm font-bold border-2 transition-all active:scale-95
            ${value === opt.value
              ? opt.color
              : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
            }
          `}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ItemCard({ item, score, onChange, isBasal }) {
  return (
    <div className={`
      rounded-xl border p-4 transition-all
      ${score
        ? score === '-'
          ? 'bg-slate-50 border-slate-200'
          : 'bg-white border-blue-200 shadow-sm'
        : 'bg-white border-slate-200'
      }
      ${isBasal ? 'ring-2 ring-green-300' : ''}
    `}>
      <div className="flex items-start gap-3">
        <span className="text-xs text-slate-400 font-mono mt-0.5 shrink-0 w-6 text-right">{item.id}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CATEGORY_COLORS[item.category]}`}>
              {item.category}
            </span>
            <span className="text-[10px] text-slate-400">{CATEGORY_LABELS[item.category]}</span>
            <span className="text-[10px] text-slate-400 ml-auto">({item.ageEquiv}세)</span>
          </div>
          <p className="text-sm font-medium text-slate-800 leading-snug">{item.text}</p>
          {item.desc && (
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
          )}
          <div className="mt-3">
            <ScoreButtons value={score} onChange={onChange} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TestPage({ info, initialScores, onComplete, onBack }) {
  const [scores, setScores] = useState(initialScores || {});
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const [showLegend, setShowLegend] = useState(false);
  const groupRefs = useRef({});
  const mainRef = useRef(null);

  const scoredCount = Object.keys(scores).length;
  const pct = Math.round((scoredCount / TEST_ITEMS.length) * 100);

  function setScore(itemId, value) {
    setScores(prev => {
      const next = { ...prev };
      if (next[itemId] === value) delete next[itemId];
      else next[itemId] = value;
      return next;
    });
  }

  function scrollToGroup(idx) {
    setActiveGroupIdx(idx);
    const el = groupRefs.current[idx];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleDone() {
    const unscored = TEST_ITEMS.filter(i => !scores[i.id]).length;
    if (unscored > 0) {
      if (!confirm(`아직 채점되지 않은 문항이 ${unscored}개 있습니다.\n계속 결과를 산출하시겠습니까?`)) return;
    }
    onComplete(scores);
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setActiveGroupIdx(Number(entry.target.dataset.groupIdx));
          }
        });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    Object.values(groupRefs.current).forEach(el => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-xl leading-none">←</button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800 truncate">{info?.name || ''} 검사</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLegend(v => !v)}
                  className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded px-2 py-0.5"
                >
                  채점기호
                </button>
                <button
                  onClick={handleDone}
                  className="bg-blue-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  결과 산출
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-slate-400 shrink-0">{scoredCount}/117</span>
            </div>
          </div>
        </div>

        {showLegend && (
          <div className="bg-slate-50 rounded-lg p-3 mt-1 space-y-1.5">
            {SCORE_OPTIONS.map(opt => (
              <div key={opt.value} className="flex items-center gap-2 text-xs">
                <span className={`w-8 text-center font-bold py-0.5 rounded ${opt.color}`}>{opt.label}</span>
                <span className="text-slate-600">{opt.title}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* 본문: 사이드바 + 메인 */}
      <div className="flex flex-1 overflow-hidden">

        {/* 사이드바 — 연령 구간 네비게이션 */}
        <aside className="w-24 shrink-0 bg-white border-r border-slate-200 sticky top-[57px] self-start h-[calc(100vh-57px)] overflow-y-auto flex flex-col py-2">
          {AGE_GROUPS.map((g, idx) => {
            const [start, end] = g.range;
            const groupItems = TEST_ITEMS.filter(i => i.id >= start && i.id <= end);
            const scoredInGroup = groupItems.filter(i => scores[i.id]).length;
            const allDone = scoredInGroup === groupItems.length;
            const isActive = activeGroupIdx === idx;

            return (
              <button
                key={idx}
                onClick={() => scrollToGroup(idx)}
                className={`
                  relative w-full text-left px-3 py-2.5 transition-all
                  ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-50'
                  }
                `}
              >
                {isActive && (
                  <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-blue-600 rounded-r" />
                )}
                <span className={`block text-xs font-semibold leading-tight ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                  {g.label}
                </span>
                <span className={`block text-[10px] mt-0.5 ${allDone ? 'text-green-500 font-medium' : 'text-slate-400'}`}>
                  {allDone ? '✓ 완료' : `${scoredInGroup}/${groupItems.length}`}
                </span>
              </button>
            );
          })}
        </aside>

        {/* 메인 콘텐츠 */}
        <main ref={mainRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {AGE_GROUPS.map((group, idx) => {
            const [start, end] = group.range;
            const groupItems = TEST_ITEMS.filter(i => i.id >= start && i.id <= end);
            const scoredInGroup = groupItems.filter(i => scores[i.id]).length;

            return (
              <section
                key={idx}
                data-group-idx={idx}
                ref={el => { groupRefs.current[idx] = el; }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-bold text-slate-700">{group.label} 구간</h2>
                  <span className="text-xs text-slate-400">{scoredInGroup}/{groupItems.length}</span>
                  {scoredInGroup === groupItems.length && (
                    <span className="text-xs text-green-600 font-medium">✓ 완료</span>
                  )}
                </div>
                <div className="space-y-3">
                  {groupItems.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      score={scores[item.id]}
                      onChange={val => setScore(item.id, val)}
                      isBasal={false}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          <div className="pb-8">
            <button
              onClick={handleDone}
              className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all text-sm"
            >
              결과 산출하기 →
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
