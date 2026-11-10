import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { themes } from '../../core/themes';
import SettingToggle from './SettingToggle';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { topic?: string }) => (options?.topic ? `${key}(${options.topic})` : key) }),
}));
vi.mock('../../core/context/ThemeContext', () => ({ useTheme: () => ({ theme: themes.light }) }));

describe('SettingToggle', () => {
  afterEach(cleanup);

  it('names the checkbox with the setting, not with its state', () => {
    render(<SettingToggle label="Read aloud" checked onChange={vi.fn()} />);
    const box = screen.getByRole('checkbox', { name: 'Read aloud' }) as HTMLInputElement;
    expect(box.checked).toBe(true);
    // The label a sighted person reads is the same text, and clicking it flips the box.
    expect(screen.getByText('Read aloud').closest('label')?.contains(box)).toBe(true);
  });

  it('reports the new state, on and off', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SettingToggle label="Daily view" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Daily view' }));
    expect(onChange).toHaveBeenLastCalledWith(true);
    rerender(<SettingToggle label="Daily view" checked onChange={onChange} />);
    fireEvent.click(screen.getByText('Daily view'));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it('ties the helper text to the checkbox as its description', () => {
    render(<SettingToggle label="Animations" helper="Turns off decorative movement." checked onChange={vi.fn()} />);
    const describedBy = screen.getByRole('checkbox').getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe('Turns off decorative movement.');
  });

  it('points at no description when there is no helper', () => {
    render(<SettingToggle label="Animations" checked onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox').hasAttribute('aria-describedby')).toBe(false);
    expect(document.querySelector('small')).toBeNull();
  });

  it('keeps the help bubble outside the label, so its text is not part of the name', () => {
    render(<SettingToggle label="Rewards" tooltip="Turns points on or off." checked onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'Rewards' })).toBeTruthy();
    const help = screen.getAllByRole('button');
    expect(help).toHaveLength(1);
    expect(help[0].closest('label')).toBeNull();
    // The help button says which setting it explains.
    expect(help[0].getAttribute('aria-label')).toBe('shell.informationAbout(Rewards)');
  });

  it('shows no help button without a tooltip', () => {
    render(<SettingToggle label="Rewards" checked onChange={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('carries the tour target on its outer box, with a border unless it sits inside another card', () => {
    const { container, rerender } = render(<SettingToggle label="Rewards" dataTour="settings-gamification" checked onChange={vi.fn()} />);
    const box = container.querySelector('[data-tour="settings-gamification"]') as HTMLElement;
    expect(box.contains(screen.getByRole('checkbox'))).toBe(true);
    expect(box.style.border).not.toBe('');
    rerender(<SettingToggle bare label="Rewards" checked onChange={vi.fn()} />);
    expect((container.firstElementChild as HTMLElement).style.border).toBe('');
    expect(container.querySelector('[data-tour]')).toBeNull();
  });
});
