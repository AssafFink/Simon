# Milestone 5 – PWA, Offline ופרסום ב-GitHub Pages — תוכנית

> מבוסס על `MILESTONES.md` (Milestone 5), `PRD.md` §4.5, `ARCHITECTURE.md` §2.7–2.9 ו-`DESIGN.md` §2.4 (App Icon). Milestones 1–4 אושרו (✅); הקוד הוא מקור האמת.

## מצב קיים רלוונטי

- Vite 8 + React 19 + TypeScript 7; אין עדיין `vite-plugin-pwa`, אין `base`, אין תיקיית `public/` ואין `.github/`.
- `index.html` כבר כולל `lang="he"`, `dir="rtl"`, `theme-color` `#0A1628`; אין Favicon.
- Heebo נטען מ-`@fontsource/heebo` (400/600/700) ב-`src/main.tsx` – נארז ב-Build, ולכן ייכנס ל-Precache.
- הצלילים נוצרים ב-Web Audio (אין קובצי אודיו), כך שאין נכסי צליל ל-Precache.
- ה-Repository `AssafFink/Simon` **כבר ציבורי** (נבדק ב-`gh repo view`), ענף ברירת המחדל `main`, ה-remote מחובר.
- `vite-plugin-pwa@2.0.0` תומך ב-Vite 8 (peer `^8.0.0`).

## החלטות מרכזיות לבנייה (יתועדו כ-ADR)

1. **ADR-6 – עדכון גרסה ללא חלונית וללא Reload:** `registerType: "prompt"` (לפי §2.7), בלי `skipWaiting` ובלי `clientsClaim`. לא מוצגת בקשת עדכון בממשק – ל-`DESIGN.md` אין עיצוב לחלונית כזו, ו-§2.7 מתיר אותה ("ניתן") ולא מחייב. גרסה חדשה מורדת ברקע, ממתינה, ונכנסת לתוקף רק בפתיחה הבאה של האפליקציה אחרי שנסגרה לגמרי. כך משחק פעיל לעולם אינו נקטע. (אם תרצה בהמשך הודעת "גרסה חדשה זמינה" – זה שינוי עיצוב שתצטרך לאשר.)
2. **ADR-7 – אייקונים:** קובץ מקור יחיד `public/icon.svg` שנכתב ידנית לפי §2.4; קובצי PNG ו-Favicon נוצרים ממנו פעם אחת בעזרת `@vite-pwa/assets-generator` (devDependency, הכלי הרשמי של vite-plugin-pwa) ונשמרים ב-`public/` ב-Repository. ה-CI לא מייצר אותם מחדש.
3. **ADR-8 – `base: "/Simon/"` גם בפיתוח:** אותו נתיב ב-dev, ב-preview וב-Production, כדי שבעיות נתיב יתגלו מקומית. כתובת הפיתוח משתנה ל-`http://localhost:5173/Simon/`.

## קבצים ליצור / לשנות

| קובץ | שינוי |
|---|---|
| `package.json` / `package-lock.json` | הוספת devDependencies: `vite-plugin-pwa`, `@vite-pwa/assets-generator` (ו-`workbox-window` אם נדרש כ-peer). סקריפט `generate-pwa-assets` להרצה ידנית. |
| `public/icon.svg` | **חדש.** viewBox `0 0 512 512`; רקע מלא `#0A1628`; לוח עגול בקוטר ≤ 80% מהקנבס (בתוך ה-Safe Zone של Maskable) עם ארבעה רבעים – ירוק `#00D26A` למעלה-שמאל, אדום `#FF3B30` למעלה-ימין, צהוב `#FFD600` למטה-שמאל, כחול `#00A3FF` למטה-ימין – פסי הפרדה ומסגרת `#0F0F0F` ודיסק מרכזי `#0F0F0F`. ללא טקסט. |
| `pwa-assets.config.ts` | **חדש.** Preset `minimal-2023` מעל `public/icon.svg`, צבע רקע `#0A1628` ל-Maskable ול-Apple. |
| `public/` (נוצרים) | `favicon.ico`, `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`. |
| `vite.config.ts` | `base: '/Simon/'`; הוספת `VitePWA({...})` (פירוט למטה). אם הפלאגין מפריע ל-Vitest – לא לטעון אותו כש-`process.env.VITEST` מוגדר. |
| `src/vite-env.d.ts` | הוספת `/// <reference types="vite-plugin-pwa/client" />`. |
| `src/main.tsx` | `registerSW({ immediate: true })` מתוך `virtual:pwa-register`, בלי `onNeedRefresh` שמבצע Reload. |
| `index.html` | קישורי Favicon (`favicon.ico`, `icon.svg`) ו-`apple-touch-icon`; קישור ה-Manifest מוזרק אוטומטית ע"י הפלאגין. לוודא ב-`dist/index.html` שכל הנתיבים מתחילים ב-`/Simon/`. |
| `.github/workflows/deploy.yml` | **חדש.** Workflow פריסה (פירוט למטה). |
| `.claude/launch.json` | הוספת תצורת `simon-preview` (`npm run preview -- --port 4173 --strictPort`) לבדיקת ה-Build וה-Offline. |
| `CLAUDE.md` – "פקודות הרצה" | עדכון כתובת dev ל-`http://localhost:5173/Simon/`; הוספת בדיקת PWA מקומית: `npm run build` ואז `npm run preview` ← `http://localhost:4173/Simon/`; כתובת Production. |
| `spec/ARCHITECTURE.md` | הוספת ADR-6, ADR-7, ADR-8 בלבד. |
| `spec/MILESTONES.md` | סימון 🟡 ליד Milestone 5 בסיום הבנייה המקומית. |

## הגדרת `VitePWA`

```ts
VitePWA({
  strategies: 'generateSW',
  registerType: 'prompt',
  injectRegister: false,            // registration is done in main.tsx
  includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
  manifest: {
    name: 'סיימון',
    short_name: 'סיימון',
    description: 'משחק זיכרון של צבעים וצלילים – עשרה שלבים',
    lang: 'he',
    dir: 'rtl',
    display: 'standalone',
    start_url: '/Simon/',
    scope: '/Simon/',
    theme_color: '#0A1628',
    background_color: '#0A1628',
    icons: [ /* 64, 192, 512 'any' + maskable 512 */ ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
    navigateFallback: 'index.html',   // SPA fallback, inside the /Simon/ scope only
    cleanupOutdatedCaches: true,
    // no skipWaiting / clientsClaim – see ADR-6
  },
})
```

- הגופנים: רק `woff2` נכנסים ל-Precache (כל הדפדפנים הרלוונטיים תומכים בו); לבדוק ב-`dist/sw.js` שכל קובצי ה-`woff2` של Heebo שבשימוש (כולל ה-Subset העברי) רשומים.
- לא מוסיפים `runtimeCaching`, Background Sync או Push (§2.7).
- לא מוסיפים `orientation` ל-Manifest – לא נדרש ב-spec.

## Workflow – `.github/workflows/deploy.yml`

- טריגר: `push` ל-`main` + `workflow_dispatch`.
- `permissions: contents: read, pages: write, id-token: write`; `concurrency: group: pages, cancel-in-progress: false`.
- Job `build`: `actions/checkout` → `actions/setup-node` (Node 22 LTS, `cache: npm`) → `npm ci` → `npm run typecheck` → `npm run test` → `npm run build` → `actions/configure-pages` → `actions/upload-pages-artifact` (`path: dist`).
- Job `deploy` (`needs: build`, `environment: github-pages`): `actions/deploy-pages`.
- גרסאות ה-Actions: לבדוק בזמן הבנייה את הגרסה העדכנית של כל אחת (`gh api repos/actions/<name>/releases/latest`) ולהצמיד ל-Major הנוכחי.
- Build או בדיקה שנכשלים עוצרים את הפריסה (ה-deploy תלוי ב-build).

## נגישות ופריסה – מעבר בדיקה (ללא הוספת יכולות)

- כל כפתור עם שם נגיש בעברית; `:focus-visible` קיים לכל הכפתורים (כולל רבעי הלוח, הניווט וכפתור "אישור").
- `prefers-reduced-motion`: לוודא שהקונפטי מצומצם/מבוטל ושה-Glow אינו מונפש בחדות (§2.4 ב-ARCHITECTURE). כרגע לא נמצא שימוש ב-CSS – להוסיף אם חסר.
- `viewport-fit=cover` כבר קיים – לוודא Safe-Area (`env(safe-area-inset-bottom)`) לפס הניווט במצב Standalone, כדי שלא יוסתר בטלפונים עם "חריץ".
- ללא גלילה אופקית ב-375px וב-320px.

## סדר העבודה

### שלב א' – בנייה ובדיקה מקומית (ללא commit/push)
1. התקנת התלויות; כתיבת `icon.svg`; יצירת האייקונים ובדיקה חזותית שלהם (כולל Maskable בעיגול).
2. `base`, `VitePWA`, רישום ה-SW, `index.html`, טיפוסים.
3. Workflow ב-`.github/workflows/deploy.yml`.
4. מעבר נגישות/Safe-Area ותיקונים קטנים.
5. הרצת `npm run typecheck`, `npm run test`, `npm run build` – הכל עובר; כל בדיקות ה-Regression הקיימות (עשרה שלבים, כישלון ראשון, קונפטי בניצחון בלבד, השהיה/חידוש, עשר תוצאות, מחיקה מאושרת) ירוקות.
6. בדיקת ה-Build ב-`npm run preview` (`http://localhost:4173/Simon/`) בדפדפן המובנה:
   - אין 404 ברשת; Manifest נטען ותקין (שם, אייקונים, `start_url`/`scope` = `/Simon/`).
   - Service Worker רשום ופעיל, וה-Precache מכיל HTML, JS, CSS, אייקונים וגופני Heebo.
   - **Offline מקומי:** עצירת שרת ה-preview וטעינה מחדש – האפליקציה נפתחת, ניווט בית/אודות, משחק והיסטוריה פועלים.
   - **עדכון גרסה:** Build חדש בזמן שמשחק פעיל בדף פתוח – הדף אינו מתרענן והמשחק ממשיך; הגרסה החדשה ממתינה.
   - תצוגת Smartphone אנכית (375×812), עברית ו-RTL.
7. עדכון `CLAUDE.md` (פקודות הרצה), הוספת ADR-6/7/8, סימון 🟡 ב-`MILESTONES.md`, סגירת השרתים.

### שלב ב' – פריסה (דורש את אישורך ל-push)
> הפריסה עצמה מחייבת push, ולכן אעצור כאן ואבקש אישור. ה-push הזה **לא** מאשר את ה-Milestone – הסימון נשאר 🟡 עד שתבדוק את האתר החי בטלפון.
1. אדריך אותך צעד אחר צעד להגדיר ב-GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions** (ה-Repository כבר ציבורי – אין צורך לשנות).
2. לאחר אישורך: commit + push ל-`main`; מעקב אחרי ריצת ה-Workflow (`gh run watch`) עד הצלחה.
3. בדיקה ב-`https://assaffink.github.io/Simon/`: HTTPS, אין 404, Manifest ו-SW תקינים, Precache הושלם, טעינה מחדש ללא רשת.
4. בדיקות במכשיר אמיתי (שלך): התקנה למסך הבית, מגע, צלילים, נעילת מסך וחזרה, ניצחון/הפסד, מצב טיסה ופתיחה מחדש. אסמן כ"לא נבדק" כל מה שלא אוכל לבדוק בעצמי.

## מה לא נכלל
- אין הודעת "גרסה חדשה זמינה", אין מתג סאונד, אין Analytics, אין Custom Domain.
- אין שינוי בחוקי המשחק, במסכים או בעיצוב, מלבד Safe-Area ונגישות בסיסית.

## בדיקה מול Definition of Done

| תנאי | איך ייבדק |
|---|---|
| Workflow עובר ומפרסם אוטומטית אחרי Push | ריצה ירוקה ב-GitHub Actions לאחר ה-push של שלב ב' |
| HTTPS ואין 404 תחת `/Simon/` | בדפדפן המובנה מול האתר החי + רשימת בקשות רשת |
| Manifest ו-SW תקינים; אפשרות התקנה | בדיקת Manifest/SW בדפדפן; התקנה בטלפון שלך |
| Offline אחרי Precache | עצירת שרת מקומית (שלב א'); מצב טיסה בטלפון (שלב ב') |
| עדכון גרסה לא מרענן משחק פעיל | Build חדש מול דף עם משחק פעיל (שלב א') |
| Regression ותצוגת Smartphone RTL | `npm run test` + בדיקה ב-375×812 |
