export type DebtItem = {
  id: string | number;
  balance: number;
  annualRate: number;
  minPayment: number;
};

export type PayoffStrategy = 'SNOWBALL' | 'AVALANCHE';

export type PayoffSimulationResult = {
  months: number;
  totalInterest: number;
  monthlyPayment: number;
  paidOff: boolean;
};

const MAX_MONTHS = 600;
const EPSILON = 0.01;

const sanitizeNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDebts = (items: DebtItem[]): DebtItem[] =>
  items
    .map((item) => ({
      id: item.id,
      balance: Math.max(0, sanitizeNumber(item.balance)),
      annualRate: Math.max(0, sanitizeNumber(item.annualRate)),
      minPayment: Math.max(0, sanitizeNumber(item.minPayment)),
    }))
    .filter((item) => item.balance > EPSILON);

const sortDebts = (strategy: PayoffStrategy, debts: DebtItem[]): void => {
  if (strategy === 'SNOWBALL') {
    debts.sort((a, b) => a.balance - b.balance);
    return;
  }
  debts.sort((a, b) => b.annualRate - a.annualRate);
};

export const simulateDebtPayoff = (
  items: DebtItem[],
  strategy: PayoffStrategy,
  extraPayment: number
): PayoffSimulationResult | null => {
  const debts = normalizeDebts(items);
  const monthlyPayment =
    debts.reduce((sum, debt) => sum + debt.minPayment, 0) + Math.max(0, sanitizeNumber(extraPayment));

  if (!debts.length || monthlyPayment <= EPSILON) {
    return null;
  }

  let months = 0;
  let totalInterest = 0;

  while (months < MAX_MONTHS && debts.some((debt) => debt.balance > EPSILON)) {
    sortDebts(strategy, debts);
    let available = monthlyPayment;

    debts.forEach((debt) => {
      if (debt.balance <= EPSILON) return;

      const monthlyRate = debt.annualRate / 12 / 100;
      const interest = debt.balance * monthlyRate;
      debt.balance += interest;
      totalInterest += interest;

      const minPay = Math.min(debt.balance, debt.minPayment);
      debt.balance -= minPay;
      available -= minPay;
    });

    if (available > EPSILON) {
      for (let index = 0; index < debts.length && available > EPSILON; index += 1) {
        const debt = debts[index];
        if (debt.balance <= EPSILON) continue;
        const extra = Math.min(debt.balance, available);
        debt.balance -= extra;
        available -= extra;
      }
    }

    months += 1;

    const totalBalance = debts.reduce((sum, debt) => sum + debt.balance, 0);
    if (totalBalance > 0 && monthlyPayment <= totalBalance * 0.001) {
      break;
    }
  }

  return {
    months,
    totalInterest,
    monthlyPayment,
    paidOff: debts.every((debt) => debt.balance <= EPSILON),
  };
};

export const buildPayoffComparison = (
  items: DebtItem[],
  extraPayment: number
): Record<PayoffStrategy, PayoffSimulationResult | null> => ({
  SNOWBALL: simulateDebtPayoff(items, 'SNOWBALL', extraPayment),
  AVALANCHE: simulateDebtPayoff(items, 'AVALANCHE', extraPayment),
});
