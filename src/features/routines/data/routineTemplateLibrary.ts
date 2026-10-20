import type { DataVizHue } from '../../../core/themes';
export type RoutineCategory = 'morning' | 'evening' | 'weekly' | 'focus' | 'health';

export type RoutineTemplate = {
  id: string;
  category: RoutineCategory;
  titleKey: string;
  whyKey: string;
  /** i18n key for the anchor habit (e.g. 'routines.anchor.afterWaking'), or null */
  anchorHabitKey: string | null;
  frequency: 'DAILY' | 'WEEKLY';
  triggerTime: string | null; // e.g. "06:30" for 6:30am
  /** i18n keys for each step (e.g. 'routines.tpl.hubermanMorning.step1') */
  stepKeys: string[];
  estimatedMinutes: number;
  sourceLabel: string;
};

export const ROUTINE_CATEGORY_META: Record<
  RoutineCategory,
  { emoji: string; labelKey: string; hue: DataVizHue }
> = {
  morning: { emoji: '🌅', labelKey: 'routines.tpl.cat.morning', hue: 'amber' },
  evening: { emoji: '🌙', labelKey: 'routines.tpl.cat.evening', hue: 'indigo' },
  weekly:  { emoji: '📅', labelKey: 'routines.tpl.cat.weekly',  hue: 'green' },
  focus:   { emoji: '🧠', labelKey: 'routines.tpl.cat.focus',   hue: 'blue' },
  health:  { emoji: '💪', labelKey: 'routines.tpl.cat.health',  hue: 'pink' },
};

export const ROUTINE_TEMPLATE_LIBRARY: RoutineTemplate[] = [
  // ── MORNING ──────────────────────────────────────────────────────────────
  {
    id: 'huberman-morning',
    category: 'morning',
    titleKey: 'routines.tpl.hubermanMorning.title',
    whyKey: 'routines.tpl.hubermanMorning.why',
    anchorHabitKey: 'routines.anchor.afterWaking',
    frequency: 'DAILY',
    triggerTime: '06:30',
    estimatedMinutes: 30,
    sourceLabel: 'Huberman · Morning Protocol',
    stepKeys: [
      'routines.tpl.hubermanMorning.step1',
      'routines.tpl.hubermanMorning.step2',
      'routines.tpl.hubermanMorning.step3',
      'routines.tpl.hubermanMorning.step4',
      'routines.tpl.hubermanMorning.step5',
    ],
  },
  {
    id: 'morning-pages',
    category: 'morning',
    titleKey: 'routines.tpl.morningPages.title',
    whyKey: 'routines.tpl.morningPages.why',
    anchorHabitKey: 'routines.anchor.afterCoffee',
    frequency: 'DAILY',
    triggerTime: '07:00',
    estimatedMinutes: 20,
    sourceLabel: "Cameron · The Artist's Way",
    stepKeys: [
      'routines.tpl.morningPages.step1',
      'routines.tpl.morningPages.step2',
      'routines.tpl.morningPages.step3',
    ],
  },
  {
    id: 'deep-work-launch',
    category: 'morning',
    titleKey: 'routines.tpl.deepWorkLaunch.title',
    whyKey: 'routines.tpl.deepWorkLaunch.why',
    anchorHabitKey: 'routines.anchor.beforeEmail',
    frequency: 'DAILY',
    triggerTime: '08:00',
    estimatedMinutes: 15,
    sourceLabel: 'Newport · Deep Work',
    stepKeys: [
      'routines.tpl.deepWorkLaunch.step1',
      'routines.tpl.deepWorkLaunch.step2',
      'routines.tpl.deepWorkLaunch.step3',
      'routines.tpl.deepWorkLaunch.step4',
    ],
  },
  {
    id: 'exercise-morning',
    category: 'morning',
    titleKey: 'routines.tpl.exerciseMorning.title',
    whyKey: 'routines.tpl.exerciseMorning.why',
    anchorHabitKey: 'routines.anchor.afterWaking',
    frequency: 'DAILY',
    triggerTime: '06:00',
    estimatedMinutes: 30,
    sourceLabel: 'Huberman · Exercise Science',
    stepKeys: [
      'routines.tpl.exerciseMorning.step1',
      'routines.tpl.exerciseMorning.step2',
      'routines.tpl.exerciseMorning.step3',
      'routines.tpl.exerciseMorning.step4',
    ],
  },

  // ── EVENING ──────────────────────────────────────────────────────────────
  {
    id: 'huberman-evening',
    category: 'evening',
    titleKey: 'routines.tpl.hubermanEvening.title',
    whyKey: 'routines.tpl.hubermanEvening.why',
    anchorHabitKey: 'routines.anchor.afterSunset',
    frequency: 'DAILY',
    triggerTime: '21:00',
    estimatedMinutes: 30,
    sourceLabel: 'Huberman · Sleep Science',
    stepKeys: [
      'routines.tpl.hubermanEvening.step1',
      'routines.tpl.hubermanEvening.step2',
      'routines.tpl.hubermanEvening.step3',
      'routines.tpl.hubermanEvening.step4',
      'routines.tpl.hubermanEvening.step5',
    ],
  },
  {
    id: 'power-down-hour',
    category: 'evening',
    titleKey: 'routines.tpl.powerDownHour.title',
    whyKey: 'routines.tpl.powerDownHour.why',
    anchorHabitKey: 'routines.anchor.afterDinner',
    frequency: 'DAILY',
    triggerTime: '21:30',
    estimatedMinutes: 60,
    sourceLabel: 'Breus · Sleep Doctor',
    stepKeys: [
      'routines.tpl.powerDownHour.step1',
      'routines.tpl.powerDownHour.step2',
      'routines.tpl.powerDownHour.step3',
    ],
  },
  {
    id: 'evening-review',
    category: 'evening',
    titleKey: 'routines.tpl.eveningReview.title',
    whyKey: 'routines.tpl.eveningReview.why',
    anchorHabitKey: 'routines.anchor.beforeBed',
    frequency: 'DAILY',
    triggerTime: '22:00',
    estimatedMinutes: 10,
    sourceLabel: 'Stoic · Evening Reflection',
    stepKeys: [
      'routines.tpl.eveningReview.step1',
      'routines.tpl.eveningReview.step2',
      'routines.tpl.eveningReview.step3',
      'routines.tpl.eveningReview.step4',
    ],
  },
  {
    id: 'tomorrow-prep',
    category: 'evening',
    titleKey: 'routines.tpl.tomorrowPrep.title',
    whyKey: 'routines.tpl.tomorrowPrep.why',
    anchorHabitKey: 'routines.anchor.beforeShutdown',
    frequency: 'DAILY',
    triggerTime: '21:00',
    estimatedMinutes: 10,
    sourceLabel: 'Allen · GTD',
    stepKeys: [
      'routines.tpl.tomorrowPrep.step1',
      'routines.tpl.tomorrowPrep.step2',
      'routines.tpl.tomorrowPrep.step3',
      'routines.tpl.tomorrowPrep.step4',
    ],
  },

  // ── WEEKLY ───────────────────────────────────────────────────────────────
  {
    id: 'weekly-review-routine',
    category: 'weekly',
    titleKey: 'routines.tpl.weeklyReview.title',
    whyKey: 'routines.tpl.weeklyReview.why',
    anchorHabitKey: 'routines.anchor.sundayAfternoon',
    frequency: 'WEEKLY',
    triggerTime: null,
    estimatedMinutes: 45,
    sourceLabel: 'Allen · GTD + Newport',
    stepKeys: [
      'routines.tpl.weeklyReview.step1',
      'routines.tpl.weeklyReview.step2',
      'routines.tpl.weeklyReview.step3',
      'routines.tpl.weeklyReview.step4',
      'routines.tpl.weeklyReview.step5',
    ],
  },
  {
    id: 'health-audit',
    category: 'weekly',
    titleKey: 'routines.tpl.healthAudit.title',
    whyKey: 'routines.tpl.healthAudit.why',
    anchorHabitKey: 'routines.anchor.sundayMorning',
    frequency: 'WEEKLY',
    triggerTime: null,
    estimatedMinutes: 15,
    sourceLabel: 'Patrick · Health Optimization',
    stepKeys: [
      'routines.tpl.healthAudit.step1',
      'routines.tpl.healthAudit.step2',
      'routines.tpl.healthAudit.step3',
      'routines.tpl.healthAudit.step4',
    ],
  },

  // ── FOCUS ────────────────────────────────────────────────────────────────
  {
    id: 'pomodoro-block',
    category: 'focus',
    titleKey: 'routines.tpl.pomodoroBlock.title',
    whyKey: 'routines.tpl.pomodoroBlock.why',
    anchorHabitKey: 'routines.anchor.beforeWork',
    frequency: 'DAILY',
    triggerTime: null,
    estimatedMinutes: 55,
    sourceLabel: 'Cirillo · Pomodoro Technique',
    stepKeys: [
      'routines.tpl.pomodoroBlock.step1',
      'routines.tpl.pomodoroBlock.step2',
      'routines.tpl.pomodoroBlock.step3',
      'routines.tpl.pomodoroBlock.step4',
    ],
  },
  {
    id: 'no-phone-morning',
    category: 'focus',
    titleKey: 'routines.tpl.noPhoneMorning.title',
    whyKey: 'routines.tpl.noPhoneMorning.why',
    anchorHabitKey: 'routines.anchor.immediatelyOnWaking',
    frequency: 'DAILY',
    triggerTime: '06:00',
    estimatedMinutes: 60,
    sourceLabel: 'Newport · Digital Minimalism',
    stepKeys: [
      'routines.tpl.noPhoneMorning.step1',
      'routines.tpl.noPhoneMorning.step2',
      'routines.tpl.noPhoneMorning.step3',
    ],
  },

  // ── HEALTH ───────────────────────────────────────────────────────────────
  {
    id: 'zone-2-cardio',
    category: 'health',
    titleKey: 'routines.tpl.zone2Cardio.title',
    whyKey: 'routines.tpl.zone2Cardio.why',
    anchorHabitKey: 'routines.anchor.afterWork',
    frequency: 'WEEKLY',
    triggerTime: null,
    estimatedMinutes: 45,
    sourceLabel: 'Attia · Longevity Medicine',
    stepKeys: [
      'routines.tpl.zone2Cardio.step1',
      'routines.tpl.zone2Cardio.step2',
      'routines.tpl.zone2Cardio.step3',
    ],
  },
  {
    id: 'mobility-routine',
    category: 'health',
    titleKey: 'routines.tpl.mobility.title',
    whyKey: 'routines.tpl.mobility.why',
    anchorHabitKey: 'routines.anchor.afterMorningLight',
    frequency: 'DAILY',
    triggerTime: '07:00',
    estimatedMinutes: 10,
    sourceLabel: 'Huberman · Injury Prevention',
    stepKeys: [
      'routines.tpl.mobility.step1',
      'routines.tpl.mobility.step2',
      'routines.tpl.mobility.step3',
      'routines.tpl.mobility.step4',
      'routines.tpl.mobility.step5',
    ],
  },
];

export const getRoutinesByCategory = (
  category: RoutineCategory | null,
): RoutineTemplate[] => {
  if (category === null) return ROUTINE_TEMPLATE_LIBRARY;
  return ROUTINE_TEMPLATE_LIBRARY.filter((t) => t.category === category);
};

export const getAllRoutineTemplates = (): RoutineTemplate[] => ROUTINE_TEMPLATE_LIBRARY;
