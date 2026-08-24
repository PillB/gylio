# GYLIO onboarding evidence ledger

Validated: 2026-08-24

## Product rule

Onboarding is a preference/setup flow, not a diagnostic questionnaire or treatment recommendation. The evidence bar depends on risk and claim strength.

| Evidence tier | Product use |
| --- | --- |
| Strong / standards-backed | May inform a neutral default or clear accessibility option. |
| Moderate / directionally supported | May be offered as an optional, reversible support with uncertainty stated. |
| Mixed / heterogeneous | User-controlled experiment only; do not imply reliable benefit. |
| Unsupported, harmful, redundant, or not implemented | Do not collect, prescribe, or claim it works. |

Every onboarding choice must be low-risk, reversible, explain what it changes, and remain editable later. A diagnosis must not determine a user's interface.

## Why onboarding is only three screens

The current sequence is:

1. **Interface preferences** — direct choices for reading appearance, contrast, motion, and optional read-aloud.
2. **Optional starter data** — one first task and/or monthly take-home income; both may be left blank.
3. **Orientation** — a short map of the app with no acknowledgement or consent checkbox.

An intermediate "support profile" screen was removed after review. It bundled the same preferences already chosen on screen 1 and could overwrite a deliberate choice immediately afterward. Current W3C form guidance recommends simple, short forms, logical steps, clearly marked optional stages, and collecting only information needed for the process. The more defensible design is therefore to ask the user directly once, not infer or rebundle their preferences.

Sources:
- W3C Forms Tutorial (updated 2026-03-27): https://www.w3.org/WAI/tutorials/forms/
- W3C Multi-page Forms: https://www.w3.org/WAI/tutorials/forms/multi-page/
- W3C Cognitive Accessibility, Make Each Step Clear: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/

## Screen 1 — Interface preferences

### Standard readable text — neutral default

**Tier:** Strong/standards-backed default.

A conventional readable default plus user-controlled enlargement is consistent with WCAG. WCAG 2.2 SC 1.4.4 requires text to remain usable when enlarged up to 200%; W3C cognitive guidance also supports personalization of presentation.

Sources:
- W3C, Understanding SC 1.4.4 Resize Text: https://www.w3.org/WAI/WCAG22/Understanding/resize-text
- W3C, Support a Personalized and Familiar Interface: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o8p04-interface/

### Larger text

**Tier:** Strong as a user choice; not diagnosis-specific.

Larger text is a standard accessibility option. GYLIO does not assume which users need it.

Sources:
- W3C G178, controls for changing text size: https://www.w3.org/WAI/WCAG22/Techniques/general/G178
- W3C Customizable Text: https://www.w3.org/WAI/perspective-videos/customizable/

### More spacing

**Tier:** Moderate/directional as an optional preference.

WCAG 2.2 SC 1.4.12 requires content to tolerate user-overridden line, paragraph, letter, and word spacing without loss of content or functionality. That does not establish one ideal spacing configuration for everyone. GYLIO therefore offers a reversible spacing option and separately tests that it does not break narrow layouts.

Sources:
- W3C, Understanding SC 1.4.12 Text Spacing: https://www.w3.org/WAI/WCAG22/Understanding/text-spacing
- W3C C36, Allowing for text spacing override: https://www.w3.org/WAI/WCAG22/Techniques/css/C36

### Why GYLIO does not recommend a dyslexia-specific font

**Tier:** Mixed/negative aggregate evidence.

A 2026 meta-analysis synthesized 15 studies, 91 effect sizes, and 688 participants. Dyslexia-friendly fonts such as OpenDyslexic/Dyslexie had no consistent reliable effect on reading speed or accuracy versus standard fonts (overall Hedges g = -0.04, 95% CI -0.15 to 0.07). Earlier controlled studies also found no reliable OpenDyslexic advantage. A diagnosis-specific font is therefore not an evidence-based default.

Sources:
- Azzarello et al. (2026), *Annals of Dyslexia*, DOI 10.1007/s11881-026-00389-8: https://pubmed.ncbi.nlm.nih.gov/42536336/
- Wery & Diliberto (2017): https://pubmed.ncbi.nlm.nih.gov/26993270/

Legacy diagnosis-font state is normalized to the neutral standard reading style when old onboarding data is migrated.

### Follow device motion setting — neutral default

**Tier:** Strong/standards-backed.

W3C documents `prefers-reduced-motion` so websites can respect the operating-system preference. Motion may distract users or cause vestibular discomfort/nausea. GYLIO defaults to the device preference and permits explicit overrides.

Sources:
- W3C WCAG Technique C39: https://www.w3.org/WAI/WCAG22/Techniques/css/C39
- W3C, Let Users Control When Content Moves or Changes: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o8p01-motion/

### Higher contrast

**Tier:** Strong as an available preference; not a universal default.

WCAG defines minimum authored contrast requirements, while personalization guidance supports user-controlled presentation preferences. GYLIO provides a high-contrast theme but does not infer who should use it.

Sources:
- W3C, Understanding SC 1.4.3 Contrast (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum
- W3C, Support a Personalized and Familiar Interface: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o8p04-interface/

### Read text aloud

**Tier:** Moderate evidence with meaningful heterogeneity.

A meta-analysis of text-to-speech/read-aloud tools for students with reading disabilities found a positive average reading-comprehension effect (about d = 0.35) but substantial variation across implementations and readers. GYLIO therefore keeps it off by default and user-controlled; copy says benefit varies rather than promising improvement.

Source:
- Wood et al., text-to-speech/read-aloud meta-analysis: https://pubmed.ncbi.nlm.nih.gov/29839101/

## Screen 2 — Optional starter data

### First task (optional)

**Tier:** Moderate directional support.

A systematic review/meta-analysis of randomized studies found a small positive unique average effect of goal setting across behaviors (141 papers, 384 effect sizes, N=16,523; d=0.34). A separate experimental meta-analysis found that interventions increasing progress monitoring improved goal attainment on average (138 studies, N=19,951; d=0.40). Effects vary by context, so onboarding offers one optional concrete task without promising completion or productivity.

Sources:
- Epton et al., goal-setting meta-analysis: https://pubmed.ncbi.nlm.nih.gov/29189034/
- Harkin et al., progress-monitoring meta-analysis: https://pubmed.ncbi.nlm.nih.gov/26479070/

### Monthly take-home income (optional)

**Tier:** Product setup, not behavioral science.

This field exists only to seed the first Budget month with an income record. It is optional. GYLIO does not infer spending categories from the amount.

An older field named `monthlyBudget` is deliberately **not** migrated into `monthlyIncome`: the meanings differ, and silently changing the semantics of persisted user data would be incorrect.

## Screen 3 — Orientation

**Tier:** Standards/usability-backed.

W3C cognitive-accessibility guidance notes that users may struggle with orientation, learning new interfaces, distraction, and remembering where they are in a multi-step process. It recommends clear signposts, current-step/progress information, concise instructions, and predictable structure. The final screen is therefore a brief map, not a quiz. No checkbox is required to prove the user read or memorized it.

Sources:
- W3C, Help Users Understand What Things Are and How to Use Them: https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-understandable/
- W3C, Make Each Step Clear: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/
- W3C, Use Clear Step-by-step Instructions: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p07-step-instructions/

### Why onboarding does not ask for a generic reminder preference

The previous reminder checkbox was not connected to a working reminder delivery path. Collecting an option the product cannot honor is misleading. If reminders are added later, the relevant screen should explain timing, channel, permission, editability, and opt-out behavior where the reminder is actually configured.

Source:
- W3C, Provide Reminders: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o7p07-reminders/

## Choice-architecture rule

Defaults influence behavior, so they should be low-assumption and reversible. GYLIO starts with standard text, the normal app theme, the device's own motion preference, and read-aloud off. None of these defaults encodes a diagnosis.

The onboarding deliberately avoids medical labels such as ADHD, autism, anxiety, or dyslexia because the product only needs interface preferences, not health information.

## Claims we intentionally do not make

- "ADHD users need large text."
- "Autistic users should use high contrast."
- "Anxiety requires a light theme."
- "OpenDyslexic improves reading for dyslexia."
- "A starter task guarantees productivity."
- "A particular support bundle is best for a diagnosis."
- "Typing income is a behavioral intervention."

## Review rule

Whenever onboarding copy, defaults, questions, or options change:

1. identify the factual/behavioral claim implied by the control;
2. classify its evidence strength;
3. prefer direct user preference over diagnosis inference;
4. make low-certainty supports optional and reversible;
5. do not collect data the application does not use;
6. run EN/es-PE localization, migration, 320/390px layout, keyboard/accessibility, and full-browser regression tests.
