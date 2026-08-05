import React from 'react';
import { Dumbbell } from 'lucide-react';
import { DIFFICULTY_MODIFIERS } from '../data/constants';

// שורת "צ'יפים" לבחירת רמת קושי (אפשר לבחור כמה שרוצים) - נשמרת כתגית על האימון,
// זמינה גם במגרש וגם בדף ההזנה כדי שהבחירה תהיה נגישה בכל שלב.
export default function DifficultyChips({ selected, onToggle, compact = false }) {
  return (
    <div className={compact ? 'flex flex-wrap gap-1.5' : 'flex flex-wrap gap-2'}>
      {DIFFICULTY_MODIFIERS.map(mod => {
        const isActive = selected.includes(mod.id);
        return (
          <button
            key={mod.id}
            type="button"
            onClick={() => onToggle(mod.id)}
            className={`inline-flex items-center gap-1 rounded-full border font-bold transition-colors
              ${compact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'}
              ${isActive
                ? 'bg-[#FF8A00] text-black border-[#FF8A00]'
                : 'bg-[#0F1115] text-[#A0A6B1] border-[#3A4155] hover:border-[#FF8A00]/50'}`}
          >
            {!compact && <Dumbbell size={11} className={isActive ? 'text-black' : 'text-[#FF8A00]'} />}
            {mod.label}
          </button>
        );
      })}
    </div>
  );
}
