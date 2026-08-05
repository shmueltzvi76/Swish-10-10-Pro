export const TREND_COLORS = { up: '#22C55E', down: '#EF4444', same: '#FF8A00' };

export const STORAGE_DATA_KEY = 'swish_pro_data_v19';
export const STORAGE_SETTINGS_KEY = 'swish_pro_settings_v19';
export const STORAGE_ONBOARDED_KEY = 'swish_pro_onboarded_v19';
export const STORAGE_SETTINGS_SEEN_KEY = 'swish_pro_settings_seen_v19';
export const STORAGE_SPOTS_KEY = 'swish_pro_spots_v1';
export const STORAGE_SPOTS_HINT_SEEN_KEY = 'swish_pro_spots_hint_seen_v1';
export const STORAGE_DIFFICULTY_HINT_SEEN_KEY = 'swish_pro_difficulty_hint_seen_v1';
export const STORAGE_COURT_VIEW_KEY = 'swish_pro_court_view_v1';

// רמות קושי לזריקה - ניתן לבחור כמה שרוצים, נשמרות כתגית על האימון (זמינות גם במגרש וגם בדף ההזנה)
export const DIFFICULTY_MODIFIERS = [
  { id: 'off_hand', label: 'יד לא-דומיננטית' },
  { id: 'off_glass', label: 'דרך הקרש' },
  { id: 'off_dribble', label: 'תוך כדי ריצה / דריבל' },
  { id: 'moving', label: 'תוך כדי תנועה' },
  { id: 'jump_shot', label: 'עם קפיצה' },
  { id: 'set_shot', label: 'בלי קפיצה' },
  { id: 'from_drill', label: 'מתוך תרגיל' },
  { id: 'behind_back', label: 'מאחורי הגב' },
  { id: 'one_hand', label: 'ביד אחת' }
];

// נתוני הדגמה בלבד - מוצגים רק כשאין עדיין אימונים אמיתיים, כדי להראות את האפליקציה "בשיא תפארתה".
// נמחקים אוטומטית ברגע שנשמר אימון אמיתי ראשון, או שהנתונים מנוקים ידנית בהגדרות.
export const DEMO_SESSIONS = [
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

export const INITIAL_SESSION = {
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
