// === "תצוגה אפקטיבית" - הלב של פיצ'ר "אימון קצר" ===
// כשאימון לא כולל את כל המיקומים (כי היה קצר), המקומות שלא נזרקו בו ממשיכים "לחפש אחורה"
// בהיסטוריה עד שנמצא הערך האמיתי האחרון שהוזן בפועל, כדי שהמגרש/כרטיס הסיכום/הגרף תמיד
// יראו תמונה מלאה ועדכנית - בלי להמציא נתונים, ובלי להראות "0" במקום שלא נזרק.
//
// כל הפונקציות כאן מקבלות sessionsList ו-spotsList כפרמטרים (לא גלובליים) כדי שאפשר יהיה
// להפעיל אותן גם על היסטוריית האימונים המלאה (לשימוש בטאב הסטטיסטיקות) וגם על תת-קבוצה
// מסוננת (למשל לפי רמת קושי, לשימוש במגרש) - שתי התצוגות האלו לא בהכרח מבוססות על אותם אימונים.

// חיפוש אחורה בהיסטוריה עד מציאת ערך אמיתי שהוזן בפועל למקום נתון
export const findEffectiveSpotValue = (sessionsList, spotId, fromIdx) => {
  for (let i = fromIdx; i < sessionsList.length; i++) {
    if (sessionsList[i].data[spotId] !== undefined) return { value: sessionsList[i].data[spotId], idx: i };
  }
  return null;
};

// עבור כל מיקום פעיל, הערך האפקטיבי האחרון (כולל מאיזה אימון הוא הגיע בפועל)
export const computeEffectiveMerge = (sessionsList, spotsList) => {
  const merged = {};
  spotsList.forEach(spot => {
    const found = findEffectiveSpotValue(sessionsList, spot.id, 0);
    if (found) merged[spot.id] = found;
  });
  return merged;
};

export const computeEffectiveMA = (mergeMap, targetShotsFallback) => {
  const entries = Object.values(mergeMap);
  return {
    made: entries.reduce((a, e) => a + e.value, 0),
    total: entries.length * targetShotsFallback
  };
};

// "תמונת מצב עצמאית" של המיקומים החל מהאימון הקודם (fromIdx=1) - נבנית מחדש, לא כ"מה שהיה
// לפני המקור של כל עמדה" בנפרד (זו הייתה טעות אמיתית: יכולה לפספס עמדות או להפוך השוואה)
export const computeEffectivePrevMA = (sessionsList, spotsList, targetShotsFallback) => {
  if (sessionsList.length < 2) return null;
  const entries = [];
  spotsList.forEach(spot => {
    const found = findEffectiveSpotValue(sessionsList, spot.id, 1);
    if (found) entries.push(found.value);
  });
  if (!entries.length) return null;
  return {
    made: entries.reduce((a, b) => a + b, 0),
    total: entries.length * targetShotsFallback
  };
};

// האחוז האפקטיבי המצטבר בנקודת זמן idx נתונה בהיסטוריה (ממוזג מהאימון הזה ואילך אחורה) -
// משמש לגרף ("כולל") ולבדיקת שיא אמיתי, כדי שגם נקודות היסטוריות עם אימון חלקי לא "יצנחו" באופן מטעה
export const computeEffectivePercAtIndex = (sessionsList, spotsList, idx, targetShotsFallback) => {
  const merged = {};
  for (let i = idx; i < sessionsList.length && Object.keys(merged).length < spotsList.length; i++) {
    spotsList.forEach(spot => {
      if (merged[spot.id] === undefined && sessionsList[i].data[spot.id] !== undefined) merged[spot.id] = sessionsList[i].data[spot.id];
    });
  }
  const vals = Object.values(merged);
  if (!vals.length) return null;
  const total = vals.length * (sessionsList[idx]?.targetShots || targetShotsFallback);
  return (vals.reduce((a, b) => a + b, 0) / total) * 100;
};
