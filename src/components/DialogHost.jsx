import React, { useState, useEffect } from 'react';

// דיאלוגי אישור/התראה מודרניים במקום window.confirm/window.alert המכוערים - ממומש כ"סינגלטון"
// עצמאי (לא context) כדי שכל פונקציה בקובץ תוכל לקרוא לו בלי props. בקשות שמגיעות בזמן שדיאלוג
// כבר מוצג נכנסות לתור ומוצגות אחת אחרי השנייה - כדי שאף Promise לא יינטש בלי להיפתר (למשל
// אם אפקט אוטומטי פותח דיאלוג בדיוק כשדיאלוג אחר כבר ממתין לתשובה), מה שעלול "לתקוע" את
// הפונקציה ה-async שממתינה לו לנצח ולמנוע ממנה להמשיך לרוץ.
let dialogListener = null;
const queue = [];
const showNext = () => {
  if (dialogListener && queue.length > 0) dialogListener(queue[0]);
};
const openDialog = (config) => new Promise((resolve) => {
  queue.push({ ...config, resolve });
  if (queue.length === 1) showNext();
});
export const confirmModern = (message, opts = {}) => openDialog({ type: 'confirm', message, ...opts });
export const alertModern = (message, opts = {}) => openDialog({ type: 'alert', message, ...opts });

export default function DialogHost() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    dialogListener = (config) => setDialog(config);
    if (queue.length > 0) setDialog(queue[0]);
    return () => { dialogListener = null; };
  }, []);

  if (!dialog) return null;
  const close = (result) => {
    dialog.resolve(result);
    queue.shift();
    setDialog(queue.length > 0 ? queue[0] : null);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1C202A] rounded-3xl border border-[#2A2F3D] shadow-2xl w-full max-w-[320px] p-6 animate-in zoom-in-95">
        {dialog.title && <h3 className="text-white font-bold text-base mb-2">{dialog.title}</h3>}
        <p className="text-[#E0E2E7] text-sm leading-relaxed whitespace-pre-line">{dialog.message}</p>
        <div className="flex gap-3 mt-6">
          {dialog.type === 'confirm' && (
            <button
              onClick={() => close(false)}
              className="flex-1 py-3 rounded-xl bg-[#2A2F3D] text-[#E0E2E7] font-bold text-sm active:scale-95 transition-transform"
            >
              {dialog.cancelText || 'ביטול'}
            </button>
          )}
          <button
            onClick={() => close(true)}
            className={`flex-1 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform ${dialog.danger ? 'bg-[#EF4444] text-white' : 'bg-gradient-to-r from-[#FF8A00] to-[#E55D00] text-[#0F1115]'}`}
          >
            {dialog.confirmText || (dialog.type === 'alert' ? 'הבנתי' : 'אישור')}
          </button>
        </div>
      </div>
    </div>
  );
}
