// Prints the finance model's outputs as JSON for the setup report and spreadsheet.
// Usage: npm run finance:report > finance.json
const m = require('../server/billing/financeModel');
const { base, scenarios } = require('../server/billing/financeAssumptions');

const pick = (r) => ({
  npv: r.npv, cumulative: r.cumulative, returnOnHours: r.returnOnHours, maxDrawdown: r.maxDrawdown,
  paybackMonth: r.paybackMonth, m12: r.rows[11], m24: r.rows[23], m36: r.rows[35],
});

const kept = (grossUsd, market) => m.netPerCharge(grossUsd, {
  taxRate: market === 'PEN' ? base.taxPeru : base.taxIntl, feePct: base.feePct, feeFixed: base.feeFixed,
  fxSpread: market === 'PEN' ? base.fxSpread : 0,
});
const keptPerCharge = [
  ['Peru monthly', base.prices.monthly.PEN / 100, 'PEN'],
  ['Peru yearly', base.prices.yearly.PEN / 100, 'PEN'],
  ['World monthly', base.prices.monthly.USD / 100, 'USD'],
  ['World yearly', base.prices.yearly.USD / 100, 'USD'],
].map(([plan, price, cur]) => {
  const usd = cur === 'PEN' ? price / base.penPerUsd : price;
  const k = kept(usd, cur);
  return { plan, price, currency: cur, keptUsd: +k.toFixed(2), keptPen: +(k * base.penPerUsd).toFixed(2), share: +(k / usd).toFixed(3) };
});

const penKept = (priceMinor) => kept(priceMinor / 100 / base.penPerUsd, 'PEN') * base.penPerUsd;
const penPrices = [990, 1290, 1490, 1690, 1990, 2290, 2490, 2990].map((p) => p);
const demandBand = [0.8, 1.2, 1.6, 2.0].map((beta) => ({
  beta, rows: m.linearDemandBand(penPrices, { referenceMinor: 1490, beta, keptPerCharge: penKept }),
}));

const conversions = [0.06, 0.08, 0.1, 0.14, 0.18];
const churns = [0.05, 0.07, 0.09, 0.12, 0.15];
const grid = conversions.map((c) => ({ trialToPaid: c, npv: churns.map((ch) => m.simulate({ ...base, trialToPaid: c, monthlyChurn: ch }).npv) }));

const discount = [0.08, 0.12, 0.15, 0.2, 0.3, 0.4].map((r) => ({ rate: r, npv: m.simulate({ ...base, discountRateAnnual: r }).npv }));

const contador = [0, 150, 250, 350, 500].map((soles) => {
  const p = { ...base, fixedMonthly: soles / base.penPerUsd };
  return { soles, breakEvenPayers: m.breakEvenPayers(p, 2000), npv: m.simulate(p).npv };
});

const costCases = {
  mercadoPagoOn: { fixedMonthly: base.fixedMonthly + 70 / base.penPerUsd },
  infraTriple: { infraAnchors: base.infraAnchors.map(([x, y]) => [x, y * 3]) },
  peruShare90: { peruShare: 0.9 },
  peruShare30: { peruShare: 0.3 },
  annualShare20: { annualShare: 0.2 },
  annualShare50: { annualShare: 0.5 },
  noAds: { adRpmUsd: 0 },
  noBeta: { betaMonths: 0 },
  cardTrial: { trialStartRate: 0.12, trialToPaid: 0.4 },
};
const sensitivity = Object.fromEntries(Object.entries(costCases).map(([k, v]) => {
  const r = m.simulate({ ...base, ...v });
  return [k, { npv: r.npv, paybackMonth: r.paybackMonth, payersM36: r.rows[35].payers }];
}));

console.log(JSON.stringify({
  scenarios: Object.fromEntries(Object.entries(scenarios).map(([k, v]) => [k, pick(m.simulate(v))])),
  baseRows: m.simulate(base).rows,
  breakEven: [1000, 10000, 50000].map((mau) => ({ mau, payers: m.breakEvenPayers(base, mau) })),
  keptPerCharge, demandBand, conversionChurn: { churns, grid }, discount, contador, sensitivity,
}, null, 2));
