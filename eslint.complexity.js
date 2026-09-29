// Cyclomatic complexity ceiling (ESLint core `complexity` rule).
// 10 is McCabe's original recommendation and the NIST SP 500-235 default.
export const COMPLEXITY_CEILING = 10;

// Files that already had functions above the ceiling when the rule landed,
// capped at their worst function's score so the debt can only shrink.
// When you simplify one: lower its cap to the new worst score, or delete the
// entry once everything in it is at or under the ceiling. Never raise a cap.
// src/test/complexityBaseline.test.ts fails if a cap is looser than needed.
export const COMPLEXITY_BASELINE = {
  'src/App.jsx': 23,
  'src/components/GuidedTourOverlay.tsx': 43,
  'src/components/RewardsView.jsx': 51,
  'src/components/SettingsView.jsx': 39,
  'src/components/atoms/DateTimeWidget.tsx': 14,
  'src/core/hooks/useDB.ts': 11,
  'src/core/hooks/useRewards.ts': 17,
  'src/features/budget/components/DataFreshnessBanner.jsx': 23,
  'src/features/budget/components/FinancialDiagnostic.tsx': 33,
  'src/features/budget/components/ReconciliationChecklist.jsx': 46,
  'src/features/budget/components/SpendingChart.tsx': 11,
  'src/features/budget/utils/debtPayoff.ts': 11,
  'src/features/calendar/utils/scheduleSuggestions.ts': 13,
  'src/features/dashboard/DailyCommandCenter.tsx': 27,
  'src/features/recurring/RecurringReliabilityPanel.tsx': 12,
  'src/features/recurring/useRecurringReliability.ts': 12,
  'src/features/routines/components/RoutinesView.tsx': 14,
  'src/features/social/components/SocialPlansView.tsx': 14,
  'src/features/social/components/TemplateGallery.tsx': 12,
  'src/features/subscription/PricingPage.tsx': 22,
  'src/features/tasks/components/PomodoroTimer.tsx': 15,
  'src/features/tasks/components/TaskTimerInline.tsx': 13,
  'src/hooks/useOnboardingFlow.jsx': 11,
  'src/onboarding/steps/AccessibilityPrefs.jsx': 11,
  'src/shims/expo-sqlite.ts': 29,
};
