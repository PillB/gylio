/**
 * summarize.js — turn stored analytics events into the admin dashboard.
 * Pure: takes events and a clock, returns numbers. Counting is by session
 * (one browser tab session), which is what an A/B exposure is assigned to.
 */

'use strict';

const FUNNEL = ['paywall_viewed', 'trial_started', 'checkout_opened', 'checkout_completed'];

const day = (iso) => String(iso).slice(0, 10);

function sessionsBy(events, predicate) {
  const sessions = new Set();
  for (const e of events) if (predicate(e)) sessions.add(e.sessionId);
  return sessions;
}

function totals(events) {
  const byName = new Map();
  for (const e of events) {
    const row = byName.get(e.name) || { name: e.name, events: 0, sessions: new Set() };
    row.events += 1;
    row.sessions.add(e.sessionId);
    byName.set(e.name, row);
  }
  return [...byName.values()]
    .map((r) => ({ name: r.name, events: r.events, sessions: r.sessions.size }))
    .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name));
}

/** Each step counts sessions that did that step AND every earlier step. */
function funnel(events) {
  let reached = null;
  return FUNNEL.map((step) => {
    const did = sessionsBy(events, (e) => e.name === step);
    reached = reached ? new Set([...reached].filter((s) => did.has(s))) : did;
    return { step, sessions: reached.size };
  });
}

function experiments(events) {
  const trial = sessionsBy(events, (e) => e.name === 'trial_started');
  const checkout = sessionsBy(events, (e) => e.name === 'checkout_opened');
  const groups = new Map();
  for (const e of events) {
    if (e.name !== 'experiment_exposure' || !e.props?.experiment) continue;
    const key = `${e.props.experiment}\u0000${e.props.variant}`;
    const group = groups.get(key) || { experiment: e.props.experiment, variant: String(e.props.variant), sessions: new Set() };
    group.sessions.add(e.sessionId);
    groups.set(key, group);
  }
  return [...groups.values()].map((g) => {
    const exposed = g.sessions.size;
    const trials = [...g.sessions].filter((s) => trial.has(s)).length;
    const checkouts = [...g.sessions].filter((s) => checkout.has(s)).length;
    return { experiment: g.experiment, variant: g.variant, exposed, trials, checkouts, trialRate: exposed ? trials / exposed : 0 };
  }).sort((a, b) => a.experiment.localeCompare(b.experiment) || a.variant.localeCompare(b.variant));
}

function ads(events) {
  const rows = new Map();
  for (const e of events) {
    if (e.name !== 'ad_impression' && e.name !== 'ad_click') continue;
    const key = `${e.props?.provider}\u0000${e.props?.placement}`;
    const row = rows.get(key) || { provider: String(e.props?.provider), placement: String(e.props?.placement), impressions: 0, clicks: 0 };
    if (e.name === 'ad_impression') row.impressions += 1; else row.clicks += 1;
    rows.set(key, row);
  }
  return [...rows.values()].map((r) => ({ ...r, ctr: r.impressions ? r.clicks / r.impressions : 0 }));
}

function daily(events) {
  const days = new Map();
  for (const e of events) {
    const d = day(e.receivedAt);
    const row = days.get(d) || { day: d, events: 0, sessions: new Set() };
    row.events += 1;
    row.sessions.add(e.sessionId);
    days.set(d, row);
  }
  return [...days.values()].map((r) => ({ day: r.day, events: r.events, sessions: r.sessions.size })).sort((a, b) => a.day.localeCompare(b.day));
}

function summarize(events, { from, to }) {
  return {
    from,
    to,
    events: events.length,
    sessions: new Set(events.map((e) => e.sessionId)).size,
    signedInSessions: sessionsBy(events, (e) => e.signedIn).size,
    totals: totals(events),
    funnel: funnel(events),
    experiments: experiments(events),
    ads: ads(events),
    daily: daily(events),
  };
}

module.exports = { FUNNEL, summarize };
