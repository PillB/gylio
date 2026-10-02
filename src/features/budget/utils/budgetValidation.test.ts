import { describe, expect, it } from 'vitest';
import {
  hasErrors,
  optionalText,
  parseNumber,
  validateCategory,
  validateDebt,
  validateIncome,
  validateMonth,
  validateTransaction,
} from './budgetValidation';

const t = (key: string) => key;

describe('parseNumber', () => {
  it('parses decimals and rejects non-numeric or infinite input', () => {
    expect(parseNumber('12.5')).toBe(12.5);
    expect(parseNumber('abc')).toBeNaN();
    expect(parseNumber('')).toBeNaN();
    expect(parseNumber('Infinity')).toBeNaN();
  });
});

describe('budget form validation', () => {
  it('requires a non-blank month', () => {
    expect(validateMonth('   ', t)).toBe('validation.periodRequired');
    expect(validateMonth('2026-09', t)).toBe('');
  });

  it('distinguishes a missing amount from a zero or negative one', () => {
    expect(validateIncome({ source: 'Job', amount: '' }, t).amount).toBe('validation.invalidNumber');
    expect(validateIncome({ source: 'Job', amount: '0' }, t).amount).toBe('validation.amountPositive');
    expect(validateIncome({ source: ' ', amount: '10' }, t)).toEqual({
      source: 'validation.sourceRequired',
      amount: '',
    });
  });

  it('requires category name, type and a positive plan', () => {
    expect(validateCategory({ name: '', type: '', plannedAmount: '-5' }, t)).toEqual({
      name: 'validation.categoryRequired',
      type: 'validation.categoryRequired',
      plannedAmount: 'validation.amountPositive',
    });
    expect(hasErrors(validateCategory({ name: 'Rent', type: 'NEED', plannedAmount: '900' }, t))).toBe(false);
  });

  it('requires amount, category and date on a transaction but not a note', () => {
    const errors = validateTransaction({ amount: '5', categoryName: '', date: '', note: '' }, t);
    expect(errors).toEqual({ amount: '', categoryName: 'validation.categoryRequired', date: 'validation.invalidDateTime' });
  });

  it('allows a zero balance and zero rate on a debt but needs a positive minimum payment', () => {
    const base = { name: 'Card', balance: '0', annualRate: '0', minPayment: '0', categoryName: '' };
    expect(validateDebt(base, t)).toEqual({
      name: '',
      balance: '',
      annualRate: '',
      minPayment: 'validation.amountPositive',
    });
    expect(validateDebt({ ...base, balance: '-1', annualRate: 'x' }, t)).toMatchObject({
      balance: 'validation.nonNegativeNumber',
      annualRate: 'validation.invalidNumber',
    });
  });
});

describe('optionalText', () => {
  it('trims and turns blank input into null', () => {
    expect(optionalText('  note ')).toBe('note');
    expect(optionalText('   ')).toBeNull();
  });
});
