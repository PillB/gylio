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
  subtasks: string[];
  energyRequired: 'tiny' | 'low' | 'medium' | 'high';
  estimatedMinutes: number;
  sourceLabel: string;
};

export const CATEGORY_META: Record<
  TaskCategory,
  { emoji: string; labelKey: string; color: string }
> = {
  environment:   { emoji: '🏠', labelKey: 'tasks.tpl.cat.environment',   color: '#22C55E' },
  deepwork:      { emoji: '🧠', labelKey: 'tasks.tpl.cat.deepwork',      color: '#5B5CF6' },
  health:        { emoji: '💪', labelKey: 'tasks.tpl.cat.health',        color: '#F59E0B' },
  relationships: { emoji: '🤝', labelKey: 'tasks.tpl.cat.relationships', color: '#EC4899' },
  mindset:       { emoji: '🌱', labelKey: 'tasks.tpl.cat.mindset',       color: '#14B8A6' },
  career:        { emoji: '🚀', labelKey: 'tasks.tpl.cat.career',        color: '#3B82F6' },
  finances:      { emoji: '💰', labelKey: 'tasks.tpl.cat.finances',      color: '#F97316' },
};

export const TASK_TEMPLATE_LIBRARY: TaskTemplate[] = [
  // ─── ENVIRONMENT ────────────────────────────────────────────────────────────
  {
    id: 'clean-immediate-space',
    category: 'environment',
    titleKey: 'tasks.tpl.cleanSpace.title',
    whyKey: 'tasks.tpl.cleanSpace.why',
    subtasks: [
      "Clear the surface you work at",
      "Remove trash or clutter from the room",
      "Put one thing away that's been out of place",
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
    subtasks: [
      "Delete apps you haven't opened in 30 days",
      "Unsubscribe from 5 email lists",
      "Clear your phone's home screen to only essentials",
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
    subtasks: [
      "Identify one bad habit and remove its cue from your space",
      "Make one good habit easier (place the item in plain sight)",
      "Set up your work area before you finish today",
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
    subtasks: [
      "Choose ONE important task — the one you've been avoiding",
      "Set a 90-minute timer with all notifications off",
      "Write down your goal for this block before starting",
      "Review what you produced at the end",
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
    subtasks: [
      "Scan your task list — capture anything uncaptured",
      "Write tomorrow's top 3 priorities",
      "Say out loud: 'Shutdown complete'",
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
    subtasks: [
      "Set a timer for 15 minutes",
      "Write every open loop, worry, or to-do in your head — no filtering",
      "Review the list and mark which items actually need action",
      "Pick the single most important one and schedule it",
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
    subtasks: [
      "Clear your inbox and capture any new commitments",
      "Review your projects list — is anything stuck?",
      "Check what you accomplished this week",
      "Set 3 intentions for next week",
      "Schedule next week's review",
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
    subtasks: [
      "Pick your most stuck or procrastinated project",
      "Ask: what is the very next physical action required?",
      "Add that specific action to your task list and schedule it",
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
    subtasks: [
      "Go outside within 30–60 minutes of waking",
      "Stay outside for 10–15 minutes without sunglasses",
      "Walk or stand — movement helps absorption",
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
    subtasks: [
      "Pick one form of movement (walk, run, lift, swim)",
      "Set a minimum: 20–30 minutes",
      "Do it before checking news or social media if possible",
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
    subtasks: [
      "Choose a consistent wake time and stick to it for 2 weeks",
      "Set an alarm to start winding down 1 hour before bed",
      "Remove your phone from the bedroom or put it across the room",
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
    subtasks: [
      "Identify which days/situations you drink most",
      "Set a specific rule (e.g., only weekends, only 1 drink)",
      "Replace the ritual with a non-alcoholic alternative for one week",
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
    subtasks: [
      "Write one page — stream of consciousness, no editing",
      "End with: what is one thing I could do differently tomorrow?",
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
    subtasks: [
      "Write 3 specific things you're grateful for (not generic)",
      "For each one, write WHY you're grateful for it",
      "Text one of them to the person involved if applicable",
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
    subtasks: [
      "Write 3 ways you've improved in the past 6 months",
      "Identify one area where you're still struggling",
      "Set one small, specific improvement goal for this week only",
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
    subtasks: [
      "Identify one thing you've been avoiding saying or doing",
      "Write what is actually true about your situation",
      "Decide on one honest action you can take this week",
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
    subtasks: [
      "Name one problem in your life you've been blaming on others or circumstances",
      "Write what part of this is actually within your control",
      "Choose one action to take that is fully in your power",
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
    subtasks: [
      "Think of one person you haven't spoken to in over 2 weeks",
      "Send a genuine, non-generic message (not just 'hey')",
      "Ask one real question about their life",
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
    subtasks: [
      "Identify the relationship you've been avoiding or neglecting",
      "Write what you'd want to say — unsent letter first",
      "Reach out and say one true thing without defensiveness",
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
    subtasks: [
      "Name one person who deserves acknowledgment today",
      "Tell them something specific (not general) that you appreciate",
      "Do it in person or voice — not text if possible",
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
    subtasks: [
      "Identify the single most valuable skill in your field",
      "Find the edge of your current ability in that skill",
      "Practice just beyond your comfort zone for 45–60 minutes",
      "Review what was hard and what improved",
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
    subtasks: [
      "Write what you're genuinely good at (skills others pay for)",
      "Write what problems in the world you care about",
      "Find one intersection between those two lists",
      "Research one person doing work at that intersection",
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
    subtasks: [
      "List your current commitments — every yes you've given",
      "Identify one that is not aligned with your priorities",
      "Decline or exit it with a clear, honest response",
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
    subtasks: [
      "Open every account statement you've been avoiding",
      "Write each debt: creditor, balance, interest rate, minimum payment",
      "Sort by interest rate (highest first = avalanche method)",
      "Total the debt — write down the actual number",
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
    subtasks: [
      "Calculate your monthly essential expenses (rent + food + bills)",
      "Identify how much you currently have in savings",
      "Set up a separate high-yield savings account if you haven't",
      "Automate a fixed amount to transfer on payday — even $50 counts",
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
    subtasks: [
      "Open your bank/card statements for the last 7 days",
      "Categorize every transaction: need, want, or save",
      "Add up each category total",
      "Find the one 'want' category that surprised you most",
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
    subtasks: [
      "Search your email for 'subscription', 'renewal', 'receipt'",
      "List every recurring charge",
      "Cancel any you haven't used in 30+ days",
      "Calculate your monthly savings",
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
    subtasks: [
      "Choose one recurring bill (internet, phone, insurance)",
      "Research what competitors charge for the same service",
      "Call and say you're considering switching — ask for a better rate",
      "Document the outcome and time saved vs money saved",
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
