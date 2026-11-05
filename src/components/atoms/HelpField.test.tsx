import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HelpField, { HelpLabel } from './HelpField';
import BudgetTooltip from './BudgetTooltip';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => (key === 'shell.information' ? 'Information' : key) }),
}));
vi.mock('../../core/context/ThemeContext', async () => {
  const { themes } = await import('../../core/themes');
  return { useTheme: () => ({ theme: themes.light }) };
});

describe('HelpField', () => {
  it('names the control by its label only, not by the help button next to it', () => {
    render(
      <HelpField label="Amount" help={<BudgetTooltip content="What you spent" />}>
        <input type="number" />
      </HelpField>
    );
    expect(screen.getByRole('spinbutton', { name: 'Amount' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Information' })).toBeTruthy();
  });

  it('the label belongs to the control, and clicking it does not open the help', () => {
    render(
      <HelpField label="Category" help={<BudgetTooltip content="Pick one" />}>
        <select>
          <option>Food</option>
        </select>
      </HelpField>
    );
    const label = screen.getByText('Category') as HTMLLabelElement;
    expect(label.control).toBe(screen.getByRole('combobox', { name: 'Category' }));
    fireEvent.click(label);
    expect(screen.getByRole('tooltip', { hidden: true }).style.display).toBe('none');
  });

  it('reads the error out with the control and marks it invalid', () => {
    render(
      <HelpField label="Title" error="Add a title">
        <input type="text" />
      </HelpField>
    );
    const input = screen.getByRole('textbox', { name: 'Title' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe('Add a title');
  });

  it('reads a hint after the name, not as part of it, together with any error', () => {
    const { rerender } = render(
      <HelpField label="Reminder" hint="Shows while the app is open">
        <input type="number" />
      </HelpField>
    );
    const input = screen.getByRole('spinbutton', { name: 'Reminder' });
    const descriptions = () =>
      (input.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent);
    expect(descriptions()).toEqual(['Shows while the app is open']);
    expect(input.getAttribute('aria-invalid')).toBeNull();

    rerender(
      <HelpField label="Reminder" hint="Shows while the app is open" error="Too far ahead">
        <input type="number" />
      </HelpField>
    );
    expect(descriptions()).toEqual(['Too far ahead', 'Shows while the app is open']);
  });

  it('keeps an id the control already has', () => {
    render(
      <HelpField label="Month">
        <input id="budget-month" type="text" />
      </HelpField>
    );
    expect(screen.getByRole('textbox', { name: 'Month' }).id).toBe('budget-month');
  });

  it('gives two fields on one page different ids', () => {
    render(
      <>
        <HelpField label="First">
          <input type="text" />
        </HelpField>
        <HelpField label="Second">
          <input type="text" />
        </HelpField>
      </>
    );
    expect(screen.getByRole('textbox', { name: 'First' }).id).not.toBe(screen.getByRole('textbox', { name: 'Second' }).id);
  });
});

describe('HelpLabel', () => {
  it('labels an existing control without adding the help button to its name', () => {
    render(
      <>
        <HelpLabel htmlFor="task-title" help={<BudgetTooltip content="Be specific" />}>
          Add task
        </HelpLabel>
        <input id="task-title" type="text" />
      </>
    );
    expect(screen.getByRole('textbox', { name: 'Add task' })).toBeTruthy();
  });
});
