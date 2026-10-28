import { describe, expect, it } from 'vitest';
import { resolveLayoutVariant } from './layoutVariants';

describe('resolveLayoutVariant', () => {
  it('returns the control when nothing is forced', () => {
    expect(resolveLayoutVariant('tour_length', '')).toBe('overview9');
    expect(resolveLayoutVariant('budget_quick_add', '?x=1')).toBe('none');
    expect(resolveLayoutVariant('calendar_default_phone', '')).toBe('day');
  });
  it('lets QA force a listed variant', () => {
    expect(resolveLayoutVariant('tour_length', '?exp_tour_length=overview5')).toBe('overview5');
    expect(resolveLayoutVariant('budget_quick_add', '?exp_budget_quick_add=top')).toBe('top');
  });
  it('ignores values that are not a listed variant of that experiment', () => {
    expect(resolveLayoutVariant('tour_length', '?exp_tour_length=top')).toBe('overview9');
    expect(resolveLayoutVariant('calendar_default_phone', '?exp_calendar_default_phone=<script>')).toBe('day');
  });
});
