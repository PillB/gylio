import type { ChoiceId, PracticeLesson } from '../data/lessons';

/** Ephemeral, per-visit state: no names, messages, or relationship history are stored. */
export type PracticeState = {
  lessonId: string;
  turnIndex: number;
  selected: ChoiceId | null;
  practiced: number;
  finished: boolean;
};

export const beginPractice = (lesson: PracticeLesson): PracticeState => ({
  lessonId: lesson.id,
  turnIndex: 0,
  selected: null,
  practiced: 0,
  finished: false
});

/** Invalid or repeated submissions cannot earn extra credit or change a prior answer. */
export function selectChoice(
  state: PracticeState,
  lesson: PracticeLesson,
  choice: string
): PracticeState {
  if (state.lessonId !== lesson.id || state.finished || state.selected) return state;
  const turn = lesson.turns[state.turnIndex];
  if (!turn || !Object.prototype.hasOwnProperty.call(turn.choices, choice)) return state;
  return { ...state, selected: choice as ChoiceId, practiced: state.practiced + 1 };
}

/** Skip is available without penalty; skipped turns do not count as practiced. */
export function nextTurn(
  state: PracticeState,
  lesson: PracticeLesson,
  skip = false
): PracticeState {
  if (state.lessonId !== lesson.id || state.finished) return state;
  if (!skip && !state.selected) return state;
  if (state.turnIndex + 1 >= lesson.turns.length) {
    return { ...state, finished: true, selected: null };
  }
  return { ...state, turnIndex: state.turnIndex + 1, selected: null };
}
