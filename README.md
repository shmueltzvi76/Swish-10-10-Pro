# Swish 10/10 Pro (v1)

גרסה מקבילה ומשודרגת של [Swish 10/10](https://github.com/shmueltzvi76/Swish-10-10) - אפליקציה לאימון קליעות לסל במגרש. שני הפרויקטים רצים במקביל ולגמרי בלי תלות אחד בשני; זהו נקודת ההתחלה לפני השדרוגים.

## פיתוח מקומי

```bash
npm install
npm run dev
```

## בנייה לפרודקשן

```bash
npm run build
npm run preview
```

## פריסה ל-Vercel

הפרויקט הוא אפליקציית Vite + React רגילה. בחיבור הריפו ל-Vercel, ה-Framework Preset יזוהה אוטומטית כ-Vite:

- Build Command: `npm run build`
- Output Directory: `dist`

הנתונים נשמרים מקומית בדפדפן (`localStorage`), אין צורך בשרת או במסד נתונים.
