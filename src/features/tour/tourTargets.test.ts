import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as steps from './tourSteps';
import type { TourFlow } from './tourSteps';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(jsx|tsx)$/.test(name) && !/\.test\./.test(name) ? [full] : [];
  });

const source = walk(join(__dirname, '..', '..')).map((f) => readFileSync(f, 'utf8')).join('\n');
const flows = Object.values(steps).filter((v): v is TourFlow => !!v && typeof v === 'object' && 'steps' in (v as object));

describe('tour step targets', () => {
  it('finds the flows', () => expect(flows.length).toBeGreaterThanOrEqual(5));

  it('every targeted step points at a data-tour attribute that exists in the UI', () => {
    const missing: string[] = [];
    for (const flow of flows) {
      for (const step of flow.steps) {
        if (!step.target) continue;
        for (const m of step.target.matchAll(/data-tour="([^"]+)"/g)) {
          const name = m[1];
          // `dataTour` is the prop SettingToggle puts on its outer box as `data-tour`.
          const present = source.includes(`data-tour="${name}"`) || source.includes(`dataTour="${name}"`) || source.includes(`data-tour={\`${name.replace(/[a-z]+$/, '')}`) || source.includes(`data-tour={'${name}'}`);
          if (!present) missing.push(`${flow.id}/${step.id}: ${name}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('steps whose target can be hidden', () => {
  const all = flows.flatMap((flow) => flow.steps);

  it('point at the control that reveals it, second, and say so', () => {
    const hinted = all.filter((step) => step.revealHintKey);
    expect(hinted.map((step) => step.id)).toEqual(['tasks-date', 'tasks-energy']);
    for (const step of hinted) {
      const names = [...(step.target ?? '').matchAll(/data-tour="([^"]+)"/g)].map((m) => m[1]);
      expect(names).toHaveLength(2);
      expect(names[1]).toBe('task-details-toggle');
    }
  });

  it('never use the upgrade card as a first choice', () => {
    for (const step of all) {
      const first = /data-tour="([^"]+)"/.exec(step.target ?? '')?.[1];
      expect(first, step.id).not.toBe('premium-gate');
    }
  });
});

import { stepsForFlow, OVERVIEW_FLOW } from './tourSteps';

describe('stepsForFlow', () => {
  it('keeps all overview steps by default', () => {
    expect(stepsForFlow('overview')).toHaveLength(OVERVIEW_FLOW.steps.length);
  });
  it('the short overview keeps welcome and done, and the free core in order', () => {
    const ids = stepsForFlow('overview', 'overview5').map((s) => s.id);
    expect(ids).toEqual(['overview-welcome', 'overview-tasks', 'overview-calendar', 'overview-budget', 'overview-done']);
  });
  it('never shortens a section walkthrough', () => {
    expect(stepsForFlow('budget', 'overview5')).toHaveLength(stepsForFlow('budget').length);
  });
});

import { clampStepIndex } from './tourSteps';

describe('clampStepIndex', () => {
  it('keeps a valid index', () => expect(clampStepIndex(3, 9)).toBe(3));
  it('pulls a saved index back inside a shorter step list (9-step save, 5-step variant)', () => {
    expect(clampStepIndex(7, 5)).toBe(4);
  });
  it('handles empty lists and bad values', () => {
    expect(clampStepIndex(2, 0)).toBe(0);
    expect(clampStepIndex(-1, 5)).toBe(0);
    expect(clampStepIndex(Number.NaN, 5)).toBe(0);
  });
});
