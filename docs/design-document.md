# NeuroFlow: Neurodivergent-Friendly Task, Calendar & Budgeting Web App – Complete Design Document

---

## 1. Executive Summary / Resumen Ejecutivo

**NeuroFlow** is a web-based application tailored for neurodivergent users (autism, ADHD, dyslexia, dyspraxia, etc.) that unifies **task management**, **calendar/routines**, and **budgeting/debt reduction**. The product emphasizes predictable layouts, low sensory load, dyslexia-friendly typography, and ethical gamification (points, streaks, gentle nudges) to support self-set goals. Budgeting follows **Caleb Hammer’s zero-based approach** with **Needs vs Wants** tracking and **Snowball/Avalanche** debt simulators.

**Stack (proposed, offline-first):**
- Frontend: React + TypeScript, ARIA-compliant UI, service worker + IndexedDB for caching.
- Backend: Node.js + Express (REST), JWT auth.
- Data: MongoDB in production; **SQLite fallback for full local/offline runs** (plus browser IndexedDB cache).

This document (≈40-page equivalent) details features, UX, APIs, data models, roadmap, and testing (with neurodivergent participants) to ensure the experience is empowering, predictable, and accessible.

---

## 2. Feature List & Priorities / Lista de Funcionalidades y Prioridades

**Priority legend:** P0 = MVP-critical, P1 = post-MVP/high impact, P2 = nice-to-have.

### 2.1 Task Management
- **Breakable tasks & visual checklists (P0):** Micro-steps (3–7), progress bars, optional “suggest breakdown.”
- **Focus blocks / Pomodoro (P0):** Presets 5/10/25/45 minutes, minimal animation, optional sound; link to tasks.
- **Task views (P0):** Tabs Today/This Week/Backlog; optional simple Kanban (click-to-move).
- **Recurring tasks & routines (P1):** Daily/weekly, attach to calendar routines.
- **Task notes & attachments (P2):** Plain text with TTS; small files (local optional).

### 2.2 Calendar
- **Day/Week view with soft colors (P0):** Large blocks, predictable grid, zoom via buttons.
- **Event creation + link to tasks (P0):** One-tap “convert task to calendar block.”
- **Text-to-speech reminders (P0):** Browser SpeechSynthesis; “Read this event” button.
- **Routine templates (P1):** Morning/evening/study/budget; user-saveable.
- **Shared calendars (P2):** Invite-only, explicit consent/privacy controls.

### 2.3 Rewards & Gamification
- **Points & XP (P0):** Tasks, focus blocks, budget reviews, debt payments; soft daily cap.
- **Streaks + skip token (P0):** Focus streak (daily), budget streak (weekly); skip token to preserve streak.
- **Cosmetic unlocks (P1):** Themes/icons/backgrounds (low sensory).
- **Quests & challenges (P1):** User-authored or template multi-step goals.
- **Achievements/badges (P2):** Milestone collectibles.

### 2.4 Positive Nudges
- **Progress bars & journeys (P0):** Tasks, daily focus, debt payoff bars with positive copy.
- **Gentle reminders (P0):** Custom schedules; supportive tone.
- **Self-nudge rules (P1):** User-defined triggers (e.g., show debt bar when adding a Want).
- **Variable rewards (P2):** Occasional bonuses for consistency.

### 2.5 Budgeting & Debt (Caleb Hammer-inspired)
- **Zero-based budget setup (P0):** Allocate income until “Remaining = 0”; categories labeled Need/Want/Goal/Debt.
- **Needs vs Wants tracking (P0):** Charts for planned vs actual; alerts on thresholds.
- **Debt management & simulator (P0):** Snowball/Avalanche projections, payoff dates, interest estimates.
- **Transaction logging (P1):** Quick-add with TTS confirmation; local CSV import.
- **Subscription radar (P2):** Flag recurring merchants as Wants candidates.

---

## 3. UX & Interaction Design / Diseño UX e Interacción

### 3.1 Information Architecture
Top nav (persistent): Tasks & Focus | Calendar | Budget | Rewards | Settings (Accessibility). Mental model: **Capture → Plan → Focus → Reward → Review**.

### 3.2 Wireframes (Text Descriptions)

**Dashboard**
- **Left (40%):** Task list with checkboxes + micro-step indicator; “+ New Task” button; focus block widget (“Start 10-min focus”).
- **Center (40%):** Weekly calendar grid; soft-colored blocks; Day/Week toggle, date picker.
- **Right (20%):** Budget snapshot (Needs/Wants/Goals pie); debt payoff bar; “Open Budget” button with gentle nudge.
- **Top bar:** Logo, search, dark-mode toggle, profile.
- **Bottom bar:** Streak indicator with skip token count.

**Task Creation**
- Single-column, low distraction. Fields: Title, “Break into steps” (subtask list), “Attach focus block?” (duration), “Attach to calendar?” (date/time), notes with TTS. Primary “Save task” (full width).

**Budget View**
- **Top:** Zero-based allocation list (category, tag Need/Want/Goal/Debt, planned amount, %). Remaining indicator.
- **Middle:** Plan vs Actual toggle, bar/pie charts.
- **Bottom:** Debt table (balance/rate/min), Snowball/Avalanche selector, projected payoff and progress bar.

### 3.3 Onboarding Flow
1. **Accessibility prefs:** Simple vs detailed UI, low-motion default ON, font choice (standard/dyslexia), timers on/off.
2. **Neurodivergence presets (optional):** Check ADHD/Autism/Dyslexia/Dyspraxia → suggest settings (e.g., short focus blocks, strong progress visuals).
3. **Goal & budget quick setup:** One main task goal + financial goal; optional quick income.
4. **Mini tour:** Tooltips with TTS.

### 3.4 Accessibility Requirements
- WCAG 2.2 AA, semantic HTML, ARIA landmarks/roles.
- Base font ≥16px; line height 1.5–1.8; left-aligned text.
- Contrast ≥4.5:1; avoid red/green for critical info.
- Full keyboard navigation; visible focus outlines.
- Low-motion mode (animations off except soft fades).

---

## 4. Gamification & Nudge System

### 4.1 Gamification Model
- **XP sources:** +5 micro-task, +10 main task, +10 focus block, +15 weekly budget review.
- **Levels:** Every 100 XP; unlock cosmetic rewards.
- **Streak logic:** Increment on daily focus block; use skip token to preserve; else reset.

### 4.2 Positive Nudges Engine (Rule Examples)
- **REMINDER:** Time-based (e.g., Sunday 18:00) → “Budget check-in?” notification.
- **CONTEXTUAL:** On adding a Want expense → inline banner: “Redirecting $50 to debt moves payoff ~2 weeks sooner. Simulate?”
- **SELF_NUDGE:** On skipping planned focus → modal: “You planned 10 minutes; start with 2 instead?” [Start 2 min] [Skip].

---

## 5. Functional Specifications / Especificaciones Funcionales

### 5.1 Architecture & Tech Stack
- **Frontend:** React + TypeScript; React Query/Context (or Redux Toolkit); headless/ARIA components; service worker + IndexedDB.
- **Backend:** Node.js + Express; REST; JWT auth.
- **Data:** MongoDB (prod) with **SQLite adapter for full local/offline**; IndexedDB browser cache; write-through sync queue.
- **Offline:** Cache static assets; queue writes locally; background sync when online.

### 5.2 API Design (REST)
- **Auth:** `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`.
- **Tasks:** `GET/POST/PUT/DELETE /api/tasks`; `POST /api/tasks/:id/focus-sessions`.
- **Events:** `GET /api/events?start&end`, `POST/PUT/DELETE /api/events/:id`.
- **Rewards:** `GET /api/rewards/points`, `GET /api/rewards/unlocks`, `POST /api/rewards/redeem`.
- **Budget:** `GET /api/budget`, `POST /api/budget/income`, `POST /api/budget/categories`, `POST /api/budget/transactions`.
- **Debts:** `GET/POST/PUT /api/debts`, `POST /api/debts/simulate` (Snowball/Avalanche).

### 5.3 Data Model (Mongo-style; SQLite equivalent)

**User**
```
_id, email, passwordHash, username
preferences { interfaceDensity, font, theme, motion, ndFlags, locale }
points, level, streaks { focusDays, budgetWeeks, skipTokens }, createdAt
```

**Task**
```
_id, userId, title, subtasks[{label, done}], status, plannedDate,
calendarEventId, focusPresetMinutes, createdAt, updatedAt
```

**Event**
```
_id, userId, title, start, end, color, taskId?, reminderMinutesBefore?, createdAt
```

**Budget**
```
_id, userId, month, income[{source, amount}],
categories[{name, type(NEED|WANT|GOAL|DEBT), plannedAmount}]
```

**Transaction**
```
_id, userId, budgetMonth, amount, categoryName, isNeed, date, note?
```

**Debt**
```
_id, userId, name, balance, annualRate, minPayment, categoryName?, createdAt
```

### 5.4 Pseudocode Examples

**Task creation (award XP)**
```javascript
app.post('/tasks', auth, async (req, res) => {
  const { title, subtasks, plannedDate, focusPresetMinutes } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const task = await Task.create({ userId: req.user.id, title, subtasks, plannedDate, focusPresetMinutes });
  await addPoints(req.user.id, 10);
  res.json(task);
});
```

**Debt snowball simulation (simplified)**
```javascript
function simulateDebtSnowball(debts, extraPayment) {
  const queue = debts.sort((a,b)=>a.balance-b.balance);
  const timeline = [];
  for (let month=1; month<=600 && queue.some(d=>d.balance>0); month++) {
    let extra = extraPayment;
    for (const d of queue) {
      if (d.balance<=0) continue;
      const interest = d.balance * (d.annualRate/12/100);
      let pay = d.minPayment + extra;
      pay = Math.min(pay, d.balance + interest);
      d.balance = Math.max(0, d.balance - (pay - interest));
      if (d.balance>0) extra = 0;
    }
    timeline.push({ month, totalDebt: queue.reduce((s,d)=>s+d.balance,0) });
  }
  return timeline;
}
```

---

## 6. Implementation Roadmap / Roadmap de Implementación

**Phase 0 (W1–2):** Repo/CI, TypeScript, ESLint/Prettier, Express skeleton, React shell with theme toggle.  
**Phase 1 (W3–4):** Auth, user prefs, SQLite toggle (`USE_SQLITE=true`).  
**Phase 2 (W5–8):** Task CRUD, subtasks, focus timer; calendar CRUD; basic XP/streaks.  
**Phase 3 (W9–12):** Budget models/UI, Needs/Wants charts, debt simulator.  
**Phase 4 (W13–14):** Accessibility audit, keyboard navigation, onboarding quiz/presets.  
**Phase 5 (W15–16):** Offline mode (SW + IndexedDB), sync queue, doc for full-local run.  
**Phase 6 (W17–20):** Neurodivergent user testing; iterate copy, colors, interactions.

---

## 7. Testing Guidelines / Guía de Pruebas

- **Unit:** React components (tasks, timers, charts); Express controllers (task create, debt simulate).
- **Integration:** Task ↔ calendar linkage; focus logging → XP/streaks; budget changes → debt outputs.
- **Accessibility:** axe-core automation; manual screen-reader + keyboard passes.
- **Usability (ND participants 10–15):** Flows—create/break task + 10-min focus; set Needs/Wants budget; simulate debt payoff. Track completion, errors, self-reported overwhelm.
- **Offline:** No-network simulation; create tasks/transactions; verify sync on reconnect.
- **Ethics checks:** Nudges optional, transparent; no dark patterns.

---

## 8. Feature vs Neurodivergence Benefit / Tabla Beneficios

| Feature                     | ADHD Benefit                     | Autism Benefit                  | Dyslexia Benefit                   | Dyspraxia Benefit               |
| --------------------------- | -------------------------------- | --------------------------------| ---------------------------------- | --------------------------------|
| Breakable tasks             | Reduces overwhelm; easy start    | Clear sequences                 | Short text chunks                  | Fewer actions per step          |
| Focus blocks (5–45 min)     | Time-blindness helper            | Predictable routines            | Simple labeled controls            | Large buttons                   |
| Soft-color calendar         | Less visual noise                | Lower sensory load              | Clear shapes/labels                | Easier selection                |
| TTS for tasks/events        | Multisensory cues                | Clarifies expectations          | Reading support                    | Hands-free                      |
| Needs/Wants budget view     | Concrete feedback                | Structured, consistent display  | Charts + labels over heavy text    | Simple click selection          |
| Snowball debt simulator     | Quick wins, visible milestones   | Predictable payoff path         | Visual payoff bar                  | Low fine-motor demand           |

---

## 9. APP_DATA (JSON Snapshot)
```json
{
  "status": "ok",
  "intent": "mixed",
  "next_actions": [],
  "entities": {
    "tasks": [],
    "events": [],
    "budget": {
      "income_monthly": 0,
      "categories": [],
      "subscriptions": [],
      "debts": [],
      "strategy": "AVALANCHE"
    }
  },
  "assumptions": [
    {
      "en": "The team will adapt and extend this design document as development progresses, using it as a starting blueprint.",
      "es-PE": "El equipo adaptará y ampliará este documento de diseño a medida que avance el desarrollo, usándolo como plano inicial."
    }
  ],
  "citations": [],
  "confidence": 0.86
}
```

---

## 10. Ethics & Safety Notes
- Gamification is **opt-in** and configurable; rewards are cosmetic.
- Nudges are transparent and user-authored where possible; always offer “Skip” without penalty.
- Privacy: local/offline mode available; sharing features require explicit consent.

---

## 11. Local-Only & Offline Operation
- Run backend with SQLite adapter; serve React static build locally.
- Service worker pre-caches assets; IndexedDB stores queued writes (tasks, events, transactions).
- Sync worker reconciles when connectivity returns; conflicts resolved by latest timestamp with user review prompt for collisions.
- Offline workflow details:
  - **Precache**: service worker caches build assets via the Vite manifest plus the app shell (`index.html`) for predictable offline launch.
  - **Write queue**: task/event/transaction mutations enqueue into IndexedDB with `clientUpdatedAt`, retry counters, and `nextAttemptAt` scheduling.
  - **Background sync**: on reconnect (and via the background sync tag) the queue replays to REST endpoints, removing entries on success.
  - **Retry/backoff**: failures trigger exponential backoff (2s → 4s → 8s … capped at 5 min) with jitter to avoid repeated spikes.
  - **Conflict review**: 409 responses store a conflict record (local + server payloads) and surface a Settings review card so users choose which version to keep.

---

## 12. Future Enhancements (P2+)
- Body-doubling/co-working mode (timer + presence cues).
- AI-assisted task breakdown and budget suggestions (local-first, opt-in).
- Mobile PWA with haptic feedback (configurable intensity).
- Calendar sharing granular permissions (busy/available only).

---

## 13. Full Design Appendix (English + Spanish Highlights)

### EN: Bilingual TL;DR
* **NeuroFlow** is a web app that combines **task management, calendar, and budgeting** with **strong accessibility** for people with **ADHD, autism, dyslexia, dyspraxia, and other neurodivergences**.
* Core patterns:
  * **Tasks**: breakable tasks, Pomodoro-style **Blocks of time / Focus sessions**, visual checklists, body-doubling vibes.
  * **Calendar**: soft-color events, predictable layouts, text-to-speech reminders, routine templates.
  * **Budgeting**: **Zero-Based Budget**, **Needs vs Wants**, **Debt Snowball/Avalanche** simulator in Caleb-Hammer style.
  * **Gamification**: points, streaks, cosmetic unlocks, progress bars for task streaks and debt payoff, all **optional and configurable**.
  * **Nudges**: gentle, transparent prompts tied to self-set goals; “Skip token” instead of punishment.
* Tech: **React + TypeScript** frontend, **Node.js/Express** backend, **MongoDB** (production) + **SQLite or file DB** for fully local offline running, with service worker and IndexedDB caching.
* This doc defines: **feature list + priorities, UI/UX wireframes in text, API endpoints, DB schemas, offline strategy, implementation roadmap, and testing with neurodivergent users.**

### ES-PE: TL;DR bilingüe
* **NeuroFlow** es una app web que combina **gestor de tareas, calendario y presupuesto** con **fuerte accesibilidad** para personas con **TDAH, autismo, dislexia, dispraxia y otras neurodivergencias**.
* Patrones centrales:
  * **Tareas**: tareas dividibles, **Bloques de tiempo / Sesiones de enfoque** tipo Pomodoro, checklists visuales, dinámica tipo body-doubling.
  * **Calendario**: eventos en colores suaves, layouts predecibles, recordatorios con lectura en voz alta, plantillas de rutinas.
  * **Presupuesto**: **Presupuesto de base cero**, **Necesidades vs Gustos**, simulador de deuda **Bola de nieve/Avalancha** al estilo Caleb Hammer.
  * **Gamificación**: puntos, rachas, desbloqueos cosméticos, barras de progreso para rachas de tareas y pago de deudas, todo **opcional y configurable**.
  * **Nudges**: avisos suaves y transparentes ligados a metas auto-definidas; **“Pase de omisión”** en vez de castigos.
* Tech: frontend **React + TypeScript**, backend **Node.js/Express**, **MongoDB** (producción) + **SQLite o DB de archivos** para correr completamente en local, con service worker e IndexedDB para offline.
* Este documento define: **lista de funcionalidades y prioridades, wireframes en texto, endpoints de API, esquemas de BD, estrategia offline, roadmap de implementación y pruebas con usuarios neurodivergentes.**

---

## 14. Extended Functional Details

### 14.1 Additional API Considerations
- Rate limiting for auth and write endpoints.
- Feature flag endpoints to toggle gamification and offline sync behaviors.
- Export endpoints for budgets/tasks (CSV/JSON) for local backups.

### 14.2 Localization & Internationalization
- I18n keys for English + Peruvian Spanish; extensible to additional locales.
- Date/time formatting respects locale; calendar week start configurable.

### 14.3 Security
- Encrypt JWT secrets and DB credentials via environment variables.
- Input validation on all endpoints; sanitize HTML in notes to prevent XSS.
- Role-based access for future collaboration features.

### 14.4 Performance
- Virtualized lists for large task/event sets.
- Debounced search and typeahead for tasks/events.

### 14.5 Observability
- Structured logging (JSON) with correlation IDs per request.
- Basic metrics: API latency, error rates, offline queue size.

---

## 15. Offline-First Data Flow Example (Pseudo)

```
User action → write to IndexedDB queue → optimistic UI update →
background sync worker attempts POST/PUT to server → on success remove from queue → on failure retry with backoff →
if conflict, prompt user to reconcile (server vs local timestamps).
```

---

## 16. Testing Matrix (Detailed)

| Area               | Test Type       | Tools                   | Notes |
|--------------------|-----------------|-------------------------|-------|
| Tasks UI           | Unit/UI         | React Testing Library   | Focus timer, checklist interactions |
| Calendar API       | Integration     | Supertest + Jest        | Date range queries, event-task links |
| Budget math        | Unit            | Jest                    | Zero-based remainder, Needs/Wants thresholds |
| Debt simulator     | Unit            | Jest                    | Snowball vs Avalanche timelines |
| Accessibility      | Automated/Manual| axe-core, NVDA/VoiceOver| Keyboard-only, focus states, TTS hooks |
| Offline sync       | Integration     | Playwright + mocked SW  | Queue writes offline, sync on reconnect |
| Localization       | Unit/UI         | jest-i18next            | Date formats, translated labels |
| Performance        | Profiling       | Lighthouse, React Profiler | Virtualized lists, SW caching |

---

## 17. Implementation Notes for Developers
- Keep gamification optional; surface a global toggle in Settings.
- Default to low-motion and soft palettes; allow users to opt into richer visuals.
- Avoid yellow-heavy palettes; prefer greens/blues/browns for calmness.
- Provide “simple” and “detailed” modes to reduce cognitive load.
- Document local-only run: `USE_SQLITE=true npm run dev` (backend) + `npm run dev` (frontend) with service worker enabled.

---

## 18. Glossary
- **Zero-Based Budget:** Every unit of income is assigned to a category until remaining is zero.
- **Snowball Method:** Pay smallest balance debts first to build momentum.
- **Avalanche Method:** Pay highest interest debts first for efficiency.
- **Skip Token / Pase de omisión:** Consumable item that preserves streaks after a missed day.
- **Focus Block:** Time-boxed session (5–45 minutes) linked to a task.

---

## 19. References (Contextual Research)
- ADDitude Magazine on ADHD productivity tools.
- UX Design articles on designing for autistic users.
- WCAG 2.2 guidelines for accessibility.
- Behavioral science references on nudges and ethical gamification.
- Caleb Hammer budgeting and debt reduction strategies.

---

**End of Complete Design Document.**
