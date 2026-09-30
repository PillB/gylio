// Prints the finance assumptions as JSON for build_workbook.py, so the
// spreadsheet starts from exactly the numbers the code model uses.
const { base, scenarios } = require('../../server/billing/financeAssumptions');

const [a1, a2, a3] = base.infraAnchors;
const common = {
  penPerUsd: base.penPerUsd,
  priceMonthlyUSD: base.prices.monthly.USD / 100,
  priceYearlyUSD: base.prices.yearly.USD / 100,
  priceMonthlyPEN: base.prices.monthly.PEN / 100,
  priceYearlyPEN: base.prices.yearly.PEN / 100,
  feePct: base.feePct,
  feeFixed: base.feeFixed,
  fxSpread: base.fxSpread,
  taxPeru: base.taxPeru,
  taxIntl: base.taxIntl,
  mau1: a1[0], cost1: a1[1], mau2: a2[0], cost2: a2[1], mau3: a3[0], cost3: a3[1],
  // fixedMonthly in the code is the contador in dollars; the sheet keeps it in soles.
  contadorPen: Math.round(base.fixedMonthly * base.penPerUsd * 100) / 100,
  invoicingPen: 0,
  payoutFeeMonthly: base.payoutFeeMonthly,
  adsStartMonth: base.adsStartMonth,
  adPageviewsPerFreeUser: base.adPageviewsPerFreeUser,
  adRpmUsd: base.adRpmUsd,
  incomeTaxRate: base.incomeTaxRate,
  initialInvestment: base.initialInvestment,
  discountRateAnnual: base.discountRateAnnual,
  hoursInvested: base.hoursInvested,
  hourlyRateUsd: base.hourlyRateUsd,
  conversionMultiplier: base.conversionMultiplier,
};
console.log(JSON.stringify({ common, scenarios }));
