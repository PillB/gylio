# Retrospectives

## Round 1 (2026-10-02)
- Worked: axe-core in the real browser found 5 defects the unit suite and existing e2e missed; stash-and-rerun proved the new tests fail without the fixes.
- Did not work: the research subagent's web search returned link lists, so some citations are unverified; treat those as leads.
- Next round: add an axe e2e per primary view once the lint thread's package.json changes land (adding `axe-core` as a devDependency touches package.json/lockfile).
