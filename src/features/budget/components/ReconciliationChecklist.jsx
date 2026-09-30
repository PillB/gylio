import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../core/context/ThemeContext';
import { track, Events } from '../../../core/analytics';

const CHECKLIST_ITEMS = [
  {
    id: 'income',
    labelKey: 'budget.freshness.reconcile.income',
    labelFallback: 'Income recorded',
  },
  {
    id: 'expenses',
    labelKey: 'budget.freshness.reconcile.expenses',
    labelFallback: 'All expenses entered',
  },
  {
    id: 'balances',
    labelKey: 'budget.freshness.reconcile.balances',
    labelFallback: 'Balances match',
  },
];

function getStorageKey(budgetMonthKey) {
  return `gylio_reconcile_${budgetMonthKey}`;
}

function loadCheckedState(budgetMonthKey) {
  try {
    const raw = localStorage.getItem(getStorageKey(budgetMonthKey));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveCheckedState(budgetMonthKey, state) {
  try {
    localStorage.setItem(getStorageKey(budgetMonthKey), JSON.stringify(state));
  } catch {
    // localStorage unavailable — silently degrade
  }
}

export default function ReconciliationChecklist({ budgetMonthKey }) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [checked, setChecked] = useState(() => loadCheckedState(budgetMonthKey));

  // Re-load when month key changes (e.g. navigating months)
  useEffect(() => {
    setChecked(loadCheckedState(budgetMonthKey));
  }, [budgetMonthKey]);

  // Persist whenever checked state changes
  useEffect(() => {
    saveCheckedState(budgetMonthKey, checked);
  }, [checked, budgetMonthKey]);

  const allChecked = useMemo(
    () => CHECKLIST_ITEMS.every((item) => checked[item.id] === true),
    [checked],
  );

  // Track "all confirmed" — fire exactly once per transition to allChecked=true
  const prevAllChecked = useRef(false);
  useEffect(() => {
    if (allChecked && !prevAllChecked.current) {
      track(Events.BUDGET_RECONCILIATION_CONFIRMED, { budgetMonthKey });
    }
    prevAllChecked.current = allChecked;
  }, [allChecked, budgetMonthKey]);

  const handleToggle = useCallback((id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleKeyToggle = useCallback(
    (e, id) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle(id);
      }
    },
    [handleToggle],
  );

  const completedCount = CHECKLIST_ITEMS.filter((item) => checked[item.id]).length;
  const colors = theme.colors ?? {};
  const spacing = theme.spacing ?? {};

  const borderColor = allChecked
    ? colors.successStrong
    : colors.border;

  const headerBg = allChecked
    ? colors.successSoft
    : colors.surface;

  return (
    <section
      aria-label={t(
        'budget.freshness.reconcile.sectionLabel',
        'Reconciliation checklist',
      )}
      style={{
        border: `1px solid ${borderColor}`,
        borderRadius: theme.shape.radiusSm,
        marginBottom: spacing.md,
        overflow: 'hidden',
        transition: 'border-color 0.2s ease',
      }}
    >
      {/* ── Collapsible header ────────────────────────────────── */}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="reconciliation-panel"
        onClick={() => setIsOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacing.md}px ${spacing.md}px`,
          background: headerBg,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: spacing.sm,
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}
        >
          <span aria-hidden="true" style={{ fontSize: 16 }}>
            {allChecked ? '✅' : '📋'}
          </span>
          <span
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: allChecked
                ? colors.successStrong
                : colors.text,
            }}
          >
            {t(
              'budget.freshness.reconcile.title',
              'Reconciliation Checklist',
            )}
          </span>
        </div>

        <div
          style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}
        >
          {/* Progress badge */}
          <span
            aria-label={t(
              'budget.freshness.reconcile.progressLabel',
              '{{completed}} of {{total}} completed',
              {
                completed: completedCount,
                total: CHECKLIST_ITEMS.length,
              },
            )}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: allChecked
                ? colors.successStrong
                : colors.muted,
              background: allChecked
                ? colors.successSoft
                : colors.surfaceElevated,
              padding: '2px 8px',
              borderRadius: 99,
              minWidth: 36,
              textAlign: 'center',
            }}
          >
            {completedCount}/{CHECKLIST_ITEMS.length}
          </span>

          {/* Chevron */}
          <span
            aria-hidden="true"
            style={{
              fontSize: 12,
              color: colors.muted,
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'inline-block',
            }}
          >
            ▼
          </span>
        </div>
      </button>

      {/* ── Panel body ───────────────────────────────────────── */}
      <div
        id="reconciliation-panel"
        role="region"
        aria-label={t(
          'budget.freshness.reconcile.sectionLabel',
          'Reconciliation checklist',
        )}
        hidden={!isOpen}
        style={{
          padding: isOpen
            ? `${spacing.md}px ${spacing.md}px`
            : 0,
          background: colors.background,
          display: isOpen ? 'block' : 'none',
        }}
      >
        <p
          style={{
            margin: `0 0 ${spacing.md}px`,
            fontSize: 13,
            color: colors.muted,
          }}
        >
          {t(
            'budget.freshness.reconcile.description',
            "Confirm each item to mark this month's budget as reconciled.",
          )}
        </p>

        <ul
          role="list"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.sm,
          }}
        >
          {CHECKLIST_ITEMS.map((item) => {
            const isChecked = !!checked[item.id];
            const checkboxId = `reconcile-${item.id}-${budgetMonthKey}`;

            return (
              <li key={item.id}>
                <label
                  htmlFor={checkboxId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    cursor: 'pointer',
                    padding: `${spacing.sm}px`,
                    borderRadius: theme.shape.radiusSm,
                    background: isChecked
                      ? colors.successSoft
                      : 'transparent',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    id={checkboxId}
                    checked={isChecked}
                    onChange={() => handleToggle(item.id)}
                    onKeyDown={(e) => handleKeyToggle(e, item.id)}
                    aria-checked={isChecked}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: colors.success,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 14,
                      color: isChecked
                        ? colors.successStrong
                        : colors.text,
                      textDecoration: isChecked ? 'line-through' : 'none',
                      fontWeight: isChecked ? 400 : 500,
                      transition:
                        'color 0.15s ease, text-decoration 0.15s ease',
                    }}
                  >
                    {t(item.labelKey, item.labelFallback)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        {/* All-done celebration message */}
        {allChecked && (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginTop: spacing.md,
              padding: `${spacing.sm}px ${spacing.md}px`,
              borderRadius: theme.shape.radiusSm,
              background: colors.successSoft,
              color: colors.successStrong,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            <span aria-hidden="true">🎉</span>
            {t(
              'budget.freshness.reconcile.allDone',
              'All items confirmed — your budget is reconciled for this month.',
            )}
          </div>
        )}
      </div>
    </section>
  );
}
