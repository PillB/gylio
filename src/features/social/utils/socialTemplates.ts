import type { SocialPlan } from '../../../core/hooks/useDB';

export type SocialTemplate = {
  id: 'check-in' | 'birthday' | 'meetup' | 'support';
  type: SocialPlan['type'];
  labelKey: string;
  descriptionKey: string;
  titleKey: string;
  notesKey: string;
  stepKeys: string[];
};

export const SOCIAL_TEMPLATES: SocialTemplate[] = [
  {
    id: 'check-in',
    type: 'MESSAGE',
    labelKey: 'social.templates.checkIn.label',
    descriptionKey: 'social.templates.checkIn.description',
    titleKey: 'social.templates.checkIn.title',
    notesKey: 'social.templates.checkIn.notes',
    stepKeys: [
      'social.templates.checkIn.steps.first',
      'social.templates.checkIn.steps.second',
      'social.templates.checkIn.steps.third'
    ]
  },
  {
    id: 'birthday',
    type: 'MESSAGE',
    labelKey: 'social.templates.birthday.label',
    descriptionKey: 'social.templates.birthday.description',
    titleKey: 'social.templates.birthday.title',
    notesKey: 'social.templates.birthday.notes',
    stepKeys: [
      'social.templates.birthday.steps.first',
      'social.templates.birthday.steps.second',
      'social.templates.birthday.steps.third'
    ]
  },
  {
    id: 'meetup',
    type: 'MEETUP',
    labelKey: 'social.templates.meetup.label',
    descriptionKey: 'social.templates.meetup.description',
    titleKey: 'social.templates.meetup.title',
    notesKey: 'social.templates.meetup.notes',
    stepKeys: [
      'social.templates.meetup.steps.first',
      'social.templates.meetup.steps.second',
      'social.templates.meetup.steps.third'
    ]
  },
  {
    id: 'support',
    type: 'CALL',
    labelKey: 'social.templates.support.label',
    descriptionKey: 'social.templates.support.description',
    titleKey: 'social.templates.support.title',
    notesKey: 'social.templates.support.notes',
    stepKeys: [
      'social.templates.support.steps.first',
      'social.templates.support.steps.second',
      'social.templates.support.steps.third'
    ]
  }
];
