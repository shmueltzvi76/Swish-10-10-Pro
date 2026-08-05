import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// === הזנה משולבת ===
export default function HybridInput({ value, onChange, max }) {
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
}
