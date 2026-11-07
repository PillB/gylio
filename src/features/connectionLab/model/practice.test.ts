import { describe, expect, it } from 'vitest';
import { LESSONS, findLesson } from '../data/lessons';
import { beginPractice, nextTurn, selectChoice } from './practice';

describe('Connection Lab deterministic practice', () => {
  const lesson = LESSONS.find((item) => item.id === 'rejection')!;

  it('treats a clear no as a boundary and never rewards pushing after it', () => {
    const start = beginPractice(lesson);
    const pressure = selectChoice(start, lesson, 'a');
    expect(lesson.turns[0].choices[pressure.selected!]).toBe('pressuring');
    expect(pressure.practiced).toBe(1);
    // Repeated taps cannot alter the feedback or inflate effort counts.
    expect(selectChoice(pressure, lesson, 'c')).toBe(pressure);
    expect(lesson.turns[0].choices.c).toBe('strong');
  });

  it('cannot progress without a choice unless the person explicitly skips', () => {
    const start = beginPractice(lesson);
    expect(nextTurn(start, lesson)).toBe(start);
    const skipped = nextTurn(start, lesson, true);
    expect(skipped.turnIndex).toBe(1);
    expect(skipped.practiced).toBe(0);
    expect(nextTurn(skipped, lesson, true).finished).toBe(true);
  });

  it('rejects invalid choice IDs, out-of-range turns and cross-lesson actions', () => {
    const start = beginPractice(lesson);
    expect(selectChoice(start, lesson, 'not-a-choice')).toBe(start);
    expect(selectChoice(start, LESSONS[0], 'a')).toBe(start);
    const done = nextTurn(nextTurn(start, lesson, true), lesson, true);
    expect(selectChoice(done, lesson, 'a')).toBe(done);
    expect(nextTurn(done, lesson, true)).toBe(done);
  });

  it('offers six independent skills with two playable scenes each', () => {
    expect(LESSONS).toHaveLength(6);
    for (const item of LESSONS) {
      expect(findLesson(item.id)).toBe(item);
      expect(item.turns).toHaveLength(2);
      for (const turn of item.turns) {
        expect(Object.values(turn.choices)).toContain('strong');
        expect(Object.values(turn.choices)).toContain('pressuring');
      }
    }
  });
});
