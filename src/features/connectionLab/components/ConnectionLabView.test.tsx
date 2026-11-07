import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import en from '../../../i18n/connectionLab.en.json';
import es from '../../../i18n/connectionLab.es-PE.json';
import { LESSONS } from '../data/lessons';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

import ConnectionLabView from './ConnectionLabView';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('Connection Lab UI', () => {
  it('plays an offline two-scene practice, gives feedback and allows a no-penalty skip', () => {
    render(<ConnectionLabView />);
    fireEvent.click(screen.getByRole('button', { name: /connectionLab.lessons.approach.title/ }));
    expect(screen.getByText('connectionLab.lessons.approach.turns.open.prompt')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'connectionLab.lessons.approach.turns.open.options.a.text' }));
    expect(screen.getByText('connectionLab.feedback.strong')).toBeTruthy();
    expect(screen.getByText('connectionLab.lessons.approach.turns.open.options.a.response')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'connectionLab.next' }));
    expect(screen.getByText('connectionLab.lessons.approach.turns.follow.prompt')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'connectionLab.skip' }));
    expect(screen.getByText('connectionLab.finished')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'connectionLab.repeat' }));
    expect(screen.getByText('connectionLab.lessons.approach.turns.open.prompt')).toBeTruthy();
  });

  it('tracks only non-identifying practice metadata, not what the person chose', () => {
    render(<ConnectionLabView />);
    fireEvent.click(screen.getByRole('button', { name: /connectionLab.lessons.flirt.title/ }));
    fireEvent.click(screen.getByRole('button', { name: 'connectionLab.lessons.flirt.turns.interest.options.b.text' }));
    const events = JSON.parse(localStorage.getItem('analytics:queue') ?? '[]');
    expect(events.map((event: { name: string }) => event.name)).toContain('connection_lab_choice');
    const choice = events.find((event: { name: string }) => event.name === 'connection_lab_choice');
    expect(choice.props).toEqual({ lesson: 'flirt', turn: 0 });
  });

  it('has complete human-readable English and Peruvian Spanish copy for every playable choice', () => {
    for (const lesson of LESSONS) {
      for (const catalog of [en, es]) {
        const entry = catalog.lessons[lesson.id];
        expect(entry.title.trim().length).toBeGreaterThan(0);
        expect(entry.transfer.trim().length).toBeGreaterThan(0);
        for (const turn of lesson.turns) {
          const scene = entry.turns[turn.id as keyof typeof entry.turns];
          expect(scene?.prompt).toBeTruthy();
          for (const choice of ['a', 'b', 'c'] as const) {
            expect(scene.options[choice].text).toBeTruthy();
            expect(scene.options[choice].response).toBeTruthy();
          }
        }
      }
    }
  });
});
