import type { ChoiceId, PracticeLesson } from '../data/lessons';

/** The discriminant makes answered/skipped/completed mutually exclusive. No personal answers are persisted. */
type Base = { lessonId: string; turnIndex: number; practiced: number };
export type PracticeState = Base & (
  | { phase: 'prompt'; selected: null }
  | { phase: 'feedback'; selected: ChoiceId }
  | { phase: 'complete'; selected: null }
);

export const beginPractice = (lesson: PracticeLesson): PracticeState => ({
  lessonId: lesson.id,
  turnIndex: 0,
  selected: null,
  practiced: 0,
  phase: 'prompt'
});

const validTurn = (state: PracticeState, lesson: PracticeLesson) =>
  state.lessonId === lesson.id && Number.isInteger(state.turnIndex) &&
  state.turnIndex >= 0 && state.turnIndex < lesson.turns.length;

/** Feedback is a terminal decision for this scene; repeated submissions have no effect. */
export function selectChoice(
  state: PracticeState,
  lesson: PracticeLesson,
  choice: string
): PracticeState {
  if (state.phase !== 'prompt' || !validTurn(state, lesson)) return state;
  const turn = lesson.turns[state.turnIndex];
  if (!Object.prototype.hasOwnProperty.call(turn.choices, choice)) return state;
  return { ...state, phase: 'feedback', selected: choice as ChoiceId, practiced: state.practiced + 1 };
}

/** Only unanswered scenes can be skipped. An answered scene can only advance. */
export function nextTurn(
  state: PracticeState,
  lesson: PracticeLesson,
  skip = false
): PracticeState {
  if (!validTurn(state, lesson) || state.phase !== (skip ? 'prompt' : 'feedback')) return state;
  if (state.turnIndex + 1 >= lesson.turns.length) {
    return { ...state, phase: 'complete', selected: null };
  }
  return { ...state, turnIndex: state.turnIndex + 1, phase: 'prompt', selected: null };
}
