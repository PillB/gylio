import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ready as languageReady } from '../../../i18n/i18n.js';
import { themes } from '../../../core/themes';
import { RoutineSequence, sequenceItems } from './RoutineSequence';

// The English text is fetched when the language module starts; wait for it before drawing anything.
beforeAll(() => languageReady);

const step = (label: string, done = false) => ({ label, done });

afterEach(cleanup);

describe('sequenceItems', () => {
  it('puts the habit first, keeps every named step in order and drops blank ones', () => {
    const items = sequenceItems([step('Drink water'), step('  '), step('Take meds', true), step(''), step('Open planner')], '  After coffee ');
    expect(items.map((item) => item.label)).toEqual(['After coffee', 'Drink water', 'Take meds', 'Open planner']);
    expect(items.map((item) => item.anchor)).toEqual([true, false, false, false]);
    expect(items[2].done).toBe(true);
  });

  it('has no habit box when none was given, and keeps more than seven steps', () => {
    const many = Array.from({ length: 9 }, (_, index) => step(`Step ${index + 1}`));
    expect(sequenceItems(many, null)).toHaveLength(9);
    expect(sequenceItems(many, '   ').some((item) => item.anchor)).toBe(false);
  });
});

describe('RoutineSequence', () => {
  const show = (steps: ReturnType<typeof step>[], anchorHabit: string | null = null) =>
    render(<RoutineSequence routineTitle="Morning start" steps={steps} anchorHabit={anchorHabit} theme={themes.light} />);

  it('is not shown for fewer than two named steps: one step has no order to show', () => {
    const { container } = show([step('Drink water'), step(' ')], 'After coffee');
    expect(container.firstChild).toBeNull();
  });

  it('is an ordered list a screen reader can read, named after the routine, with done steps said as done', () => {
    const { container } = show([step('Drink water', true), step('Take meds'), step('Open planner')], 'After coffee');
    expect(container.querySelector('summary')?.textContent).toBe('See the order of steps');
    const list = screen.getByRole('list', { name: 'Morning start: steps in order', hidden: true });
    expect(list.tagName).toBe('OL');
    const rows = within(list).getAllByRole('listitem', { hidden: true });
    expect(rows.map((row) => row.textContent?.replace('↓', '').trim())).toEqual(['After coffee', 'Drink water (Done)', 'Take meds', 'Open planner']);
    // Nothing is hidden from assistive technology except the arrows, and nothing in it takes focus.
    expect([...container.querySelectorAll('[aria-hidden="true"]')].map((node) => node.textContent?.trim())).toEqual(['↓', '↓', '↓']);
    expect(container.querySelector('a, button, [tabindex]')).toBeNull();
    expect(container.querySelector('canvas, svg, .react-flow')).toBeNull();
  });
});
