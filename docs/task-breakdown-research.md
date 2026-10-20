# Task Breakdown Research: Goblin.tools, ADHD Neuroscience & NeuroFlow Implementation
**Date:** 2026-04-04 | **Purpose:** Inform NeuroFlow's AI-powered task breakdown feature  
**Sources:** Goblin.tools UX analysis, academic research (arXiv, PMC, CHI), ADHD practitioner resources

---

## 1. How Goblin.tools Magic To-Do Works

### Overview
Goblin.tools ([goblin.tools](https://goblin.tools)) is a free, no-signup, no-ads collection of 8 micro-tools built by Bram De Buyser (Belgian AI/data engineer, Arcology). The Magic To-Do tool is its standout feature — specifically designed for neurodivergent task initiation barriers.

**Backend:** Uses OpenAI API (confirmed by third-party review) + possibly other models ("open and closed source"). Not open source; prompts not disclosed.

### The Magic To-Do Mechanic (Step by Step)

1. **Input:** User types a task in plain language (e.g., "file my taxes", "clean the kitchen", "write the quarterly report")
2. **Spiciness slider:** User selects 1–5 chili peppers. Definition shown in UI: *"The spiciness level gives the tool a hint about how hard or stressful you find the task. The spicier, the more steps it will attempt to break it down into."*
   - 🌶 Level 1: Broad, high-level steps (for easy/routine tasks)
   - 🌶🌶🌶 Level 3: Moderate granularity (default for most users)
   - 🌶🌶🌶🌶🌶 Level 5: Micro-steps — "even the worst task paralysis day can handle"
3. **Output:** Flat list of concrete steps in **verb-noun format** (e.g., "Pick up clothes and put them in the hamper", "Wipe down surfaces")
4. **Recursive breakdown:** Any individual subtask can be clicked to break it down further — unlimited nesting depth
5. **Manual add:** Users can append additional subtasks via "Add Subtask" button

### Additional UX Features
- Emoji category tags auto-applied to top-level tasks (visual organization)
- Filter button: show/hide categories, completed items
- Drag-and-drop reordering
- Time estimation (via integrated Estimator tool)
- Cloud sync (beta)
- Export to: local file, Todoist, iCal
- Undo/redo
- Bulk actions: mark all complete, clear estimates, remove completed

### What Tasks Break Down Well vs. Poorly

| Works well ✅ | Works less well ⚠️ |
|---|---|
| Household chores ("clean the kitchen") | Highly technical domain tasks |
| Party / event planning | Emotional/relational tasks ("have a difficult conversation") |
| Filing taxes | Tasks requiring personal context the AI lacks |
| Writing projects (thesis, reports) | Abstract creative work |
| Home organization | Tasks where timing depends on personal life |
| Grocery shopping / errands | Domain-specific professional tasks |

---

## 2. What Users Say About Magic To-Do

### Praise
> *"I stared at 'clean the house' on my to-do list for three hours last Tuesday. Then I found Goblin Tools and it broke that task into 12 steps before I could talk myself out of starting."*  
> — FocusHack reviewer, [focushack.io/reviews/goblin-tools-adhd-review](https://focushack.io/reviews/goblin-tools-adhd-review/)

> *"I'm a paid user because of Magic ToDo — and I don't even use it that often."*  
> — Hacker News commenter, [news.ycombinator.com/item?id=43461375](https://news.ycombinator.com/item?id=43461375)

> *"Way easier to introduce people to who aren't likely to want to invest the time to learn prompting compared to ChatGPT."*  
> — Joy_Strube, [Asana Community Forum](https://forum.asana.com/t/free-handy-ai-assisted-goblin-tools-breaks-down-tasks-and-more-designed-for-neurodivergent-people-and-useful-to-all/868466)

> *"That's super easy to use, full of cool options — love the spiciness of breaking down a task."*  
> — ArthurBEGOU, same Asana forum thread

> *"This did the trick"* (when unable to organize thoughts for a new project)  
> — ArlinA, Asana forum

### Limitations
> *"Tools cannot overcome the fundamental difficulty of converting obligation into sustained focus — the core problem."*  
> — Hacker News ADHD user (widely echoed)

- **No memory or learning:** Each session starts fresh; zero user history retained
- **No calendar/task manager native integration** (only manual export)
- **No context awareness:** Cannot know the user's energy, time, or history
- **AI output accuracy varies** for niche or domain-specific tasks
- Cannot edit time estimates directly within Magic ToDo

### Rating Summary
FocusHack review: **9/10 for Magic ToDo** specifically. Overall Goblin.tools: 8/10.  
r/autism post "Amazing resource GoblinTools" cited extensively; community describes it as *"it is free and this thing is perfect."*

---

## 3. The Neuroscience Behind Task Breakdown for ADHD

### Why Task Initiation Fails (The Activation Barrier)

ADHD brains operate on an **interest-based nervous system** (Dr. William Dodson). Unlike neurotypical brains that activate through willpower + importance, ADHD brains require **novelty, interest, challenge, or urgency** to trigger dopamine-dependent activation.

Key executive function deficits affecting task management:
- **Task initiation paralysis** — knowing what to do but being unable to start
- **Working memory deficits** — difficulty holding multiple steps in mind simultaneously
- **Time perception disorders** — unrealistic planning; missing the "now vs. not now" distinction
- **Binary engagement** — hyperfocus or complete disengagement, little middle ground
- **Emotional dysregulation** — aversive reactions to tasks perceived as overwhelming

**Research base:** Faraone et al. 2021 (ADHD neurobiology); Harvard Medical School ADHD dopamine research. ADHD brains may need 2–3× more dopamine stimulation to initiate tasks.

### Optimal Subtask Count and Granularity

**Miller's Law baseline:** Working memory holds 7 ± 2 chunks (neurotypical adults). For ADHD populations, working memory capacity is significantly lower and more susceptible to load.

**Research:** PMC8175567 shows ADHD groups show greater accuracy drops under high cognitive load vs. controls.

**ADHD practitioner consensus (Shimmer ADHD Coaching, CHADD, ADHD Homestead):**
- Show **5 or fewer visible items** at a time
- Each subtask should be completable in **1 hour or less**
- Smallest effective action = single, concrete physical action requiring no further decisions
  - ✅ "Put one dish in the dishwasher"
  - ❌ "Clean the kitchen"
- Display **one task at a time** to reduce overwhelm more than showing full nested hierarchies

**Source:** [Shimmer ADHD Coaching: Breaking Down Tasks](https://www.shimmer.care/blog/breaking-down-tasks)

### The Microstepping Evidence Base

Microstepping (breaking tasks into absurdly small, friction-free first actions) is one of the most evidence-supported ADHD strategies.

**Mechanism:**
1. Minimal first action lowers the activation threshold
2. Once started, momentum carries the ADHD brain forward ("task initiation is the barrier, not task execution")
3. Completion of micro-steps provides frequent dopamine hits, reinforcing continued effort

**Source:** [Klarity Health: Breaking the First-Step Barrier](https://www.helloklarity.com/post/breaking-the-first-step-barrier-how-micro-steps-can-help-adhd-brains-overcome-task-initiation-problems/)

### CHI 2024 Research: What ADHD Users Actually Need from AI Task Tools

From *"Not Just Me and My To-Do List": Understanding Challenges of Task Management for Adults with ADHD and the Need for AI-Augmented Social Scaffolds* (arXiv:2603.17258):

Key findings:
- Tasks must be decomposed with **emotional scaffolding**, not just logical decomposition
- Users want **"ideal" vs. "baseline" goal tiers** — graceful degradation for bad-ADHD-days
- **Mood-adaptive recalibration** is critical: systems should adjust scope based on emotional state
- **Non-punitive reflection** is a must: safe spaces to debrief skipped/abandoned tasks without shame
- **Rigid nested hierarchies cause fatigue** — "long, static task boards or nested checklist hierarchies" directly worsen task paralysis
- Most valued concept in speed-dating test: **"Brain Weather Dashboard"** — metaphorical language like "light fog with patches of clarity" to normalize cognitive fluctuation

**Source:** [arXiv:2603.17258](https://arxiv.org/html/2603.17258v1) | [arXiv:2507.06864 — Neurodivergent-Aware Productivity (2025 systems review)](https://arxiv.org/html/2507.06864)

### Display Format Comparison for ADHD

| Format | ADHD Fit | Notes |
|---|---|---|
| Simple checkbox list | ✅ High | Low cognitive overhead; dopamine from ticking |
| Sequential (one step at a time) | ✅✅ Very high | Eliminates overwhelm from seeing everything at once |
| Nested hierarchies | ⚠️ Medium-low | Useful for complex projects; risks overwhelm if too deep |
| Kanban board | ⚠️ Low-medium | Visual but spatial complexity can be disorienting |
| Tree diagram (Splitti-style) | ⚠️ Medium | Powerful but can overwhelm |

**Consensus:** Show minimum items needed to make the next action clear. Checklists beat kanban for ADHD daily task management.

---

## 4. Competing App Approaches

| App | Breakdown Approach | Key Differentiator |
|---|---|---|
| **Goblin.tools** | Spiciness-slider + AI list | Free, zero friction, no context |
| **Splitti** | AI recursive tree + Eisenhower matrix + mood check-in + energy matching | Most technically sophisticated; energy-aware |
| **Tiimo** | Visual schedule + AI breakdown into time-blocked routine | Schedule-first; won iPhone App of Year 2025 |
| **Orli** | "File taxes → 4 clear subtasks" + time estimates + energy matching | ADHD-explicit UX |
| **Motion** | Calendar optimization scheduler | NOT a breakdown tool — user must already know steps |
| **Reclaim.ai** | Auto-scheduling into calendar slots | NOT a breakdown tool |

**None are open source. None have disclosed prompts.**

**Source:** [SentiSight AI Neurodivergent Productivity Review 2025](https://www.sentisight.ai/ai-neurodivergent-productivity-adhd-friendly/) | [Splitti App Store](https://apps.apple.com/us/app/adhd-planner-ai-task-splitti/id6473397856)

---

## 5. NeuroFlow Implementation Recommendations

### 5.1 Core Differentiator: Context-Aware Breakdown (vs. Goblin.tools' Stateless AI)

NeuroFlow knows things Goblin.tools never can. Use them:

```
User says: "Break down: Write the quarterly report"

Injected context:
  - Energy level: Low (self-reported or inferred from engagement)
  - Time available: 45 minutes (from calendar gap)
  - Time of day: Monday morning
  - User pattern: tends to hyperfocus then crash (learned over time)
  - Previous similar tasks: completed "write monthly summary" in 3 steps last week

→ Output: 3 micro-steps, ≤15 min each, starting with lowest-friction first
```

This is the single biggest differentiator vs. every competing tool.

### 5.2 Replace "Spiciness" with Energy + Time

Instead of abstract spiciness, surface two real-world constraints:

**"How's your energy right now?"** (5-point scale or emoji)  
**"How much time do you have?"** (15 min / 30 min / 1 hr / open)

Then auto-calibrate breakdown granularity:

| Energy | Time | Steps | Step Size |
|--------|------|-------|-----------|
| Very low | Any | 2–3 | ~10 min each |
| Low | ≤30 min | 3–4 | ~8 min each |
| Medium | ~1 hr | 5–7 | ~10 min each |
| High | Open | 7–9 | ~15–20 min each |

### 5.3 Recommended AI Prompt Template

```
Given the task: [TASK_DESCRIPTION]
User context:
  - Energy level: [1-5]
  - Time available: [MINUTES]
  - Time of day: [MORNING/AFTERNOON/EVENING]
  - User history with similar tasks: [SUMMARY OR NONE]

Generate exactly [N] concrete, actionable steps. Rules:
- Each step ≤ [TIME_PER_STEP] minutes
- Start with the physically easiest, lowest-friction step
- Use verb-noun format: "Open the document" not "Work on the document"
- Each step completable without further decisions (no "research" or "figure out")
- Flat list only — no nested sub-points at this level
- Avoid vague verbs: no "review", "work on", "deal with", "handle"
- First step must be so small it takes under 2 minutes and has zero ambiguity
```

### 5.4 Recursive Breakdown (Power Feature)

- Any step can be broken down further with a single tap (like Goblin.tools)
- Add: **"I'm stuck on this step"** button → ultra-micro breakdown of just that one item
- Optional: let user explain why they're stuck → feed to AI for empathetic micro-step generation

### 5.5 Progressive Disclosure (Never Show More Than 5)

Display first 3–5 steps only. "Show remaining steps" toggle below.  
This prevents the overwhelm that a full 15-step breakdown triggers even when individual steps are small.

### 5.6 The "Next Action" Highlight (GTD-aligned)

Always show exactly one **"Start here →"** item at the top — the single next physical action. Everything else collapses below. Allows the user to process just one thing at a time.

This mirrors Goblin.tools' strength (actionable verb-noun steps) while adding hierarchy discipline.

### 5.7 Non-AI Fallback (Critical for Offline/Cost Control)

Goblin.tools fails completely without AI. NeuroFlow must have:

| Fallback Layer | Implementation |
|---|---|
| **Template library** | Pre-built decompositions for 20 most common task types (taxes, email, cleaning, grocery, appointments, bills, report writing, etc.) — stored in IndexedDB |
| **User templates** | "I've broken this type of task down before — reuse that structure" |
| **Heuristic rules** | If task contains "email" → suggest [Open email, Find contact, Draft, Review, Send]. Hardcoded in JS |
| **Offline cache** | If breakdown was generated online, cache in IndexedDB for re-use next time |

### 5.8 Emotional Scaffolding (The Gap Goblin.tools Doesn't Fill)

Research (arXiv:2603.17258) shows the biggest unmet need is emotional scaffolding. NeuroFlow should:

- **Non-punitive framing:** "Here's one way to start — you don't have to do all of this today"
- **Celebrate tiny completions:** Micro-animation or affirmation on each subtask check
- **"Good enough for today" mode:** Mark a subset as minimum viable completion; rest become optional
- **Skip without shame:** "Skip today →" with no penalty, no guilt messaging, no streak loss
- **Bad day rescaling:** One-tap "Tough day — simplify this" rebuilds breakdown at lower granularity
- **Mood-adaptive language:** Mirror Tiimo's approach — check in on energy before breakdown

### 5.9 i18n Considerations for LatAm

- All breakdown UI strings must be in `en.json` and `es-PE.json`
- The concept of "next action" may need cultural localization — "¿Qué es lo primero que puedes hacer?" rather than literal translation
- Spiciness metaphor (if used) needs replacement — consider "¿Qué tan difícil te parece esto hoy?"

### 5.10 Comparison: NeuroFlow vs. Goblin.tools

| Feature | Goblin.tools | NeuroFlow (recommended) |
|---|---|---|
| Context awareness | ❌ None (stateless) | ✅ Energy, time, history, patterns |
| Breakdown granularity control | Spiciness 1–5 | Energy level + time available |
| Nesting | Recursive on demand | Flat by default; recursive opt-in |
| Emotional framing | Neutral | Non-punitive, celebratory |
| Memory/learning | ❌ None | ✅ Learns user's task patterns |
| Calendar integration | Manual export only | Native — slots tasks automatically |
| Budget integration | ❌ None | ✅ "This task → 30 min → use focus block" |
| Non-AI fallback | ❌ Fails completely | ✅ Template library + heuristics |
| "Next action" surfacing | ❌ No feature | ✅ Always highlights first step |
| Progress continuity | Session only | Persisted, resumable |
| Price | Free | Free (in free tier) |

---

## 6. Sources

| Source | URL | Relevance |
|---|---|---|
| Goblin.tools home | https://goblin.tools/ | Direct product reference |
| Goblin.tools About | https://goblin.tools/About | Technical stack info |
| Goblin.tools — FocusHack Review | https://focushack.io/reviews/goblin-tools-adhd-review/ | UX + user quotes |
| Goblin.tools — Diann Wingert Coaching | https://www.diannwingertcoaching.com/blog/goblin-tools-simple-solutions-for-adhd-task-avoidance | ADHD framing |
| Goblin.tools — Hacker News | https://news.ycombinator.com/item?id=43461375 | Community sentiment |
| Goblin.tools — Asana Forum | https://forum.asana.com/t/free-handy-ai-assisted-goblin-tools-breaks-down-tasks-and-more-designed-for-neurodivergent-people-and-useful-to-all/868466 | User quotes |
| Goblin.tools — Gold Penguin | https://goldpenguin.org/tools/goblintools/ | UX analysis |
| Goblin.tools — Effective Effort Consulting | https://effectiveeffortconsulting.com/goblin-tools/ | ADHD practitioner review |
| arXiv: "Not Just Me and My To-Do List" (CHI 2024) | https://arxiv.org/html/2603.17258v1 | ADHD AI task management research |
| arXiv: Neurodivergent-Aware Productivity (2025) | https://arxiv.org/html/2507.06864 | Systems review |
| Shimmer ADHD: Breaking Down Tasks | https://www.shimmer.care/blog/breaking-down-tasks | Practitioner guidance |
| Klarity Health: Micro-steps for ADHD | https://www.helloklarity.com/post/breaking-the-first-step-barrier-how-micro-steps-can-help-adhd-brains-overcome-task-initiation-problems/ | Evidence base |
| SaskADHD: Task Initiation Strategies | https://saskadhd.com/adhd-task-initiation-evidence-based-strategies-that-actually-work/ | Evidence base |
| Laws of UX: Miller's Law | https://lawsofux.com/millers-law/ | Cognitive load reference |
| PMC8175567 | https://pmc.ncbi.nlm.nih.gov/articles/PMC8175567/ | ADHD working memory research |
| Splitti App | https://apps.apple.com/us/app/adhd-planner-ai-task-splitti/id6473397856 | Competitor analysis |
| Tiimo: Task Initiation | https://www.tiimoapp.com/resource-hub/task-initiation-adhd | Competitor approach |
| SentiSight: AI Neurodivergent Productivity | https://www.sentisight.ai/ai-neurodivergent-productivity-adhd-friendly/ | Competitive overview |
| AI for Squishy Humans: Goblin.tools | https://aiforsquishyhumans.com/2025/05/05/goblin-tools/ | Community review |
