// === מיקומי המגרש המעודכנים מתמטית ברמת הפיקסל! ===
// מערכת הצירים: 100 רוחב על 125 גובה (הסל למעלה, y גדל ככל שמתרחקים ממנו)
// קו עונשין = Y:55, לוח סל = Y:12
export const DEFAULT_SPOTS = [
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

export const GROUP_ORDER = ['צד שמאל', 'אופקי', 'צד ימין', 'מול הסל', 'שלשות'];

// המגרש מחולק גם ל-4 "רבעים" ביחס לסל (למעלה-שמאל=1, למעלה-ימין=2, למטה-ימין=3, למטה-שמאל=4) -
// משמש בעיקר להצעת שם אוטומטית למיקום מותאם אישית חדש שנוסף דרך עורך המיקומים.
const COURT_HEIGHT = 125;

export const getQuadrant = (x, y) => {
  const nearHoop = y < COURT_HEIGHT / 2;
  const leftSide = x < 50;
  if (nearHoop) return leftSide ? 1 : 2;
  return leftSide ? 4 : 3;
};

const QUADRANT_LABELS = {
  1: 'רבע עליון-שמאלי',
  2: 'רבע עליון-ימני',
  3: 'רבע תחתון-ימני',
  4: 'רבע תחתון-שמאלי'
};

// שם "נקודת ציון" בהתאם למרחק מהסל (ציר Y), בהשראת האזורים האמיתיים במגרש כדורסל
const landmarkForY = (x, y) => {
  const isCorner = y <= 20 && (x <= 15 || x >= 85);
  if (isCorner) return 'פינת שלוש';
  if (y <= 12) return 'מאחורי הקרש';
  if (y <= 20) return 'מתחת לסל';
  if (y <= 35) return 'עיגול עונשין קדמי';
  if (y <= 50) return 'בקבוק';
  if (y <= 60) return 'קו עונשין';
  if (y <= 82) return 'עיגול עונשין אחורי';
  if (y <= 95) return 'קשת שלישה';
  return 'שלישה רחוקה';
};

const sideForX = (x) => {
  if (x < 40) return 'צד שמאל';
  if (x > 60) return 'צד ימין';
  return 'מרכז';
};

// מציע שם קריא למיקום חדש שנוסף ידנית על המגרש, לפי מיקומו (רבע + נקודת ציון + צד)
export const suggestSpotName = (x, y) => {
  const quadrant = QUADRANT_LABELS[getQuadrant(x, y)];
  const landmark = landmarkForY(x, y);
  const side = sideForX(x);
  return `${landmark} - ${side} (${quadrant})`;
};

// משייך מיקום חדש לאחד מ-5 האזורים הקיימים לצורך סטטיסטיקות/היסטוריה עקביות
export const suggestSpotGroup = (x, y) => {
  if (y >= 78) return 'שלשות';
  if (y >= 50 && y <= 60 && x >= 20 && x <= 80) return 'אופקי';
  if (x <= 30) return 'צד שמאל';
  if (x >= 70) return 'צד ימין';
  return 'מול הסל';
};

// מזהים חדשים למיקומים מותאמים אישית מתחילים מ-1000 כדי לעולם לא להתנגש עם ה-21 המובנים (1-21)
export const nextCustomSpotId = (spots) => {
  const customIds = spots.map(s => s.id).filter(id => id >= 1000);
  return customIds.length > 0 ? Math.max(...customIds) + 1 : 1000;
};
