import { useState } from 'react';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../data/testItems';

const CAT_ORDER = ['C', 'S', 'SHG', 'SHD', 'SHE', 'L', 'O', 'SD'];

const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzi3thbADYf58fofGAhc0Nz443z5F2EidgMbkJKVuQOsGnBrN4r8ojYoVDXPog51wrp/exec';

const SQ_RANGES = [
  { min: 130, max: 999, label: '최우수', color: '#3b82f6' },
  { min: 110, max: 129, label: '우수',   color: '#22c55e' },
  { min: 90,  max: 109, label: '평균',   color: '#14b8a6' },
  { min: 70,  max: 89,  label: '경계선', color: '#eab308' },
  { min: 50,  max: 69,  label: '경도 지연', color: '#f97316' },
  { min: 0,   max: 49,  label: '중도 이하 지연', color: '#ef4444' },
];

function getSQLevel(sq) {
  return SQ_RANGES.find(r => sq >= r.min && sq <= r.max) || SQ_RANGES[SQ_RANGES.length - 1];
}

function BarChart({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2 print:bg-gray-200">
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-slate-500 w-16 text-right shrink-0">
        {value}/{max} ({pct}%)
      </span>
    </div>
  );
}

const BAR_HEX = {
  C: '#3b82f6', S: '#a855f7', SHG: '#22c55e',
  SHD: '#10b981', SHE: '#14b8a6', L: '#f97316',
  O: '#eab308', SD: '#f43f5e',
};

export default function ResultPage({ info, result, scores, onBack, onEdit, onSaveRecord }) {
  const [sheetsUrl, setSheetsUrl] = useState(
    () => localStorage.getItem('sms_sheets_url') || DEFAULT_SHEETS_URL
  );
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [showSheetsForm, setShowSheetsForm] = useState(false);

  const ca = info.birthYear
    ? (() => {
        const birth = new Date(`${info.birthYear}-${String(info.birthMonth || 1).padStart(2, '0')}-${String(info.birthDay || 1).padStart(2, '0')}`);
        const test = new Date(info.testDate || Date.now());
        return (test - birth) / (1000 * 60 * 60 * 24 * 365.25);
      })()
    : null;

  const caStr = ca
    ? `${Math.floor(ca)}세 ${Math.round((ca % 1) * 12)}개월`
    : '-';

  const sqLevel = result.sq != null ? getSQLevel(result.sq) : null;

  // ── PDF 저장 ──────────────────────────────────────────────────────
  function handlePrint() {
    window.print();
  }

  // ── Google Sheets 저장 ────────────────────────────────────────────
  async function saveToSheets() {
    if (!sheetsUrl.trim()) { setShowSheetsForm(true); return; }
    setSaving(true);
    setSaveStatus(null);
    try {
      const row = {
        검사일: info.testDate || '',
        이름: info.name || '',
        성별: info.gender === 'M' ? '남' : info.gender === 'F' ? '여' : '',
        생년월일: `${info.birthYear || ''}-${info.birthMonth || ''}-${info.birthDay || ''}`,
        생활연령: caStr,
        장애: info.disability || '',
        학교학년: `${info.school || ''} ${info.grade || ''}`.trim(),
        IQ: info.iq || '',
        MA: info.ma || '',
        기본점: result.baseScore,
        가산점: result.additionalScore,
        총점: result.total,
        SA: result.saStr,
        SQ: result.sq ?? '',
        면접자: info.examiner || '',
        피면접자: info.interviewee || '',
        관계: info.relationship || '',
        비고: info.memo || '',
        ...Object.fromEntries(
          CAT_ORDER.map(cat => [
            `${cat}(${CATEGORY_LABELS[cat]})`,
            `${result.categoryScores[cat]?.passed || 0}/${result.categoryScores[cat]?.total || 0}`,
          ])
        ),
      };
      // Apps Script는 POST body를 리다이렉트 중 유실 → GET + 쿼리파라미터로 전송
      const url = `${sheetsUrl}?data=${encodeURIComponent(JSON.stringify(row))}`;
      await fetch(url, { method: 'GET', mode: 'no-cors' });
      setSaveStatus('ok');
      onSaveRecord?.();
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }

  function saveSheetsUrl() {
    localStorage.setItem('sms_sheets_url', sheetsUrl);
    setShowSheetsForm(false);
    saveToSheets();
  }

  return (
    <>
      {/* ── 인쇄용 스타일 ────────────────────────────────────────── */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* 헤더 */}
        <header className="no-print bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-xl leading-none">←</button>
            <div className="flex-1">
              <h1 className="text-base font-bold text-slate-800">검사 결과</h1>
              <p className="text-xs text-slate-400">{info.name || ''} &nbsp;·&nbsp; {info.testDate || ''}</p>
            </div>
            <button onClick={onEdit} className="text-xs text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50">
              재검토
            </button>
            <button
              onClick={handlePrint}
              className="text-xs text-slate-600 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1"
            >
              🖨 PDF 저장
            </button>
          </div>
        </header>

        <main className="print-area flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">

          {/* 인쇄 제목 (화면에서는 숨김) */}
          <div className="hidden print:block mb-4">
            <h1 className="text-xl font-bold text-center">사회성숙도 검사 결과</h1>
            <p className="text-sm text-center text-gray-500 mt-1">Social Maturity Scale · 김승국·김옥기</p>
          </div>

          {/* 종합 결과 */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-blue-600 px-4 py-3">
              <h2 className="text-sm font-bold text-white">종합 결과</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-500 mb-1">SA (사회연령)</p>
                  <p className="text-2xl font-black text-blue-700">{result.saStr}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">SQ (사회지수)</p>
                  <p className="text-2xl font-black" style={{ color: sqLevel?.color }}>
                    {result.sq ?? '-'}
                    {sqLevel && <span className="text-sm font-normal text-slate-500 ml-1">({sqLevel.label})</span>}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  ['생활연령(CA)', caStr],
                  ['기본점', result.baseScore],
                  ['가산점', result.additionalScore],
                  ['총점', `${result.total} / 117`],
                ].map(([label, val]) => (
                  <div key={label} className="bg-slate-50 rounded-lg p-2">
                    <p className="text-[10px] text-slate-400">{label}</p>
                    <p className="font-semibold text-slate-700 text-xs mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SQ 해석 */}
          {result.sq != null && (
            <section className="bg-white rounded-xl border border-slate-200 p-4">
              <h2 className="text-sm font-bold text-slate-700 mb-3">SQ 해석</h2>
              <div className="space-y-1.5">
                {SQ_RANGES.map(item => {
                  const isActive = result.sq >= item.min && result.sq <= item.max;
                  return (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${isActive ? 'ring-2 bg-blue-50' : 'opacity-40'}`}
                      style={isActive ? { ringColor: item.color } : {}}
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-medium text-slate-700 w-20">
                        {item.min === 0 ? `~${item.max}` : item.max === 999 ? `${item.min}+` : `${item.min}~${item.max}`}
                      </span>
                      <span className="text-xs text-slate-600">{item.label}</span>
                      {isActive && <span className="ml-auto text-xs font-bold text-blue-600">← 현재</span>}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 영역별 결과 */}
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-700 mb-3">영역별 결과</h2>
            <div className="space-y-3">
              {CAT_ORDER.map(cat => {
                const cs = result.categoryScores[cat];
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CATEGORY_COLORS[cat]}`}>{cat}</span>
                      <span className="text-xs text-slate-600">{CATEGORY_LABELS[cat]}</span>
                    </div>
                    <BarChart value={cs.passed} max={cs.total} color={BAR_HEX[cat]} />
                  </div>
                );
              })}
            </div>
          </section>

          {/* 피검자 정보 */}
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-700 mb-3">피검자 정보</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {[
                ['이름', info.name],
                ['성별', info.gender === 'M' ? '남' : info.gender === 'F' ? '여' : '-'],
                ['생년월일', `${info.birthYear || '-'}.${info.birthMonth || '-'}.${info.birthDay || '-'}`],
                ['생활연령', caStr],
                ['학교/학년', `${info.school || ''} ${info.grade || ''}`.trim() || '-'],
                ['MA', info.ma || '-'],
                ['IQ', info.iq || '-'],
                ['장애', info.disability || '-'],
                ['면접자', info.examiner || '-'],
                ['피면접자', `${info.interviewee || '-'} (${info.relationship || '-'})`],
              ].map(([label, val]) => (
                <div key={label} className="flex gap-1">
                  <span className="text-slate-400 shrink-0">{label}:</span>
                  <span className="text-slate-700 font-medium truncate">{val}</span>
                </div>
              ))}
            </div>
            {info.memo && (
              <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">비고: {info.memo}</p>
            )}
          </section>

          {/* Google Sheets 저장 */}
          <section className="no-print bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-700">Google Sheets 저장</h2>
              <button onClick={() => setShowSheetsForm(v => !v)} className="text-xs text-slate-400 hover:text-slate-600">
                {sheetsUrl ? '⚙ URL 변경' : '⚙ 설정'}
              </button>
            </div>

            {showSheetsForm && (
              <div className="mb-3 space-y-2">
                <input
                  type="url"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://script.google.com/macros/s/..."
                  value={sheetsUrl}
                  onChange={e => setSheetsUrl(e.target.value)}
                />
                <button onClick={saveSheetsUrl} className="w-full bg-slate-700 text-white text-xs py-2 rounded-lg hover:bg-slate-800 transition-colors">
                  저장 및 전송
                </button>
              </div>
            )}

            <button
              onClick={saveToSheets}
              disabled={saving}
              className={`w-full font-semibold py-3 rounded-xl text-sm transition-all active:scale-95 ${
                saving ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {saving ? '전송 중...' : '📊 Google Sheets에 저장'}
            </button>

            {saveStatus === 'ok' && <p className="text-xs text-green-600 text-center mt-2">✓ 전송 완료</p>}
            {saveStatus === 'error' && <p className="text-xs text-red-500 text-center mt-2">전송 실패. Apps Script URL을 확인해주세요.</p>}
          </section>

          <div className="pb-8 no-print" />
        </main>
      </div>
    </>
  );
}
