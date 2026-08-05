import React from 'react';
import { Pencil, Check, RotateCcw } from 'lucide-react';
import { getTrend } from '../utils/trend';
import { TREND_COLORS } from '../data/constants';

const GRID_COLS = 10;
const GRID_ROWS = 12;
const COURT_H = 125;

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

// מגרש כדורסל: פרופורציות מדויקות (ציר Y ביחס 100:125), עם מצב עריכת מיקומים (רשת -
// לחיצה על משבצת ריקה מוסיפה מיקום, לחיצה על מיקום קיים מוחקת אותו) ובורר חצי/מלא מגרש.
export default function CourtView({
  spots,
  latestSession,
  comparisonSession,
  onSpotClick,
  courtMode,
  onChangeCourtMode,
  editMode,
  onToggleEditMode,
  onAddSpot,
  onRemoveSpot,
  onResetSpots,
  showEditHint
}) {
  const isFull = courtMode === 'full';
  const cellW = 100 / GRID_COLS;
  const cellH = COURT_H / GRID_ROWS;

  const gridCells = [];
  if (editMode) {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        gridCells.push({ cx: col * cellW + cellW / 2, cy: row * cellH + cellH / 2, key: `${row}-${col}` });
      }
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 flex items-center justify-between gap-2 mb-2">
        <div className="flex bg-[#1C202A] border border-[#2A2F3D] rounded-xl p-1">
          <button
            onClick={() => onChangeCourtMode('half')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${!isFull ? 'bg-[#FF8A00] text-black' : 'text-[#848B98]'}`}
          >
            חצי מגרש
          </button>
          <button
            onClick={() => onChangeCourtMode('full')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${isFull ? 'bg-[#FF8A00] text-black' : 'text-[#848B98]'}`}
          >
            מגרש מלא
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {editMode && (
            <button
              onClick={onResetSpots}
              aria-label="איפוס מיקומים לברירת מחדל"
              title="איפוס לברירת מחדל"
              className="p-2 rounded-full bg-[#1C202A] text-[#848B98] border border-[#2A2F3D] hover:text-[#EF4444] transition-colors"
            >
              <RotateCcw size={15} />
            </button>
          )}
          <button
            onClick={onToggleEditMode}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-full border font-bold text-[11px] transition-colors
              ${editMode ? 'bg-[#FF8A00] text-black border-[#FF8A00]' : 'bg-[#1C202A] text-[#848B98] border-[#2A2F3D] hover:text-[#FF8A00]'}`}
          >
            {editMode ? <Check size={14} /> : <Pencil size={14} />}
            {editMode ? 'סיום עריכה' : 'עריכת מיקומים'}
            {showEditHint && !editMode && (
              <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-[#EF4444] border-2 border-[#0F1115] animate-pulse"></span>
            )}
          </button>
        </div>
      </div>

      {editMode && (
        <div className="shrink-0 mb-2 px-3 py-2 rounded-xl border border-dashed border-[#FF8A00]/50 bg-[#FF8A00]/10">
          <p className="text-[#FF8A00] text-[11px] font-bold leading-tight">
            לחיצה על משבצת ריקה מוסיפה מיקום זריקה חדש · לחיצה על מיקום קיים מוחקת אותו
          </p>
        </div>
      )}

      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div
          className="relative h-full max-w-full bg-[#A9713F] rounded-3xl border-[6px] border-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden"
          style={{ aspectRatio: isFull ? '100 / 250' : '100 / 125' }}
        >
          <div className="absolute inset-0 bg-black/15 pointer-events-none"></div>
          <div className="absolute inset-0 opacity-15 flex flex-col justify-around pointer-events-none">
            {[...Array(isFull ? 45 : 25)].map((_, i) => (
              <div key={i} className="h-[2px] bg-black/40 w-full shadow-[0_1px_1px_rgba(255,255,255,0.1)]" />
            ))}
          </div>

          <svg viewBox={`0 0 100 ${isFull ? 250 : 125}`} className="absolute inset-0 w-full h-full opacity-90 pointer-events-none">
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
            <svg viewBox={`0 0 100 ${isFull ? 250 : 125}`} className="absolute inset-0 w-full h-full z-[5]">
              {gridCells.map(cell => (
                <rect
                  key={cell.key}
                  x={cell.cx - cellW / 2 + 0.4}
                  y={cell.cy - cellH / 2 + 0.4}
                  width={cellW - 0.8}
                  height={cellH - 0.8}
                  rx="1"
                  fill="rgba(255,255,255,0.05)"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="0.3"
                  strokeDasharray="1.2 1"
                  className="cursor-pointer hover:fill-[#FF8A00]/30"
                  onClick={() => onAddSpot(cell.cx, cell.cy)}
                />
              ))}
            </svg>
          )}

          {spots.map((spot) => {
            const score = latestSession?.data[spot.id];
            const trend = getTrend(score, comparisonSession?.data[spot.id]);
            const trendColor = trend ? TREND_COLORS[trend] : '#FFFFFF';
            if (score === undefined && !editMode) return null;

            return (
              <button
                key={spot.id}
                onClick={() => (editMode ? onRemoveSpot(spot.id) : onSpotClick(spot.id))}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 active:scale-95 z-10 w-5 h-5"
                style={{ left: `${spot.x}%`, top: `${(spot.y / COURT_H) * 100}%`, pointerEvents: 'auto' }}
                title={editMode ? `${spot.name} - לחץ להסרה` : spot.name}
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  {editMode ? (
                    <div className="absolute inset-0 rounded-full bg-[#EF4444]/85 border border-white/70 flex items-center justify-center">
                      <span className="text-white text-[11px] font-black leading-none">×</span>
                    </div>
                  ) : (
                    <>
                      {trend && (
                        <div
                          className="absolute rounded-full"
                          style={{ inset: '1px', backgroundColor: trendColor, boxShadow: `0 0 1px 0px ${trendColor}` }}
                        ></div>
                      )}
                      <span
                        className="relative z-10 font-black text-[10px] text-white"
                        style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.95), 0px 0px 2px rgba(0,0,0,0.95)', fontFamily: 'Impact, sans-serif' }}
                      >
                        {score}
                      </span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
