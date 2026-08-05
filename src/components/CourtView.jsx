import React, { useRef, useState } from 'react';
import { Pencil, Check, RotateCcw, Trash2, ChevronDown, Filter, LayoutTemplate, Target } from 'lucide-react';
import { getTrend } from '../utils/trend';
import { TREND_COLORS } from '../data/constants';
import CustomDropdown from './CustomDropdown';
import TemplatesModal from './TemplatesModal';

const COURT_H = 125;
// המגרש נמתח (preserveAspectRatio="none") לפרופורציה רחבה יותר מהיחס הגאומטרי המקורי (100x125/250) -
// כדי שהמגרש ייראה פחות "צר וארוך" ויותר כמו יחס רוחב/אורך אמיתי של חצי מגרש כדורסל.
const HALF_RENDER_H = 108;
const FULL_RENDER_H = 216;

// סימוני מגרש אמיתיים: בקבוק, קשתות עונשין, איזור מוגבל, בלוקים, קרש/סל וקשת שלישיה
function HalfCourtMarkings({ dim }) {
  return (
    <g opacity={dim ? 0.45 : 1}>
      <rect x="25" y="0" width="50" height="55" fill="#A46D42" stroke="white" strokeWidth="1.2" />
      <path d="M 25 55 A 25 25 0 0 0 75 55" fill="none" stroke="white" strokeWidth="1.2" />
      <path d="M 25 55 A 25 25 0 0 1 75 55" fill="none" stroke="white" strokeDasharray="2 2" strokeWidth="1.2" />
      {[41, 45, 49, 53].map(y => (
        <React.Fragment key={y}>
          <line x1="25" y1={y} x2="27.2" y2={y} stroke="white" strokeWidth="0.8" />
          <line x1="72.8" y1={y} x2="75" y2={y} stroke="white" strokeWidth="0.8" />
        </React.Fragment>
      ))}
      <path d="M 44 16 A 6 6 0 0 0 56 16" fill="none" stroke="white" strokeWidth="0.8" />
      <line x1="38" y1="12" x2="62" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="16" r="3.5" fill="#FF4D4D" stroke="white" strokeWidth="1" />
      <path d="M 6 0 L 6 16 A 44 74 0 0 0 94 16 L 94 0" fill="none" stroke="white" strokeWidth="1.2" />
    </g>
  );
}

const computeSessionPerc = (session) => {
  if (!session) return null;
  const values = Object.values(session.data);
  if (values.length === 0) return null;
  const made = values.reduce((a, b) => a + b, 0);
  const total = values.length * session.targetShots;
  return total > 0 ? Math.round((made / total) * 100) : null;
};

export default function CourtView({
  spots,
  latestSession,
  comparisonSession,
  onSpotClick,
  isDemoData,
  targetShots,
  courtMode,
  onChangeCourtMode,
  editMode,
  onToggleEditMode,
  onAddSpot,
  onRemoveSpot,
  onResetSpots,
  onClearAllSpots,
  showEditHint,
  difficultyFilter,
  onChangeDifficultyFilter,
  difficultyFilterOptions,
  templates,
  activeTemplateId,
  onApplyTemplate
}) {
  const isFull = courtMode === 'full';
  const surfaceRef = useRef(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const latestPerc = computeSessionPerc(latestSession);
  const comparisonPerc = computeSessionPerc(comparisonSession);
  const perTrend = getTrend(latestPerc, comparisonPerc);
  const perTrendColor = perTrend ? TREND_COLORS[perTrend] : '#FF8A00';

  // ממיר לחיצה (בכל פיקסל, כולל בדיוק על קווי הקשתות) לקואורדינטת מגרש מדויקת -
  // המשטח מוגבל תמיד לחצי הקרוב לסל (0-125), גם במצב "מגרש מלא", כי זהו החצי היחיד עם מיקומי זריקה
  const handleSurfaceClick = (e) => {
    if (!surfaceRef.current) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const fracX = (e.clientX - rect.left) / rect.width;
    const fracY = (e.clientY - rect.top) / rect.height;
    if (fracX < 0 || fracX > 1 || fracY < 0 || fracY > 1) return;
    const x = Math.round(fracX * 100 * 10) / 10;
    const y = Math.round(fracY * COURT_H * 10) / 10;
    onAddSpot(x, y);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* פס מצב קומפקטי - לחיצה פותחת שכבה שנייה מעל המגרש עם כל הפרטים המלאים */}
      <div className="shrink-0 relative mb-2 z-20">
        <button
          onClick={() => setShowInfo(o => !o)}
          className="w-full flex items-center justify-between bg-[#1C202A] border border-[#2A2F3D] rounded-2xl px-3 py-2 shadow-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2.5 py-1 rounded-lg font-black text-sm shrink-0" style={{ backgroundColor: `${perTrendColor}22`, color: perTrendColor }}>
              {latestPerc ?? '-'}%
            </span>
            <span className="text-[#848B98] text-[11px] font-medium truncate">
              {latestSession ? new Date(latestSession.date).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' }) : 'אין נתונים עדיין'}
            </span>
            {isDemoData && <span className="text-[#FF8A00] text-[10px] font-bold shrink-0">· הדגמה</span>}
          </div>
          <ChevronDown size={16} className={`text-[#848B98] shrink-0 transition-transform duration-300 ${showInfo ? 'rotate-180' : ''}`} />
        </button>

        {showInfo && (
          <div className="absolute top-full inset-x-0 mt-1.5 bg-[#1C202A] border border-[#2A2F3D] rounded-2xl p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-2">
            {isDemoData && (
              <p className="text-[#FF8A00] text-[11px] font-bold leading-relaxed mb-2.5 pb-2.5 border-b border-[#2A2F3D]">
                מצב הדגמה - נתונים לדוגמה בלבד. ברגע שתזין אימון אמיתי ראשון, הם יוחלפו במעקב האמיתי שלך.
              </p>
            )}
            <p className="text-white text-xs font-bold flex items-center gap-1.5">
              <Target size={12} className="text-[#FF8A00]" />
              מתוך <span className="text-[#FF8A00]">{targetShots}</span> זריקות לעמדה · לחץ על מספר במגרש לפרטים
            </p>
            <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-[#2A2F3D] text-[10px] text-[#848B98]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: TREND_COLORS.up }}></span>שיא חדש</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: TREND_COLORS.same }}></span>ללא שינוי</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: TREND_COLORS.down }}></span>ירידה</span>
            </div>
          </div>
        )}
      </div>

      {/* בקרות: חצי/מלא מגרש + עריכת מיקומים */}
      <div className="shrink-0 grid grid-cols-2 gap-2 mb-2">
        <div className="flex bg-[#1C202A] border border-[#2A2F3D] rounded-2xl p-1 shadow-sm">
          <button
            onClick={() => onChangeCourtMode('half')}
            className={`flex-1 px-2 py-2.5 rounded-xl text-[11px] font-bold transition-colors ${!isFull ? 'bg-[#FF8A00] text-black shadow-sm' : 'text-[#848B98]'}`}
          >
            חצי מגרש
          </button>
          <button
            onClick={() => onChangeCourtMode('full')}
            className={`flex-1 px-2 py-2.5 rounded-xl text-[11px] font-bold transition-colors ${isFull ? 'bg-[#FF8A00] text-black shadow-sm' : 'text-[#848B98]'}`}
          >
            מגרש מלא
          </button>
        </div>

        <button
          onClick={onToggleEditMode}
          className={`relative flex items-center justify-center gap-1.5 rounded-2xl border font-bold text-[11px] shadow-sm transition-colors
            ${editMode ? 'bg-[#FF8A00] text-black border-[#FF8A00]' : 'bg-[#1C202A] text-[#848B98] border-[#2A2F3D] hover:text-[#FF8A00]'}`}
        >
          {editMode ? <Check size={14} /> : <Pencil size={14} />}
          {editMode ? 'סיום עריכה' : 'עריכת מיקומים'}
          {showEditHint && !editMode && (
            <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-[#EF4444] border-2 border-[#0F1115] animate-pulse"></span>
          )}
        </button>
      </div>

      {/* בקרות: סינון לפי סוג קליעה + תבניות מיקומים */}
      <div className="shrink-0 grid grid-cols-2 gap-2 mb-2">
        <CustomDropdown value={difficultyFilter} options={difficultyFilterOptions} onChange={onChangeDifficultyFilter} icon={Filter} />
        <button
          onClick={() => setShowTemplates(true)}
          className="flex items-center justify-center gap-1.5 bg-[#161920] text-white font-bold text-sm border border-[#3A4155] rounded-xl py-3 px-3 shadow-sm hover:border-[#FF8A00]/50 transition-colors"
        >
          <LayoutTemplate size={15} className="text-[#FF8A00]" />
          <span className="truncate">תבניות מיקומים</span>
        </button>
      </div>

      {editMode && (
        <div className="shrink-0 mb-2 space-y-2">
          <div className="px-3 py-2 rounded-xl border border-dashed border-[#FF8A00]/50 bg-[#FF8A00]/10">
            <p className="text-[#FF8A00] text-[11px] font-bold leading-tight">
              לחיצה בכל מקום על המגרש (גם בדיוק על קו או קשת) מוסיפה מיקום זריקה חדש שם · לחיצה על מיקום קיים מוחקת אותו
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onResetSpots}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1C202A] text-[#848B98] border border-[#2A2F3D] hover:text-[#FF8A00] hover:border-[#FF8A00]/40 text-[11px] font-bold transition-colors"
            >
              <RotateCcw size={13} /> איפוס לברירת מחדל
            </button>
            <button
              onClick={onClearAllSpots}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1C202A] text-[#848B98] border border-[#2A2F3D] hover:text-[#EF4444] hover:border-[#EF4444]/40 text-[11px] font-bold transition-colors"
            >
              <Trash2 size={13} /> מחיקת כל המיקומים
            </button>
          </div>
        </div>
      )}

      <div className={`flex-1 min-h-0 flex justify-center ${isFull ? 'items-start overflow-y-auto' : 'items-center'}`}>
        <div
          className={`relative bg-[#A9713F] rounded-3xl border-[6px] border-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden
            ${isFull ? 'w-full shrink-0' : 'h-full max-w-full'}`}
          style={{ aspectRatio: isFull ? `100 / ${FULL_RENDER_H}` : `100 / ${HALF_RENDER_H}` }}
        >
          <div className="absolute inset-0 bg-black/15 pointer-events-none"></div>
          <div className="absolute inset-0 opacity-15 flex flex-col justify-around pointer-events-none">
            {[...Array(isFull ? 45 : 25)].map((_, i) => (
              <div key={i} className="h-[2px] bg-black/40 w-full shadow-[0_1px_1px_rgba(255,255,255,0.1)]" />
            ))}
          </div>

          <svg
            viewBox={`0 0 100 ${isFull ? 250 : 125}`}
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full opacity-90 pointer-events-none"
          >
            <HalfCourtMarkings />
            {isFull && (
              <>
                <g transform="translate(0, 250) scale(1, -1)">
                  <HalfCourtMarkings dim />
                </g>
                <line x1="0" y1="125" x2="100" y2="125" stroke="white" strokeWidth="1.2" />
                <circle cx="50" cy="125" r="9" fill="none" stroke="white" strokeWidth="1.2" />
              </>
            )}
          </svg>

          {editMode && (
            <div
              ref={surfaceRef}
              onClick={handleSurfaceClick}
              aria-label="לחץ בכל מקום על המגרש כדי להוסיף מיקום זריקה"
              className="absolute inset-x-0 top-0 z-[5] cursor-crosshair"
              style={{ height: isFull ? '50%' : '100%' }}
            />
          )}

          {spots.map((spot) => {
            const score = latestSession?.data[spot.id];
            const hasScore = score !== undefined;
            const trend = hasScore ? getTrend(score, comparisonSession?.data[spot.id]) : null;
            const ringColor = !hasScore ? TREND_COLORS.up : (trend ? TREND_COLORS[trend] : null);

            return (
              <button
                key={spot.id}
                onClick={() => (editMode ? onRemoveSpot(spot.id) : onSpotClick(spot.id))}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 active:scale-95 z-10 w-5 h-5"
                style={{ left: `${spot.x}%`, top: `${(spot.y / COURT_H) * (isFull ? 50 : 100)}%`, pointerEvents: 'auto' }}
                title={editMode ? `${spot.name} - לחץ להסרה` : spot.name}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  {editMode ? (
                    <div className="absolute inset-0 rounded-full bg-[#EF4444]/85 border border-white/70 flex items-center justify-center">
                      <span className="text-white text-[11px] font-black leading-none">×</span>
                    </div>
                  ) : (
                    <>
                      {ringColor && (
                        <div
                          className="absolute rounded-full"
                          style={{ inset: '1px', backgroundColor: ringColor, boxShadow: `0 0 1px 0px ${ringColor}` }}
                        ></div>
                      )}
                      <span
                        className="relative z-10 font-black text-[10px] text-white"
                        style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.95), 0px 0px 2px rgba(0,0,0,0.95)', fontFamily: 'Impact, sans-serif' }}
                      >
                        {hasScore ? score : '-'}
                      </span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {showTemplates && (
        <TemplatesModal
          templates={templates}
          activeTemplateId={activeTemplateId}
          onApply={(t) => { onApplyTemplate(t); setShowTemplates(false); }}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
