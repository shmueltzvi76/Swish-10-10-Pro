import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Highlighter, Palette, X, Trash2 } from 'lucide-react';

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

export default function RichTextEditor({ initialValue, onChange, placeholder }) {
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
}
