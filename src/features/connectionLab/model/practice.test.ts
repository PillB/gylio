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
    expect(nextTurn(skipped, lesson, true).phase).toBe('complete');
  });

  it('rejects invalid choice IDs, out-of-range turns and cross-lesson actions', () => {
    const start = beginPractice(lesson);
    expect(selectChoice(start, lesson, 'not-a-choice')).toBe(start);
    expect(selectChoice(start, LESSONS[0], 'a')).toBe(start);
    const done = nextTurn(nextTurn(start, lesson, true), lesson, true);
    expect(selectChoice(done, lesson, 'a')).toBe(done);
    expect(nextTurn(done, lesson, true)).toBe(done);
  });

  it('does not count an answered scene as a skip or accept an out-of-range transition', () => {
    const start = beginPractice(lesson);
    const answered = selectChoice(start, lesson, 'c');
    expect(nextTurn(answered, lesson, true)).toBe(answered);
    const invalid = { ...start, turnIndex: -1 };
    expect(nextTurn(invalid, lesson, true)).toBe(invalid);
    expect(selectChoice(invalid, lesson, 'a')).toBe(invalid);
  });

  it('exhausts every combination of answer or skip across all six lessons', () => {
    const actions = ['a', 'b', 'c', 'skip'] as const;
    for (const item of LESSONS) for (const first of actions) for (const second of actions) {
      let state = beginPractice(item);
      for (const action of [first, second]) {
        if (action === 'skip') state = nextTurn(state, item, true);
        else {
          state = selectChoice(state, item, action);
          expect(state).toMatchObject({ phase: 'feedback', selected: action });
          expect(nextTurn(state, item, true)).toBe(state);
          state = nextTurn(state, item);
        }
      }
      expect(state, `${item.id}/${first}/${second}`).toMatchObject({
        phase: 'complete', selected: null, turnIndex: 1,
        practiced: Number(first !== 'skip') + Number(second !== 'skip')
      });
      expect(nextTurn(state, item, true)).toBe(state);
    }
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
