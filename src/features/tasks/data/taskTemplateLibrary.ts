export type TaskCategory =
  | 'environment'
  | 'deepwork'
  | 'health'
  | 'relationships'
  | 'mindset'
  | 'career'
  | 'finances';

export type TaskTemplate = {
  id: string;
  category: TaskCategory;
  titleKey: string;
  whyKey: string;
  /** i18n keys for each micro-step (e.g. 'tasks.tpl.cleanSpace.step1') */
  subtaskKeys: string[];
  energyRequired: 'tiny' | 'low' | 'medium' | 'high';
  estimatedMinutes: number;
  sourceLabel: string;
};

export const CATEGORY_META: Record<
  TaskCategory,
  { emoji: string; labelKey: string; /** Index into theme.dataViz.series. */ hue: number }
> = {
  environment:   { emoji: '🏠', labelKey: 'tasks.tpl.cat.environment',   hue: 4 },
  deepwork:      { emoji: '🧠', labelKey: 'tasks.tpl.cat.deepwork',      hue: 0 },
  health:        { emoji: '💪', labelKey: 'tasks.tpl.cat.health',        hue: 3 },
  relationships: { emoji: '🤝', labelKey: 'tasks.tpl.cat.relationships', hue: 2 },
  mindset:       { emoji: '🌱', labelKey: 'tasks.tpl.cat.mindset',       hue: 1 },
  career:        { emoji: '🚀', labelKey: 'tasks.tpl.cat.career',        hue: 5 },
  finances:      { emoji: '💰', labelKey: 'tasks.tpl.cat.finances',      hue: 6 },
};

export const TASK_TEMPLATE_LIBRARY: TaskTemplate[] = [
  // ─── ENVIRONMENT ────────────────────────────────────────────────────────────
  {
    id: 'clean-immediate-space',
    category: 'environment',
    titleKey: 'tasks.tpl.cleanSpace.title',
    whyKey: 'tasks.tpl.cleanSpace.why',
    subtaskKeys: [
      'tasks.tpl.cleanSpace.step1',
      'tasks.tpl.cleanSpace.step2',
      'tasks.tpl.cleanSpace.step3',
    ],
    energyRequired: 'tiny',
    estimatedMinutes: 15,
    sourceLabel: 'Peterson · 12 Rules',
  },
  {
    id: 'digital-declutter',
    category: 'environment',
    titleKey: 'tasks.tpl.digitalDeclutter.title',
    whyKey: 'tasks.tpl.digitalDeclutter.why',
    subtaskKeys: [
      'tasks.tpl.digitalDeclutter.step1',
      'tasks.tpl.digitalDeclutter.step2',
      'tasks.tpl.digitalDeclutter.step3',
    ],
    energyRequired: 'low',
    estimatedMinutes: 20,
    sourceLabel: 'Newport · Digital Minimalism',
  },
  {
    id: 'design-environment',
    category: 'environment',
    titleKey: 'tasks.tpl.designEnv.title',
    whyKey: 'tasks.tpl.designEnv.why',
    subtaskKeys: [
      'tasks.tpl.designEnv.step1',
      'tasks.tpl.designEnv.step2',
      'tasks.tpl.designEnv.step3',
    ],
    energyRequired: 'low',
    estimatedMinutes: 30,
    sourceLabel: 'Clear · Atomic Habits',
  },

  // ─── DEEP WORK ───────────────────────────────────────────────────────────────
  {
    id: 'deep-work-block',
    category: 'deepwork',
    titleKey: 'tasks.tpl.deepWork.title',
    whyKey: 'tasks.tpl.deepWork.why',
    subtaskKeys: [
      'tasks.tpl.deepWork.step1',
      'tasks.tpl.deepWork.step2',
      'tasks.tpl.deepWork.step3',
      'tasks.tpl.deepWork.step4',
    ],
    energyRequired: 'high',
    estimatedMinutes: 90,
    sourceLabel: 'Newport · Deep Work',
  },
  {
    id: 'shutdown-ritual',
    category: 'deepwork',
    titleKey: 'tasks.tpl.shutdownRitual.title',
    whyKey: 'tasks.tpl.shutdownRitual.why',
    subtaskKeys: [
      'tasks.tpl.shutdownRitual.step1',
      'tasks.tpl.shutdownRitual.step2',
      'tasks.tpl.shutdownRitual.step3',
    ],
    energyRequired: 'tiny',
    estimatedMinutes: 10,
    sourceLabel: 'Newport · Deep Work',
  },
  {
    id: 'brain-dump',
    category: 'deepwork',
    titleKey: 'tasks.tpl.brainDump.title',
    whyKey: 'tasks.tpl.brainDump.why',
    subtaskKeys: [
      'tasks.tpl.brainDump.step1',
      'tasks.tpl.brainDump.step2',
      'tasks.tpl.brainDump.step3',
      'tasks.tpl.brainDump.step4',
    ],
    energyRequired: 'low',
    estimatedMinutes: 20,
    sourceLabel: 'Allen · GTD',
  },
  {
    id: 'weekly-review',
    category: 'deepwork',
    titleKey: 'tasks.tpl.weeklyReview.title',
    whyKey: 'tasks.tpl.weeklyReview.why',
    subtaskKeys: [
      'tasks.tpl.weeklyReview.step1',
      'tasks.tpl.weeklyReview.step2',
      'tasks.tpl.weeklyReview.step3',
      'tasks.tpl.weeklyReview.step4',
      'tasks.tpl.weeklyReview.step5',
    ],
    energyRequired: 'medium',
    estimatedMinutes: 45,
    sourceLabel: 'Allen · GTD',
  },
  {
    id: 'define-next-action',
    category: 'deepwork',
    titleKey: 'tasks.tpl.nextAction.title',
    whyKey: 'tasks.tpl.nextAction.why',
    subtaskKeys: [
      'tasks.tpl.nextAction.step1',
      'tasks.tpl.nextAction.step2',
      'tasks.tpl.nextAction.step3',
    ],
    energyRequired: 'tiny',
    estimatedMinutes: 10,
    sourceLabel: 'Allen · GTD',
  },

  // ─── HEALTH ──────────────────────────────────────────────────────────────────
  {
    id: 'morning-sunlight',
    category: 'health',
    titleKey: 'tasks.tpl.morningSunlight.title',
    whyKey: 'tasks.tpl.morningSunlight.why',
    subtaskKeys: [
      'tasks.tpl.morningSunlight.step1',
      'tasks.tpl.morningSunlight.step2',
      'tasks.tpl.morningSunlight.step3',
    ],
    energyRequired: 'tiny',
    estimatedMinutes: 15,
    sourceLabel: 'Huberman · Neuroscience',
  },
  {
    id: 'move-your-body',
    category: 'health',
    titleKey: 'tasks.tpl.moveBody.title',
    whyKey: 'tasks.tpl.moveBody.why',
    subtaskKeys: [
      'tasks.tpl.moveBody.step1',
      'tasks.tpl.moveBody.step2',
      'tasks.tpl.moveBody.step3',
    ],
    energyRequired: 'medium',
    estimatedMinutes: 30,
    sourceLabel: 'Huberman · Exercise Science',
  },
  {
    id: 'fix-sleep',
    category: 'health',
    titleKey: 'tasks.tpl.fixSleep.title',
    whyKey: 'tasks.tpl.fixSleep.why',
    subtaskKeys: [
      'tasks.tpl.fixSleep.step1',
      'tasks.tpl.fixSleep.step2',
      'tasks.tpl.fixSleep.step3',
    ],
    energyRequired: 'low',
    estimatedMinutes: 20,
    sourceLabel: 'Breus · Sleep Science',
  },
  {
    id: 'reduce-alcohol',
    category: 'health',
    titleKey: 'tasks.tpl.reduceAlcohol.title',
    whyKey: 'tasks.tpl.reduceAlcohol.why',
    subtaskKeys: [
      'tasks.tpl.reduceAlcohol.step1',
      'tasks.tpl.reduceAlcohol.step2',
      'tasks.tpl.reduceAlcohol.step3',
    ],
    energyRequired: 'medium',
    estimatedMinutes: 5,
    sourceLabel: 'Huberman · Neuroscience',
  },

  // ─── MINDSET ─────────────────────────────────────────────────────────────────
  {
    id: 'journal-one-page',
    category: 'mindset',
    titleKey: 'tasks.tpl.journal.title',
    whyKey: 'tasks.tpl.journal.why',
    subtaskKeys: [
      'tasks.tpl.journal.step1',
      'tasks.tpl.journal.step2',
    ],
    energyRequired: 'tiny',
    estimatedMinutes: 10,
    sourceLabel: 'Peterson · Self-Authoring',
  },
  {
    id: 'gratitude-practice',
    category: 'mindset',
    titleKey: 'tasks.tpl.gratitude.title',
    whyKey: 'tasks.tpl.gratitude.why',
    subtaskKeys: [
      'tasks.tpl.gratitude.step1',
      'tasks.tpl.gratitude.step2',
      'tasks.tpl.gratitude.step3',
    ],
    energyRequired: 'tiny',
    estimatedMinutes: 5,
    sourceLabel: 'Emmons · Gratitude Research',
  },
  {
    id: 'compare-past-self',
    category: 'mindset',
    titleKey: 'tasks.tpl.comparePastSelf.title',
    whyKey: 'tasks.tpl.comparePastSelf.why',
    subtaskKeys: [
      'tasks.tpl.comparePastSelf.step1',
      'tasks.tpl.comparePastSelf.step2',
      'tasks.tpl.comparePastSelf.step3',
    ],
    energyRequired: 'low',
    estimatedMinutes: 15,
    sourceLabel: 'Peterson · 12 Rules',
  },
  {
    id: 'tell-the-truth',
    category: 'mindset',
    titleKey: 'tasks.tpl.tellTruth.title',
    whyKey: 'tasks.tpl.tellTruth.why',
    subtaskKeys: [
      'tasks.tpl.tellTruth.step1',
      'tasks.tpl.tellTruth.step2',
      'tasks.tpl.tellTruth.step3',
    ],
    energyRequired: 'medium',
    estimatedMinutes: 20,
    sourceLabel: 'Peterson · 12 Rules',
  },
  {
    id: 'assume-responsibility',
    category: 'mindset',
    titleKey: 'tasks.tpl.takeResponsibility.title',
    whyKey: 'tasks.tpl.takeResponsibility.why',
    subtaskKeys: [
      'tasks.tpl.takeResponsibility.step1',
      'tasks.tpl.takeResponsibility.step2',
      'tasks.tpl.takeResponsibility.step3',
    ],
    energyRequired: 'medium',
    estimatedMinutes: 15,
    sourceLabel: 'Peterson · Beyond Order',
  },

  // ─── RELATIONSHIPS ────────────────────────────────────────────────────────────
  {
    id: 'reach-out',
    category: 'relationships',
    titleKey: 'tasks.tpl.reachOut.title',
    whyKey: 'tasks.tpl.reachOut.why',
    subtaskKeys: [
      'tasks.tpl.reachOut.step1',
      'tasks.tpl.reachOut.step2',
      'tasks.tpl.reachOut.step3',
    ],
    energyRequired: 'tiny',
    estimatedMinutes: 5,
    sourceLabel: 'Dunbar · Social Neuroscience',
  },
  {
    id: 'repair-relationship',
    category: 'relationships',
    titleKey: 'tasks.tpl.repairRelationship.title',
    whyKey: 'tasks.tpl.repairRelationship.why',
    subtaskKeys: [
      'tasks.tpl.repairRelationship.step1',
      'tasks.tpl.repairRelationship.step2',
      'tasks.tpl.repairRelationship.step3',
    ],
    energyRequired: 'high',
    estimatedMinutes: 30,
    sourceLabel: 'Gottman · Relationship Research',
  },
  {
    id: 'express-appreciation',
    category: 'relationships',
    titleKey: 'tasks.tpl.expressAppreciation.title',
    whyKey: 'tasks.tpl.expressAppreciation.why',
    subtaskKeys: [
      'tasks.tpl.expressAppreciation.step1',
      'tasks.tpl.expressAppreciation.step2',
      'tasks.tpl.expressAppreciation.step3',
    ],
    energyRequired: 'tiny',
    estimatedMinutes: 5,
    sourceLabel: 'Gottman · Positive Ratio',
  },

  // ─── CAREER ──────────────────────────────────────────────────────────────────
  {
    id: 'deliberate-practice',
    category: 'career',
    titleKey: 'tasks.tpl.deliberatePractice.title',
    whyKey: 'tasks.tpl.deliberatePractice.why',
    subtaskKeys: [
      'tasks.tpl.deliberatePractice.step1',
      'tasks.tpl.deliberatePractice.step2',
      'tasks.tpl.deliberatePractice.step3',
      'tasks.tpl.deliberatePractice.step4',
    ],
    energyRequired: 'high',
    estimatedMinutes: 60,
    sourceLabel: "Newport · So Good They Can't Ignore You",
  },
  {
    id: 'identify-mission',
    category: 'career',
    titleKey: 'tasks.tpl.identifyMission.title',
    whyKey: 'tasks.tpl.identifyMission.why',
    subtaskKeys: [
      'tasks.tpl.identifyMission.step1',
      'tasks.tpl.identifyMission.step2',
      'tasks.tpl.identifyMission.step3',
      'tasks.tpl.identifyMission.step4',
    ],
    energyRequired: 'medium',
    estimatedMinutes: 45,
    sourceLabel: 'Newport · Career Capital',
  },
  {
    id: 'say-no',
    category: 'career',
    titleKey: 'tasks.tpl.sayNo.title',
    whyKey: 'tasks.tpl.sayNo.why',
    subtaskKeys: [
      'tasks.tpl.sayNo.step1',
      'tasks.tpl.sayNo.step2',
      'tasks.tpl.sayNo.step3',
    ],
    energyRequired: 'low',
    estimatedMinutes: 10,
    sourceLabel: 'Newport · Deep Work',
  },

  // ─── FINANCES ─────────────────────────────────────────────────────────────────
  {
    id: 'list-all-debts',
    category: 'finances',
    titleKey: 'tasks.tpl.listDebts.title',
    whyKey: 'tasks.tpl.listDebts.why',
    subtaskKeys: [
      'tasks.tpl.listDebts.step1',
      'tasks.tpl.listDebts.step2',
      'tasks.tpl.listDebts.step3',
      'tasks.tpl.listDebts.step4',
    ],
    energyRequired: 'low',
    estimatedMinutes: 20,
    sourceLabel: 'Hammer · Financial Audit',
  },
  {
    id: 'emergency-fund-start',
    category: 'finances',
    titleKey: 'tasks.tpl.emergencyFund.title',
    whyKey: 'tasks.tpl.emergencyFund.why',
    subtaskKeys: [
      'tasks.tpl.emergencyFund.step1',
      'tasks.tpl.emergencyFund.step2',
      'tasks.tpl.emergencyFund.step3',
      'tasks.tpl.emergencyFund.step4',
    ],
    energyRequired: 'medium',
    estimatedMinutes: 20,
    sourceLabel: 'Hammer · Financial Audit',
  },
  {
    id: 'track-spending-one-week',
    category: 'finances',
    titleKey: 'tasks.tpl.trackSpending.title',
    whyKey: 'tasks.tpl.trackSpending.why',
    subtaskKeys: [
      'tasks.tpl.trackSpending.step1',
      'tasks.tpl.trackSpending.step2',
      'tasks.tpl.trackSpending.step3',
      'tasks.tpl.trackSpending.step4',
    ],
    energyRequired: 'low',
    estimatedMinutes: 10,
    sourceLabel: 'Hammer · Budgeting',
  },
  {
    id: 'cancel-subscriptions',
    category: 'finances',
    titleKey: 'tasks.tpl.cancelSubs.title',
    whyKey: 'tasks.tpl.cancelSubs.why',
    subtaskKeys: [
      'tasks.tpl.cancelSubs.step1',
      'tasks.tpl.cancelSubs.step2',
      'tasks.tpl.cancelSubs.step3',
      'tasks.tpl.cancelSubs.step4',
    ],
    energyRequired: 'tiny',
    estimatedMinutes: 15,
    sourceLabel: 'Hammer · Financial Audit',
  },
  {
    id: 'negotiate-one-bill',
    category: 'finances',
    titleKey: 'tasks.tpl.negotiateBill.title',
    whyKey: 'tasks.tpl.negotiateBill.why',
    subtaskKeys: [
      'tasks.tpl.negotiateBill.step1',
      'tasks.tpl.negotiateBill.step2',
      'tasks.tpl.negotiateBill.step3',
      'tasks.tpl.negotiateBill.step4',
    ],
    energyRequired: 'medium',
    estimatedMinutes: 30,
    sourceLabel: 'Hammer · Frugality',
  },
];

export const getTemplatesByCategory = (
  category: TaskCategory | null
): TaskTemplate[] => {
  if (category === null) return TASK_TEMPLATE_LIBRARY;
  return TASK_TEMPLATE_LIBRARY.filter((t) => t.category === category);
};

export const getAllTemplates = (): TaskTemplate[] => TASK_TEMPLATE_LIBRARY;
