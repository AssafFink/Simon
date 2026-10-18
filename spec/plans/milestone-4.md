# Milestone 4 – היסטוריית משחקים ומחיקה מאושרת — תוכנית בנייה

מקורות: `MILESTONES.md` (Milestone 4), `PRD.md` §3 ("סיום משחק" סעיף 4, "צפייה בהיסטוריה ומחיקתה"), §4.4, מקרי קצה (היסטוריה ריקה, מגבלה, ביטול מחיקה, אחסון חסום); `ARCHITECTURE.md` §2.3 כללים 4, 8, 9; §2.5 (Game Result, `simon.history.v1`, Validation, Locale עברי); §2.6 ("אודות"); §2.8 (אין `dangerouslySetInnerHTML`); `DESIGN.md` §1.2, §1.3, §2.3 (History Cards, Dialog, Secondary/Destructive Button), Wireframes + Mockups "אודות" ו-"אודות – אישור מחיקה".
מצב פתיחה: Milestone 3 ✅ — `useGame` ב-`App` מנהל את המשחק (כולל `paused`); `AboutScreen` מציג הסבר וחיווי ריק קבוע; אין שימוש ב-`localStorage`.

## מה **לא** נכנס באבן דרך זו
- PWA, Service Worker, אייקונים, `base: "/Simon/"`, GitHub Actions — Milestone 5.
- אין שמירת מצב משחק פעיל/מושהה ב-`localStorage` (רק תוצאות שהסתיימו).
- אין סינון, מיון, סטטיסטיקה או "שיא אישי" — לא ב-PRD.

## 1. התנהגות מטרה (סיכום)
- כשמשחק **נכנס** ל-`won` או `lost` נשמרת רשומה אחת: `finishedAt` (רגע הלחיצה האחרונה, ISO 8601), `completedRounds` (0–10), `outcome` (`'win'`/`'loss'`, לפי ARCHITECTURE §2.5).
- שמירה **פעם אחת בלבד** לכל `gameId` — גם תחת React Strict Mode, גם אם ה-Component מתרנדר שוב, וגם אחרי מעבר מסכים כשהמשחק עדיין במצב `won`/`lost`.
- השהיה, מעבר מסכים, הסתרה, Refresh או סגירה באמצע משחק — **לא** שומרים כלום.
- הרשומה החדשה נכנסת בראש הרשימה; נשמרות רק 10 הראשונות (הישנה ביותר נזרקת).
- מסך **"אודות"** מציג את הרשימה מהחדש לישן; בהיעדר רשומות — **"עדיין אין משחקים שמורים."** (החיווי הקיים).
- **"מחק היסטוריה"** פותח חלונית אישור. **"ביטול"** סוגר בלי שינוי. **"מחק"** מוחק, סוגר, ומציג חיווי ריק. המחיקה לא נוגעת במשחק פעיל/מושהה.
- כשל אחסון לעולם לא חוסם משחק, ולא מוצג כהצלחה.

## 2. קבצים חדשים

### `src/history/historyStorage.ts` — History Repository (טהור, ללא React)
```ts
export type GameResult = { id: string; finishedAt: string; completedRounds: number; outcome: 'win' | 'loss' };
export const HISTORY_KEY = 'simon.history.v1';
export const MAX_RESULTS = 10;

export type LoadResult = { ok: true; results: GameResult[] } | { ok: false; results: [] };
export function loadHistory(): LoadResult;
export function addResult(result: GameResult): { ok: boolean; results: GameResult[] };
export function clearHistory(): boolean;
```
- הגישה ל-`window.localStorage` עצמה עטופה ב-`try/catch` (ב-Safari פרטי/חסום עצם הגישה יכולה לזרוק).
- `loadHistory`: אין מפתח → `ok: true`, רשימה ריקה. `JSON.parse` נכשל / `schemaVersion !== 1` / `results` אינו מערך → `ok: false`. רשומות לא תקינות (שדה חסר, `completedRounds` מחוץ ל-0–10, `outcome` אחר, תאריך לא תקין) מסוננות בשקט; חיתוך ל-10.
- `addResult`: קורא את הקיים (אם הנתונים פגומים — מתחיל מרשימה ריקה, כי אין מה לשמר), מוסיף בראש, חותך ל-10, כותב `{ schemaVersion: 1, results }`. מחזיר `ok: false` אם הכתיבה זרקה (למשל `QuotaExceededError`), ואז `results` הוא הרשימה שהייתה ידועה לפני הניסיון.
- `clearHistory`: כותב `{ schemaVersion: 1, results: [] }` (או `removeItem`); מחזיר `false` בכשל.
- `createResultId()`: `` `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` `` — לא `crypto.randomUUID`, שאינו זמין בכתובת HTTP לא מאובטחת (למשל בדיקה מהטלפון ברשת הביתית).

### `src/history/useHistory.ts` — Hook שמוחזק ב-`App`
- State: `results`, `loadError` (קריאה נכשלה), `saveError` (שמירה אחרונה נכשלה), `clearError`.
- קריאה ראשונית אחת ב-`useState(() => loadHistory())`.
- `record(result)`: קורא ל-`addResult`, מעדכן `results` ו-`saveError`.
- `clear()`: קורא ל-`clearHistory`; בהצלחה → `results = []`, `loadError = false`; בכשל → `clearError = true` והרשימה **נשארת** כפי שהייתה (לא מטשטשים כשל).
- המצב חי ב-`App`, ולכן מסך אודות מציג מיד תוצאה שנשמרה זה עתה, בלי לקרוא שוב מהאחסון.

### `src/components/HistoryCard.tsx` + `HistoryCard.css`
- `<li>` כרטיס כהה (`Surface` + `Border`, פינות מעוגלות) לפי ה-Mockup:
  - צד ימין (תחילת השורה ב-RTL): **"שלבים שהושלמו: X"** (מודגש) ומתחתיו **"תוצאה: ניצחון"** / **"תוצאה: הפסד"** — המילה בירוק/אדום מאופקים, אבל התוצאה תמיד כתובה גם בטקסט.
  - צד שמאל: תאריך ושעה בגודל Caption, למשל `12.05.2024  14:32`, דרך `Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })` ו-`{ hour: '2-digit', minute: '2-digit' }` לפי השעון המקומי, בתוך `<bdi>`/`<time dateTime=…>`.
  - **ניסוח "שלבים שהושלמו"** (ולא "שלב: X" שב-Wireframe): DESIGN §1.2 מבקש "מספר השלבים שהושלמו", ו-"שלב: 0" בהפסד בשלב 1 מבלבל. מתאים לטקסט שבחלונית ההפסד.
- טקסט מוצג רק כ-JSX רגיל (אין `dangerouslySetInnerHTML`).

### `src/components/ConfirmDialog.tsx` + `ConfirmDialog.css`
- שכבת Scrim כהה על כל המסך (מעל פס הניווט) ובמרכזה כרטיס **בהיר** (כמו ב-Mockup): כותרת **"למחוק את ההיסטוריה?"**, הסבר **"כל תוצאות המשחקים יימחקו."**, ושני כפתורים באותה שורה: **"מחק"** (אדום, `--color-red`) ו-**"ביטול"** (אפור בהיר, משני).
  - סדר הכפתורים לפי ה-Mockup: ב-RTL "מחק" מימין ו-"ביטול" משמאל (ב-Wireframe הסדר הפוך; המראה הסופי לפי ה-Mockup).
- `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`/`aria-describedby`; פוקוס ראשוני על **"ביטול"** (הבחירה הבטוחה); `Escape` ולחיצה על ה-Scrim = ביטול.
- רכיב פשוט ב-`div` (לא `<dialog>` מקורי — jsdom לא תומך ב-`showModal` היטב, וזה מסבך בדיקות).

## 3. קבצים שמשתנים

### `src/App.tsx`
- `const history = useHistory();`
- **שמירת תוצאה** — Effect ב-App:
  ```ts
  const recordedGameRef = useRef(0);
  useEffect(() => {
    const { status, gameId, completedRounds } = game.state;
    if ((status !== 'won' && status !== 'lost') || recordedGameRef.current === gameId) return;
    recordedGameRef.current = gameId;
    history.record({ id: createResultId(), finishedAt: new Date().toISOString(), completedRounds, outcome: status === 'won' ? 'win' : 'loss' });
  }, [game.state.status, game.state.gameId]);
  ```
  ה-Guard לפי `gameId` מונע כפילות ב-Strict Mode (שמריץ Effects פעמיים) ובכל רינדור חוזר. ה-Reducer עצמו לא נוגע באחסון (ARCHITECTURE כלל 4). השמירה קורית מיד בכניסה ל-`won`/`lost`, ולא אחרי ה-`1000ms` של הצגת ההודעה — כך שגם מעבר לאודות באותה שנייה לא מאבד תוצאה.
- מעביר ל-`AboutScreen`: `results`, `loadError`, `clearError`, `onClear`.
- מעביר ל-`HomeScreen` את `saveError` (רק להודעה בחלונית הסיום).

### `src/components/AboutScreen.tsx` + `.css`
- כרטיס "על המשחק" — ללא שינוי.
- כותרת **"10 המשחקים האחרונים"** — ללא שינוי.
- `loadError` → הודעה בכרטיס: **"לא ניתן לטעון את היסטוריית המשחקים במכשיר זה."**
- אחרת: רשימה (`<ol>` של `HistoryCard`) או החיווי הריק הקיים.
- כפתור **"מחק היסטוריה"** מתחת לרשימה — בסגנון משני עם קו מתאר (כמו ב-Mockup), ברוחב הכרטיסים. **מושבת** כשאין רשומות.
- מצב מקומי `confirmOpen`; "מחק" → `onClear()` → סגירת החלונית; אם נכשל — הודעת שגיאה בולטת (`role="alert"`, אדום): **"מחיקת ההיסטוריה נכשלה. נסה שוב."**, והרשימה נשארת.
- הרשימה גוללת בתוך העמוד (ה-`app-main` הקיים), בלי גלילה אופקית, ונשארת מעל פס הניווט הקבוע.

### `src/components/GameOverOverlay.tsx` + `HomeScreen.tsx`
- Prop חדש `saveError`; אם `true`, שורת Caption מתחת לתוצאה: **"לא ניתן היה לשמור את התוצאה בהיסטוריה."** "שחק שוב" ממשיך לעבוד כרגיל.
  (DESIGN לא מגדיר היכן מופיעה הודעת כשל שמירה; חלונית הסיום היא המקום שבו השחקן נמצא ברגע השמירה — הפתרון הפשוט ביותר.)

### `src/test/setup.ts`
- `localStorage.clear()` ו-`vi.restoreAllMocks()` אחרי כל בדיקה, כדי שבדיקות לא ישפיעו זו על זו.

### `spec/ARCHITECTURE.md`
- **ADR-4: היסטוריה — Repository טהור + Hook ב-`App`, שמירה עם Guard לפי `gameId`** — הקשר: שמירה פעם אחת בלבד (גם ב-Strict Mode), ללא Side Effects ב-Reducer, ותצוגה מעודכנת מיד באודות. החלטה: כמתואר למעלה, כולל התנהגות בנתונים פגומים (מתחילים מחדש בשמירה הבאה) ומזהה ללא `crypto.randomUUID`. השלכות: אחסון נבדק בלי React; כשל מוצג ולא מוסתר; המשחק לא תלוי באחסון.

### `spec/MILESTONES.md`
- 🟡 ליד כותרת Milestone 4 בסיום הבנייה.

## 4. בדיקות (Vitest + RTL)

### `src/history/historyStorage.test.ts`
- טעינה ריקה; שמירה וטעינה חוזרת (Roundtrip) — "שורד Refresh".
- 11 הוספות → 10 רשומות, החדשה ראשונה, הראשונה שנוספה נעלמה.
- JSON פגום / `schemaVersion` שגוי → `ok: false`; רשומה לא תקינה מסוננת; `addResult` אחרי נתונים פגומים כותב רשימה תקינה.
- `setItem` זורק → `addResult` מחזיר `ok: false`; `getItem` זורק → `loadHistory` מחזיר `ok: false`; גישה ל-`localStorage` עצמה זורקת → אין קריסה.
- `clearHistory` מצליח → טעינה ריקה; `setItem`/`removeItem` זורק → `false`.

### `src/App.history.test.tsx` — אינטגרציה (Fake Timers ו-mocks כמו ב-`App.game.test.tsx`)
- הפסד בשלב 1 → באודות כרטיס אחד: "שלבים שהושלמו: 0", "תוצאה: הפסד", תאריך ושעה בפורמט הצפוי (עם `vi.setSystemTime`).
- הפסד בשלב מתקדם (למשל אחרי 3 שלבים) → "שלבים שהושלמו: 3".
- ניצחון (10 שלבים) → "שלבים שהושלמו: 10", "תוצאה: ניצחון".
- **Strict Mode:** `render(<StrictMode><App /></StrictMode>)` → הפסד אחד = רשומה אחת בדיוק ב-`localStorage`.
- מעבר אודות↔בית אחרי הפסד (המצב עדיין `lost`) → עדיין רשומה אחת.
- השהיה (אודות / `visibilitychange`) באמצע משחק, וחזרה → אין רשומה; remount ("Refresh") באמצע משחק → אין רשומה, וההיסטוריה הקודמת עדיין מוצגת.
- "שחק שוב" ומשחק נוסף → שתי רשומות, החדשה למעלה.
- remount אחרי שמירה → הרשומות נטענות מחדש.
- מחיקה: "מחק היסטוריה" → חלונית; "ביטול" (וגם `Escape`) → אין שינוי ב-`localStorage` ובתצוגה; "מחק" → חלונית נסגרת, חיווי ריק, האחסון ריק, הכפתור מושבת.
- כשל שמירה (`setItem` זורק) → הודעה בחלונית הסיום, "שחק שוב" מתחיל משחק חדש.
- כשל קריאה → הודעה באודות, ו-"התחל" עדיין מתחיל משחק.
- כשל מחיקה → הודעת שגיאה, הרשומות עדיין מוצגות.

### `src/App.test.tsx` / `App.game.test.tsx` / שאר הבדיקות
- חייבות להמשיך לעבור. בדיקת "אודות מציג חיווי ריק" נשארת (האחסון מתנקה בין בדיקות).
- בדיקת ה-Refresh מ-Milestone 3 שבודקת ש-`setItem` לא נקרא — לעדכן: לא נשמרת רשומה למשחק שלא הסתיים (בדיקה על התוכן ולא על עצם הקריאה).

## 5. בדיקה ידנית בסיום הבנייה (אני, בדפדפן במצב מובייל)
- `npm run typecheck`, `npm run test`, `npm run build` עוברים.
- `npm run dev`, אמולציית Smartphone אנכי: הפסד מהיר, ניצחון (בעזרת קריאת הרצף), באודות הכרטיסים מופיעים כמו ב-Mockup; Refresh — הם נשארים; 11 משחקים → 10 כרטיסים; חלונית מחיקה, ביטול ומחיקה; רשימה ארוכה גוללת ללא גלילה אופקית; אין שגיאות Console.
- סימולציית אחסון חסום (דריסת `setItem` ב-Console) — הודעה מופיעה והמשחק ממשיך.
- **מצב גלישה פרטית אמיתי בטלפון** — לבדיקה שלך במכשיר (לא אציג אותה כאילו עברה).

## 6. מיפוי ל-Definition of Done
| תנאי | איך מכוסה |
|---|---|
| ניצחון/הפסד מוסיפים רשומה אחת עם זמן, שלבים שהושלמו ו"ניצחון"/"הפסד" | אינטגרציה (הפסד שלב 1, הפסד מתקדם, ניצחון) + ידני |
| מעבר מסכים, השהיה, Refresh או יציאה באמצע לא מוסיפים רשומה | אינטגרציה (אודות, `visibilitychange`, remount) |
| אחרי 11 משחקים — לכל היותר 10, מהחדש לישן, נשמרות אחרי Refresh | Repository (11 הוספות, Roundtrip) + אינטגרציה (remount) + ידני |
| "ביטול" לא משנה; "מחק" מרוקן ומחזיר חיווי ריק | אינטגרציה (ביטול, Escape, מחק) + ידני |
| כשל אחסון לא מונע משחק ומוצגת הודעה בעברית | Repository + אינטגרציה (כשל שמירה/קריאה/מחיקה) + ידני |
| בדיקות אוטומטיות להיסטוריה, מגבלת 10, מחיקה, כשל אחסון ומניעת שמירה כפולה | כל הנ"ל, כולל בדיקת Strict Mode |
