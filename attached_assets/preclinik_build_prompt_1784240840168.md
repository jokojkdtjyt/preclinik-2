# PreClinik — Full Build Specification & Continuation Prompt

Use this as the master prompt/spec for Claude Code (or any dev) to rebuild, extend, or continue this platform. It documents every design token, page, component, data field, and behavior implemented in the working HTML prototype, so a rebuild in a real stack (Next.js/Supabase/Vercel) reproduces it exactly before new features are added.

---

## 1. Product summary

**PreClinik** is a Coursera-style e-learning platform for Algerian medical students. Students buy access to **modules** (Anatomy, Physiology, Biochemistry, etc.) one at a time or as a bundle. Each module contains video lessons and a question bank. There's a companion admin dashboard for content management. The current build is a single-file HTML/CSS/vanilla-JS prototype with `localStorage` persistence — it needs to become a real multi-user product with auth, hosted video, and payments.

**Business model (locked):**
- Price per module: **800 DZD** (admin-editable per module, defaults to 800)
- Full bundle: **2,600 DZD**
- 7-day free trial → hard paywall (not yet implemented in code, needs building)
- One-time purchase per module, kept forever (not subscription — see separate SaaS-idea conversation for future subscription add-ons)
- Payment for now: manual — Telegram bot will generate unlock codes after a student pays via BaridiMob/cash (not yet built)

---

## 2. Design system (exact tokens — reproduce precisely)

### Colors (CSS custom properties)
```css
--bg:#f7f3ec;          /* page background, warm off-white */
--surface:#ffffff;     /* card/panel background */
--surface-2:#f1eae0;   /* secondary surface, pills, hover states */
--ink:#241e1b;         /* primary text */
--muted:#79706a;       /* secondary text */
--faint:#a89c90;       /* placeholder/icon-faint */
--line:#e6ddd0;        /* borders */
--line-strong:#d5c8b8; /* stronger borders (outline buttons) */
--blue:#8b1a2f;        /* PRIMARY BRAND COLOR — actually burgundy/wine red, variable named --blue for historical reasons */
--blue-dark:#6b1322;
--blue-soft:#f4e5e3;   /* active nav background */
--green:#3f7d5b;       /* success, "owned" tag, completed states */
--orange:#b9852e;      /* secondary brand accent, used in gradients */
--red:#b3261e;         /* danger/delete */
--shadow:0 14px 34px rgba(36,30,27,.10);
--radius:14px;
--max:1180px;          /* max content width */
--sidebar:248px;
```

### Typography
- Body font: **Inter** (400/500/600/700)
- Display font (h1-h4, brand, card titles): **Manrope** (500/700/800)
- Mono (labels, eyebrows, breadcrumbs, form labels): **DM Mono** (400/500)
- Loaded via Google Fonts

### Background treatment
Body has a subtle fixed radial-gradient wash behind everything:
```css
background: radial-gradient(circle at 12% 8%, rgba(139,26,47,.06), transparent 28rem),
            radial-gradient(circle at 86% 18%, rgba(185,133,46,.06), transparent 30rem),
            linear-gradient(180deg, rgba(255,255,255,.6), rgba(247,243,236,.94));
```

### Buttons (variants)
- `.btn` base: `border-radius:10px; padding:11px 16px; font-weight:800; font-size:14px;`
- `.btn-primary`: solid burgundy bg, white text
- `.btn-outline`: white bg, burgundy text, strong border
- `.btn-ghost`: transparent, muted text
- `.btn-danger`: white bg, red text/border
- `.btn-sm`: compact variant, `padding:8px 11px; font-size:12px`

### Cards
- `border-radius: 22px` on major panels/course cards
- `box-shadow: var(--shadow)`
- Rounded thumb/hero images use CSS gradients per category (not real images) — each module has a `gradient` field like `linear-gradient(135deg,#8b1a2f,#b9852e)`

### Responsive breakpoints
- `980px`: sidebar/cards collapse to fewer columns
- `720px`: topbar wraps, search moves to its own row, single-column grids

---

## 3. App shell & navigation

### Topbar (sticky, height 72px, z-index 50)
Left to right:
1. Brand: burgundy-to-orange gradient square logo mark "P" + "PreClinik / Medical Modules" wordmark — clicking always returns to Student Dashboard
2. Search input (pill-shaped, icon-left) — placeholder "Search modules, anatomy, physiology..." — pressing Enter jumps to Catalog and filters
3. Top nav buttons: **Student | Admin | Catalog | My learning** (role/view switcher)
4. Profile avatar (circular, initials "MS")
5. **Cart icon** (circular outline button) with a small badge showing live cart item count (hidden when 0)

### Two parallel app shells
- `#student-app` — the student-facing product
- `#admin-app` — the admin/content-management product
Both are full-screen `<main>` sections toggled via `switchRole('student'|'admin')`; only one is visible at a time (`.hide` class).

### Student sidebar (`#student-shell`, id `student-shell`)
- **Collapsed by default on load** (icon-only rail) — this is a hard requirement, not optional. User expands manually via the toggle button at the top of the sidebar.
- Nav items: Dashboard, Module catalog, Progress, Question bank — each with an SVG icon + label (label hides when collapsed, shown as tooltip/data-label attribute)
- Collapse toggle persists only per-session (not saved to localStorage currently — could be added)
- **On entering a lesson/video page**: sidebar force-collapses (regardless of prior state) to maximize video space. This is additive to the global collapsed-by-default rule.

### Admin sidebar (`#admin-shell`)
Nav items: Overview, Modules, Lessons, Students, Settings — same icon-rail pattern, independent from student sidebar state.

---

## 4. Student pages (all rendered client-side into `#student-view`)

### 4.1 Dashboard (`renderStudentDashboard`)
- Welcome hero
- Continue-learning panel (in-progress modules)
- Stats row
- "Recommended for you" section header: "Popular modules in preclinical medicine." + "See all" link
- Grid of course cards (see §5 for exact card spec)

### 4.2 Module catalog (`renderCatalog`)
- Full browsable list/grid of all published modules, same card component as dashboard
- Has its own search/filter input (`#catalog-search`) wired to the global search-enter behavior

### 4.3 My learning (`renderMyLearning`)
- Shows modules the student has progress in / owns

### 4.4 Progress (`renderProgress`)
- Aggregate progress view across modules

### 4.5 Question bank (`renderQBank`)
- Cross-module quiz/QBank access point

### 4.6 Module detail page (`renderCourse(id)`)
Structure, top to bottom:
1. Hero band: module title, description, "Live lessons" count stat, "Lesson questions" count stat, progress bar + "X% complete"
2. **Tabs bar** (`.tabs`, sticky at `top:72px`, z-index 20, own rounded top corners matching the 22px card radius): **Description | Videos | Q-bank**
   - Default tab on entry is **Videos** (`courseTab='videos'` set globally and re-asserted on card click) — NOT Description. This was a deliberate change: clicking a module card should take the student straight to the lesson list, not a marketing blurb.
   - Tab content area (`.tab-content`) has its own bottom-rounded corners since the parent no longer clips with `overflow:hidden` (this was a bug fix — see §7 "Fixed bugs")

**Description tab:**
- Single-column layout (NOT a two-column grid with a video preview — the video preview was deliberately removed)
- "About this module" heading + summary paragraph (max-width ~640px for readability)
- "What you will learn" heading + **plain bullet list** of outcomes (small colored dot + bold text, NOT bordered boxes/cards — this was a deliberate simplification, see §7)

**Videos tab:**
- "Video lessons" heading + helper text "Only lessons marked live in Admin appear here."
- One `.module-item` card per internal module group, containing:
  - `.module-head`: module title + "N live lessons" on the left, **"Watch full playlist" button** on the right (only shown if live lessons exist) — clicking jumps into the first live lesson
  - `.lesson-list`: each lesson row (`.lesson-row`) shows play icon, title, type/duration/question-count meta, and a **"Watch" button** (renamed from "Learn" — button label must say "Watch") that opens the lesson player. Completed lessons show "Completed" instead and get a checkmark/`is-complete` style.

**Q-bank tab:** module-level question bank access.

### 4.7 Lesson/video player page (`renderLesson({courseId, lessonId})`)
- Breadcrumb: "Module Title / Lesson X of N"
- Lesson title as H1
- **"Show playlist" button** top-right — playlist panel is **collapsed/hidden by default** (`playlistCollapsed = true` at init). User can expand it; state toggles via `togglePlaylist()`.
- Sidebar is force-collapsed on this page (see §3) so the video gets maximum width.
- Video area: dark gradient placeholder block (no real video yet) with a centered play button, lesson title, "Module · duration · type" meta line, and a note: "Video player placeholder — live video/embed connects here later" — **this is the exact hook point for real video hosting integration.**
- Below the video (not fully built out in prototype but present): lesson tabs for Video / Q-bank content, driven by `lessonTab` state.

---

## 5. Course card component (`courseCard(c)`) — used identically on Dashboard, Catalog, My Learning

This is the single most reused component. Exact spec:

```
┌─────────────────────────────────┐
│ [gradient thumb w/ category icon]│  ← thumb uses c.gradient, icon from `icons` map (heart/brain/dna/lungs)
│  PROVIDER LABEL                  │
│  Category name                   │
├─────────────────────────────────┤
│ [Year N] [Level] [★ rating] [Draft?]  ← pill row
│ Module Title (h3)                │
│ Summary text (2-3 lines)         │
│ ▓▓▓▓▓▓▓░░░ progress bar          │
│ X% complete · duration · N students │  ← students count lives HERE now, small text
├─────────────────────────────────┤
│ 800 DZD  [🛒] [View module]       │  ← price OR "Owned" tag, cart icon button, view button
└─────────────────────────────────┘
```

**Critical behaviors:**
- **The entire card is clickable** (not just the button) — `onclick` on the outer `<article>` navigates to the module detail page with `courseTab` forced to `'videos'`.
- The "View module" button and cart button both call `event.stopPropagation()` so they don't double-trigger the card's own click.
- **Price/Owned tag** (bottom-left of footer): if the module is in `purchased[]`, show a green pill "Owned" (`.owned-tag`). Otherwise show the price in DZD, bold (`.price-tag`).
- **Cart button** (small circular icon button, `.cart-btn`): only rendered if NOT owned. Shopping-cart SVG icon. Fills solid blue/burgundy (`.active` class) when the module is already in the cart. Clicking toggles cart membership via `toggleCart(id, event)` — does NOT re-render the whole page, just toggles the button's own class and updates the topbar badge (fast, no flicker).
- Student count moved from the footer (where it originally lived, competing with price) into the small meta line alongside "% complete" and duration.

---

## 6. Cart & checkout system (currently the only "commerce" logic built)

**State:** two arrays in memory + localStorage:
- `cart` — array of course IDs pending purchase
- `purchased` — array of course IDs the student owns

**Storage keys:** `preclinik_coursera_cart_v1`, `preclinik_coursera_purchased_v1` (parallel to existing `preclinik_coursera_courses_v1` and `preclinik_coursera_progress_v1`)

**Flow:**
1. Student clicks the cart icon on any course card anywhere in the app → `toggleCart(id)` adds/removes from `cart`, updates that button's visual state and the topbar badge count immediately (via `data-cart-btn="id"` attribute lookup across all rendered instances of that card, since the same module might appear on both Dashboard and Catalog simultaneously).
2. Student clicks the **topbar cart icon** → opens a right-side drawer (`.drawer` / `.drawer-panel`, reusing the same drawer component as the admin editors) listing every cart item: title, category, duration, price, and a small "×" remove button. Shows a running **Total** at the bottom.
3. **"Checkout" button** at the bottom of the cart drawer: on click, all cart item IDs move from `cart` → `purchased`, cart is cleared, a toast confirms "Purchase complete — added to your library", the drawer closes, and whatever student view is currently active re-renders so cards immediately reflect the new "Owned" state.
4. Owned modules never show the cart button again (they're already purchased) — the price slot is replaced by the green "Owned" tag.

**This is intentionally a placeholder mechanic** — there is no real payment processing. "Checkout" instantly grants ownership. This needs to be replaced by the Telegram-bot-code-unlock flow (student pays externally, gets a code, enters code → same effect as `checkoutCart()` but gated behind code validation) as the next real milestone, and eventually a proper payment gateway (Chargily / CIB / EDAHABIA are the realistic Algerian options to research).

---

## 7. Admin panel

### Overview (`renderAdminOverview`)
Stat tiles: total modules, live modules, live/total lessons. "Recent modules" table.

### Modules (`renderAdminCourses` + `openCourseEditor`)
Table of all modules with Edit/Preview/Publish-toggle/Delete actions. **"New module" / "Edit module" drawer** (wide variant, 980px) contains a form with these exact fields:
- Module name (text)
- Year category (select 1-7)
- Subject category (text, e.g. "Physiology")
- Level (select: Beginner/Intermediate/Advanced)
- Duration (text, e.g. "5 weeks")
- Provider (text, default "PreClinik Faculty")
- Icon (select: Heart/Brain/DNA/Lungs — maps to the `icons` SVG set)
- Status (select: Live/Draft)
- Module description (textarea)
- Rating (number, step 0.1)
- Students (number) — manually set for demo purposes; would come from real enrollment data in production
- **Price (DZD)** (number, defaults to 800) — **this is the field that was added in this session** so pricing is admin-configurable per module rather than hardcoded
- Nested lesson list with inline "Add lesson" → opens a second drawer for the individual lesson (title, duration, type: Video/Reading/Quiz, published toggle, and a "Build" button that opens the full lesson+Q-bank editor)

### Lessons (`renderAdminLessons` / `openLessonEditor`)
Full editor per lesson: video title, video URL (placeholder field — real integration point for hosted video URLs from Bunny/Mux/etc.), summary, and an inline Q-bank builder (question text, 5 options, correct-answer index, explanation comment, optional image).

### Students (`renderAdminStudents`)
Static sample table for now (Meriem S. / Anis B. / Lina K. with progress %) — needs to become real user data once auth exists.

### Settings (`renderAdminSettings`)
Currently just a "Reset demo data" button that clears localStorage. Will need to become real platform settings (payment config, video provider keys, etc.) in production.

---

## 8. Data model (current shape, as stored in `courses` array)

```js
{
  id: 'cardio-foundations',          // slug-style id
  title: 'Cardiovascular Physiology',
  category: 'Physiology',
  level: 'Intermediate',             // Beginner | Intermediate | Advanced
  provider: 'PreClinik Faculty',
  rating: 4.8,
  students: 1240,
  price: 800,                        // DZD, admin-editable, defaults 800
  duration: '5 weeks',
  published: true,                   // Live/Draft toggle
  icon: 'heart',                     // heart | brain | dna | lungs
  gradient: 'linear-gradient(135deg,#8b1a2f,#b9852e)',
  year: '1',                         // Year 1-7
  summary: '...',
  outcomes: ['...', '...', '...'],   // rendered as bullet list
  modules: [{                        // internally flattened to a single "Lessons" group
    title: 'Lessons',
    lessons: [{
      id: 'cv-l1',
      title: 'Wiggers diagram and valve events',
      duration: '18 min',
      type: 'Video',                 // Video | Reading | Quiz
      published: true,
      summary: '...',
      videoTitle: '...',
      videoUrl: '',                  // EMPTY — real video integration point
      qbank: [{
        q: '...',
        options: ['','','','',''],   // always 5 slots
        correct: 0,                  // index
        comment: '...'
      }]
    }]
  }],
  quiz: []                           // legacy module-level quiz, auto-migrated into first lesson's qbank on load
}
```

**Progress:** `progress = { [lessonId]: true }` — simple completed-lesson map, persisted separately.

**Cart/purchased:** flat arrays of course IDs, persisted separately (see §6).

---

## 9. Fixed bugs / deliberate corrections made this session (don't regress these)

1. **Sticky tabs overlapping content**: `.course-panel` originally had `overflow:hidden` which broke the sticky-positioned `.tabs` bar and caused it to visually clip/overlap the "Only lessons marked live..." text below it. Fix: removed `overflow:hidden` from the parent, moved the rounded-corner clipping to `.tabs` (top corners) and `.tab-content` (bottom corners) individually.
2. **Lesson row button labeled "Learn"** → renamed to **"Watch"** since the row already navigates straight to the video.
3. **Description tab had a bordered "activity box" for each learning outcome** → replaced with a plain bulleted list (dot + text, no card/border).
4. **Description tab had a redundant video preview panel** next to the text (two-column grid) → removed entirely; description is now single-column, since the Videos tab is where playback lives and is now the default tab anyway.
5. **Course cards showed raw student count in the footer** where price should go → price now lives there (or "Owned" tag), student count relocated to the small meta line.
6. **Sidebar was expanded by default** → now collapsed by default globally; only force-collapses further (redundantly, harmlessly) when entering the lesson player.
7. **Playlist was expanded by default on the lesson page** → now hidden by default, opened only via "Show playlist".
8. **Course cards weren't fully clickable** (only the small "View module" button worked) → whole card is now a click target.

---

## 10. What is NOT built yet (the actual roadmap, in order)

1. **Authentication** — real student accounts. Recommend Supabase Auth (email/password + maybe Google). Every `localStorage` read/write in this prototype (`courses`, `progress`, `cart`, `purchased`) needs to become a per-user row in a real database instead.
2. **Hosting** — Vercel for the frontend.
3. **Video hosting** — the `videoUrl` field is currently empty and the player is a static placeholder. Needs a real provider (Bunny Stream is the current favorite — cheap, good for Algeria's bandwidth realities; Mux is the higher-end alternative).
4. **Database** — Supabase Postgres to replace the `courses`/`progress`/`cart`/`purchased` localStorage arrays with real tables (`modules`, `lessons`, `qbank_questions`, `enrollments`/`purchases`, `progress`, `users`).
5. **Payments — phase 1 (stopgap):** Telegram bot. Student pays manually (BaridiMob transfer, cash via reseller, etc.), messages the bot, bot generates a unique unlock code tied to a module (or the full bundle), student enters the code on the platform, code redemption triggers the same effect as today's placeholder `checkoutCart()` — grants ownership, no real payment gateway needed yet.
6. **Payments — phase 2 (real):** integrate an actual Algerian payment gateway (Chargily Pay is the most realistic option; CIB/EDAHABIA card rails are the fallback) once volume justifies the integration cost.

---

## 11. How to use this document

Hand this whole file to Claude Code as the system/spec prompt when starting the real build. Tell it explicitly: *"Rebuild this exact prototype's design system, page structure, and interaction behavior in [Next.js/Supabase/Vercel], preserving every detail in this spec, then layer in real auth, a real database, and the Telegram-bot code-redemption flow described in §10.5."* Keep the existing prototype HTML file alongside it as the visual ground truth for anything this spec doesn't spell out to the pixel.
