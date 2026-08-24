# GYLIO onboarding evidence ledger

Validated: 2026-08-23

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

Larger text can improve readability for people with low vision and some cognitive disabilities. The user, not GYLIO, chooses it.

Sources:
- W3C, G178 controls for changing text size: https://www.w3.org/WAI/WCAG22/Techniques/general/G178
- W3C, Customizable Text: https://www.w3.org/WAI/perspective-videos/customizable/

### More spacing

**Tier:** Moderate/directional.

Text customization including spacing can help some readers, and WCAG's visual-presentation guidance includes line and paragraph spacing. Individual response varies, so GYLIO presents this as a reversible preference rather than a dyslexia treatment.

Sources:
- W3C, Customizable Text: https://www.w3.org/WAI/perspective-videos/customizable/
- W3C, Understanding SC 1.4.8 Visual Presentation: https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html

### Why GYLIO no longer recommends OpenDyslexic automatically

**Tier:** Mixed/negative aggregate evidence.

A 2026 meta-analysis of 15 studies (91 effect sizes; N=688) found no consistent improvement in reading speed or accuracy from dyslexia-specific fonts versus standard fonts (overall g=-0.04, 95% CI -0.15 to 0.07). An earlier controlled study also found no group improvement from OpenDyslexic. Specialized fonts therefore should not be presented as a default treatment for dyslexia.

Sources:
- Azzarello et al. (2026), *Annals of Dyslexia*, DOI 10.1007/s11881-026-00389-8: https://pubmed.ncbi.nlm.nih.gov/42536336/
- Wery & Diliberto (2017), OpenDyslexic reading rate/accuracy study: https://pubmed.ncbi.nlm.nih.gov/26993270/

Legacy saved font preferences remain readable for backwards compatibility, but new onboarding does not recommend the old diagnosis-specific option.

### Follow device motion setting — default

**Tier:** Strong/standards-backed.

W3C documents `prefers-reduced-motion` specifically so sites can respect an operating-system preference. Motion can cause distraction or nausea for some users, including people with vestibular disorders. GYLIO therefore defaults to following the device and lets the user override it.

Sources:
- W3C WCAG 2.2 Technique C39, updated 2026-01-12: https://www.w3.org/WAI/WCAG22/Techniques/css/C39
- W3C, Let Users Control When Content Moves or Changes: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o8p01-motion/

### High contrast

**Tier:** Strong as an available user preference; not a universal default.

High contrast is important for many users with low vision, but sensory preferences vary. Participatory research with autistic users also found divergent palette preferences, including need for both lower-contrast and high-contrast choices. GYLIO offers high contrast without assuming who needs it.

Sources:
- W3C personalization guidance: https://www.w3.org/WAI/WCAG2/supplemental/patterns/o8p04-interface/
- Raymaker et al. AASPIRE web accessibility guidelines: https://pmc.ncbi.nlm.nih.gov/articles/PMC6485264/

### Read text aloud

**Tier:** Moderate/directional assistive support.

W3C cognitive-accessibility guidance explicitly includes text-to-speech as a personalization/assistive option. Individual benefit varies, so GYLIO keeps this off by default and user-controlled.

Source:
- W3C, Support Adaptation and Personalization: https://www.w3.org/WAI/WCAG2/supplemental/objectives/o8-personalization/

## Screen 2 — Optional starter support profiles

**Tier:** Moderate/directional by construction.

Profiles are convenience bundles of the low-risk preferences above. They are named by the interface experience they create, not by a medical diagnosis:

- **Focus-friendly:** larger text + reduced motion + non-essential animations off.
- **Quiet motion:** standard text + reduced motion + non-essential animations off.
- **Reading support:** larger text + read-aloud + device motion preference.
- **High visibility:** larger text + high-contrast theme + device motion preference.

The profiles are deliberately labelled an **optional experiment**. Research supports personalization, predictability, reduced clutter/motion, alternative themes, text resizing and TTS as useful accommodations for subsets of users, but does not support inferring one bundle from a diagnosis.

Sources:
- W3C WAI-Adapt overview: https://www.w3.org/WAI/adapt/
- W3C predictable interfaces: https://www.w3.org/WAI/WCAG22/Understanding/predictable.html
- Raymaker et al., participatory autistic web-accessibility research: https://pmc.ncbi.nlm.nih.gov/articles/PMC6485264/

## Screen 3 — Start with something useful

### First task (optional)

**Tier:** Moderate-to-strong directional support.

Goal intentions alone do not reliably produce action. Implementation-intention research supports specifying when/where/how action will occur, and behavioral-activation literature supports activity scheduling and graded tasks. GYLIO's onboarding uses a much lighter intervention: optionally create one concrete next task. It does **not** claim that typing a task guarantees completion.

Sources:
- Gollwitzer/implementation-intention review summarizing 94 studies and d≈0.65: https://pmc.ncbi.nlm.nih.gov/articles/PMC4500900/
- Toli et al. meta-analysis in clinical/analogue samples: https://pubmed.ncbi.nlm.nih.gov/25965276/
- Cuijpers et al. 2026 behavioral activation systematic review/meta-analysis: https://pubmed.ncbi.nlm.nih.gov/42492146/

### Monthly take-home income (optional)

**Tier:** Product setup, not a behavioral-science intervention.

The field exists only to create the first Budget month with an income record. It must not be described as a psychological intervention. It is optional, and GYLIO does not infer spending categories from the amount.

## Screen 4 — Orientation

**Tier:** Standards/usability-backed.

A short predictable map reduces the amount users need to remember during first use. W3C cognitive guidance recommends clear labels, predictable interfaces, and signposts.

Sources:
- W3C, Help Users Understand What Things Are and How to Use Them: https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-understandable/
- W3C, Understanding Guideline 3.2 Predictable: https://www.w3.org/WAI/WCAG22/Understanding/predictable.html

### Why onboarding no longer asks for a generic reminder preference

Reminder interventions can be effective in specific contexts (for example appointment adherence), but the previous onboarding checkbox was not wired to a functioning reminder system. Collecting a preference that the product does not honor is misleading. Reminder preferences should return only when a concrete reminder feature can explain timing, channel, permission and opt-out behavior.

Context source:
- Systematic review/meta-analysis of digital appointment reminders: https://pmc.ncbi.nlm.nih.gov/articles/PMC5093388/

## Claims we intentionally do not make

- "ADHD users need large text."
- "Autistic users should use high contrast."
- "Anxiety requires a light theme."
- "OpenDyslexic improves reading for dyslexia."
- "One starter task will make you productive."
- "These profiles diagnose or treat any condition."

## Review rule

When onboarding copy or options change, review this ledger and classify the new claim. If a setting is only directionally supported, use language such as **may help**, **some people prefer**, **useful to try**, or **optional experiment**. Do not silently upgrade directional evidence into certainty.
