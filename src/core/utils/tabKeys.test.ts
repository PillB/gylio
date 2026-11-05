import { describe, expect, it } from 'vitest';
import { tabIndexForKey } from './tabKeys';

describe('tabIndexForKey', () => {
  it('moves right and left, wrapping at both ends', () => {
    expect(tabIndexForKey('ArrowRight', 0, 4)).toBe(1);
    expect(tabIndexForKey('ArrowRight', 3, 4)).toBe(0);
    expect(tabIndexForKey('ArrowLeft', 0, 4)).toBe(3);
    expect(tabIndexForKey('ArrowLeft', 2, 4)).toBe(1);
  });

  it('jumps to the first and last tab', () => {
    expect(tabIndexForKey('Home', 2, 4)).toBe(0);
    expect(tabIndexForKey('End', 0, 4)).toBe(3);
  });

  it('ignores other keys and empty rows', () => {
    expect(tabIndexForKey('Enter', 1, 4)).toBeNull();
    expect(tabIndexForKey('ArrowDown', 1, 4)).toBeNull();
    expect(tabIndexForKey('ArrowRight', 0, 0)).toBeNull();
  });
});
