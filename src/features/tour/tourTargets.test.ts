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
          const present = source.includes(`data-tour="${name}"`) || source.includes(`data-tour={\`${name.replace(/[a-z]+$/, '')}`) || source.includes(`data-tour={'${name}'}`);
          if (!present) missing.push(`${flow.id}/${step.id}: ${name}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
