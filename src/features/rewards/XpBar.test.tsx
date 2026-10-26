import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import XpBar from './XpBar';

describe('XpBar', () => {
  afterEach(cleanup);

  it('exposes progress within the level to assistive tech', () => {
    render(<XpBar points={250} level={3} label="Level progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Level progress' });
    expect(bar.getAttribute('aria-valuenow')).toBe('50');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('fills in proportion to the share earned', () => {
    render(<XpBar points={25} level={1} label="Level progress" />);
    const fill = screen.getByRole('progressbar').firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('25%');
  });
});
