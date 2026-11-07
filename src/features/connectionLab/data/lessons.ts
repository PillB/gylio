/**
 * Connection Lab scenario metadata.
 * Copy lives in connectionLab.{en,es-PE}.json. These are *illustrative*
 * social choices, not predictions of what any person will say or feel.
 */
export type ChoiceId = 'a' | 'b' | 'c';
export type ChoiceRating = 'strong' | 'mixed' | 'pressuring';
export type LessonId = 'approach' | 'flow' | 'flirt' | 'connect' | 'rejection' | 'repair';
export type PracticeTurn = {
  id: string;
  choices: Readonly<Record<ChoiceId, ChoiceRating>>;
};
export type PracticeLesson = {
  id: LessonId;
  sourceId: string;
  minutes: 5 | 10;
  turns: readonly PracticeTurn[];
};

export const SOURCES: Readonly<Record<string, { title: string; url: string }>> = {
  questions: {
    title: 'Huang et al. (2017), question-asking and liking',
    url: 'https://doi.org/10.1037/pspi0000097'
  },
  dating: {
    title: 'Joel et al. (2017), predicting romantic desire',
    url: 'https://doi.org/10.1177/0956797617714580'
  },
  closeness: {
    title: 'Aron et al. (1997), experimental interpersonal closeness',
    url: 'https://doi.org/10.1177/0146167297234003'
  },
  anxiety: {
    title: 'Hofmann & Smits (2008), CBT for adult anxiety disorders',
    url: 'https://doi.org/10.4088/JCP.v69n0415'
  },
  responsiveness: {
    title: 'Reis, Clark & Holmes (2004), perceived partner responsiveness',
    url: 'https://www.sas.rochester.edu/psy/people/faculty/reis_harry/assets/pdf/ReisClarkHolmes_2004.pdf'
  }
};

export const LESSONS: readonly PracticeLesson[] = [
  {
    id: 'approach', sourceId: 'questions', minutes: 5,
    turns: [
      { id: 'open', choices: { a: 'strong', b: 'mixed', c: 'pressuring' } },
      { id: 'follow', choices: { a: 'mixed', b: 'strong', c: 'pressuring' } }
    ]
  },
  {
    id: 'flow', sourceId: 'questions', minutes: 5,
    turns: [
      { id: 'listen', choices: { a: 'mixed', b: 'pressuring', c: 'strong' } },
      { id: 'share', choices: { a: 'strong', b: 'pressuring', c: 'mixed' } }
    ]
  },
  {
    id: 'flirt', sourceId: 'dating', minutes: 10,
    turns: [
      { id: 'interest', choices: { a: 'pressuring', b: 'strong', c: 'mixed' } },
      { id: 'unclear', choices: { a: 'mixed', b: 'strong', c: 'pressuring' } }
    ]
  },
  {
    id: 'connect', sourceId: 'closeness', minutes: 10,
    turns: [
      { id: 'disclose', choices: { a: 'strong', b: 'pressuring', c: 'mixed' } },
      { id: 'support', choices: { a: 'mixed', b: 'strong', c: 'pressuring' } }
    ]
  },
  {
    id: 'rejection', sourceId: 'anxiety', minutes: 5,
    turns: [
      { id: 'no', choices: { a: 'pressuring', b: 'mixed', c: 'strong' } },
      { id: 'reset', choices: { a: 'strong', b: 'mixed', c: 'pressuring' } }
    ]
  },
  {
    id: 'repair', sourceId: 'responsiveness', minutes: 10,
    turns: [
      { id: 'listen', choices: { a: 'mixed', b: 'strong', c: 'pressuring' } },
      { id: 'repair', choices: { a: 'pressuring', b: 'mixed', c: 'strong' } }
    ]
  }
];

export const findLesson = (id: string): PracticeLesson | undefined =>
  LESSONS.find((lesson) => lesson.id === id);
