import { describe, expect, it } from 'vitest';
import { claimReward, REWARD_LEDGER_KEY, REWARD_LEDGER_MAX, stepRewardKey, taskRewardKey } from './rewardLedger';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
};

describe('claimReward', () => {
  it('pays a completion once, however often it is undone and done again', () => {
    const storage = memory();
    expect(claimReward(taskRewardKey(4), storage)).toBe(true);
    expect(claimReward(taskRewardKey(4), storage)).toBe(false);
    expect(claimReward(taskRewardKey(5), storage)).toBe(true);
  });

  it('knows a step by its text, so reordering steps does not make a done step new', () => {
    expect(stepRewardKey(1, ' Call the bank ')).toBe(stepRewardKey(1, 'call the bank'));
    expect(stepRewardKey(1, 'a')).not.toBe(stepRewardKey(2, 'a'));
  });

  it('keeps the newest keys when full', () => {
    const storage = memory();
    storage.setItem(REWARD_LEDGER_KEY, JSON.stringify(Array.from({ length: REWARD_LEDGER_MAX }, (_, i) => `old:${i}`)));
    expect(claimReward('new', storage)).toBe(true);
    const keys = JSON.parse(storage.getItem(REWARD_LEDGER_KEY) as string);
    expect(keys).toHaveLength(REWARD_LEDGER_MAX);
    expect(keys[0]).toBe('old:1');
    expect(keys.at(-1)).toBe('new');
  });

  it('gives the points when storage cannot be used, and reads a damaged list as empty', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => undefined };
    expect(claimReward('x', broken)).toBe(true);
    const storage = memory();
    storage.setItem(REWARD_LEDGER_KEY, '{"not":"a list"}');
    expect(claimReward('x', storage)).toBe(true);
  });
});
