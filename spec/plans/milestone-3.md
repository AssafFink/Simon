# Milestone 3 – השהיה וחידוש משחק — תוכנית בנייה

מקורות: `MILESTONES.md` (Milestone 3), `PRD.md` §3 ("מעבר למסך אודות והמשך משחק"), §4.3, מקרי קצה; `ARCHITECTURE.md` §2.1–2.6 (Visibility Handler, State Machine, כללים 3–7, אודיו במובייל); `DESIGN.md` §1.1 (מצב "מושהה", חיווי שלב, טבלת קצב), Wireframe "בית – משחק מושהה".
מצב פתיחה: Milestone 2 ✅ — `gameReducer` עם `idle`/`presenting`/`awaitingInput`/`won`/`lost` ו-Action זמני `abandon`; `useGame` מנהל הצגה, לחיצות, צלילים וקונפטי; `App.navigate` מבטל משחק במעבר לאודות.

## מה **לא** נכנס באבן דרך זו
- היסטוריה / `localStorage` / כרטיסי תוצאה / מחיקה — Milestone 4. אין כתיבה כלשהי לאחסון.
- PWA, Service Worker, אייקונים, `base: "/Simon/"` — Milestone 5.
- אין שמירת משחק מושהה מעבר לטעינת הדף (Refresh מאפס — PRD "הבהרות").

## 1. התנהגות מטרה (סיכום)
- משחק **פעיל** = `presenting` או `awaitingInput` (כולל ההמתנה שבין שלבים, שהיא חלק מ-`presenting`).
- השהיה קורית: במעבר ל-**"אודות"**, ב-`visibilitychange` ל-`hidden`, וב-`pagehide` (Safety Net). השהיה עוצרת מיד הארה, צליל, Timers של ההצגה ושל הלחיצה, וזורקת קלט חלקי.
- במצב מושהה: הרצף והשלב לא משתנים; הלוח מעומעם ונעול; חיווי **"המשחק מושהה"**; כפתור ראשי **"המשך משחק"**; חיווי השלב מציג את השלב הנוכחי.
- אין Resume אוטומטי — לא בחזרה ל"בית" ולא בחזרת הדף ל-`visible`.
- **"המשך משחק"**: Gesture שמפעיל את האודיו מחדש (`unlockAudio`); בהצלחה — המתנה של `LEAD_IN_MS` (1000ms) והצגת **כל** הרצף של השלב מההתחלה, ואז שחזור מתחילתו. בכשל — נשארים מושהים עם הודעת שגיאה (אין התקדמות שקטה).
- `won`/`lost` אינם משחק פעיל: מעבר לאודות או הסתרה לא משנים אותם (לא נחשבים השהיה), וכפתור "המשך משחק" לא מוצג. `idle` — כנ"ל.
- השהיה אינה הפסד ואינה משנה `completedRounds`.

## 2. קבצים שמשתנים

### `src/game/gameReducer.ts`
- `GameStatus` מקבל `'paused'`.
- Actions חדשים (ו-`abandon` הזמני **מוסר**):
  ```ts
  | { type: 'pause' }
  | { type: 'resume' }
  ```
- `pause`: רק מ-`presenting`/`awaitingInput` → `status='paused'`, `inputIndex=0`, `presentationId+1` (כך ש-`presentationDone` מיושן של ההצגה שבוטלה לא יתאים). `sequence`, `round`, `completedRounds`, `gameId` ללא שינוי. מכל מצב אחר — אין שינוי (מונע השהיה כפולה / השהיית משחק שהסתיים).
- `resume`: רק מ-`paused` → `status='presenting'`, `inputIndex=0`, `presentationId+1`. הרצף והשלב ללא שינוי (אין צבע חדש). ריבוי `resume` — השני מתעלם כי כבר לא `paused`.
- `press` ו-`presentationDone` ממשיכים להתעלם מכל מצב לא מתאים (כולל `paused`), ו-`start` עדיין מותר רק מ-`idle`/`won`/`lost` (לא מ-`paused`).

### `src/game/useGame.ts`
- **`pause()`** (במקום `abandon`): אם הסטטוס פעיל — `finishPress()` (עצירת צליל/הארה/Timer הלחיצה), `stopAllSounds()`, `setRoundHiddenFor(null)` (החיווי מראה את השלב הנוכחי), `setAudioError(false)`, `dispatch({type:'pause'})`. ה-Effect של ההצגה מבוטל אוטומטית (ה-`status` משתנה → `abort()` מנקה Timers ומכבה הארה).
- **`resume()`**: Guard ב-ref (`resumingRef`, כמו `startingRef`) נגד לחיצה כפולה בזמן ה-`await`; רק מ-`paused`. `await unlockAudio()` → אם נכשל: `audioError=true` ונשארים `paused`; אם הצליח: `audioError=false`, `dispatch({type:'resume'})`. אחרי ה-`await` בודקים שוב שהמצב עדיין `paused` (למשל אם הדף הוסתר בינתיים — ממילא נשאר מושהה).
- ההצגה אחרי `resume` מקבלת `LEAD_IN_MS` רגיל (ה-`presentationId` החדש אינו זה של "אחרי שלב", ולכן אין את ה-1000ms הנוספים).
- **Visibility Handler** — Effect אחד ב-Hook: מאזין ל-`document` `visibilitychange` (כש-`document.visibilityState === 'hidden'`) ול-`window` `pagehide`, וקורא ל-`pause()`. הסרת המאזינים ב-Cleanup. חזרה ל-`visible` לא עושה דבר.
- מחזיר גם `pause`, `resume` (ו-`abandon` מוסר).

### `src/App.tsx`
- `navigate`: אם עוברים ל-`'about'` — `game.pause()` (הפונקציה עצמה מתעלמת ממצבים לא פעילים). מוסר הפתרון הזמני וההערה שלו. `won`/`lost` נשארים כמו שהם בחזרה לבית.
- מעביר ל-`HomeScreen` את `onResume={game.resume}`.

### `src/components/HomeScreen.tsx`
- `BOARD_MODE.paused = 'paused'`.
- שורת סטטוס: `paused` → **"המשחק מושהה"**; הודעת כשל אודיו במצב מושהה: **"לא ניתן להפעיל את הצלילים. לחץ שוב על "המשך משחק"."**
- אזור הפעולה: `paused` → `PrimaryButton` **"המשך משחק"** (`onResume`). בשאר המצבים — ללא שינוי (הכפתור מופיע **רק** ב-`paused`).

### `src/components/SimonBoard.tsx` + `.css`
- `BoardMode` מקבל `'paused'`; הרבעים `disabled` (כמו בכל מצב שאינו `input`).
- CSS: `[data-mode="paused"]` — עמעום ודהייה של כל הלוח (בהשראת ה-Wireframe, למשל `filter: brightness(0.5) saturate(0.4)`), ללא Glow.

### `spec/ARCHITECTURE.md`
- **ADR-3: השהיה כמצב `paused` ב-Reducer עם "הצגה חדשה" בחידוש** — הקשר: יש לבטל מיד Playback/Timers/צלילים ולהתעלם מ-Callbacks מיושנים, בלי Resume אוטומטי. החלטה: `pause` מעלה את `presentationId` וזורק את `inputIndex`; `resume` הוא כניסה רגילה ל-`presenting` עם `presentationId` חדש, אחרי `unlockAudio` מתוך הלחיצה; אירועי ניווט/`visibilitychange`/`pagehide` קוראים לאותה פונקציה. השלכות: אותו מנגנון ביטול (`AbortController` + `presentationId`) משרת השהיה, סיום וניווט; משחק שהסתיים אינו מושפע; מצב מושהה חי רק בזיכרון.

### `spec/MILESTONES.md`
- 🟡 ליד כותרת Milestone 3 בסיום הבנייה.

## 3. בדיקות (Vitest + RTL)

### `src/game/gameReducer.test.ts`
- `pause` מ-`presenting` ומ-`awaitingInput` (אחרי קלט חלקי) → `paused`, `inputIndex=0`, רצף/שלב/`completedRounds` ללא שינוי.
- `pause` מ-`idle`/`won`/`lost`/`paused` לא משנה State.
- `press` ו-`presentationDone` (גם עם ה-`presentationId` שהיה לפני ההשהיה) ב-`paused` — מתעלמים.
- `resume` → `presenting`, אותו רצף ואותו שלב, `presentationId` חדש; `resume` שני מתעלם; `resume` מכל מצב שאינו `paused` מתעלם; `start` מ-`paused` מתעלם.
- הסרת בדיקת `abandon`.

### `src/App.game.test.tsx` — אינטגרציה (Fake Timers, mocks קיימים)
- מחליף את בדיקת "leaving for אודות cancels the game":
  - מעבר ל-"אודות" בזמן הצגה ובזמן תור השחקן (אחרי קלט חלקי בשלב 2+) → `stopAllSounds` נקרא, אין רבע מואר, אין Timers ממתינים (`vi.getTimerCount() === 0`).
  - חזרה ל-"בית" → "המשחק מושהה", כפתור "המשך משחק", חיווי השלב הנוכחי; אחרי המתנה ארוכה (`advance`) — לא מתחילה הצגה ו-`startTone` לא נקרא.
  - "המשך משחק" → אחרי 1000ms מוצג **כל** הרצף מהצבע הראשון (סדר ה-`startTone` תואם לרצף), אותו שלב, אין צבע חדש; אחרי ההצגה "התור שלך", ושחזור מלא מתחילתו עובר לשלב הבא.
- השהיה בזמן ההמתנה שבין שלבים → בחזרה מוצג השלב החדש, והחידוש מציג את הרצף החדש בשלמותו.
- `visibilitychange` ל-`hidden` (באמצע הצגה ובאמצע תור) → אותה התנהגות השהיה; חזרה ל-`visible` אינה מחדשת. `pagehide` → משהה.
- הסתרה בזמן שמסך "אודות" פתוח / השהיה כפולה — אין שינוי ואין שגיאה.
- לחיצה כפולה מהירה על "המשך משחק" → הצגה אחת בלבד (מספר קריאות `startTone` = אורך הרצף).
- `unlockAudio` → `false` ב-"המשך משחק": הודעת השגיאה מוצגת, נשארים מושהים, אין הצגה; לחיצה חוזרת עם הצלחה ממשיכה.
- "המשך משחק" לא קיים ב-`idle`, בתור השחקן, ובמסך ניצחון/הפסד; מעבר לאודות מ-`lost` ובחזרה — התוצאה וכפתור "שחק שוב" עדיין שם.
- השהיה אינה הפסד: אין צליל הפסד, אין הודעת "נפסלת!".
- Refresh (remount) במצב מושהה → מצב התחלה ("התחל", "שלב 1 מתוך 10"); `setItem` לא נקרא.

### `src/App.test.tsx`, `sequencePlayer.test.ts`, `audioEngine.test.ts`
- ללא שינוי מהותי; חייבים להמשיך לעבור.

## 4. בדיקה ידנית בסיום הבנייה (אני, בדפדפן במצב מובייל)
- `npm run typecheck`, `npm run test`, `npm run build` עוברים.
- `npm run dev`, אמולציית Smartphone אנכי: התחלה → מעבר לאודות באמצע הצגה ובאמצע תור → חזרה → מסך מושהה כמו ב-Wireframe → "המשך משחק" → הצגה מלאה מחדש → המשך רגיל. מעבר טאב (הסתרה) וחזרה. אין שגיאות Console ואין גלילה אופקית.
- **נעילת טלפון אמיתית / מעבר לאפליקציה אחרת במכשיר** ושמיעת הצלילים אחרי החידוש — לבדיקה שלך במכשיר (לא אציג אותה כאילו עברה).

## 5. מיפוי ל-Definition of Done
| תנאי | איך מכוסה |
|---|---|
| מעבר לאודות בהצגה ובשחזור משהה ועוצר מיד הארה וצליל | אינטגרציה (`stopAllSounds`, אין רבע מואר, `getTimerCount`) + ידני |
| חזרה לבית לא מפעילה רצף; "המשך משחק" רק במושהה | אינטגרציה (המתנה ללא `startTone`; היעדר הכפתור במצבים אחרים) |
| "המשך משחק" מציג את כל הרצף, אותו שלב, בלי צבע חדש | Reducer + אינטגרציה (סדר `startTone`, חיווי שלב) |
| הסתרה וחזרה — אותו כלל, ללא Callback מיושן | אינטגרציה (`visibilitychange`/`pagehide`) + Reducer (`presentationDone` מיושן) + ידני |
| השהיה אינה הפסד; Refresh מאפס | אינטגרציה (אין "נפסלת!"/צליל הפסד; remount) |
