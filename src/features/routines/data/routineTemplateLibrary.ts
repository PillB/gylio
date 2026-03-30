export type RoutineCategory = 'morning' | 'evening' | 'weekly' | 'focus' | 'health';

export type RoutineTemplate = {
  id: string;
  category: RoutineCategory;
  titleKey: string;
  whyKey: string;
  anchorHabit: string | null; // what to attach to
  frequency: 'DAILY' | 'WEEKLY';
  triggerTime: string | null; // e.g. "06:30" for 6:30am
  steps: string[]; // step labels, English
  estimatedMinutes: number;
  sourceLabel: string;
};

export const ROUTINE_CATEGORY_META: Record<
  RoutineCategory,
  { emoji: string; labelKey: string; color: string }
> = {
  morning: { emoji: '🌅', labelKey: 'routines.tpl.cat.morning', color: '#F59E0B' },
  evening: { emoji: '🌙', labelKey: 'routines.tpl.cat.evening', color: '#5B5CF6' },
  weekly:  { emoji: '📅', labelKey: 'routines.tpl.cat.weekly',  color: '#22C55E' },
  focus:   { emoji: '🧠', labelKey: 'routines.tpl.cat.focus',   color: '#3B82F6' },
  health:  { emoji: '💪', labelKey: 'routines.tpl.cat.health',  color: '#EC4899' },
};

export const ROUTINE_TEMPLATE_LIBRARY: RoutineTemplate[] = [
  // ── MORNING ──────────────────────────────────────────────────────────────
  {
    id: 'huberman-morning',
    category: 'morning',
    titleKey: 'routines.tpl.hubermanMorning.title',
    whyKey: 'routines.tpl.hubermanMorning.why',
    anchorHabit: 'After waking',
    frequency: 'DAILY',
    triggerTime: '06:30',
    estimatedMinutes: 30,
    sourceLabel: 'Huberman · Morning Protocol',
    steps: [
      'Wake at consistent time (no snooze)',
      'Go outside within 30–60 min — face the morning sky for 10–15 min',
      'Delay caffeine 90–120 min after waking',
      'Do 10 min of light movement or stretching',
      'Cold shower or face splash (30 sec) — activates alertness',
    ],
  },
  {
    id: 'morning-pages',
    category: 'morning',
    titleKey: 'routines.tpl.morningPages.title',
    whyKey: 'routines.tpl.morningPages.why',
    anchorHabit: 'After coffee',
    frequency: 'DAILY',
    triggerTime: '07:00',
    estimatedMinutes: 20,
    sourceLabel: "Cameron · The Artist's Way",
    steps: [
      'Sit with pen and paper before screens',
      'Write 3 pages longhand — stream of consciousness, no editing',
      'Do not reread until at least a week later',
    ],
  },
  {
    id: 'deep-work-launch',
    category: 'morning',
    titleKey: 'routines.tpl.deepWorkLaunch.title',
    whyKey: 'routines.tpl.deepWorkLaunch.why',
    anchorHabit: 'Before opening email',
    frequency: 'DAILY',
    triggerTime: '08:00',
    estimatedMinutes: 15,
    sourceLabel: 'Newport · Deep Work',
    steps: [
      "Write today's single most important task (MIT)",
      'Clear your desk of everything not related to that task',
      'Set a 90-min focus timer before checking messages',
      'Put phone in another room or drawer',
    ],
  },
  {
    id: 'exercise-morning',
    category: 'morning',
    titleKey: 'routines.tpl.exerciseMorning.title',
    whyKey: 'routines.tpl.exerciseMorning.why',
    anchorHabit: 'After waking',
    frequency: 'DAILY',
    triggerTime: '06:00',
    estimatedMinutes: 30,
    sourceLabel: 'Huberman · Exercise Science',
    steps: [
      'Put on workout clothes before any decision-making',
      'Do 20–30 min of cardio or resistance training',
      'Do NOT check phone until workout is complete',
      'Take protein or meal within 60 min of finishing',
    ],
  },

  // ── EVENING ──────────────────────────────────────────────────────────────
  {
    id: 'huberman-evening',
    category: 'evening',
    titleKey: 'routines.tpl.hubermanEvening.title',
    whyKey: 'routines.tpl.hubermanEvening.why',
    anchorHabit: 'After sunset',
    frequency: 'DAILY',
    triggerTime: '21:00',
    estimatedMinutes: 30,
    sourceLabel: 'Huberman · Sleep Science',
    steps: [
      'View sunset or dim lights 2+ hours before bed',
      'No bright overhead lights after 9pm — use lamps',
      'No caffeine after 2pm (if you haven\'t already)',
      'Do not eat within 2–3 hours of sleep',
      'Keep room cool: 65–68°F / 18–20°C',
    ],
  },
  {
    id: 'power-down-hour',
    category: 'evening',
    titleKey: 'routines.tpl.powerDownHour.title',
    whyKey: 'routines.tpl.powerDownHour.why',
    anchorHabit: 'After dinner',
    frequency: 'DAILY',
    triggerTime: '21:30',
    estimatedMinutes: 60,
    sourceLabel: 'Breus · Sleep Doctor',
    steps: [
      "First 20 min: finish small tasks and tomorrow's to-do list",
      'Next 20 min: hygiene (shower, brush teeth, skincare)',
      'Final 20 min: only relaxing activities — reading, light stretching, breathing',
    ],
  },
  {
    id: 'evening-review',
    category: 'evening',
    titleKey: 'routines.tpl.eveningReview.title',
    whyKey: 'routines.tpl.eveningReview.why',
    anchorHabit: 'Before getting into bed',
    frequency: 'DAILY',
    triggerTime: '22:00',
    estimatedMinutes: 10,
    sourceLabel: 'Stoic · Evening Reflection',
    steps: [
      'Write: What did I do well today?',
      'Write: What could I have done better?',
      'Write: What am I grateful for today?',
      'Close your notebook — do not review screens after this',
    ],
  },
  {
    id: 'tomorrow-prep',
    category: 'evening',
    titleKey: 'routines.tpl.tomorrowPrep.title',
    whyKey: 'routines.tpl.tomorrowPrep.why',
    anchorHabit: 'Before shutdown ritual',
    frequency: 'DAILY',
    triggerTime: '21:00',
    estimatedMinutes: 10,
    sourceLabel: 'Allen · GTD',
    steps: [
      "Write tomorrow's top 3 priorities",
      "Set out anything you'll need (gym bag, work items, etc)",
      "Pre-decide tomorrow's wake time",
      'Close all browser tabs and apps',
    ],
  },

  // ── WEEKLY ───────────────────────────────────────────────────────────────
  {
    id: 'weekly-review-routine',
    category: 'weekly',
    titleKey: 'routines.tpl.weeklyReview.title',
    whyKey: 'routines.tpl.weeklyReview.why',
    anchorHabit: 'Sunday afternoon',
    frequency: 'WEEKLY',
    triggerTime: null,
    estimatedMinutes: 45,
    sourceLabel: 'Allen · GTD + Newport',
    steps: [
      'Clear all inboxes (email, messages, notes)',
      "Review last week: what got done, what didn't, what blocked you",
      'Set 3 intentions for the coming week',
      'Schedule any important tasks as calendar blocks',
      'Review your finances — check spending vs budget',
    ],
  },
  {
    id: 'health-audit',
    category: 'weekly',
    titleKey: 'routines.tpl.healthAudit.title',
    whyKey: 'routines.tpl.healthAudit.why',
    anchorHabit: 'Sunday morning',
    frequency: 'WEEKLY',
    triggerTime: null,
    estimatedMinutes: 15,
    sourceLabel: 'Patrick · Health Optimization',
    steps: [
      'Note sleep quality this week (1–5 scale)',
      'Note exercise days this week',
      'Note how many days you ate vegetables',
      'Identify the #1 health habit to improve next week',
    ],
  },

  // ── FOCUS ────────────────────────────────────────────────────────────────
  {
    id: 'pomodoro-block',
    category: 'focus',
    titleKey: 'routines.tpl.pomodoroBlock.title',
    whyKey: 'routines.tpl.pomodoroBlock.why',
    anchorHabit: 'Before starting work',
    frequency: 'DAILY',
    triggerTime: null,
    estimatedMinutes: 55,
    sourceLabel: 'Cirillo · Pomodoro Technique',
    steps: [
      'Choose one task and write it down',
      'Set 25-min timer — work on nothing else',
      'Take 5-min break (stand up, walk)',
      'Repeat 4 times then take a 20–30 min break',
    ],
  },
  {
    id: 'no-phone-morning',
    category: 'focus',
    titleKey: 'routines.tpl.noPhoneMorning.title',
    whyKey: 'routines.tpl.noPhoneMorning.why',
    anchorHabit: 'Immediately on waking',
    frequency: 'DAILY',
    triggerTime: '06:00',
    estimatedMinutes: 60,
    sourceLabel: 'Newport · Digital Minimalism',
    steps: [
      'Do not check your phone for the first 60 minutes after waking',
      'Do your morning routine first (light, movement, breakfast)',
      'After 60 min, check messages for a defined 10-min window only',
    ],
  },

  // ── HEALTH ───────────────────────────────────────────────────────────────
  {
    id: 'zone-2-cardio',
    category: 'health',
    titleKey: 'routines.tpl.zone2Cardio.title',
    whyKey: 'routines.tpl.zone2Cardio.why',
    anchorHabit: 'After work',
    frequency: 'WEEKLY',
    triggerTime: null,
    estimatedMinutes: 45,
    sourceLabel: 'Attia · Longevity Medicine',
    steps: [
      "Do 30–45 minutes of cardio at a 'conversational' pace — you could speak in sentences",
      'Keep heart rate around 60–70% of your max (roughly 180 minus your age)',
      'Aim for 3–4 sessions per week — this is the minimum effective dose for longevity',
    ],
  },
  {
    id: 'mobility-routine',
    category: 'health',
    titleKey: 'routines.tpl.mobility.title',
    whyKey: 'routines.tpl.mobility.why',
    anchorHabit: 'After morning light',
    frequency: 'DAILY',
    triggerTime: '07:00',
    estimatedMinutes: 10,
    sourceLabel: 'Huberman · Injury Prevention',
    steps: [
      'Neck rolls: 5 slow circles each direction',
      'Hip circles: 10 each direction',
      'Cat-cow spinal stretch: 10 reps',
      'Reach toward toes: hold 30 seconds',
      'Arm across chest: 30 seconds each side',
    ],
  },
];

export const getRoutinesByCategory = (
  category: RoutineCategory | null,
): RoutineTemplate[] => {
  if (!category) return ROUTINE_TEMPLATE_LIBRARY;
  return ROUTINE_TEMPLATE_LIBRARY.filter((t) => t.category === category);
};

export const getAllRoutineTemplates = (): RoutineTemplate[] =>
  ROUTINE_TEMPLATE_LIBRARY;
