import { useState } from 'react';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../data/testItems';

const CAT_ORDER = ['C', 'S', 'SHG', 'SHD', 'SHE', 'L', 'O', 'SD'];

const DEFAULT_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbzi3thbADYf58fofGAhc0Nz443z5F2EidgMbkJKVuQOsGnBrN4r8ojYoVDXPog51wrp/exec';

function SQBadge({ sq }) {
  if (sq === null || sq === undefined) return <span className="text-slate-400">-</span>;
  const color = sq >= 90 ? 'text-green-600' : sq >= 70 ? 'text-yellow-600' : 'text-red-500';
  const label = sq >= 110 ? '우수' : sq >= 90 ? '보통' : sq >= 70 ? '경계선' : '지연';
  return (
    <span className={`${color} font-bold`}>{sq} <span className="text-sm font-normal">({label})</span></span>
  );
}

function BarChart({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-12 text-right shrink-0">
        {value}/{max} ({pct}%)
      </span>
    </div>
  );
}

const BAR_COLORS = {
  C: 'bg-blue-500', S: 'bg-purple-500', SHG: 'bg-green-500',
  SHD: 'bg-emerald-500', SHE: 'bg-teal-500', L: 'bg-orange-500',
  O: 'bg-yellow-500', SD: 'bg-rose-500',
};

export default function ResultPage({ info, result, scores, onBack, onEdit, onSaveRecord }) {
  const [sheetsUrl, setSheetsUrl] = useState(
    () => localStorage.getItem('sms_sheets_url') || DEFAULT_SHEETS_URL
  );
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'ok' | 'error' | null
  const [showSheetsForm, setShowSheetsForm] = useState(false);

  const ca = info.birthYear
    ? (() => {
        const birth = new Date(`${info.birthYear}-${String(info.birthMonth || 1).padStart(2, '0')}-${String(info.birthDay || 1).padStart(2, '0')}`);
        const test = new Date(info.testDate || Date.now());
        const diffMs = test - birth;
        const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
        return years;
      })()
    : null;

  const caStr = ca
    ? `${Math.floor(ca)}세 ${Math.round((ca - Math.floor(ca)) * 12)}개월`
    : '-';

  async function saveToSheets() {
    if (!sheetsUrl.trim()) {
      setShowSheetsForm(true);
      return;
    }
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

      const res = await fetch(sheetsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
        mode: 'no-cors',
      });

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600 text-xl leading-none">←</button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-800">검사 결과</h1>
            <p className="text-xs text-slate-400">
              {info.name || ''} &nbsp;·&nbsp; {info.testDate || ''}
            </p>
          </div>
          <button
            onClick={onEdit}
            className="text-xs text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50"
          >
            재검토
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">

        {/* 주요 결과 카드 */}
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
                <p className="text-2xl font-black">
                  <SQBadge sq={result.sq} />
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-400">생활연령(CA)</p>
                <p className="font-semibold text-slate-700 text-xs mt-0.5">{caStr}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-400">기본점</p>
                <p className="font-semibold text-slate-700">{result.baseScore}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-400">가산점</p>
                <p className="font-semibold text-slate-700">{result.additionalScore}</p>
              </div>
            </div>

            <div className="mt-3 bg-slate-50 rounded-lg p-2 text-center">
              <span className="text-xs text-slate-400">총점 </span>
              <span className="font-bold text-slate-800">{result.total}점</span>
              <span className="text-xs text-slate-400"> / 117점</span>
            </div>
          </div>
        </section>

        {/* SQ 해석 */}
        {result.sq !== null && result.sq !== undefined && (
          <section className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-sm font-bold text-slate-700 mb-3">SQ 해석</h2>
            <div className="space-y-1.5">
              {[
                { range: '130+', label: '최우수', color: 'bg-blue-500' },
                { range: '110~129', label: '우수', color: 'bg-green-500' },
                { range: '90~109', label: '평균', color: 'bg-teal-400' },
                { range: '70~89', label: '경계선', color: 'bg-yellow-400' },
                { range: '50~69', label: '경도 지연', color: 'bg-orange-400' },
                { range: '~49', label: '중도 이하 지연', color: 'bg-red-400' },
              ].map(item => {
                const [min, max] = item.range.includes('+')
                  ? [parseInt(item.range), 999]
                  : item.range.includes('~') && item.range.startsWith('~')
                    ? [0, parseInt(item.range.slice(1))]
                    : item.range.split('~').map(Number);
                const isActive = result.sq >= min && result.sq <= max;
                return (
                  <div
                    key={item.range}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 ${isActive ? 'ring-2 ring-blue-400 bg-blue-50' : 'opacity-40'}`}
                  >
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-xs font-medium text-slate-700 w-20">{item.range}</span>
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
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CATEGORY_COLORS[cat]}`}>
                        {cat}
                      </span>
                      <span className="text-xs text-slate-600">{CATEGORY_LABELS[cat]}</span>
                    </div>
                  </div>
                  <BarChart
                    value={cs.passed}
                    max={cs.total}
                    color={BAR_COLORS[cat]}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* 피검자 정보 요약 */}
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
              ['피면접자', info.interviewee || '-'],
            ].map(([label, val]) => (
              <div key={label} className="flex gap-1">
                <span className="text-slate-400 shrink-0">{label}:</span>
                <span className="text-slate-700 font-medium truncate">{val}</span>
              </div>
            ))}
          </div>
          {info.memo && (
            <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
              비고: {info.memo}
            </p>
          )}
        </section>

        {/* Google Sheets 저장 */}
        <section className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700">Google Sheets 저장</h2>
            <button
              onClick={() => setShowSheetsForm(v => !v)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              {sheetsUrl ? '⚙ URL 변경' : '⚙ 설정'}
            </button>
          </div>

          {showSheetsForm && (
            <div className="mb-3 space-y-2">
              <p className="text-xs text-slate-500">
                Google Apps Script 웹앱 URL을 입력하세요.
                <br />
                <span className="text-blue-500 cursor-pointer" onClick={() => window.open('https://script.google.com', '_blank')}>
                  Apps Script 열기 →
                </span>
              </p>
              <input
                type="url"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://script.google.com/macros/s/..."
                value={sheetsUrl}
                onChange={e => setSheetsUrl(e.target.value)}
              />
              <button
                onClick={saveSheetsUrl}
                className="w-full bg-slate-700 text-white text-xs py-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                저장 및 전송
              </button>
            </div>
          )}

          <button
            onClick={saveToSheets}
            disabled={saving}
            className={`w-full font-semibold py-3 rounded-xl text-sm transition-all active:scale-95 ${
              saving
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {saving ? '전송 중...' : '📊 Google Sheets에 저장'}
          </button>

          {saveStatus === 'ok' && (
            <p className="text-xs text-green-600 text-center mt-2">✓ 전송 완료</p>
          )}
          {saveStatus === 'error' && (
            <p className="text-xs text-red-500 text-center mt-2">
              전송 실패. Apps Script URL을 확인해주세요.
            </p>
          )}
        </section>

        <div className="pb-8" />
      </main>
    </div>
  );
}
