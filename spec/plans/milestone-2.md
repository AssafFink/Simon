# Milestone 2 – משחק מלא מקצה לקצה — תוכנית בנייה

מקורות: `MILESTONES.md` (Milestone 2), `PRD.md` §3–4.2, `ARCHITECTURE.md` §2.3–2.6, `DESIGN.md` §1.1, §2.3–2.4, Wireframes ו-Mockups.
מצב פתיחה: Milestone 1 ✅ — App Shell, `HomeScreen` סטטי, `SimonBoard` עם ארבעה `button`, `src/game/colors.ts` (`COLORS`, `TOTAL_ROUNDS`).

## מה **לא** נכנס באבן דרך זו
- מצב `paused`, כפתור "המשך משחק", `visibilitychange`/`pagehide` — Milestone 3.
- היסטוריה / `localStorage` / כרטיסי תוצאה באודות — Milestone 4. אין כתיבה כלשהי לאחסון.
- PWA, Service Worker, אייקונים, `base: "/Simon/"` — Milestone 5.

## 1. תלות חדשה
- `canvas-confetti` (dependency) + `@types/canvas-confetti` (devDependency). אין תלויות נוספות.

## 2. קבצים חדשים

### `src/game/timing.ts`
קבועים משותפים לכל השלבים (DESIGN §1.1, ללא האצה):
- `LEAD_IN_MS = 1000` — המתנה לפני תחילת הצגה (אחרי "התחל", "שחק שוב", או שחזור נכון של שלב).
- `FLASH_MS = 600` — הארה + צליל של כל צבע ברצף.
- `GAP_MS = 250` — הפסקה בין צבעים.
- `PRESS_MIN_MS = 300` — הארה + צליל מינימליים בלחיצת שחקן.

### `src/game/random.ts`
- `randomColor(): SimonColor` — `COLORS[Math.floor(Math.random() * 4)].id`. מודול נפרד כדי שהבדיקות יוכלו להחליף אותו ב-`vi.mock` ברצף צפוי.

### `src/game/gameReducer.ts` — Game Engine + State Machine (טהור, ללא Side Effects)
```ts
type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost';
type GameState = {
  status: GameStatus;
  sequence: SimonColor[];   // 0–10
  round: number;            // 1–10 (ב-idle: 1)
  inputIndex: number;
  completedRounds: number;  // 0–10
  gameId: number;           // עולה בכל משחק חדש (ישמש ב-M4 ל-Guard של שמירה)
  presentationId: number;   // עולה בכל כניסה ל-presenting; מפתח ל-Effect של ההצגה
};
type GameAction =
  | { type: 'start'; firstColor: SimonColor }          // מ-idle / won / lost
  | { type: 'presentationDone'; presentationId: number }
  | { type: 'press'; color: SimonColor; nextColor: SimonColor }
  | { type: 'abandon' };                               // ביטול זמני במעבר לאודות → idle
```
- **הרנדום מגיע מבחוץ** ב-payload (`firstColor`, `nextColor`) — ה-Reducer נשאר טהור (חשוב תחת Strict Mode, שמריץ Reducer פעמיים) וקל לבדיקה.
- `start`: רצף `[firstColor]`, `round=1`, `inputIndex=0`, `completedRounds=0`, `gameId+1`, `presentationId+1`, `status='presenting'`. מותר רק מ-`idle`/`won`/`lost`.
- `presentationDone`: רק אם `status==='presenting'` **וגם** ה-`presentationId` תואם (התעלמות מסיום Playback מיושן) → `awaitingInput`, `inputIndex=0`.
- `press`: מתעלמים בכל מצב שאינו `awaitingInput`.
  - שגוי → `lost`, `completedRounds = round - 1`.
  - נכון ולא אחרון → `inputIndex+1`.
  - נכון ואחרון: `completedRounds = round`; אם `round === TOTAL_ROUNDS` → `won`; אחרת `round+1`, הוספת `nextColor` לסוף הרצף, `presentationId+1`, `presenting`. (אין שלב 11 בשום מסלול.)
- `abandon`: מכל מצב → `idle` (שומר `gameId` ו-`presentationId` כדי ש-callbacks ישנים לא יתאימו).
- ייצוא גם `initialGameState` ו-`isPressCorrect(state, color)` (משמש את ה-Hook כדי לדעת אם להשמיע צליל צבע או צליל הפסד).

### `src/game/sequencePlayer.ts` — Sequence Controller
```ts
playSequence(sequence, { onLight(color | null), onDone() }, signal: AbortSignal): void
```
- לוח זמנים: `LEAD_IN_MS` → לכל צבע: `onLight(color)` + צליל `FLASH_MS` → `onLight(null)` → `GAP_MS` (לא אחרי האחרון) → `onDone()`.
- מבוסס `setTimeout` בשרשרת; כל ה-Timers נרשמים ומבוטלים ב-`signal.abort` (וגם `onLight(null)` + עצירת צליל). אחרי Abort אף callback לא נקרא.

### `src/audio/audioEngine.ts` — Audio Engine (Web Audio API)
- `unlockAudio(): Promise<boolean>` — יוצר `AudioContext` (או `webkitAudioContext`) בפעם הראשונה ומבצע `resume()`; מחזיר `false` אם אין תמיכה, אם נזרקה שגיאה, או אם המצב אינו `running`. נקרא **רק** מתוך לחיצה ("התחל"/"שחק שוב").
- `startTone(color): () => void` — Oscillator (`sine`/`triangle`) + `GainNode` עם Envelope קצר (~10ms attack/release, למניעת קליקים); מחזיר פונקציית עצירה. גבהים שונים לכל צבע (בהשראת Simon המקורי): ירוק 415Hz, אדום 310Hz, צהוב 252Hz, כחול 209Hz.
- `playTone(color, ms)` — עטיפה שעוצרת אוטומטית.
- `playWinSound()` — מוטיב עולה קצר (ארבעה צלילים C5-E5-G5-C6).
- `playLoseSound()` — מוטיב יורד, נמוך וצורם (`sawtooth`, ~2 צלילים).
- `stopAllSounds()` — עוצר כל צליל פעיל (בשימוש ב-Abort, בסיום משחק ובמעבר לאודות).
- בבדיקות המודול מוחלף ב-`vi.mock` (ב-jsdom אין `AudioContext`).

### `src/game/useGame.ts` — Hook שמחבר הכול
- `useReducer(gameReducer, initialGameState)` + `useState` ל-`litColor` (הצבע המואר כרגע) ול-`audioError: boolean`.
- **Effect של ההצגה**, תלוי ב-`[status, presentationId]`: כש-`status==='presenting'` — `new AbortController()`, `playSequence(...)`, ו-`onDone` שולח `presentationDone` עם ה-`presentationId` הנוכחי. ה-Cleanup מבצע `abort()`. (תחת Strict Mode ה-Effect רץ-נעצר-רץ; ה-Abort מבטל את הריצה הראשונה, כך שאין הצגה כפולה.)
- `start()` (משמש גם ל-"שחק שוב"): `await unlockAudio()`; אם נכשל → `audioError=true` והמשחק **לא** מתחיל (אין התקדמות שקטה); אם הצליח → `audioError=false`, `confetti.reset()`, `dispatch({type:'start', firstColor: randomColor()})`. הגנה מפני לחיצה כפולה בזמן ה-`await` (flag ב-ref).
- `pressStart(color)` (בעת `pointerdown`/מקש): רק ב-`awaitingInput`.
  - שגוי → `stopAllSounds()`, `playLoseSound()`, ללא הארה וללא צליל הצבע, `dispatch(press)`.
  - נכון → הארה + `startTone(color)`; רישום זמן התחלה; `dispatch({type:'press', color, nextColor: randomColor()})`.
- `pressEnd()` (בעת `pointerup`/`pointercancel`/`pointerleave` או אחרי לחיצת מקלדת): מכבה הארה וצליל ב-`max(PRESS_MIN_MS, משך הלחיצה)` — כלומר מיד אם עברו 300ms, אחרת ב-Timer עד 300ms.
- **Effect סיום**, תלוי ב-`[status, gameId]`: בכניסה ל-`won` → `stopAllSounds()`, `playWinSound()`, `confetti({ disableForReducedMotion: true, ... })` פעם אחת; Cleanup (יציאה מ-`won`) → `confetti.reset()`. בכניסה ל-`lost` — צליל ההפסד כבר הושמע ב-`pressStart` (מיד, לפי PRD), ואין קונפטי.
- `abandon()` — `stopAllSounds()`, ניקוי Timer של הלחיצה, `litColor=null`, `confetti.reset()`, `dispatch({type:'abandon'})`. ה-Effect של ההצגה מתבטל אוטומטית כי ה-status משתנה.
- Cleanup כללי ב-Unmount: עצירת כל הצלילים וה-Timers.
- מחזיר: `state`, `litColor`, `audioError`, `start`, `pressStart`, `pressEnd`, `abandon`.

### `src/components/GameOverOverlay.tsx` + `.css`
- שכבה מעל הלוח (`position: absolute` בתוך עטיפה של הלוח), רקע `Surface` עם גבול כחול ופינות מעוגלות, הלוח נשאר מזוהה מתחת (DESIGN §1.1).
- ניצחון: כותרת **"כל הכבוד! ניצחת!"** (ירוק/צהוב בהשראת ה-Mockup).
- הפסד: כותרת **"נפסלת!"** באדום + **"השלמת N שלבים"** (N = `completedRounds`; ביחיד: "השלמת שלב אחד"; המספר בתוך `<bdi>`).
- כפתור **"שחק שוב"** (`PrimaryButton`) **בתוך** ה-Overlay — לפי ה-Wireframes, שגוברים על מבנה (ב-Mockups הכפתור מתחת ל-Overlay; זה הבדל מיקום בלבד).
- `role="dialog"`, `aria-labelledby` לכותרת; פוקוס עובר לכפתור "שחק שוב" כשהשכבה מופיעה.

## 3. קבצים שמשתנים

### `src/App.tsx`
- `useGame()` עובר ל-`App` — בעל ה-State אינו מתפרק במעבר מסכים (ARCHITECTURE §2.1).
- `onNavigate`: אם עוברים ל-`'about'` ו-`status` הוא `presenting`/`awaitingInput` → `game.abandon()` (הפתרון הזמני של M2). מ-`won`/`lost` — גם `abandon()` כדי לנקות קונפטי ולחזור למצב התחלה (אין תוצאה לשמור עדיין). ואז `setScreen`.
- מעביר ל-`HomeScreen` את ה-props של המשחק.

### `src/components/HomeScreen.tsx` + `.css`
- חיווי שלב: `שלב <bdi>{round}</bdi> מתוך <bdi>10</bdi>` (ב-idle: 1; בסיום נשאר השלב האחרון).
- שורת סטטוס (`aria-live="polite"`, כבר קיימת):
  - idle: ריקה, או — אם `audioError` — **"לא ניתן להפעיל את הצלילים. לחץ שוב על "התחל"."** (ובמסך סיום: "...על "שחק שוב"").
  - presenting: **"המשחק מציג את הרצף"**.
  - awaitingInput: **"התור שלך"**.
- אזור הפעולה מתחת ללוח:
  - idle: כפתור **"התחל"**.
  - presenting: טקסט **"המתן..."** (לפי Mockup/Wireframe), ללא כפתור.
  - awaitingInput: טקסט **"הקש על הצבעים לפי הסדר"**.
  - won/lost: ריק (הכפתור בתוך ה-Overlay).
- הלוח עטוף ב-`div` עם `position: relative` שמארח את `GameOverOverlay`.

### `src/components/SimonBoard.tsx` + `.css`
- Props חדשים: `litColor`, `mode: 'idle' | 'presenting' | 'input' | 'over'`, `onPressStart(color)`, `onPressEnd()`.
- `data-mode` על הלוח, `data-lit="true"` על הרבע המואר.
- קלט: `onPointerDown` → `onPressStart` (תגובה מיידית במגע, ללא המתנה ל-`click`); `onPointerUp`/`onPointerCancel`/`onPointerLeave` → `onPressEnd`; `onKeyDown` של Enter/Space (ללא `repeat`) → start ואז end (נגישות מקלדת). `onContextMenu` → `preventDefault` (מניעת תפריט בלחיצה ארוכה).
- הרבעים `disabled` כשה-mode אינו `input` (חסימה ברמת ה-DOM, בנוסף ל-Guard ב-Reducer).
- CSS:
  - `presenting`: כל הרבעים מעומעמים (`filter: brightness(0.45) saturate(0.7)`), הרבע המואר — בהירות מלאה + Glow (`box-shadow` בצבע הרבע). כמו ב-Mockup "הצגת רצף".
  - `input`: צבעים מלאים; רבע לחוץ — `brightness(1.3)` + Glow.
  - `idle`/`over`: צבעים מלאים, ללא Glow; `disabled` **לא** מעמעם במצבים אלה.
  - `transition` קצר (≤80ms) כדי שהארה של 600ms תהיה חדה.

### `src/components/AboutScreen.tsx`
- ללא שינוי.

### `spec/ARCHITECTURE.md`
- הוספת **ADR-2: קלט לוח ב-`pointerdown` ורנדום מחוץ ל-Reducer** — הקשר: תגובה מיידית במגע ודרישה ל-Reducer טהור; החלטה: שיפוט וצליל בלחיצת `pointerdown`, הארה עד שחרור/300ms; הצבע האקראי מועבר ב-Action; השלכות: אין עיכוב `click` במובייל, Reducer דטרמיניסטי בבדיקות.

### `spec/MILESTONES.md`
- 🟡 ליד כותרת Milestone 2 בסיום הבנייה.

## 4. בדיקות (Vitest + RTL)

### `src/game/gameReducer.test.ts` — יחידה
- `start` → אורך רצף 1, `round=1`, `presenting`.
- אורכי הרצף בשלבים 1, 2 ו-10 הם 1, 2 ו-10; הרצף הקודם הוא prefix של הבא; צבע חוזר מותר (nextColor זהה לקודם).
- `press` ב-`presenting` / `idle` / `won` / `lost` לא משנה State.
- `presentationDone` עם `presentationId` ישן מתעלם.
- שגיאה בשלב 1 → `lost`, `completedRounds=0`; שגיאה בשלב 5 → `completedRounds=4`; שגיאה באמצע רצף (לא רק בצבע הראשון).
- השלמת שלב 10 → `won`, `completedRounds=10`, `round=10`, אורך רצף 10 (אין שלב 11).
- `start` מ-`won`/`lost` → משחק חדש, `gameId` עולה, רצף חדש באורך 1.
- `abandon` → `idle`.

### `src/game/sequencePlayer.test.ts` — Fake Timers
- סדר ותזמון ה-callbacks: הדלקה ב-1000ms, כיבוי ב-1600ms, הדלקה הבאה ב-1850ms וכו'; `onDone` מיד אחרי כיבוי האחרון.
- אותם מרווחים לרצף של 1, 3 ו-10 צבעים (אין האצה).
- Abort באמצע: אין callbacks נוספים, `onLight(null)` נקרא.

### `src/App.game.test.tsx` — אינטגרציה (Fake Timers + `userEvent.setup({ advanceTimers })`)
Mocks: `src/audio/audioEngine.ts` (spies; `unlockAudio` → `true`), `canvas-confetti` (spy + `reset`), `src/game/random.ts` (רצף צבעים קבוע).
- "התחל" → "המשחק מציג את הרצף", לחיצה על רבע בזמן ההצגה לא משנה דבר; אחרי ההצגה "התור שלך".
- כל צבע ברצף מפעיל `startTone`/`playTone` עם הצבע הנכון; ארבעה צבעים → ארבעה צלילים שונים (בדיקת גבהים שונים ב-`audioEngine`: טבלת התדרים ללא כפילויות).
- לחיצה נכונה → צליל הצבע; לחיצה שגויה → `playLoseSound` **בלבד** (ללא צליל הצבע שנלחץ), "נפסלת!" + "השלמת 0 שלבים", ללא קונפטי.
- הפסד בשלב מתקדם (שלב 3 → "השלמת 2 שלבים").
- משחק מלא של 10 שלבים → "כל הכבוד! ניצחת!", `playWinSound` ו-`confetti` נקראו פעם אחת, חיווי "שלב 10 מתוך 10", אין הצגה נוספת (אין שלב 11).
- "שחק שוב" → משחק חדש משלב 1 עם רצף חדש (ה-mock מחזיר צבע שונה), `confetti.reset` נקרא.
- `unlockAudio` → `false`: מוצגת הודעת השגיאה, המשחק לא מתחיל, הכפתור "התחל" נשאר; לחיצה חוזרת (עם הצלחה) מתחילה.
- מעבר ל-"אודות" באמצע הצגה ובאמצע תור השחקן: `stopAllSounds` נקרא, אין Timers ממתינים (`vi.getTimerCount() === 0`), חזרה לבית מציגה "התחל" ו-"שלב 1 מתוך 10".
- רענון: `unmount` + `render` מחדש → מצב התחלה; `Storage.prototype.setItem` לא נקרא במהלך משחק.

### `src/App.test.tsx`
- הבדיקות הקיימות נשארות ועוברות (אולי התאמה קלה ל-props החדשים).

## 5. בדיקה ידנית בסיום הבנייה (אני, בדפדפן במצב מובייל)
- `npm run typecheck`, `npm run test`, `npm run build` עוברים.
- `npm run dev`, אמולציית Smartphone אנכי: התחלה, הצגה, שחזור, הפסד, שחק שוב, מעבר לאודות באמצע משחק; וידוא שאין שגיאות Console ושאין גלילה אופקית.
- צלילים וקונפטי: וידוא שה-`AudioContext` במצב `running` ושהקונפטי נוצר. **שמיעה בפועל** של הצלילים ובדיקה במכשיר אמיתי — לבדיקה שלך (לא אציג אותה כאילו עברה).
- ניצחון מלא ידני הוא ארוך; ייבדק באוטומציה, וידנית לפי הצורך.

## 6. מיפוי ל-Definition of Done
| תנאי | איך מכוסה |
|---|---|
| התחלה ב-"התחל"; אורכים 1/2/10; prefix | Reducer tests + אינטגרציה |
| ארבעה צלילים שונים והארה נבדלת; קצב קבוע | טבלת תדרים + `sequencePlayer` tests + CSS Glow/עמעום |
| לחיצות ב-presenting חסומות; נכונה מקדמת; שגויה מפסידה | Reducer + אינטגרציה |
| הפסד שלב 1 (0), הפסד מתקדם, ניצחון, אין שלב 11, "שחק שוב" רצף חדש | Reducer + אינטגרציה |
| טקסט וצליל סיום; קונפטי בניצחון בלבד | אינטגרציה + ידני |
| Refresh מאפס; אין שמירת משחק פעיל | אינטגרציה (remount + spy על `setItem`) |
| קצב לפי DESIGN; שגויה = צליל הפסד בלבד | `timing.ts` + `sequencePlayer` tests + אינטגרציה |
| מעבר לאודות לא משאיר הארה/צליל/Timer | אינטגרציה (`getTimerCount`, `stopAllSounds`) |
