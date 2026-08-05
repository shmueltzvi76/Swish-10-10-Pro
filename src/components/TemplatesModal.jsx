import React from 'react';
import { X, LayoutTemplate, Check } from 'lucide-react';

// בחירת תבנית מיקומים מוכנה מראש (ברירת מחדל / תרגילים מבוססי-מאמנים) שמחליפה את פריסת המגרש הנוכחית
export default function TemplatesModal({ templates, activeTemplateId, onApply, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#1C202A] w-full max-w-sm rounded-3xl border border-[#2A2F3D] p-5 max-h-[80vh] overflow-y-auto shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <LayoutTemplate size={18} className="text-[#FF8A00]" /> תבניות מיקומים
          </h3>
          <button onClick={onClose} aria-label="סגור" className="text-[#848B98] hover:text-white bg-[#0F1115] rounded-full p-2 border border-[#2A2F3D] shrink-0">
            <X size={16} />
          </button>
        </div>
        <p className="text-[#848B98] text-[11px] mb-4">בחירת תבנית מחליפה את המיקומים הנוכחיים על המגרש בפריסה החדשה.</p>

        <div className="space-y-2.5">
          {templates.map(t => {
            const isActive = activeTemplateId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onApply(t)}
                className={`w-full text-right p-3.5 rounded-2xl border transition-colors ${isActive ? 'border-[#FF8A00] bg-[#FF8A00]/10' : 'border-[#2A2F3D] bg-[#0F1115] hover:border-[#FF8A00]/40'}`}
              >
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-white font-bold text-sm">{t.name}</span>
                  {isActive && <Check size={14} className="text-[#FF8A00] shrink-0" />}
                </div>
                <p className="text-[#848B98] text-[11px] leading-relaxed">{t.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
