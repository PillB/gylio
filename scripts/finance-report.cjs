// Prints the finance model's outputs as JSON for the setup report.
// Usage: node scripts/finance-report.cjs > finance.json
const m = require('../server/billing/financeModel');
const { base, scenarios } = require('../server/billing/financeAssumptions');

const summary = (r) => ({
  nets: r.nets, npv: r.npv, roi: r.roi, paybackMonth: r.paybackMonth, firstProfitableMonth: r.firstProfitableMonth,
  m12: r.rows[11], m24: r.rows[23], m36: r.rows[35],
});

const factors = [0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.4, 1.6, 1.8, 2];
const elasticities = [-0.5, -1, -1.5, -2];
const sensitivity = m.priceSensitivity(base, factors, elasticities).map((s) => ({
  ...s,
  breakEvenFactor: (s.points.find((p) => p.npv >= 0) || {}).factor ?? null,
}));

const costCases = {
  base: {},
  infraTriple: { infraAnchors: base.infraAnchors.map(([x, y]) => [x, y * 3]) },
  churnPlus4pp: { monthlyChurn: base.monthlyChurn + 0.04 },
  trialToPaid8: { trialToPaid: 0.08 },
  trialToPaid16: { trialToPaid: 0.16 },
  peruShare90: { peruShare: 0.9 },
  peruShare30: { peruShare: 0.3 },
  annualShare20: { annualShare: 0.2 },
  annualShare50: { annualShare: 0.5 },
  noAds: { adRpmUsd: 0 },
  founderSalary800: { fixedMonthly: base.fixedMonthly + 800 },
  cardTrial: { trialStartRate: 0.15, trialToPaid: 0.4 },
};
const costSensitivity = Object.fromEntries(Object.entries(costCases).map(([k, v]) => {
  const r = m.simulate({ ...base, ...v });
  return [k, { npv: r.npv, roi: r.roi, paybackMonth: r.paybackMonth, payersM36: r.rows[35].payers, mrrM36: r.rows[35].mrr }];
}));

const breakEven = [1000, 5000, 10000, 50000].map((mau) => ({ mau, payers: m.breakEvenPayers(base, mau) }));

console.log(JSON.stringify({
  scenarios: Object.fromEntries(Object.entries(scenarios).map(([k, v]) => [k, summary(m.simulate(v))])),
  breakEven, sensitivity, costSensitivity,
}, null, 2));
