import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Target, Plus, TrendingUp, Trophy, Flame, Settings, Trash2, Edit3, ChevronDown, BarChart2, X, Filter, Activity, Sparkles, ArrowUp, ArrowDown, Minus, BookOpen, Bold, Italic, Underline, List, ListOrdered, Highlighter, Palette, ArrowRight, FileText, Download, Upload } from 'lucide-react';

const TREND_COLORS = { up: '#22C55E', down: '#EF4444', same: '#FF8A00' };

// משווה בין ציון נוכחי לציון קודם ומחזיר 'up' (שיא נשבר) / 'down' / 'same' / null (אין נתון להשוואה)
const getTrend = (current, previous) => {
  if (current === undefined || current === null || previous === undefined || previous === null) return null;
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'same';
};

// אייקון חץ קטן שמלווה צבע מגמה (עלייה/ירידה/ללא שינוי) כדי שהצבע לא יישאר חידה
const TrendArrow = ({ trend, size = 12, className = '' }) => {
  if (!trend) return null;
  const color = TREND_COLORS[trend];
  const Icon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  return <Icon size={size} style={{ color }} className={`inline-block shrink-0 ${className}`} strokeWidth={3} />;
};

// === מיקומי המגרש המעודכנים מתמטית ברמת הפיקסל! ===
// מערכת הצירים: 100 רוחב על 125 גובה
// קו עונשין = Y:55, לוח סל = Y:12
const SPOTS = [
  // שמאל (קרוב לרחוק) - יושבים על הקו השמאלי (X=25).
  { id: 1, name: 'שמאל 1 מאחורי הקרש', group: 'צד שמאל', x: 25, y: 6 },
  { id: 2, name: 'שמאל 2', group: 'צד שמאל', x: 25, y: 17 },
  { id: 3, name: 'שמאל 3', group: 'צד שמאל', x: 25, y: 27 },
  { id: 4, name: 'שמאל 4', group: 'צד שמאל', x: 25, y: 37 },
  { id: 5, name: 'שמאל 5 רחוק', group: 'צד שמאל', x: 25, y: 48 },

  // אופקי (בדיוק על קו העונשין Y=55. כולם בתוך גבולות הבקבוק X: 25-75)
  { id: 6, name: 'עונשין שמאל חוץ', group: 'אופקי', x: 25, y: 55 },
  { id: 7, name: 'עונשין שמאל פנים', group: 'אופקי', x: 34, y: 55 },
  { id: 8, name: 'עונשין ימין פנים', group: 'אופקי', x: 66, y: 55 },
  { id: 9, name: 'עונשין ימין חוץ', group: 'אופקי', x: 75, y: 55 },

  // ימין (רחוק לקרוב) - יושבים על הקו הימני (X=75).
  { id: 10, name: 'ימין 1 רחוק', group: 'צד ימין', x: 75, y: 48 },
  { id: 11, name: 'ימין 2', group: 'צד ימין', x: 75, y: 37 },
  { id: 12, name: 'ימין 3', group: 'צד ימין', x: 75, y: 27 },
  { id: 13, name: 'ימין 4', group: 'צד ימין', x: 75, y: 17 },
  { id: 14, name: 'ימין 5 מאחורי הקרש', group: 'צד ימין', x: 75, y: 6 },

  // מול הסל: בדיוק באמצע (X=50)
  { id: 15, name: 'קצה הבקבוק קשת עונשין', group: 'מול הסל', x: 50, y: 80 },
  { id: 16, name: 'עונשין אמצע', group: 'מול הסל', x: 50, y: 55 },
  { id: 17, name: 'קשת העונשין הקדמית', group: 'מול הסל', x: 50, y: 30 },
  { id: 18, name: 'מתחת לסל', group: 'מול הסל', x: 50, y: 22 },

  // שלשות: פינות בקו ישר לסל (אותו Y:16 של הסל עצמו), קו אמצע על קשת אמיתית שסוגרת עליהן ברדיוס 74 סביב הסל
  { id: 19, name: 'שלשה פינה שמאל', group: 'שלשות', x: 6, y: 16 },
  { id: 20, name: 'שלשה אמצע', group: 'שלשות', x: 50, y: 90 },
  { id: 21, name: 'שלשה פינה ימין', group: 'שלשות', x: 94, y: 16 }
];

const GROUP_ORDER = ['צד שמאל', 'אופקי', 'צד ימין', 'מול הסל', 'שלשות'];

const STORAGE_DATA_KEY = 'swish_pro_data_v19';
const STORAGE_SETTINGS_KEY = 'swish_pro_settings_v19';
const STORAGE_ONBOARDED_KEY = 'swish_pro_onboarded_v19';
const STORAGE_SETTINGS_SEEN_KEY = 'swish_pro_settings_seen_v19';

// נתוני הדגמה בלבד - מוצגים רק כשאין עדיין אימונים אמיתיים, כדי להראות את האפליקציה "בשיא תפארתה".
// נמחקים אוטומטית ברגע שנשמר אימון אמיתי ראשון, או שהנתונים מנוקים ידנית בהגדרות.
const DEMO_SESSIONS = [
  {
    id: 9005, date: '2026-08-03T18:00:00.000Z', targetShots: 10, isDemo: true,
    data: { 1: 9, 2: 8, 3: 9, 4: 7, 5: 10, 6: 9, 7: 8, 8: 10, 9: 8, 10: 9, 11: 8, 12: 10, 13: 8, 14: 9, 15: 10, 16: 9, 17: 8, 18: 10, 19: 8, 20: 9, 21: 8 },
    notes: {
      general: '<b>ברוך הבא ל-SWISH 10/10!</b><br><br>שמחים מאוד שהצטרפת. הנתונים שאתה רואה כרגע הם הדגמה בלבד, כדי שתכיר את האפליקציה - ברגע שתשמור אימון אמיתי ראשון, או שתבחר למחוק את הנתונים בהגדרות, ההדגמה תיעלם אוטומטית ותתחיל לעקוב אחרי ההתקדמות האמיתית שלך.<br><br>בהצלחה באימונים, ותיהנה מהדרך!',
      zones: {}
    }
  },
  {
    id: 9003, date: '2026-07-28T18:00:00.000Z', targetShots: 10, isDemo: true,
    data: { 1: 5, 2: 4, 3: 5, 4: 3, 5: 6, 6: 5, 7: 4, 8: 6, 9: 4, 10: 5, 11: 4, 12: 6, 13: 4, 14: 5, 15: 6, 16: 5, 17: 4, 18: 6, 19: 4, 20: 5, 21: 4 }
  },
  {
    id: 9002, date: '2026-07-21T18:00:00.000Z', targetShots: 10, isDemo: true,
    data: { 1: 6, 2: 5, 3: 6, 4: 4, 5: 7, 6: 6, 7: 5, 8: 7, 9: 5, 10: 6, 11: 5, 12: 7, 13: 5, 14: 6, 15: 7, 16: 6, 17: 5, 18: 7, 19: 5, 20: 6, 21: 5 }
  },
  {
    id: 9001, date: '2026-07-14T18:00:00.000Z', targetShots: 10, isDemo: true,
    data: { 1: 4, 2: 3, 3: 5, 4: 2, 5: 6, 6: 5, 7: 4, 8: 6, 9: 3, 10: 5, 11: 4, 12: 6, 13: 3, 14: 5, 15: 6, 16: 5, 17: 4, 18: 6, 19: 3, 20: 5, 21: 4 }
  }
];

const INITIAL_SESSION = {
  id: 1715000000000,
  date: '2026-07-29T19:50:03.000Z', // יום רביעי, 22:50:03 בשעון ישראל (UTC+3)
  targetShots: 10,
  data: {
    1: 1, 2: 4, 3: 1, 4: 3, 5: 5,
    6: 2, 7: 6, 8: 6, 9: 2,
    10: 4, 11: 6, 12: 7, 13: 5, 14: 2,
    15: 4, 16: 4, 17: 8, 18: 9,
    19: 2, 20: 4, 21: 4
  }
};

// === תפריט מותאם אישית ===
const CustomDropdown = ({ value, options, onChange, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[#161920] text-white font-bold text-sm border border-[#3A4155] rounded-xl py-3 px-4 focus:outline-none focus:border-[#FF8A00] shadow-sm transition-all"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-[#FF8A00]" />}
          <span className="text-white truncate">
            {selectedOption ? selectedOption.label : 'בחר...'}
          </span>
        </div>
        <ChevronDown size={16} className={`text-[#FF8A00] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#1C202A] border border-[#3A4155] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in zoom-in-95 max-h-56 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full text-right px-4 py-3.5 text-sm font-bold transition-colors border-b border-[#2A2F3D]/50 last:border-0
                  ${value === opt.value ? 'bg-[#FF8A00]/10 text-[#FF8A00]' : 'text-[#E0E2E7] hover:bg-[#2A2F3D]'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// === הזנה משולבת ===
const HybridInput = ({ value, onChange, max }) => {
  const [isOpen, setIsOpen] = useState(false);
  const safeMax = Number.isFinite(max) && max > 0 ? max : 10;

  return (
    <div className="relative flex-shrink-0">
      <div className="relative">
        <input
          type="number"
          min="0"
          max={safeMax}
          value={value !== undefined ? value : ''}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') { onChange(''); return; }
            const v = parseInt(raw, 10);
            if (Number.isFinite(v) && v >= 0 && v <= safeMax) onChange(v);
          }}
          className="appearance-none w-[85px] bg-[#0F1115] text-white font-black text-lg rounded-xl pr-3 pl-8 py-2.5 border border-[#3A4155] focus:border-[#FF8A00] focus:ring-1 focus:ring-[#FF8A00] outline-none transition-all text-center shadow-inner"
          placeholder="-"
          style={{ direction: 'ltr' }}
        />
        <button
          type="button"
          onClick={() => setIsOpen(o => !o)}
          aria-label="בחר מספר מרשימה"
          className="absolute left-2 top-1/2 transform -translate-y-1/2 p-1"
        >
          <ChevronDown className={`w-4 h-4 text-[#FF8A00] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full right-0 mt-2 w-[120px] bg-[#1C202A] border border-[#3A4155] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 max-h-48 overflow-y-auto flex flex-col animate-in fade-in zoom-in-95">
            {Array.from({length: safeMax + 1}, (_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); onChange(i); setIsOpen(false); }}
                className="py-3 text-center font-black text-white hover:bg-[#FF8A00] hover:text-black border-b border-[#2A2F3D]/50 last:border-0 transition-colors"
              >
                {i}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// === עורך טקסט מעוצב ליומן (לא-מבוקר בכוונה - כותב ל-DOM ישירות כדי לשמור על מיקום הסמן בזמן הקלדה) ===
const TEXT_COLOR_SWATCHES = [
  { label: 'ברירת מחדל', value: '#E0E2E7' },
  { label: 'כתום', value: '#FF8A00' },
  { label: 'ירוק', value: '#22C55E' },
  { label: 'אדום', value: '#EF4444' },
];

const HIGHLIGHT_SWATCHES = [
  { label: 'ללא הדגשה', value: 'transparent' },
  { label: 'כתום', value: 'rgba(255,138,0,0.45)' },
  { label: 'ירוק', value: 'rgba(34,197,94,0.45)' },
  { label: 'אדום', value: 'rgba(239,68,68,0.45)' },
];

const RichTextEditor = ({ initialValue, onChange, placeholder }) => {
  const ref = useRef(null);
  const [openPopover, setOpenPopover] = useState(null);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, underline: false });

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialValue || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncActiveFormats = () => {
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
      });
    } catch {
      // ignore - queryCommandState can throw in rare cases when there's no selection yet
    }
  };

  const exec = (cmd, arg) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current.innerHTML);
    setOpenPopover(null);
    syncActiveFormats();
  };

  const btnClass = (active) => `p-2 rounded-lg transition-colors ${active ? 'bg-[#FF8A00]/20 text-[#FF8A00]' : 'text-[#E0E2E7] hover:bg-[#2A2F3D]'}`;

  return (
    <div className="border border-[#3A4155] rounded-xl overflow-hidden bg-[#0F1115]">
      <div className="relative flex items-center gap-0.5 p-2 border-b border-[#3A4155] bg-[#161920] flex-wrap">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('bold')} className={btnClass(activeFormats.bold)} aria-label="הדגשה">
          <Bold size={14} />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('italic')} className={btnClass(activeFormats.italic)} aria-label="נטוי">
          <Italic size={14} />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('underline')} className={btnClass(activeFormats.underline)} aria-label="קו תחתון">
          <Underline size={14} />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertUnorderedList')} className={btnClass(false)} aria-label="רשימת נקודות">
          <List size={14} />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec('insertOrderedList')} className={btnClass(false)} aria-label="רשימה ממוספרת">
          <ListOrdered size={14} />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setOpenPopover(p => p === 'color' ? null : 'color')} className={btnClass(openPopover === 'color')} aria-label="צבע טקסט">
          <Palette size={14} />
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setOpenPopover(p => p === 'highlight' ? null : 'highlight')} className={btnClass(openPopover === 'highlight')} aria-label="הדגשת רקע">
          <Highlighter size={14} />
        </button>
        <div className="w-px h-5 bg-[#3A4155] mx-1 shrink-0"></div>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (!ref.current || !ref.current.textContent.trim()) return;
            if (!window.confirm('למחוק את כל הטקסט בהערה הזו?')) return;
            ref.current.focus();
            document.execCommand('selectAll');
            document.execCommand('delete');
            onChange(ref.current.innerHTML);
            syncActiveFormats();
          }}
          className="p-2 rounded-lg hover:bg-[#C4534A]/15 text-[#C4534A] transition-colors"
          aria-label="מחיקת כל הטקסט"
          title="מחיקת כל הטקסט"
        >
          <Trash2 size={14} />
        </button>

        {openPopover && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenPopover(null)}></div>
            <div className="absolute top-full right-0 mt-1 z-50 bg-[#1C202A] border border-[#3A4155] rounded-xl shadow-xl p-2 flex gap-2">
              {(openPopover === 'color' ? TEXT_COLOR_SWATCHES : HIGHLIGHT_SWATCHES).map(sw => (
                <button
                  key={sw.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => exec(openPopover === 'color' ? 'foreColor' : 'hiliteColor', sw.value)}
                  aria-label={sw.label}
                  title={sw.label}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <span
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center bg-[#0F1115]"
                    style={{ borderColor: sw.value === 'transparent' ? '#3A4155' : sw.value }}
                  >
                    {sw.value === 'transparent' ? (
                      <X size={14} className="text-[#848B98]" />
                    ) : openPopover === 'color' ? (
                      <span className="text-sm font-black" style={{ color: sw.value }}>א</span>
                    ) : (
                      <span className="w-5 h-5 rounded-full" style={{ backgroundColor: sw.value }}></span>
                    )}
                  </span>
                  <span className="text-[8px] text-[#848B98] whitespace-nowrap">{sw.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current.innerHTML)}
        onKeyUp={syncActiveFormats}
        onMouseUp={syncActiveFormats}
        onFocus={syncActiveFormats}
        data-placeholder={placeholder}
        className="journal-content p-3 min-h-[90px] max-h-[50vh] overflow-y-auto text-sm text-[#E0E2E7] leading-relaxed outline-none bg-[#171B24]"
        style={{ direction: 'rtl' }}
      />
    </div>
  );
};

// === גרף אינטראקטיבי מושלם ===
const SmartLineChart = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (data && data.length > 0) setActiveIndex(data.length - 1);
  }, [data]);

  if (!data || data.length === 0) return <div className="text-[#848B98] text-center py-6 text-sm">אין נתונים להצגת גרף</div>;

  const chartData = [...data].reverse();
  const maxPoints = Math.max(chartData.length, 2);
  const safeActiveIndex = Math.min(activeIndex, chartData.length - 1);
  const activeData = chartData[safeActiveIndex] || chartData[chartData.length - 1];

  const getX = (index) => 8 + (index / (maxPoints - 1)) * 84;
  const getSvgY = (percentage) => 100 - percentage;

  const svgPoints = chartData.map((d, i) => `${getX(i)},${getSvgY(d.percentage)}`).join(' ');

  // צבע אחיד לכל הגרף, לפי המגמה בין שתי הנקודות האחרונות (הכי עדכני) - הצורה של הגרף עצמו מראה עלייה/ירידה לאורך הזמן
  const latestPoint = chartData[chartData.length - 1];
  const priorPoint = chartData[chartData.length - 2];
  const graphTrend = priorPoint ? getTrend(latestPoint.percentage, priorPoint.percentage) : null;
  const graphColor = graphTrend ? TREND_COLORS[graphTrend] : '#FF8A00';

  return (
    <div className="w-full relative pt-2 pb-6">

      <div className="bg-[#0F1115] border border-[#3A4155] rounded-xl p-3 mb-6 flex justify-between items-center shadow-inner transition-all">
        <div>
          <p className="text-[#848B98] text-[10px] uppercase tracking-wider mb-0.5">{activeData.fullDate}</p>
          <p className="text-white font-bold text-xs">תוצאת אימון נבחר</p>
        </div>
        <div className="text-2xl font-black drop-shadow-md" style={{ color: graphColor }}>
          {activeData.percentage.toFixed(0)}<span className="text-sm">%</span>
        </div>
      </div>

      <div className="relative h-32 border-b border-[#2A2F3D]">
        {[0, 50, 100].map(val => (
          <div key={val} className="absolute w-full border-t border-[#2A2F3D]/50" style={{ bottom: `${val}%` }}>
            <span className="absolute left-0 -top-2.5 text-[9px] text-[#596070] font-medium">{val}%</span>
          </div>
        ))}

        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none">
          {chartData.length > 1 && (
            <>
              <polygon points={`0,100 ${svgPoints} ${getX(chartData.length-1)},100`} fill="url(#trend-grad)" opacity="0.15"/>
              <polyline points={svgPoints} fill="none" stroke={graphColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </>
          )}
          <defs>
            <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={graphColor} stopOpacity="1" />
              <stop offset="100%" stopColor={graphColor} stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {chartData.map((d, i) => {
          const isActive = i === safeActiveIndex;

          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 cursor-pointer flex flex-col items-center justify-end z-20 group"
              style={{ left: `calc(${getX(i)}% - 15px)`, width: '30px' }}
              onClick={() => setActiveIndex(i)}
            >
              {isActive && (
                <div className="absolute top-0 bottom-0 w-[1px] bg-transparent border-r border-dashed" style={{ left: '50%', borderColor: `${graphColor}80` }}></div>
              )}
              <div
                className={`absolute rounded-full transform -translate-x-1/2 translate-y-1/2 transition-all duration-300
                  ${isActive ? 'w-4 h-4 border-[3px] border-[#1C202A] z-30' : 'w-2 h-2 bg-[#0F1115] border-[2px]'}`}
                style={{
                  left: '50%', bottom: `${d.percentage}%`,
                  backgroundColor: isActive ? graphColor : '#0F1115',
                  borderColor: graphColor,
                  boxShadow: isActive ? `0 0 12px ${graphColor}CC` : 'none'
                }}
              ></div>
            </div>
          );
        })}
      </div>

      <div className="relative h-6 mt-3 w-full">
        {chartData.map((d, i) => {
          const isActive = i === safeActiveIndex;
          return (
            <div
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`absolute transform -translate-x-1/2 text-[9px] text-center font-bold cursor-pointer transition-colors px-1.5 py-1 rounded-md whitespace-nowrap
                ${isActive ? '' : 'text-[#848B98] hover:text-[#E0E2E7]'}`}
              style={{ left: `${getX(i)}%`, top: 0, ...(isActive ? { color: graphColor, backgroundColor: `${graphColor}1A` } : {}) }}
            >
              {d.shortDate}
            </div>
          );
        })}
      </div>
    </div>
  );
};


// טוען את המצב ההתחלתי (אימונים, הגדרות, האם להציג דמה) פעם אחת בלבד, באופן סינכרוני,
// לפני הרינדור הראשון - כדי שהמסך הראשון שהמשתמש רואה כבר יהיה הנכון, בלי הבזק ריק שקופץ
// לתוכן האמיתי רגע אחרי (מה שגרם לתחושת פתיחה "לא חלקה").
let cachedInitialLoad = null;
const loadInitialState = () => {
  if (cachedInitialLoad) return cachedInitialLoad;

  const savedData = localStorage.getItem(STORAGE_DATA_KEY);
  const savedSettingsRaw = localStorage.getItem(STORAGE_SETTINGS_KEY);

  let settings = { targetShots: 10 };
  if (savedSettingsRaw) {
    try {
      const parsedSettings = JSON.parse(savedSettingsRaw);
      if (parsedSettings && Number.isFinite(parsedSettings.targetShots) && parsedSettings.targetShots > 0) {
        settings = parsedSettings;
      }
    } catch {
      // ignore corrupted settings, keep defaults
    }
  }

  let parsedSessions = null;
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      if (Array.isArray(parsed) && parsed.length > 0) parsedSessions = parsed;
    } catch {
      // ignore corrupted data, fall back to initial session
    }
  }

  const onboarded = localStorage.getItem(STORAGE_ONBOARDED_KEY) === 'true';

  // בגרסאות ישנות של האפליקציה (לפני שהיה מצב דגמה אמיתי), טעינה ריקה הייתה שומרת אוטומטית
  // אימון-דוגמה בודד וקבוע (INITIAL_SESSION) כאילו הוא נתון אמיתי. כדי שמשתמשים כאלה עדיין
  // יקבלו את חוויית הדגמה המלאה (ולא רק אימון בודד "אמיתי" למראית עין), מתייחסים למצב הזה
  // בדיוק כמו למי שטרם התחיל בכלל.
  const isLegacyPlaceholderOnly = !!parsedSessions && parsedSessions.length === 1 && parsedSessions[0].id === INITIAL_SESSION.id && !onboarded;

  let sessions;
  let isDemoData = false;

  if (parsedSessions && !isLegacyPlaceholderOnly) {
    // מתקן רטרואקטיבית תאריך שגוי שנשמר בעבר עבור אימון הדוגמה המובנה (מזוהה לפי ה-id הקבוע שלו)
    const fixedSessions = parsedSessions.map(s =>
      s.id === INITIAL_SESSION.id && s.date !== INITIAL_SESSION.date
        ? { ...s, date: INITIAL_SESSION.date }
        : s
    );
    sessions = fixedSessions;
    if (JSON.stringify(fixedSessions) !== JSON.stringify(parsedSessions)) {
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(fixedSessions));
    }
    // למי שכבר יש נתונים אמיתיים משמורים (כולל משתמשים ותיקים) - לוודא שלעולם לא יראו מצב דמה בעתיד
    if (!onboarded) localStorage.setItem(STORAGE_ONBOARDED_KEY, 'true');
  } else if (onboarded) {
    // המשתמש כבר "סיים" את שלב ההיכרות (הזין אימון אמיתי או ניקה נתונים בעבר) - לא מציגים דמה, נשארים ריקים
    sessions = [];
  } else {
    // טעינה ראשונה אי פעם (או רק אימון הדוגמה הישן שנחשב "לא-אמיתי") - מציגים מצב הדגמה
    sessions = DEMO_SESSIONS;
    isDemoData = true;
  }

  cachedInitialLoad = { sessions, settings, isDemoData };
  return cachedInitialLoad;
};

export default function App() {
  const mainRef = useRef(null);
  const importInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('court');
  const [sessions, setSessions] = useState(() => loadInitialState().sessions);
  const [settings, setSettings] = useState(() => loadInitialState().settings);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedSpotDetails, setSelectedSpotDetails] = useState(null);
  const [recordCelebration, setRecordCelebration] = useState(null);
  const [isDemoData, setIsDemoData] = useState(() => loadInitialState().isDemoData);
  const [showSettingsHint, setShowSettingsHint] = useState(() => localStorage.getItem(STORAGE_SETTINGS_SEEN_KEY) !== 'true');

  const [currentInput, setCurrentInput] = useState({});
  const [editingId, setEditingId] = useState(null);

  const [filterMode, setFilterMode] = useState('overall');
  const [filterZone, setFilterZone] = useState(GROUP_ORDER[0]);
  const [filterSpot, setFilterSpot] = useState(SPOTS[0].id);

  const [journalSessionId, setJournalSessionId] = useState(null);
  const [expandedZones, setExpandedZones] = useState({});

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [activeTab, journalSessionId]);

  useEffect(() => {
    if (settings.showJournal !== true && activeTab === 'journal') setActiveTab('court');
  }, [settings.showJournal, activeTab]);

  useEffect(() => {
    // נתוני דמה לעולם לא נשמרים בזיכרון - כדי שברענון הבא עדיין ניחשב "לא התחלתי" ולא "יש לי נתונים אמיתיים"
    if (sessions.length > 0 && !isDemoData) {
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(sessions));
    }
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  }, [sessions, settings, isDemoData]);

  const saveSession = () => {
    const entries = Object.entries(currentInput).filter(([, v]) => v !== '' && v !== undefined && v !== null);
    if (entries.length === 0) return;
    const cleanedInput = Object.fromEntries(entries);

    if (editingId) {
      const updatedSessions = sessions.map(s =>
        s.id === editingId ? { ...s, data: cleanedInput } : s
      );
      setSessions(updatedSessions);
    } else {
      const newSession = {
        id: Date.now(),
        date: new Date().toISOString(),
        targetShots: settings.targetShots,
        data: cleanedInput
      };

      if (isDemoData) {
        // האימון האמיתי הראשון שנשמר מוחק את נתוני ההדגמה ומתחיל מעקב אמיתי נקי
        setIsDemoData(false);
        localStorage.setItem(STORAGE_ONBOARDED_KEY, 'true');
        setSessions([newSession]);
      } else {
        const newPerc = sessionOverallPerc(newSession);
        const priorPercs = sessions.map(sessionOverallPerc).filter(p => p !== null);
        const priorBest = priorPercs.length > 0 ? Math.max(...priorPercs) : null;
        if (newPerc !== null && priorBest !== null && newPerc > priorBest) {
          const ma = sessionMadeAttempts(newSession);
          setRecordCelebration({ perc: newPerc, made: ma.made, total: ma.total });
        }

        setSessions([newSession, ...sessions]);
      }
    }

    setCurrentInput({});
    setEditingId(null);
    setActiveTab('stats');
  };

  const handleInput = (id, val) => {
    setCurrentInput(prev => ({ ...prev, [id]: val }));
  };

  const handleEdit = (session) => {
    setEditingId(session.id);
    setCurrentInput(session.data);
    setActiveTab('input');
  };

  const handleDelete = (id) => {
    if (window.confirm('האם למחוק אימון זה?')) {
      const filtered = sessions.filter(s => s.id !== id);
      setSessions(filtered);
      if (filtered.length === 0) localStorage.removeItem(STORAGE_DATA_KEY);
      if (editingId === id) {
        setEditingId(null);
        setCurrentInput({});
      }
      if (journalSessionId === id) setJournalSessionId(null);
    }
  };

  const updateSessionNotes = (sessionId, field, html) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const notes = s.notes || { general: '', zones: {} };
      if (field === 'general') return { ...s, notes: { ...notes, general: html } };
      return { ...s, notes: { ...notes, zones: { ...(notes.zones || {}), [field]: html } } };
    }));
  };

  const hasNotes = (session) => {
    const notes = session.notes;
    if (!notes) return false;
    const strip = (html) => (html || '').replace(/<[^>]*>/g, '').trim();
    if (strip(notes.general)) return true;
    return Object.values(notes.zones || {}).some(html => strip(html));
  };

  const clearAllData = () => {
    if (window.confirm('אזהרה: כל היסטוריית האימונים תימחק לצמיתות. להמשיך?')) {
      setSessions([]);
      setIsDemoData(false);
      setEditingId(null);
      setCurrentInput({});
      localStorage.removeItem(STORAGE_DATA_KEY);
      localStorage.setItem(STORAGE_ONBOARDED_KEY, 'true');
      setShowSettingsModal(false);
      setActiveTab('court');
    }
  };

  const exportData = async () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      sessions: isDemoData ? [] : sessions,
      settings
    };
    const json = JSON.stringify(payload, null, 2);
    const filename = `swish-10-10-גיבוי-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], filename, { type: 'application/json' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'גיבוי Swish 10/10' });
        return;
      } catch {
        // המשתמש ביטל את השיתוף, או שהשיתוף נכשל בפועל - נופלים חזרה על הורדה רגילה
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const importedSessions = Array.isArray(parsed?.sessions) ? parsed.sessions : (Array.isArray(parsed) ? parsed : null);
        if (!importedSessions || importedSessions.length === 0) {
          window.alert('קובץ לא תקין - לא נמצאו אימונים לייבוא.');
          return;
        }
        const looksValid = importedSessions.every(s => s && typeof s === 'object' && s.data && typeof s.data === 'object' && s.date);
        if (!looksValid) {
          window.alert('קובץ לא תקין - מבנה הנתונים לא מוכר.');
          return;
        }
        if (!window.confirm(`נמצאו ${importedSessions.length} אימונים בקובץ. הייבוא יחליף את כל הנתונים הנוכחיים באפליקציה. להמשיך?`)) return;

        setIsDemoData(false);
        setEditingId(null);
        setCurrentInput({});
        setSessions([...importedSessions].sort((a, b) => new Date(b.date) - new Date(a.date)));
        if (parsed?.settings && Number.isFinite(parsed.settings.targetShots) && parsed.settings.targetShots > 0) {
          setSettings(prev => ({ ...prev, ...parsed.settings }));
        }
        localStorage.setItem(STORAGE_ONBOARDED_KEY, 'true');
        window.alert('הנתונים יובאו בהצלחה!');
      } catch {
        window.alert('קובץ לא תקין - לא ניתן לקרוא אותו כ-JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleSpotClick = (spotId) => {
    const spot = SPOTS.find(s => s.id === spotId);
    const session1 = sessions[0];
    const session2 = sessions.length > 1 ? sessions[1] : null;
    const session3 = sessions.length > 2 ? sessions[2] : null;

    const getStats = (session) => {
      if (!session || session.data[spotId] === undefined) return null;
      const made = session.data[spotId];
      const target = session.targetShots;
      return {
        made,
        target,
        perc: target > 0 ? Math.round((made / target) * 100) : 0
      };
    };

    const s1 = getStats(session1);
    const s2 = getStats(session2);
    const s3 = getStats(session3);

    setSelectedSpotDetails({
      name: spot.name,
      s1: s1 ? { ...s1, trend: s2 ? getTrend(s1.perc, s2.perc) : null } : null,
      s2: s2 ? { ...s2, trend: s3 ? getTrend(s2.perc, s3.perc) : null } : null
    });
  };

  const latestSession = sessions[0] || null;
  // "אימון ההשוואה" - האימון שלפני האחרון, משמש לבדיקת "שבירת שיא" (המגרש, כרטיס הסטטיסטיקה, חלוקה לאזורים)
  const comparisonSession = sessions.length > 1 ? sessions[1] : null;
  // כשיוצרים אימון חדש, האימון "הקודם" הוא פשוט האימון האחרון שכבר נשמר (sessions[0]) -
  // הוא עדיין לא כלול במערך sessions באותה נקודה. בעריכת אימון קיים, "הקודם" הוא האימון
  // האחרון שאינו זה שנערך כרגע.
  const previousSession = editingId ? sessions.find(s => s.id !== editingId) : (sessions[0] || null);
  // האימון שלפני "האימון הקודם" - כדי לתת גם לערך הרפרנס בדף ההזנה צבע/מגמה משלו
  const priorToPreviousSession = (() => {
    if (!previousSession) return null;
    const idx = sessions.findIndex(s => s.id === previousSession.id);
    return idx >= 0 ? (sessions[idx + 1] || null) : null;
  })();

  const currentTargetShots = editingId
    ? (sessions.find(s => s.id === editingId)?.targetShots || settings.targetShots)
    : settings.targetShots;

  const sessionMadeAttempts = (session) => {
    if (!session) return null;
    const values = Object.values(session.data);
    const total = values.length * session.targetShots;
    const made = values.reduce((a, b) => a + b, 0);
    return { made, total };
  };

  // עד 10 האימונים האחרונים עם נתונים לאזור נתון, מהחדש לישן, כל אחד עם מגמה מול זה שאחריו (גם אם הוא מחוץ ל-10)
  const getZoneHistory = (group) => {
    const rows = [];
    sessions.forEach(session => {
      let made = 0, attempts = 0;
      SPOTS.filter(s => s.group === group).forEach(spot => {
        if (session.data[spot.id] !== undefined) {
          made += session.data[spot.id];
          attempts += session.targetShots;
        }
      });
      if (attempts > 0) rows.push({ id: session.id, date: session.date, made, attempts, perc: Math.round((made / attempts) * 100) });
    });
    return rows.slice(0, 10).map((r, i) => ({ ...r, trend: rows[i + 1] ? getTrend(r.perc, rows[i + 1].perc) : null }));
  };

  const sessionOverallPerc = (session) => {
    const ma = sessionMadeAttempts(session);
    if (!ma || ma.total === 0) return null;
    return Math.round((ma.made / ma.total) * 100);
  };

  const latestSessionPerc = useMemo(() => sessionOverallPerc(latestSession) ?? 0, [latestSession]);
  const comparisonSessionPerc = useMemo(() => sessionOverallPerc(comparisonSession), [comparisonSession]);
  const overallTrend = getTrend(latestSessionPerc, comparisonSessionPerc);
  const overallTrendColor = overallTrend ? TREND_COLORS[overallTrend] : '#FF8A00';

  const stats = useMemo(() => {
    if (!sessions.length) return null;
    let totalMade = 0, totalShots = 0;
    let lastMade = 0, lastShots = 0;

    const zoneData = {};
    GROUP_ORDER.forEach(g => zoneData[g] = {
      allTimeMade: 0, allTimeAttempts: 0,
      lastMade: 0, lastAttempts: 0,
      prevMade: 0, prevAttempts: 0
    });

    sessions.forEach((session, idx) => {
      const isLast = idx === 0;
      const isPrev = idx === 1;
      Object.entries(session.data).forEach(([idStr, made]) => {
        const spot = SPOTS.find(s => s.id === parseInt(idStr, 10));
        if (spot) {
          totalMade += made;
          totalShots += session.targetShots;
          zoneData[spot.group].allTimeMade += made;
          zoneData[spot.group].allTimeAttempts += session.targetShots;

          if (isLast) {
            lastMade += made;
            lastShots += session.targetShots;
            zoneData[spot.group].lastMade += made;
            zoneData[spot.group].lastAttempts += session.targetShots;
          }
          if (isPrev) {
            zoneData[spot.group].prevMade += made;
            zoneData[spot.group].prevAttempts += session.targetShots;
          }
        }
      });
    });

    return {
      totalMade,
      totalShots,
      overallPerc: totalShots > 0 ? Math.round((totalMade / totalShots) * 100) : 0,
      lastMade,
      lastShots,
      lastPerc: lastShots > 0 ? Math.round((lastMade / lastShots) * 100) : 0,
      zoneData
    };
  }, [sessions]);

  const graphData = useMemo(() => {
    const raw = sessions.map(session => {
      let made = 0, total = 0;

      if (filterMode === 'overall') {
        Object.values(session.data).forEach(v => made += v);
        total = Object.keys(session.data).length * session.targetShots;
      }
      else if (filterMode === 'zone') {
        SPOTS.filter(s => s.group === filterZone).forEach(spot => {
          if(session.data[spot.id] !== undefined) {
            made += session.data[spot.id];
            total += session.targetShots;
          }
        });
      }
      else if (filterMode === 'spot') {
        if(session.data[filterSpot] !== undefined) {
          made += session.data[filterSpot];
          total = session.targetShots;
        }
      }

      const dateObj = new Date(session.date);
      return {
        shortDate: dateObj.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
        fullDate: dateObj.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
        percentage: total > 0 ? (made / total) * 100 : 0,
        hasData: total > 0
      };
    });
    return raw.filter(d => d.hasData);
  }, [sessions, filterMode, filterZone, filterSpot]);

  const insights = useMemo(() => {
    if (!latestSession || !stats) return [];
    const list = [];

    if (comparisonSession && comparisonSessionPerc !== null) {
      const diff = latestSessionPerc - comparisonSessionPerc;
      const prevMA = sessionMadeAttempts(comparisonSession);
      if (diff > 0) {
        list.push({ type: 'up', text: `השתפרת ב-${diff}%: קלעת ${stats.lastMade}/${stats.lastShots} באימון האחרון, לעומת ${prevMA.made}/${prevMA.total} באימון הקודם. כל הכבוד!` });
      } else if (diff < 0) {
        list.push({ type: 'down', text: `ירדת ב-${Math.abs(diff)}%: קלעת ${stats.lastMade}/${stats.lastShots} באימון האחרון, לעומת ${prevMA.made}/${prevMA.total} באימון הקודם - זה קורה, תמשיך להתאמן.` });
      } else {
        list.push({ type: 'same', text: `נשארת יציב: קלעת ${stats.lastMade}/${stats.lastShots} באימון האחרון, בדיוק כמו באימון הקודם.` });
      }

      let bestZone = null, bestDelta = 0;
      GROUP_ORDER.forEach(g => {
        const zd = stats.zoneData[g];
        if (zd.lastAttempts > 0 && zd.prevAttempts > 0) {
          const delta = Math.round((zd.lastMade / zd.lastAttempts) * 100) - Math.round((zd.prevMade / zd.prevAttempts) * 100);
          if (delta > bestDelta) { bestDelta = delta; bestZone = g; }
        }
      });
      if (bestZone) {
        const zd = stats.zoneData[bestZone];
        list.push({ type: 'up', text: `האזור "${bestZone}" השתפר הכי הרבה: עלית ב-${bestDelta}% - קלעת ${zd.lastMade}/${zd.lastAttempts} באימון האחרון, לעומת ${zd.prevMade}/${zd.prevAttempts} באימון הקודם.` });
      }
    } else {
      list.push({ type: 'same', text: 'זהו האימון הראשון שלך שנשמר - מכאן והלאה תוכל לעקוב אחרי ההתקדמות שלך!' });
    }

    let weakZone = null, weakPerc = Infinity;
    GROUP_ORDER.forEach(g => {
      const zd = stats.zoneData[g];
      if (zd.lastAttempts > 0) {
        const lp = Math.round((zd.lastMade / zd.lastAttempts) * 100);
        if (lp < weakPerc) { weakPerc = lp; weakZone = g; }
      }
    });
    if (weakZone) {
      const zd = stats.zoneData[weakZone];
      let weakText = `הכי כדאי להתמקד באזור "${weakZone}": קלעת רק ${zd.lastMade}/${zd.lastAttempts} (${weakPerc}%) באימון האחרון`;
      if (zd.prevAttempts > 0) {
        const prevPerc = Math.round((zd.prevMade / zd.prevAttempts) * 100);
        const delta = weakPerc - prevPerc;
        if (delta > 0) weakText += `, שיפור של ${delta}% לעומת ${zd.prevMade}/${zd.prevAttempts} (${prevPerc}%) באימון הקודם`;
        else if (delta < 0) weakText += `, ירידה של ${Math.abs(delta)}% לעומת ${zd.prevMade}/${zd.prevAttempts} (${prevPerc}%) באימון הקודם`;
        else weakText += `, בדיוק כמו ${zd.prevMade}/${zd.prevAttempts} (${prevPerc}%) באימון הקודם`;
      }
      weakText += `, ו-${zd.allTimeMade}/${zd.allTimeAttempts} בסך הכל.`;
      list.push({ type: 'down', text: weakText });
    }

    return list;
  }, [latestSession, comparisonSession, comparisonSessionPerc, latestSessionPerc, stats]);

  const filterModeOptions = [
    { value: 'overall', label: 'ממוצע כולל (סה"כ)' },
    { value: 'zone', label: 'לפי אזור במגרש' },
    { value: 'spot', label: 'לפי עמדה ספציפית' }
  ];

  const zoneOptions = GROUP_ORDER.map(g => ({ value: g, label: g }));
  const spotOptions = SPOTS.map(s => ({ value: s.id, label: s.name }));


  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[#0F1115] text-[#E0E2E7] font-sans selection:bg-[#FF8A00]/30" dir="rtl">

      {/* ===================== מודל פרטי נקודה ===================== */}
      {selectedSpotDetails && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedSpotDetails(null)}
        >
          <div
            className="bg-[#1C202A] p-6 rounded-3xl border border-[#2A2F3D] shadow-2xl w-full max-w-[320px] transform scale-100 animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-black text-white">{selectedSpotDetails.name}</h3>
              <button onClick={() => setSelectedSpotDetails(null)} className="text-[#848B98] hover:text-white bg-[#0F1115] rounded-full p-2 transition-colors border border-[#2A2F3D]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0F1115] p-5 rounded-2xl border border-[#2A2F3D]">
                 <p className="text-[#848B98] text-xs font-bold uppercase tracking-wider mb-2">אימון אחרון</p>
                 {selectedSpotDetails.s1 ? (
                    <div className="flex justify-between items-end">
                       <span className="text-4xl font-black" style={{ color: selectedSpotDetails.s1.trend ? TREND_COLORS[selectedSpotDetails.s1.trend] : '#FFFFFF' }}>
                         {selectedSpotDetails.s1.perc}%
                       </span>
                       <span dir="ltr" className="text-[#A0A6B1] text-sm font-medium mb-1">{selectedSpotDetails.s1.made}/{selectedSpotDetails.s1.target}</span>
                    </div>
                 ) : <p className="text-[#848B98] text-sm">לא נזרק באימון זה</p>}
              </div>

              <div className="bg-[#0F1115] p-5 rounded-2xl border border-[#2A2F3D]/50 opacity-80">
                 <p className="text-[#848B98] text-xs font-bold uppercase tracking-wider mb-2">אימון קודם</p>
                 {selectedSpotDetails.s2 ? (
                    <div className="flex justify-between items-end">
                       <span className="text-3xl font-bold" style={{ color: selectedSpotDetails.s2.trend ? TREND_COLORS[selectedSpotDetails.s2.trend] : '#FFFFFF' }}>
                         {selectedSpotDetails.s2.perc}%
                       </span>
                       <span dir="ltr" className="text-[#848B98] text-sm mb-1">{selectedSpotDetails.s2.made}/{selectedSpotDetails.s2.target}</span>
                    </div>
                 ) : <p className="text-[#848B98] text-sm">אין נתונים מהאימון הקודם</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* חגיגת שיא אישי - מוצג כשהאימון שנשמר שובר את השיא הכללי (אחוז קליעה כולל) של כל הזמנים */}
      {recordCelebration && (
        <div
          className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-6 animate-in fade-in"
          onClick={() => setRecordCelebration(null)}
        >
          <div
            className="bg-gradient-to-b from-[#1C202A] to-[#161920] p-8 rounded-3xl border border-[#FF8A00]/40 shadow-2xl w-full max-w-[320px] text-center transform scale-100 animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#FF8A00] to-[#E55D00] flex items-center justify-center shadow-lg shadow-[#FF8A00]/30">
              <Trophy className="text-white w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white mb-1">שיא אישי חדש!</h3>
            <p className="text-[#848B98] text-sm mb-5">האחוז הגבוה ביותר שלך אי פעם באימון שלם</p>
            <p className="text-5xl font-black text-[#FF8A00] mb-1">{recordCelebration.perc}%</p>
            <p dir="ltr" className="text-[#848B98] text-sm mb-6">{recordCelebration.made}/{recordCelebration.total}</p>
            <button
              onClick={() => setRecordCelebration(null)}
              className="w-full bg-gradient-to-r from-[#FF8A00] to-[#E55D00] text-[#0F1115] font-black text-lg py-3.5 rounded-xl shadow-lg shadow-[#FF8A00]/20"
            >
              יאללה, קדימה!
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 bg-[#161920] border-b border-[#252A36] pt-8 pb-4 px-5 shadow-md">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF8A00] to-[#E55D00] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF8A00]/20">
              <Trophy className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase" style={{fontFamily: 'Impact, sans-serif'}}>
                SWISH 10/10
              </h1>
            </div>
          </div>
          <button
            onClick={() => {
              setShowSettingsModal(true);
              if (showSettingsHint) {
                setShowSettingsHint(false);
                localStorage.setItem(STORAGE_SETTINGS_SEEN_KEY, 'true');
              }
            }}
            className="relative p-2.5 rounded-full bg-[#1C202A] text-[#848B98] border border-[#2A2F3D] hover:text-[#FF8A00] transition-colors"
          >
            <Settings size={20} />
            {showSettingsHint && (
              <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-[#EF4444] border-2 border-[#161920] animate-pulse"></span>
            )}
          </button>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto w-full max-w-md mx-auto relative">

        {/* מודל הגדרות */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-40 bg-[#0F1115]/95 backdrop-blur-sm p-6 overflow-y-auto animate-in fade-in">
            <div className="bg-[#1C202A] rounded-3xl p-6 border border-[#2A2F3D] shadow-2xl mt-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">הגדרות אימון</h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  aria-label="סגור הגדרות"
                  className="text-[#848B98] hover:text-white bg-[#0F1115] rounded-full p-2 transition-colors border border-[#2A2F3D] shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-[#A0A6B1] mb-3">
                  יעד זריקות לכל עמדה
                </label>
                <div className="flex items-center gap-4 bg-[#0F1115] p-3 rounded-2xl border border-[#2A2F3D]">
                  <input
                    type="number"
                    min="1"
                    value={settings.targetShots}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') { setSettings(prev => ({ ...prev, targetShots: '' })); return; }
                      const v = parseInt(raw, 10);
                      if (Number.isFinite(v) && v >= 1) setSettings(prev => ({ ...prev, targetShots: v }));
                    }}
                    onBlur={() => {
                      if (!Number.isFinite(settings.targetShots) || settings.targetShots < 1) {
                        setSettings(prev => ({ ...prev, targetShots: 10 }));
                      }
                    }}
                    className="w-20 bg-transparent text-center text-3xl font-black text-[#FF8A00] outline-none"
                  />
                  <span className="text-[#848B98] text-xs leading-relaxed">זריקות (ישפיע רק על<br/>אימונים חדשים שתפתח)</span>
                </div>
              </div>

              <div className="border-t border-[#2A2F3D] pt-6 mb-4 space-y-3">
                <div className="flex items-center justify-between bg-[#0F1115] p-4 rounded-2xl border border-[#2A2F3D]">
                  <div>
                    <p className="text-white font-bold text-sm">הצגת מסקנות</p>
                    <p className="text-[#848B98] text-[10px] mt-0.5">כרטיס תובנות ומוטיבציה בעמוד הסטטיסטיקות</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, showInsights: prev.showInsights === false }))}
                    aria-label="הצג או הסתר מסקנות"
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${settings.showInsights === false ? 'bg-[#3A4155]' : 'bg-[#FF8A00]'}`}
                  >
                    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${settings.showInsights === false ? 'right-1' : 'right-6'}`}></span>
                  </button>
                </div>

                <div className="flex items-center justify-between bg-[#0F1115] p-4 rounded-2xl border border-[#2A2F3D]">
                  <div>
                    <p className="text-white font-bold text-sm">הצגת יומן</p>
                    <p className="text-[#848B98] text-[10px] mt-0.5">טאב יומן להערות על כל אימון (ההערות עצמן לא נמחקות בכיבוי)</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, showJournal: prev.showJournal !== true }))}
                    aria-label="הצג או הסתר יומן"
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${settings.showJournal === true ? 'bg-[#FF8A00]' : 'bg-[#3A4155]'}`}
                  >
                    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${settings.showJournal === true ? 'right-6' : 'right-1'}`}></span>
                  </button>
                </div>
              </div>

              <div className="border-t border-[#2A2F3D] pt-6">
                <p className="text-white font-bold text-sm mb-1">גיבוי ושחזור</p>
                <p className="text-[#848B98] text-[10px] mb-3">שמור עותק של כל האימונים שלך כקובץ, כדי שלעולם לא תאבד אותם - גם אם תמחק את האפליקציה או תחליף מכשיר.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={exportData}
                    disabled={isDemoData}
                    className="bg-[#0F1115] text-[#E0E2E7] font-bold py-3.5 rounded-xl border border-[#3A4155] hover:border-[#FF8A00]/50 flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Download size={16} /> ייצוא נתונים
                  </button>
                  <button
                    onClick={() => importInputRef.current?.click()}
                    className="bg-[#0F1115] text-[#E0E2E7] font-bold py-3.5 rounded-xl border border-[#3A4155] hover:border-[#FF8A00]/50 flex items-center justify-center gap-2"
                  >
                    <Upload size={16} /> ייבוא נתונים
                  </button>
                  <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
                </div>
              </div>

              <div className="border-t border-[#2A2F3D] pt-6">
                <button
                  onClick={clearAllData}
                  className="w-full bg-red-500/10 text-red-500 font-bold py-4 rounded-xl border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} /> מחיקת כל הנתונים
                </button>
              </div>

              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full mt-4 bg-[#FF8A00] text-black font-black text-lg py-4 rounded-xl shadow-lg shadow-[#FF8A00]/20"
              >
                סגור חלון
              </button>
            </div>
          </div>
        )}

        {/* מגרש ראשי */}
        {activeTab === 'court' && !showSettingsModal && (
          <div className="h-full flex flex-col p-4 animate-in fade-in">
            {isDemoData && (
              <div className="shrink-0 mb-3 px-3 py-2 rounded-xl border border-dashed border-[#FF8A00]/50 bg-[#FF8A00]/10 flex items-center gap-2">
                <Sparkles size={14} className="text-[#FF8A00] shrink-0" />
                <p className="text-[#FF8A00] text-[11px] font-bold leading-tight">
                  מצב הדגמה - נתונים לדוגמה בלבד. ברגע שתזין אימון אמיתי ראשון, הם יוחלפו במעקב האמיתי שלך.
                </p>
              </div>
            )}
            <div className="shrink-0 bg-[#1C202A] p-3 rounded-2xl mb-3 border border-[#2A2F3D] flex justify-between items-center shadow-lg">
              <div>
                <p className="text-[#848B98] text-[10px] font-bold uppercase tracking-wider mb-0.5">
                  האימון האחרון
                </p>
                <p className="text-white font-medium text-sm">
                  {latestSession ? new Date(latestSession.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' }) : 'אין נתונים'}
                </p>
              </div>
              <div
                className="text-left px-3 py-1.5 rounded-xl border"
                style={{ background: `linear-gradient(to bottom right, ${overallTrendColor}33, ${overallTrendColor}0D)`, borderColor: `${overallTrendColor}33` }}
              >
                <p className="text-xl font-black flex items-center gap-1" style={{ color: overallTrendColor }}>{latestSessionPerc}%<TrendArrow trend={overallTrend} size={14} /></p>
              </div>
            </div>

            {/* איור מגרש מותאם מתמטית לחלוטין (viewBox: 0 0 100 125), מוקטן לפי הגובה הפנוי כדי שלא יגלוש */}
            <div className="flex-1 min-h-0 flex items-center justify-center">
            <div className="relative h-full max-w-full aspect-[4/5] bg-[#A9713F] rounded-3xl border-[6px] border-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden">
              <div className="absolute inset-0 bg-black/15 pointer-events-none"></div>
              <div className="absolute inset-0 opacity-15 flex flex-col justify-around pointer-events-none">
                {[...Array(25)].map((_, i) => (
                  <div key={i} className="h-[2px] bg-black/40 w-full shadow-[0_1px_1px_rgba(255,255,255,0.1)]" />
                ))}
              </div>

              <svg viewBox="0 0 100 125" className="absolute inset-0 w-full h-full opacity-90 pointer-events-none">
                {/* הבקבוק */}
                <rect x="25" y="0" width="50" height="55" fill="#A46D42" stroke="white" strokeWidth="1.2" />
                {/* קשת עונשין פנימית וחיצונית */}
                <path d="M 25 55 A 25 25 0 0 0 75 55" fill="none" stroke="white" strokeWidth="1.2" />
                <path d="M 25 55 A 25 25 0 0 1 75 55" fill="none" stroke="white" strokeDasharray="2 2" strokeWidth="1.2" />
                {/* סל וקרש */}
                <line x1="38" y1="12" x2="62" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="50" cy="16" r="3.5" fill="#FF4D4D" stroke="white" strokeWidth="1" />

                {/* קשת 3 - אליפסה אמיתית (רדיוס אופקי 44, אנכי 74) סביב מרכז הסל (50,16), עוברת בול דרך הפינות בגובה הסל ודרך הנקודה העמוקה מול הסל */}
                <path d="M 6 0 L 6 16 A 44 74 0 0 0 94 16 L 94 0" fill="none" stroke="white" strokeWidth="1.2" />
              </svg>

              {SPOTS.map((spot) => {
                const score = latestSession?.data[spot.id];
                if (score === undefined) return null;
                const trend = getTrend(score, comparisonSession?.data[spot.id]);
                const trendColor = trend ? TREND_COLORS[trend] : '#FFFFFF';
                return (
                  <button
                    key={spot.id}
                    onClick={() => handleSpotClick(spot.id)}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 active:scale-95 z-10 w-5 h-5"
                    // המרה ל-125 בגובה
                    style={{ left: `${spot.x}%`, top: `${(spot.y / 125) * 100}%`, pointerEvents: 'auto' }}
                  >
                    <div className="relative w-full h-full flex items-center justify-center">
                      {trend && (
                        <div
                          className="absolute rounded-full"
                          style={{ inset: '1px', backgroundColor: trendColor, boxShadow: `0 0 1px 0px ${trendColor}` }}
                        ></div>
                      )}
                      <span
                        className="relative z-10 font-black text-[10px] text-white"
                        style={{
                          textShadow: '0px 1px 2px rgba(0,0,0,0.95), 0px 0px 2px rgba(0,0,0,0.95)',
                          fontFamily: 'Impact, sans-serif'
                        }}
                      >
                        {score}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            </div>

            <div className="shrink-0 text-center mt-3 bg-[#1C202A] px-3 py-2 rounded-xl border border-[#2A2F3D]">
              <p className="text-[#848B98] text-[10px] flex items-center justify-center gap-1">
                <Target size={11} /> מתוך <span className="text-[#FF8A00] font-bold">{latestSession?.targetShots || settings.targetShots}</span> זריקות · לחץ על מספר לפרטים
              </p>
              {comparisonSession && (
                <div className="flex items-center justify-center gap-3 mt-1 text-[9px] text-[#848B98]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: TREND_COLORS.up }}></span>שיא חדש</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: TREND_COLORS.same }}></span>ללא שינוי</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: TREND_COLORS.down }}></span>ירידה</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* הזנה ועריכה */}
        {activeTab === 'input' && !showSettingsModal && (
          <div className="p-4 animate-in slide-in-from-bottom-4 pb-10">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  {editingId ? 'עריכת אימון' : 'הזנת תוצאות'}
                </h2>
                <p className="text-sm text-[#848B98]">מתוך {currentTargetShots} זריקות לכל עמדה</p>
              </div>
              {editingId && (
                <button onClick={() => { setEditingId(null); setCurrentInput({}); setActiveTab('stats'); }} className="text-[#848B98] text-sm underline px-2 py-1">
                  ביטול
                </button>
              )}
            </div>

            <div className="space-y-6">
              {GROUP_ORDER.map(group => (
                <div key={group} className="bg-[#1C202A] rounded-2xl border border-[#2A2F3D] shadow-lg">
                  <div className="bg-[#212631] px-4 py-3 border-b border-[#2A2F3D] rounded-t-2xl flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#FF8A00]/20 flex items-center justify-center">
                      <Target className="text-[#FF8A00] w-3.5 h-3.5" />
                    </div>
                    <h3 className="font-bold text-white text-sm tracking-wide">{group}</h3>
                  </div>

                  <div className="p-2 divide-y divide-[#2A2F3D]/50">
                    {SPOTS.filter(s => s.group === group).map(spot => {
                      const val = currentInput[spot.id];
                      const prevScore = previousSession?.data[spot.id];
                      const liveTrend = (val !== undefined && val !== '' && prevScore !== undefined) ? getTrend(val, prevScore) : null;
                      const priorScore = priorToPreviousSession?.data[spot.id];
                      const prevTrend = prevScore !== undefined && priorScore !== undefined ? getTrend(prevScore, priorScore) : null;
                      const prevTrendColor = prevTrend ? TREND_COLORS[prevTrend] : '#FF8A00';

                      return (
                        <div key={spot.id} className="flex items-center justify-between p-2">
                          <div>
                            <span className="text-[#E0E2E7] font-bold text-sm block">{spot.name}</span>
                            {prevScore !== undefined ? (
                              <span className="text-[10px] font-bold inline-flex items-center gap-1" style={{ color: prevTrendColor }}>
                                {`אימון קודם: קלעת ${prevScore}`}
                                {prevTrend === 'up' && <ArrowUp size={9} strokeWidth={3} />}
                                {prevTrend === 'down' && <ArrowDown size={9} strokeWidth={3} />}
                                {prevTrend === 'same' && <span className="w-1 h-1 rounded-full" style={{ backgroundColor: prevTrendColor }}></span>}
                              </span>
                            ) : (
                              <span className="text-[#596070] text-[10px] font-bold">טרם הוזן בעבר</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <TrendArrow trend={liveTrend} size={16} />
                            <HybridInput
                              value={val}
                              onChange={(v) => handleInput(spot.id, v)}
                              max={currentTargetShots}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={saveSession}
              className="w-full mt-8 bg-gradient-to-r from-[#FF8A00] to-[#E55D00] text-[#0F1115] font-black text-lg py-4 rounded-xl shadow-lg shadow-[#FF8A00]/20 active:scale-95 transition-all sticky bottom-0"
            >
              {editingId ? 'עדכן אימון' : 'שמור אימון'}
            </button>
          </div>
        )}

        {/* סטטיסטיקות */}
        {activeTab === 'stats' && stats && !showSettingsModal && (
          <div className="p-4 animate-in fade-in space-y-6 pb-10">

            {/* סיכום אימון אחרון! */}
            {latestSession && (
              <div className="bg-gradient-to-br from-[#1C202A] to-[#161920] rounded-3xl p-5 border border-[#FF8A00]/30 shadow-lg relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#FF8A00]/10 rounded-full blur-xl"></div>
                <div className="flex items-center gap-2 mb-2 relative z-10">
                  <Activity className="w-5 h-5 text-[#FF8A00]" />
                  <h3 className="text-white font-bold text-sm">האימון האחרון שלך</h3>
                </div>
                <div className="flex justify-between items-end relative z-10">
                  <div>
                    <p className="text-4xl font-black leading-none" style={{ color: overallTrendColor }}>{stats.lastPerc}<span className="text-xl">%</span></p>
                    {overallTrend && (
                      <p className="text-[10px] font-bold mt-1 flex items-center gap-1" style={{ color: overallTrendColor }}>
                        {overallTrend === 'up' && <><ArrowUp size={11} /> שיא חדש!</>}
                        {overallTrend === 'down' && <><ArrowDown size={11} /> ירידה מהאימון הקודם</>}
                        {overallTrend === 'same' && <><Minus size={11} /> ללא שינוי</>}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p dir="ltr" className="text-[#E0E2E7] font-bold">{stats.lastMade} / {stats.lastShots}</p>
                    <p className="text-[#848B98] text-[10px]">קליעות מהאימון האחרון</p>
                  </div>
                </div>
              </div>
            )}

            {/* מסקנות ותובנות */}
            {settings.showInsights !== false && insights.length > 0 && (
              <div className="bg-[#1C202A] rounded-2xl p-5 border border-[#2A2F3D] shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-[#FF8A00]" />
                  <h3 className="text-white font-bold text-sm">מסקנות מהאימון</h3>
                </div>
                <div className="space-y-2.5">
                  {insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span
                        className="shrink-0 mt-1 w-2 h-2 rounded-full"
                        style={{ backgroundColor: TREND_COLORS[insight.type] }}
                      ></span>
                      <p className="text-[#E0E2E7] text-xs leading-relaxed">{insight.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* סיכום מכל האימונים */}
            <div className="flex gap-4">
              <div className="flex-1 bg-[#1C202A] rounded-2xl p-4 border border-[#2A2F3D] text-center shadow-sm">
                <Flame className="w-5 h-5 text-[#848B98] mx-auto mb-1" />
                <p className="text-[#848B98] text-[9px] font-bold uppercase">אחוז כל הזמנים</p>
                <p className="text-2xl font-black text-white mt-0.5">{stats.overallPerc}<span className="text-[#848B98] text-sm">%</span></p>
              </div>

              <div className="flex-1 bg-[#1C202A] rounded-2xl p-4 border border-[#2A2F3D] text-center shadow-sm flex flex-col justify-center">
                <p className="text-[#848B98] text-[9px] font-bold uppercase mb-1">סלי שדה (All-Time)</p>
                <div dir="ltr" className="flex items-baseline justify-center gap-1 mt-0.5">
                  <span className="text-xl font-bold text-white">{stats.totalMade}</span>
                  <span className="text-[#848B98] text-xs">/ {stats.totalShots}</span>
                </div>
              </div>
            </div>

            {/* גרף התקדמות */}
            <div className="bg-[#1C202A] rounded-3xl p-5 border border-[#2A2F3D] shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={18} className="text-[#FF8A00]" />
                <h3 className="text-white font-bold text-sm">גרף התקדמות</h3>
              </div>

              <div className="flex flex-col gap-3">
                <CustomDropdown
                  value={filterMode}
                  options={filterModeOptions}
                  onChange={setFilterMode}
                  icon={Filter}
                />

                {filterMode === 'zone' && (
                  <div className="animate-in slide-in-from-top-2 fade-in">
                    <CustomDropdown
                      value={filterZone}
                      options={zoneOptions}
                      onChange={setFilterZone}
                    />
                  </div>
                )}

                {filterMode === 'spot' && (
                  <div className="animate-in slide-in-from-top-2 fade-in">
                    <CustomDropdown
                      value={filterSpot}
                      options={spotOptions}
                      onChange={setFilterSpot}
                    />
                  </div>
                )}
              </div>

              <SmartLineChart data={graphData} />
            </div>

            {/* חלוקה לאזורים משודרגת - מראה גם אימון אחרון וגם כל הזמנים */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <h3 className="text-white font-bold text-sm">חלוקה לאזורים</h3>
              </div>

              <div className="grid gap-3">
                {GROUP_ORDER.map(group => {
                  const data = stats.zoneData[group];
                  if (data.allTimeAttempts === 0) return null;

                  const lastPerc = data.lastAttempts > 0 ? Math.round((data.lastMade / data.lastAttempts) * 100) : 0;
                  const prevPerc = data.prevAttempts > 0 ? Math.round((data.prevMade / data.prevAttempts) * 100) : null;
                  const zoneTrend = comparisonSession ? getTrend(lastPerc, prevPerc) : null;
                  const zoneTrendColor = zoneTrend ? TREND_COLORS[zoneTrend] : '#FF8A00';
                  const allPerc = Math.round((data.allTimeMade / data.allTimeAttempts) * 100);

                  const isExpanded = !!expandedZones[group];

                  return (
                    <div key={group} className="bg-[#1C202A] p-4 rounded-xl border border-[#2A2F3D]">
                      <div className="flex items-center justify-between mb-3 border-b border-[#2A2F3D] pb-2">
                        <h4 className="font-bold text-white text-sm">{group}</h4>
                        <button
                          onClick={() => setExpandedZones(prev => ({ ...prev, [group]: !prev[group] }))}
                          aria-label="הרחב היסטוריה מפורטת לאזור"
                          className="text-[#848B98] hover:text-[#FF8A00] p-1 -m-1 transition-colors"
                        >
                          <ChevronDown size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="space-y-2.5">
                          {getZoneHistory(group).map(row => {
                            const rowColor = row.trend ? TREND_COLORS[row.trend] : '#FF8A00';
                            return (
                              <div key={row.id} className="flex items-center justify-between">
                                <div className="w-20">
                                  <p className="text-[9px] text-[#848B98] font-bold uppercase">
                                    {new Date(row.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                                  </p>
                                  <p dir="ltr" className="text-[11px] text-[#A0A6B1]">{row.made}/{row.attempts}</p>
                                </div>
                                <div className="flex-1 mx-3 bg-[#0F1115] h-1.5 rounded-full overflow-hidden shadow-inner">
                                  <div className="h-full rounded-full" style={{ width: `${row.perc}%`, backgroundColor: rowColor }} />
                                </div>
                                <div className="w-14 flex items-center justify-end gap-1">
                                  <span className="font-black text-xs" style={{ color: rowColor }}>{row.perc}%</span>
                                  <TrendArrow trend={row.trend} size={11} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <>
                          {/* פס אימון אחרון */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-20">
                              <p className="text-[9px] text-[#848B98] font-bold uppercase">אימון אחרון</p>
                              <p dir="ltr" className="text-[11px] text-[#A0A6B1]">{data.lastMade}/{data.lastAttempts}</p>
                            </div>
                            <div className="flex-1 mx-3 bg-[#0F1115] h-1.5 rounded-full overflow-hidden shadow-inner">
                              <div className="h-full rounded-full" style={{ width: `${lastPerc}%`, backgroundColor: zoneTrendColor }} />
                            </div>
                            <div className="w-14 flex items-center justify-end gap-1">
                              <span className="font-black text-xs" style={{ color: zoneTrendColor }}>{lastPerc}%</span>
                              <TrendArrow trend={zoneTrend} size={11} />
                            </div>
                          </div>

                          {/* פס כל הזמנים */}
                          <div className="flex items-center justify-between opacity-70">
                            <div className="w-20">
                              <p className="text-[9px] text-[#848B98] font-bold uppercase">כל הזמנים</p>
                              <p dir="ltr" className="text-[11px] text-[#848B98]">{data.allTimeMade}/{data.allTimeAttempts}</p>
                            </div>
                            <div className="flex-1 mx-3 bg-[#0F1115] h-1.5 rounded-full overflow-hidden shadow-inner">
                              <div className="h-full bg-[#848B98] rounded-full" style={{ width: `${allPerc}%` }} />
                            </div>
                            <div className="w-8 text-right">
                              <span className="font-bold text-[#848B98] text-xs">{allPerc}%</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* היסטוריית אימונים */}
            <div>
              <h3 className="text-white font-bold text-sm mb-3 mt-4">היסטוריית אימונים</h3>
              <div className="space-y-3">
                {sessions.map((session, idx) => {
                  let sMade = 0;
                  let sTotal = Object.keys(session.data).length * session.targetShots;
                  Object.values(session.data).forEach(v => sMade += v);
                  const sPerc = sTotal > 0 ? Math.round((sMade / sTotal) * 100) : 0;
                  const sOlderPerc = sessionOverallPerc(sessions[idx + 1]);
                  const sTrend = getTrend(sPerc, sOlderPerc);
                  const sTrendColor = sTrend ? TREND_COLORS[sTrend] : '#FF8A00';

                  return (
                    <div key={session.id} className="bg-[#1C202A] p-4 rounded-xl border border-[#2A2F3D] flex justify-between items-center relative overflow-hidden group">
                      <div>
                        <p className="text-white font-bold text-sm">אימון {sessions.length - idx}</p>
                        <p className="text-[10px] text-[#848B98] mt-0.5">{new Date(session.date).toLocaleString('he-IL')}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right mr-2">
                          <p className="text-lg font-black flex items-center gap-1 justify-end" style={{ color: sTrendColor }}>{sPerc}%<TrendArrow trend={sTrend} size={12} /></p>
                          <p className="text-[9px] text-[#848B98]"><span dir="ltr">{sMade}/{sTotal}</span> קליעות</p>
                        </div>

                        <div className="flex flex-col gap-1 border-r border-[#2A2F3D] pr-3">
                          <button onClick={() => handleEdit(session)} className="text-[#848B98] hover:text-white bg-[#0F1115] p-1.5 rounded-lg transition-colors">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDelete(session.id)} className="text-[#848B98] hover:text-red-500 bg-[#0F1115] p-1.5 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* יומן */}
        {activeTab === 'journal' && settings.showJournal === true && !showSettingsModal && (() => {
          const journalSession = sessions.find(s => s.id === journalSessionId);

          if (!journalSession) {
            return (
              <div className="p-4 animate-in fade-in pb-10">
                <h2 className="text-xl font-bold text-white mb-1">יומן אימונים</h2>
                <p className="text-sm text-[#848B98] mb-6">כתוב לעצמך הערות מעוצבות על כל אימון - כללי או לפי אזור במגרש.</p>

                {sessions.length === 0 ? (
                  <p className="text-[#848B98] text-sm text-center py-10">אין עדיין אימונים שמורים.</p>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session, idx) => {
                      let sMade = 0;
                      const sTotal = Object.keys(session.data).length * session.targetShots;
                      Object.values(session.data).forEach(v => sMade += v);
                      const sPerc = sTotal > 0 ? Math.round((sMade / sTotal) * 100) : 0;
                      const sOlderPerc = sessionOverallPerc(sessions[idx + 1]);
                      const sTrend = getTrend(sPerc, sOlderPerc);
                      const sTrendColor = sTrend ? TREND_COLORS[sTrend] : '#FF8A00';
                      const noted = hasNotes(session);
                      return (
                        <button
                          key={session.id}
                          onClick={() => setJournalSessionId(session.id)}
                          className="w-full text-right bg-[#1C202A] p-4 rounded-xl border border-[#2A2F3D] flex justify-between items-center hover:border-[#FF8A00]/40 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${noted ? 'bg-[#FF8A00]/20' : 'bg-[#0F1115]'}`}>
                              <FileText size={14} className={noted ? 'text-[#FF8A00]' : 'text-[#596070]'} />
                            </div>
                            <div>
                              <p className="text-white font-bold text-sm">אימון {sessions.length - idx}</p>
                              <p className="text-[10px] text-[#848B98] mt-0.5">{new Date(session.date).toLocaleString('he-IL')}</p>
                              <p className="text-[10px] mt-0.5" style={{ color: noted ? '#FF8A00' : '#596070' }}>{noted ? 'יש הערות' : 'אין הערות עדיין'}</p>
                            </div>
                          </div>
                          <span className="text-lg font-black" style={{ color: sTrendColor }}>{sPerc}%</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          let jMade = 0;
          const jTotal = Object.keys(journalSession.data).length * journalSession.targetShots;
          Object.values(journalSession.data).forEach(v => jMade += v);
          const jPerc = jTotal > 0 ? Math.round((jMade / jTotal) * 100) : 0;
          const jIdx = sessions.findIndex(s => s.id === journalSession.id);
          const jOlderPerc = sessionOverallPerc(sessions[jIdx + 1]);
          const jTrend = getTrend(jPerc, jOlderPerc);
          const jTrendColor = jTrend ? TREND_COLORS[jTrend] : '#FF8A00';

          return (
            <div className="p-4 animate-in slide-in-from-bottom-4 pb-10">
              <button onClick={() => setJournalSessionId(null)} className="flex items-center gap-1.5 text-[#848B98] text-sm font-bold mb-4">
                <ArrowRight size={16} /> חזרה ליומן
              </button>

              <div className="bg-[#1C202A] p-4 rounded-2xl border border-[#2A2F3D] flex justify-between items-center mb-6">
                <div>
                  <p className="text-white font-bold text-sm">{new Date(journalSession.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' })}</p>
                  <p className="text-[10px] text-[#848B98] mt-0.5" dir="ltr">{jMade}/{jTotal} קליעות</p>
                </div>
                <span className="text-xl font-black" style={{ color: jTrendColor }}>{jPerc}%</span>
              </div>

              <div className="mb-6">
                <h3 className="text-white font-bold text-sm mb-2">הערה כללית</h3>
                <RichTextEditor
                  key={`general-${journalSession.id}`}
                  initialValue={journalSession.notes?.general}
                  onChange={(html) => updateSessionNotes(journalSession.id, 'general', html)}
                  placeholder="מה חשבת על האימון הזה? מה עבד טוב, מה כדאי לשפר..."
                />
              </div>

              <div className="space-y-5">
                {GROUP_ORDER.map(group => (
                  <div key={group}>
                    <h3 className="text-white font-bold text-sm mb-2">{group}</h3>
                    <RichTextEditor
                      key={`zone-${group}-${journalSession.id}`}
                      initialValue={journalSession.notes?.zones?.[group]}
                      onChange={(html) => updateSessionNotes(journalSession.id, group, html)}
                      placeholder={`הערות על "${group}"...`}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </main>

      {/* תפריט תחתון */}
      <nav className="shrink-0 w-full bg-[#161920]/95 backdrop-blur-md border-t border-[#2A2F3D] pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
        <div className="max-w-md mx-auto flex justify-around p-2">
          <button onClick={() => {setActiveTab('court'); setShowSettingsModal(false);}} className={`flex flex-col items-center gap-1 transition-colors p-2 ${activeTab === 'court' && !showSettingsModal ? 'text-[#FF8A00]' : 'text-[#848B98]'}`}>
            <Target size={22} />
            <span className="text-[9px] font-bold tracking-wider">המגרש</span>
          </button>

          <button onClick={() => {setActiveTab('input'); setShowSettingsModal(false);}} className={`flex flex-col items-center gap-1 transition-colors p-2 ${activeTab === 'input' && !showSettingsModal ? 'text-white' : 'text-[#848B98]'}`}>
            <Plus size={22} />
            <span className="text-[9px] font-bold tracking-wider">{editingId ? 'ערוך אימון' : 'הזנה'}</span>
          </button>

          <button onClick={() => {setActiveTab('stats'); setShowSettingsModal(false);}} className={`flex flex-col items-center gap-1 transition-colors p-2 ${activeTab === 'stats' && !showSettingsModal ? 'text-[#FF8A00]' : 'text-[#848B98]'}`}>
            <TrendingUp size={22} />
            <span className="text-[9px] font-bold tracking-wider">סטטיסטיקות</span>
          </button>

          {settings.showJournal === true && (
            <button onClick={() => {setActiveTab('journal'); setShowSettingsModal(false);}} className={`flex flex-col items-center gap-1 transition-colors p-2 ${activeTab === 'journal' && !showSettingsModal ? 'text-[#FF8A00]' : 'text-[#848B98]'}`}>
              <BookOpen size={22} />
              <span className="text-[9px] font-bold tracking-wider">יומן</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
