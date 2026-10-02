export type Translate = (key: string) => string;

export type IncomeFields = { source: string; amount: string };
export type CategoryFields = { name: string; type: string; plannedAmount: string };
export type TransactionFields = { amount: string; categoryName: string; date: string; note: string };
export type DebtFields = {
  name: string;
  balance: string;
  annualRate: string;
  minPayment: string;
  categoryName: string;
};

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** Parses a form value; returns NaN for anything that is not a finite number. */
export const parseNumber = (value: string | number): number => {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const requiredText = (value: string, message: string): string => (value.trim() ? '' : message);

const positiveAmount = (value: string, t: Translate): string => {
  const amount = parseNumber(value);
  if (Number.isNaN(amount)) return t('validation.invalidNumber');
  return amount <= 0 ? t('validation.amountPositive') : '';
};

const nonNegativeAmount = (value: string, t: Translate): string => {
  const amount = parseNumber(value);
  if (Number.isNaN(amount)) return t('validation.invalidNumber');
  return amount < 0 ? t('validation.nonNegativeNumber') : '';
};

export const validateMonth = (value: string, t: Translate): string =>
  requiredText(value, t('validation.periodRequired'));

export const validateIncome = (fields: IncomeFields, t: Translate): FieldErrors<IncomeFields> => ({
  source: requiredText(fields.source, t('validation.sourceRequired')),
  amount: positiveAmount(fields.amount, t),
});

export const validateCategory = (fields: CategoryFields, t: Translate): FieldErrors<CategoryFields> => ({
  name: requiredText(fields.name, t('validation.categoryRequired')),
  type: fields.type ? '' : t('validation.categoryRequired'),
  plannedAmount: positiveAmount(fields.plannedAmount, t),
});

export const validateTransaction = (
  fields: TransactionFields,
  t: Translate
): FieldErrors<TransactionFields> => ({
  amount: positiveAmount(fields.amount, t),
  categoryName: requiredText(fields.categoryName, t('validation.categoryRequired')),
  date: fields.date ? '' : t('validation.invalidDateTime'),
});

export const validateDebt = (fields: DebtFields, t: Translate): FieldErrors<DebtFields> => ({
  name: requiredText(fields.name, t('validation.titleRequired')),
  balance: nonNegativeAmount(fields.balance, t),
  annualRate: nonNegativeAmount(fields.annualRate, t),
  minPayment: positiveAmount(fields.minPayment, t),
});

export const hasErrors = (errors: Record<string, string | undefined>): boolean =>
  Object.values(errors).some(Boolean);

/** Trimmed text, or null when the optional field was left blank. */
export const optionalText = (value: string): string | null => value.trim() || null;
