# GYLIO onboarding evidence ledger

Validated: 2026-08-24

## Product rule

Onboarding is a preference/setup flow, not a diagnostic questionnaire or treatment recommendation. The evidence bar depends on risk and claim strength.

| Evidence tier | Product use |
| --- | --- |
| Strong / standards-backed | May inform a neutral default or clear accessibility option. |
| Moderate / directionally supported | May be offered as an optional, reversible support with uncertainty stated. |
| Mixed / heterogeneous | User-controlled experiment only; do not imply reliable benefit. |
| Unsupported, harmful, redundant, unnecessary, or not implemented | Do not collect, prescribe, or claim it works. |

Every onboarding choice must be low-risk, reversible, explain what it changes, remain editable later, and be necessary for setup. A diagnosis must not determine a user's interface.

## Why onboarding is only three screens

The current sequence is:

1. **Interface preferences** — direct choices for reading appearance, contrast, motion, and optional read-aloud.
2. **Optional first action** — one starter task may be added or skipped.
3. **Orientation** — a short map of the app with no acknowledgement or consent checkbox.

An intermediate "support profile" screen was removed after review. It bundled the same preferences already chosen on screen 1 and could overwrite a deliberate choice immediately afterward. Monthly income was subsequently removed from screen 2 because Budget already collects income in context; asking for financial data before the user enters Budget added friction and unnecessary data collection without enabling onboarding itself.

W3C form guidance says users generally prefer simple, short forms and recommends asking only for information required to complete the process. Cognitive-accessibility guidance likewise recommends requiring as little input as possible and keeping steps clear and concise.

Sources:
- W3C Forms Tutorial (updated 2026-03-27): https://www.w3.org/WAI/tutorials/forms/
- W3C Multi-page Forms: https://www.w3.org/WAI/tutorials/forms/multi-page/
- W3C Cognitive Accessibility, Make Each Step Clear: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o1p04-clear-steps/
- W3C Cognitive Accessibility, Design Forms to Prevent Mistakes: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p04-supportive-forms/
- W3C Cognitive Accessibility, Use Clear and Understandable Content: https://www.w3.org/WAI/WCAG2/supplemental/objectives/o3-clear-content/

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

WCAG 2.2 SC 1.4.12 requires content to tolerate user-overridden line, paragraph, letter, and word spacing without loss of content or functionality. It does **not** establish one ideal spacing preset for everyone. GYLIO therefore offers a reversible spacing option and tests that it does not break narrow layouts.

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

**Tier:** Moderate evidence in a specific studied population, with meaningful heterogeneity.

A meta-analysis of text-to-speech/read-aloud tools for **students with reading difficulties** found a positive average reading-comprehension effect (about d = 0.35) but substantial variation across implementations and readers. That evidence should not be generalized into a universal adult benefit. GYLIO therefore keeps read-aloud off by default, describes the studied population in UI copy, and leaves the option fully user-controlled.

Source:
- Wood et al., text-to-speech/read-aloud meta-analysis: https://pubmed.ncbi.nlm.nih.gov/28112580/

## Screen 2 — Optional first action

### First task (optional)

**Tier:** Moderate directional support.

A systematic review/meta-analysis of randomized studies found a small positive unique average effect of goal setting across behaviors (141 papers, 384 effect sizes, N=16,523; d=0.34). A separate experimental meta-analysis found that interventions increasing progress monitoring improved goal attainment on average (138 studies, N=19,951; d=0.40). Effects vary by context.

GYLIO therefore offers one optional concrete starter task but does not promise productivity or completion. The UI copy stays practical rather than displaying study statistics during setup.

Sources:
- Epton et al., goal-setting meta-analysis: https://pubmed.ncbi.nlm.nih.gov/29189034/
- Harkin et al., progress-monitoring meta-analysis: https://pubmed.ncbi.nlm.nih.gov/26479070/

### Why monthly income is not collected here

**Tier:** Product/privacy architecture, not behavioral science.

Budget already has its own income workflow. Onboarding can be completed and understood without financial data, so collecting monthly income here is not necessary for onboarding. Removing it reduces cognitive/form burden and follows a data-minimization-by-design principle: determine whether a purpose can be fulfilled with less personal data before collecting more.

This is a product-design rationale, not a claim that GYLIO's legal obligations are identical in every jurisdiction.

Sources:
- W3C Forms Tutorial: only request what is required for the process: https://www.w3.org/WAI/tutorials/forms/
- EDPB Guidelines 4/2019, section 3.5 Data Minimisation: https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_201904_dataprotection_by_design_and_by_default_v2.0_en.pdf

Older onboarding fields named `monthlyBudget` or `monthlyIncome` are deliberately dropped from onboarding schema v5. Existing budget records in the Budget datastore are not changed by this migration.

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

Secondary app-header actions such as the interactive Guide, global TTS toggle, and upgrade CTA are visually suppressed while onboarding is active. This reduces competing actions; the relevant preference remains available inside onboarding and the other actions return afterward.

## Claims we intentionally do not make

- "ADHD users need large text."
- "Autistic users should use high contrast."
- "Anxiety requires a light theme."
- "OpenDyslexic improves reading for dyslexia."
- "Text-to-speech improves comprehension for every reader."
- "A starter task guarantees productivity."
- "A particular support bundle is best for a diagnosis."
- "Typing income during onboarding is necessary to use Budget."

## Review rule

Whenever onboarding copy, defaults, questions, or options change:

1. identify the factual/behavioral claim implied by the control;
2. classify its evidence strength and studied population;
3. prefer direct user preference over diagnosis inference;
4. make low-certainty supports optional and reversible;
5. do not collect data the onboarding process does not need;
6. keep study detail in this evidence ledger unless the user needs it to make the choice;
7. run EN/es-PE localization, migration, 320/390px layout, keyboard/accessibility, starter-task creation, and full-browser regression tests.
