import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// === תפריט מותאם אישית ===
export default function CustomDropdown({ value, options, onChange, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-[#161920] text-white font-bold text-sm border border-[#3A4155] rounded-xl py-3 px-4 focus:outline-none focus:border-[#FF8A00] shadow-sm transition-all"
      >
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon size={16} className="text-[#FF8A00] shrink-0" />}
          <span className="text-white truncate">
            {selectedOption ? selectedOption.label : 'בחר...'}
          </span>
        </div>
        <ChevronDown size={16} className={`text-[#FF8A00] shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
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
}
