# Issues and root causes

Status: open / fixed (PR) / patch (owner PR).

| ID | Found | Finding | Root cause | Status |
|----|-------|---------|-----------|--------|
| Q-001 | 2026-10-02 axe, all views | Toast stack `aria-label` on a role-less div (serious) | ARIA label needs a role | fixed (this round) |
| Q-002 | axe, Tasks | `role="list"` wrapper had non-listitem children in loading/empty states (critical) | list role applied unconditionally | fixed |
| Q-003 | axe, Calendar | Scrollable week grid not keyboard-focusable (serious) | region with overflow lacked `tabIndex=0` | fixed |
| Q-004 | axe, Settings | "Restart guide" button contrast 4.39:1 (needs 4.5) | primary text on tinted overlay | fixed |
| Q-005 | Tasks view | Duplicate lightning emoji on quick-start button | icon span plus emoji already in the i18n string | fixed |
| Q-006 | axe, locked tabs | Heading order skipped (h1 then h3) on Social, Routines, Rewards when locked | `UpgradePrompt` uses `h3` | patch for #89 (it rewrites UpgradePrompt) |
| Q-007 | Product | Social, Routines and Rewards are locked behind the paywall on main; gamified loops and social are core goals | free/Pro split | open, see #89 (its choices make streaks and rewards free) |
| Q-008 | Onboarding | Step 1 stacks three near-duplicate intro sentences before the choices | copy accumulated across edits | open |

## Repeat-issue patterns
- Sandbox-only e2e failures from missing Inter font: not an app bug; load Inter or use CI.
- Dev server first load logs a 504 "Outdated Optimize Dep": Vite artifact, ignore.
- Parallel PRs touching the same file (UpgradePrompt, package.json, Claude_changes.md): coordinate via the owning thread before editing.
