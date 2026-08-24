# GYLIO onboarding evidence ledger

Validated: 2026-08-24

## Product rule

GYLIO does not require every supportive UI idea to have definitive clinical proof. The bar depends on risk and how strongly the product frames the claim.

| Evidence tier | Product use |
| --- | --- |
| Strong / standards-backed | May inform a safe default or clear recommendation. |
| Moderate / directionally supported | May be offered as an optional, reversible starter setting or profile. |
| Mixed / heterogeneous | May be offered only as a user-controlled experiment with uncertainty stated. |
| Unsupported, harmful, or not implemented | Do not collect, prescribe, or claim it works. |

All onboarding choices must also be low-risk, reversible, explain what they change, and remain editable later. A diagnosis alone must not silently determine a user's interface.

## Screen 1 — Interface preferences

### Standard readable text — default

**Tier:** Strong/standards-backed default.

A clear default plus user-controlled resizing is consistent with WCAG and W3C cognitive-accessibility guidance. WCAG 2.2 SC 1.4.4 requires text to remain usable when enlarged up to 200%. W3C cognitive guidance recommends allowing presentation preferences such as font style and size.

Sources:
- W3C, Understanding SC 1.4.4 Resize Text: https://www.w3.org/WAI/WCAG22/Understanding/resize-text
- W3C, Support a Personalized and Familiar Interface: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o8p04-interface/

### Larger text

**Tier:** Strong direction for user choice; not a diagnosis-specific recommendation.

Larger text can improve readability for people with low vision and can be a useful preference for other readers. The user, not GYLIO, chooses it.

Sources:
- W3C, G178 controls for changing text size: https://www.w3.org/WAI/WCAG22/Techniques/general/G178
- W3C, Customizable Text: https://www.w3.org/WAI/perspective-videos/customizable/

### More spacing

**Tier:** Moderate/directional.

WCAG 2.2 SC 1.4.12 requires content to tolerate user-defined spacing without loss of content or functionality; it does **not** require authors to force those spacing values on everyone. W3C also notes that different spacing can benefit some people. GYLIO therefore offers a reversible spacing preference and tests narrow layouts, rather than presenting spacing as a treatment.

Sources:
- W3C, Understanding SC 1.4.12 Text Spacing: https://www.w3.org/WAI/WCAG22/Understanding/text-spacing
- W3C, C36 Allowing for text spacing override: https://www.w3.org/WAI/WCAG22/Techniques/css/C36

### Why GYLIO no longer recommends a dyslexia-specific font automatically

**Tier:** Mixed/negative aggregate evidence.

A 2026 meta-analysis of 15 studies (91 effect sizes; N=688) found no consistent improvement in reading speed or accuracy from dyslexia-specific fonts versus standard fonts (overall g=-0.04, 95% CI -0.15 to 0.07). An earlier controlled study also found no group improvement from OpenDyslexic. Specialized fonts therefore should not be presented as a default treatment for dyslexia.

Sources:
- Azzarello et al. (2026), *Annals of Dyslexia*, DOI 10.1007/s11881-026-00389-8: https://pubmed.ncbi.nlm.nih.gov/42536336/
- Wery & Diliberto (2017), OpenDyslexic reading rate/accuracy study: https://pubmed.ncbi.nlm.nih.gov/26993270/

New onboarding and Settings do not advertise a diagnosis-specific font choice. Older onboarding state is normalized to the neutral standard reading style when it is migrated.

### Follow device motion setting — default

**Tier:** Strong/standards-backed.

W3C documents `prefers-reduced-motion` specifically so sites can respect an operating-system preference. Motion can cause distraction or nausea for some users, including people with vestibular disorders. GYLIO therefore defaults to following the device and lets the user override it.

Sources:
- W3C WCAG 2.2 Technique C39: https://www.w3.org/WAI/WCAG22/Techniques/css/C39
- W3C, Let Users Control When Content Moves or Changes: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o8p01-motion/

### Higher contrast

**Tier:** Strong as an available user preference; not a universal default.

WCAG sets minimum contrast requirements for authored text, while W3C personalization guidance supports letting users choose presentation preferences such as contrast. GYLIO offers a stronger-contrast theme without assuming who needs it.

Sources:
- W3C, Understanding SC 1.4.3 Contrast (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum
- W3C, Support a Personalized and Familiar Interface: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o8p04-interface/

### Read text aloud

**Tier:** Moderate/directional assistive support.

W3C cognitive-accessibility guidance explicitly includes text-to-speech as a personalization/assistive option. Individual benefit varies, so GYLIO keeps this off by default and user-controlled.

Source:
- W3C, Support Adaptation and Personalization: https://www.w3.org/WAI/WCAG2/supplemental/objectives/o8-personalization/

## Screen 2 — Optional starter support profiles

**Tier:** Moderate/directional by construction.

Profiles are convenience bundles of the low-risk preferences above. They are named by the interface experience they create, not by a medical diagnosis:

- **Focus-friendly:** more text spacing + reduced motion + non-essential animations off.
- **Quiet motion:** standard text + reduced motion + non-essential animations off.
- **Reading support:** larger text + read-aloud + device motion preference.
- **High visibility:** larger text + high-contrast theme + device motion preference.

The profiles are deliberately labelled an **optional experiment**. W3C supports personalization, short critical paths, reduced interruptions/motion, text adaptation and TTS as useful accommodations, but the evidence does not justify inferring a single bundle from a diagnosis. Individual preferences can differ substantially.

Sources:
- W3C WAI-Adapt overview: https://www.w3.org/WAI/adapt/
- W3C, Help Users Focus: https://www.w3.org/WAI/WCAG2/supplemental/objectives/o5-user-focus/
- W3C, Limit Interruptions: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o5p01-minimal-interruptions/
- W3C, Support a Personalized and Familiar Interface: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o8p04-interface/

## Screen 3 — Start with something useful

### First task (optional)

**Tier:** Moderate directional support.

Goal setting has a small positive average effect across randomized behavior-change studies, while effects vary by context. Progress-monitoring interventions also improve goal attainment on average. GYLIO uses a much lighter product setup: optionally create one concrete next task. It does **not** claim that typing a task guarantees completion.

Sources:
- Epton et al., goal-setting systematic review/meta-analysis (141 papers; 384 effect sizes; N=16,523; d=0.34): https://pubmed.ncbi.nlm.nih.gov/29189034/
- Harkin et al., experimental progress-monitoring meta-analysis (138 studies; N=19,951; goal attainment d=0.40): https://pubmed.ncbi.nlm.nih.gov/26479070/

### Monthly take-home income (optional)

**Tier:** Product setup, not a behavioral-science intervention.

The field exists only to create the first Budget month with an income record. It must not be described as a psychological intervention. It is optional, and GYLIO does not infer spending categories from the amount.

An older field called `monthlyBudget` is **not** migrated into this field because its meaning was different; silently reinterpreting it as take-home income would change the semantics of stored user data.

## Screen 4 — Orientation

**Tier:** Standards/usability-backed.

A short predictable map reduces the amount users need to remember during first use. W3C cognitive guidance recommends clear labels, predictable interfaces, visible signposts, and short critical paths. No checkbox is required to prove that the user read or memorized the map.

Sources:
- W3C, Help Users Understand What Things Are and How to Use Them: https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-understandable/
- W3C, Make Short Critical Paths: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o5p02-short-paths/

### Why onboarding no longer asks for a generic reminder preference

Reminder interventions can be useful in specific contexts, but W3C says reminders should be created only at the user's request and the method should be personalized. The previous onboarding checkbox was not wired to a functioning reminder system. Collecting a preference that the product does not honor is misleading. Reminder preferences should return only when a concrete reminder feature can explain timing, channel, permission and opt-out behavior.

Sources:
- W3C, Provide Reminders: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o7p07-reminders/
- W3C, Limit Interruptions: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o5p01-minimal-interruptions/

## Form and choice-architecture rules applied across onboarding

- Keep the critical path short; optional starter data must not block completion.
- Label optional fields visibly, not only in placeholder text.
- Keep controls reversible and available again in Settings.
- Use clear labels describing the interface effect.
- Do not collect health/diagnosis information merely to choose UI preferences.
- Do not collect a preference for a feature the product cannot honor.

Sources:
- W3C Forms Tutorial (updated 2026-03-27): https://www.w3.org/WAI/tutorials/forms/
- W3C Form Instructions: https://www.w3.org/WAI/tutorials/forms/instructions/
- W3C, Use Clear Visible Labels: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p06-clear-labels/
- W3C, Use Clear Step-by-step Instructions: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p07-step-instructions/

## Claims we intentionally do not make

- "ADHD users need large text."
- "Autistic users should use high contrast."
- "Anxiety requires a light theme."
- "OpenDyslexic improves reading for dyslexia."
- "One starter task will make you productive."
- "These profiles diagnose or treat any condition."

## Review rule

When onboarding copy or options change, review this ledger and classify the new claim. If a setting is only directionally supported, use language such as **may help**, **some people prefer**, **useful to try**, or **optional experiment**. Do not silently upgrade directional evidence into certainty.
