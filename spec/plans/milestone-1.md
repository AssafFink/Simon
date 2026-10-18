# תוכנית – Milestone 1: בסיס אפליקציה ושני מסכים מעוצבים

> מקורות: `MILESTONES.md` (Milestone 1), `PRD.md`, `DESIGN.md` + `wireframes.png` / `mockups.png` / `style-guide.png`, `ARCHITECTURE.md`.
> מצב נוכחי: אין עדיין קוד. ה-repo המקומי קיים ומחובר ל-`https://github.com/AssafFink/Simon.git`. Node 22.16 / npm 10.9 מותקנים.

## 1. מטרה ותחום

הקמת פרויקט React + TypeScript + Vite שרץ מקומית, עם שני מסכים (**בית**, **אודות**) בעיצוב הכהה של ה-Mockups, ניווט פנימי ביניהם ובדיקות בסיסיות. **אין** לוגיקת משחק, אודיו, היסטוריה אמיתית, קונפטי או PWA – אלה שייכים ל-Milestones 2–5.

**מחוץ לתחום ב-Milestone זה (לא לממש):**
- `useReducer` / Game Engine / Sequence Controller / Web Audio (M2).
- מצב `paused`, "המשך משחק" (M3).
- `localStorage`, כרטיסי היסטוריה, "מחק היסטוריה" ו-Dialog המחיקה (M4).
- `vite-plugin-pwa`, Manifest, אייקון, `base: "/Simon/"`, GitHub Actions (M5).
- `canvas-confetti` – לא מתקינים עדיין.
- אין כפתורי הגדרות או מתג סאונד, ואין מסך שלישי.

## 2. Dependencies

| סוג | חבילות |
|---|---|
| Runtime | `react`, `react-dom`, `@fontsource/heebo` |
| Dev | `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` |

- גרסאות יציבות עדכניות שתואמות זו לזו (Vite + Vitest מאותו דור). `package-lock.json` נשמר ב-repo.
- הקבצים נכתבים ידנית (לא `npm create vite`), כדי לא להכניס קבצי דמו מיותרים.

## 3. קבצים ליצירה

```text
package.json
package-lock.json            (נוצר ע"י npm install)
index.html
vite.config.ts               (כולל הגדרות Vitest)
tsconfig.json
tsconfig.app.json
tsconfig.node.json
src/
  main.tsx
  App.tsx
  App.test.tsx
  vite-env.d.ts
  test/setup.ts
  styles/
    tokens.css               (CSS Variables: צבעים, ריווח, רדיוסים, טיפוגרפיה)
    global.css               (reset, body, פונט, RTL, layout בסיסי)
  game/
    colors.ts                (מזהי צבעים, שם עברי, מיקום בלוח)
  components/
    AppShell.tsx / .css      (כותרת עליונה + אזור תוכן + ניווט)
    BottomNav.tsx / .css
    SimonBoard.tsx / .css
    PrimaryButton.tsx / .css
    HomeScreen.tsx / .css
    AboutScreen.tsx / .css
```

**קבצים לשינוי:**
- `CLAUDE.md` – מילוי חלק "פקודות הרצה" (`npm run dev`, `npm run test`) לאחר שהאפליקציה רצה.
- `spec/MILESTONES.md` – סימון 🟡 ליד כותרת Milestone 1 בסיום הבנייה.
- `.gitignore` – כבר מכסה `node_modules/`, `dist/`, `coverage/`; לא צפוי שינוי.
- אין צורך ב-`.env` / `.env.example` (אין מפתחות או הגדרות).

## 4. פקודות npm

| פקודה | תוכן |
|---|---|
| `npm run dev` | `vite` |
| `npm run build` | `tsc -b && vite build` |
| `npm run typecheck` | `tsc -b --noEmit` (או מקביל תקין לתצורת ה-tsconfig) |
| `npm run test` | `vitest run` |
| `npm run preview` | `vite preview` |

`strict: true` ב-TypeScript.

## 5. מבנה וגישה

### 5.1 `index.html`
- `<html lang="he" dir="rtl">`, `<meta charset="UTF-8">`.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
- `<meta name="theme-color" content="#0A1628">`, `<title>סיימון</title>`.
- ללא קישור ל-Google Fonts או CDN כלשהו.

### 5.2 גופן
ב-`main.tsx`: ייבוא `@fontsource/heebo/400.css`, `600.css`, `700.css` בלבד (Regular / Semibold / Bold). `font-family: 'Heebo', Arial, sans-serif`.

### 5.3 ניווט (App Shell)
- ב-`App.tsx`: `useState<'home' | 'about'>('home')`. אין Router ואין שינוי URL – מעבר מסך הוא החלפת תצוגה בתוך אותו React Tree, ללא טעינת דף.
- `BottomNav`: שני `<button>` – **"בית"** ו-**"אודות"**, עם `aria-current="page"` על הפעיל ומראה פעיל מובחן (רקע/טקסט בולט). אייקון פשוט (בית / i) כ-SVG inline מעל התווית, כמשני לטקסט – לפי ה-Wireframes וה-Style Guide.
- סדר ב-RTL: **"בית"** מימין, **"אודות"** משמאל (כמו בהמחשות) – מתקבל טבעית מ-`dir="rtl"`.
- בהכנה ל-M3: ה-`HomeScreen` יישאר בבעלות `App` (ה-State של המשחק ב-M2 יחיה ב-`App`), אבל ב-M1 אין State משחק ולכן פשוט מציגים מסך אחד מתוך השניים.

### 5.4 Layout כללי
- עמודה אנכית, `min-height: 100dvh`, רוחב תוכן מקסימלי ~`480px` ממורכז (מובייל בלבד; אין עיצוב ייעודי ל-Desktop).
- כותרת עליונה (בית: **"סיימון"**; אודות: **"אודות"**), קו הפרדה דק בצבע Border מתחתיה, כמו ב-Mockups.
- פס ניווט תחתון קבוע (`position: sticky/fixed` לתחתית) עם `padding-bottom: env(safe-area-inset-bottom)`; התוכן מקבל ריווח תחתון כדי לא להיכסות.
- `overflow-x: hidden` אינו פתרון – יש לוודא שאין רכיב רחב מה-Viewport (מינימום נבדק: 320px רוחב).
- ריווח רק מהסולם `8 / 12 / 16 / 24px`.

### 5.5 Design Tokens (`tokens.css`)
```text
--color-green  #00D26A    --color-red    #FF3B30
--color-yellow #FFD600    --color-blue   #00A3FF
--color-charcoal #0F0F0F  --color-soft-gray #E5E5E5  --color-white #FFFFFF
--color-bg     #0A1628    --color-surface #12213A    --color-border #1E3556
--space-1 8px  --space-2 12px  --space-3 16px  --space-4 24px
טיפוגרפיה: h1 32/700, h2 24/700, h3 20/600, body 16/400, caption 14/400, button 16/600
```
אין צבעים נוספים מלבד גרסאות מעומעמות/שקיפות של אלה (למשל לטקסט משני).

### 5.6 מסך בית (`HomeScreen`) – מצב "לפני תחילת משחק" בלבד
מלמעלה למטה:
1. כותרת **"סיימון"** (H1).
2. חיווי שלב **"שלב 0 מתוך 10"** (H3). מספרים בתוך `<bdi>` / בידוד כיווניות לפי הצורך כדי שיוצגו נכון ב-RTL.
3. `SimonBoard`.
4. אזור סטטוס (שורת טקסט ריקה ב-M1, שומר מקום קבוע לטקסטים של M2 כדי שהפריסה לא תקפוץ).
5. `PrimaryButton` **"התחל"** – כחול מלא, רחב, מעוגל, טקסט לבן מודגש, צל רך. ב-M1 הלחיצה לא עושה דבר (אין handler משחק).

### 5.7 לוח Simon (`SimonBoard`)
- מקור הצבעים והמיקומים ב-`game/colors.ts`:
  ```ts
  type SimonColor = 'green' | 'red' | 'yellow' | 'blue';
  // מיקום מרחבי – לא מתהפך ב-RTL
  green: למעלה-שמאל, red: למעלה-ימין, yellow: למטה-שמאל, blue: למטה-ימין
  label: 'ירוק' | 'אדום' | 'צהוב' | 'כחול'
  ```
  (סידור ה-Mockups גובר על ה-Wireframes, לפי DESIGN.md.)
- מימוש: מיכל עגול (`aspect-ratio: 1`, `border-radius: 50%`, רקע Charcoal, מסגרת Border) עם CSS Grid 2×2 ו-`gap` כהה עבה כפסי הפרדה. כל רבע הוא `<button type="button">` עם `border-radius` רק בפינה החיצונית (רבע עיגול), ו-`aria-label` בעברית ("ירוק" וכו'). מיקום כל רבע נקבע ב-`grid-area` מפורש (לא לפי סדר DOM), ומיכל הגריד מוגדר `direction: ltr` כדי ש-RTL לא יהפוך את הסידור המרחבי.
- דיסק מרכזי כהה (Charcoal עם טבעת Border) ממוקם במרכז, `pointer-events: none`, **ללא טקסט** (DESIGN: "במרכז דיסק כהה; אין בו פיצ'ר נוסף").
- גודל: `width: min(85vw, 340px, 45dvh)` בקירוב – גדול אבל משאיר מקום לחיווי, לכפתור ולניווט בלי גלילה במסך טלפון רגיל.
- נכונות למגע: `touch-action: manipulation`, `user-select: none`, `-webkit-tap-highlight-color: transparent`.
- ב-M1 הצבעים מוצגים במצבם המלא ("מואר בצבעיו" כמו ב-Mockup ההתחלה); הלחיצות לא עושות דבר. נכין class/prop ל-`dimmed` ו-`active` (Glow) רק אם זה זול – בלי לוגיקה.

### 5.8 מסך אודות (`AboutScreen`)
1. כותרת **"אודות"** (H1 באזור העליון).
2. כרטיס Surface עם גבול Border ופינות מעוגלות: כותרת **"על המשחק"** (H2) ותוכן (Body):
   - "זכור את רצף הצבעים שמוצג."
   - "לחץ על הצבעים באותו סדר."
   - "נסה להגיע עד שלב 10!"
   (לפי ה-Wireframes; PRD מתיר לקבוע את נוסח ההוראות ביישום.)
3. כותרת **"10 המשחקים האחרונים"** (H2/H3).
4. חיווי ריק בכרטיס/טקסט מאופק: **"עדיין אין משחקים שמורים."**
5. **ללא** כפתור "מחק היסטוריה" ב-M1 – הוא נוסף ב-M4 יחד עם ההיסטוריה (ב-M1 נדרש רק "אזור היסטוריה ריק וחיווי היעדר תוצאות").

### 5.9 נגישות בסיסית
- `<main>` לתוכן, `<nav aria-label="ניווט ראשי">` לפס התחתון, כותרות היררכיות.
- `:focus-visible` ברור על כל הכפתורים.
- כל הטקסטים הגלויים בעברית; אין מחרוזת UI באנגלית.

## 6. בדיקות אוטומטיות (`App.test.tsx`)
Vitest + jsdom + React Testing Library:
1. רינדור ראשוני: מוצגים "סיימון", "שלב 0 מתוך 10", כפתור "התחל", ו-4 כפתורי צבע עם השמות "ירוק", "אדום", "צהוב", "כחול".
2. ניווט: לחיצה על "אודות" מציגה את "על המשחק", "10 המשחקים האחרונים" והודעת ההיסטוריה הריקה, ומסתירה את הלוח; לחיצה על "בית" מחזירה את הלוח. `aria-current` מתעדכן.
3. ללא טעינה מחדש: ה-URL (`window.location.href`) לא משתנה אחרי המעבר.
4. אין בפס הניווט יותר משתי אפשרויות.
5. מיקום הצבעים: כל רבע מקבל class/attribute של המיקום הנכון (`data-position="top-left"` וכו') לפי `colors.ts`.

## 7. בדיקה עצמית בסוף הבנייה (לפני סימון 🟡)
1. `npm run typecheck`, `npm run test`, `npm run build` – כולם עוברים.
2. הרצת `npm run dev` ובדיקה בדפדפן ה-Built-in באמולציית מובייל (375×812 ו-320 רוחב):
   - שני המסכים נפתחים; מעבר ביניהם ללא רענון.
   - מיקום הצבעים: ירוק ↖, אדום ↗, צהוב ↙, כחול ↘.
   - אין גלילה אופקית (`document.documentElement.scrollWidth <= innerWidth`).
   - הגופן Heebo נטען מקומית (בדיקת בקשות רשת – אין פנייה ל-Google Fonts).
   - צילום מסך והשוואה חזותית מול ה-Mockups.
3. סגירת שרת הפיתוח בסיום.
4. מילוי "פקודות הרצה" ב-`CLAUDE.md`, סימון 🟡 ב-`MILESTONES.md`. **ללא commit.**

## 8. ADR צפוי
- **ADR-1: מימוש לוח ה-Simon ב-CSS Grid עם ארבעה `button`** (ולא SVG) – פשוט יותר, כפתורים סמנטיים ונגישים, Hit area מלא לכל רבע. יתועד ב-`ARCHITECTURE.md` תחת `## החלטות מרכזיות (ADRs)` בזמן הבנייה.

## 9. מיפוי ל-Definition of Done

| תנאי DoD | איך מכוסה |
|---|---|
| build + typecheck עוברים; בדיקת Render/Navigation עוברת | סעיפים 4, 6, 7.1 |
| שני מסכים, מעבר ללא רענון, אין מסך שלישי | סעיף 5.3, בדיקות 2–4 |
| 4 אזורים במיקום נכון, חיווי שלב, "התחל"; אודות עם הסבר והיסטוריה ריקה | סעיפים 5.6–5.8, בדיקות 1, 2, 5 |
| עברית, RTL, קריא במובייל אנכי, בלי גלילה אופקית | סעיפים 5.1, 5.4, 5.9, 7.2 |
| אין יכולות מחוץ ל-PRD, אין Backend/DB | סעיף 1 (מחוץ לתחום), סעיף 2 (Dependencies) |

## 10. הערה על GitHub
ה-DoD מזכיר ניהול קוד ב-GitHub. ה-repo כבר מחובר ל-`AssafFink/Simon`; commit ו-push יתבצעו רק כשתבקש "דחוף שינויים לגיטהאב".
