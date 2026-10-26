import { describe, expect, it } from 'vitest';
import { initialGridScrollTop } from './gridScroll';

describe('initialGridScrollTop', () => {
  it('puts "now" a third of the way down the viewport', () => {
    expect(initialGridScrollTop(600, 450, 896)).toBe(446); // 600 - 150
  });
  it('never scrolls past the end of the grid', () => {
    expect(initialGridScrollTop(880, 450, 896)).toBe(446); // clamped to content - viewport
  });
  it('stays at the top early in the morning', () => {
    expect(initialGridScrollTop(40, 450, 896)).toBe(0);
  });
  it('stays at the top when now is outside the visible hours', () => {
    expect(initialGridScrollTop(-120, 450, 896)).toBe(0);
    expect(initialGridScrollTop(2000, 450, 896)).toBe(0);
  });
});
