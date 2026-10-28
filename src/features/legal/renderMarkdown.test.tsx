import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderMarkdown } from './renderMarkdown';

const view = (md: string, base = '/') => render(<div>{renderMarkdown(md, base)}</div>);

describe('renderMarkdown', () => {
  it('renders headings, bold, lists and unescapes markdown escapes', () => {
    view('# Title\n\n## Part\n\nSome **bold** text \\- here\n\n- one\n- two');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Title');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Part');
    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(document.querySelector('p')?.textContent).toBe('Some bold text - here');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('prefixes in-app links with the base path and keeps mailto/https links', () => {
    view('[a](/terms) [b](mailto:x@y.z) [c](https://example.com)', '/app/');
    expect(screen.getByText('a').getAttribute('href')).toBe('/app/terms');
    expect(screen.getByText('b').getAttribute('href')).toBe('mailto:x@y.z');
    expect(screen.getByText('c').getAttribute('href')).toBe('https://example.com');
  });

  it('refuses javascript: links and does not inject HTML', () => {
    view('[x](javascript:alert(1)) <img src=x onerror=alert(1)>');
    expect(screen.queryByRole('link')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it('renders pipe tables with header cells', () => {
    view('| A | B |\n| :-- | :-- |\n| 1 | 2 |');
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['A', 'B']);
    expect(screen.getAllByRole('cell').map((c) => c.textContent)).toEqual(['1', '2']);
  });
});
