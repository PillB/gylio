import { describe, expect, it } from 'vitest';
import {
  hasErrors,
  MAX_AMOUNT,
  optionalText,
  parseMoney,
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

describe('parseMoney', () => {
  it('rounds to cents so stored amounts match what is shown', () => {
    expect(parseMoney('1234.567')).toBe(1234.57);
    expect(parseMoney('0.1')).toBe(0.1);
    expect(parseMoney('19.999')).toBe(20);
  });
});

describe('amount limits', () => {
  it('refuses an amount too large to be real instead of saving a 21-digit figure', () => {
    expect(validateIncome({ source: 'Job', amount: '99999999999999999999' }, t).amount).toBe('validation.amountTooLarge');
    expect(validateIncome({ source: 'Job', amount: String(MAX_AMOUNT) }, t).amount).toBe('');
    expect(validateDebt({ name: 'Card', balance: '1e15', annualRate: '0', minPayment: '10', categoryName: '', dueDay: '' }, t).balance).toBe(
      'validation.amountTooLarge'
    );
  });

  it('refuses an amount that rounds to zero cents', () => {
    expect(validateTransaction({ amount: '0.004', categoryName: 'Food', date: '2026-10-01', note: '' }, t).amount).toBe(
      'validation.amountPositive'
    );
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

  it('accepts a blank or whole 1-31 due day and rejects anything else', () => {
    const base = { name: 'Card', balance: '1', annualRate: '1', minPayment: '1', categoryName: '', dueDay: '' };
    for (const ok of ['', '1', '31', ' 15 ']) expect(validateDebt({ ...base, dueDay: ok }, t).dueDay).toBe('');
    for (const bad of ['0', '32', '2.5', 'x', '-3']) expect(validateDebt({ ...base, dueDay: bad }, t).dueDay).toBe('validation.dueDayRange');
  });

  it('allows a zero balance and zero rate on a debt but needs a positive minimum payment', () => {
    const base = { name: 'Card', balance: '0', annualRate: '0', minPayment: '0', categoryName: '', dueDay: '' };
    expect(validateDebt(base, t)).toEqual({
      name: '',
      balance: '',
      annualRate: '',
      minPayment: 'validation.amountPositive',
      dueDay: '',
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
