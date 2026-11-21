/**
 * Stored analytics events turned into the admin dashboard. Pure: events in, numbers out. Counting is by session
 * (one browser tab session), which is what an A/B exposure is assigned to. Same output as the old server
 * (server/analytics/summarize.js), so the admin page reads either.
 */
export type SummaryEvent = { name: string; sessionId: string; signedIn: boolean; props: Record<string, unknown>; receivedAt: number };

export const FUNNEL = ['paywall_viewed', 'trial_started', 'checkout_opened', 'checkout_completed'];
const ROUTINE_TEST = 'routine_free_limit';

const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const sessionsBy = (events: SummaryEvent[], test: (e: SummaryEvent) => boolean) => new Set(events.filter(test).map((e) => e.sessionId));

const totals = (events: SummaryEvent[]) => {
  const byName = new Map<string, { name: string; events: number; sessions: Set<string> }>();
  for (const e of events) {
    const row = byName.get(e.name) ?? { name: e.name, events: 0, sessions: new Set<string>() };
    row.events += 1;
    row.sessions.add(e.sessionId);
    byName.set(e.name, row);
  }
  return [...byName.values()]
    .map((r) => ({ name: r.name, events: r.events, sessions: r.sessions.size }))
    .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name));
};

/** Each step counts sessions that did that step and every earlier step. */
const funnel = (events: SummaryEvent[]) => {
  let reached: Set<string> | null = null;
  return FUNNEL.map((step) => {
    const did = sessionsBy(events, (e) => e.name === step);
    reached = reached ? new Set([...reached].filter((s) => did.has(s))) : did;
    return { step, sessions: reached.size };
  });
};

const experiments = (events: SummaryEvent[]) => {
  const trial = sessionsBy(events, (e) => e.name === 'trial_started');
  const checkout = sessionsBy(events, (e) => e.name === 'checkout_opened');
  const groups = new Map<string, { experiment: string; variant: string; sessions: Set<string> }>();
  for (const e of events) {
    if (e.name !== 'experiment_exposure' || !e.props.experiment) continue;
    const key = `${e.props.experiment}\u0000${e.props.variant}`;
    const group = groups.get(key) ?? { experiment: String(e.props.experiment), variant: String(e.props.variant), sessions: new Set<string>() };
    group.sessions.add(e.sessionId);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((g) => {
      const exposed = g.sessions.size;
      const trials = [...g.sessions].filter((s) => trial.has(s)).length;
      const checkouts = [...g.sessions].filter((s) => checkout.has(s)).length;
      return { experiment: g.experiment, variant: g.variant, exposed, trials, checkouts, trialRate: exposed ? trials / exposed : 0 };
    })
    .sort((a, b) => a.experiment.localeCompare(b.experiment) || a.variant.localeCompare(b.variant));
};

type RoutineGroup = { variant: string; exposed: Set<string>; days: Record<string, number>; limitReached: Set<string>; extraGiven: number; seePro: number; created: number; deleted: number };

const ROUTINE_STEPS: Record<string, (g: RoutineGroup, e: SummaryEvent) => void> = {
  experiment_exposure: (g, e) => void g.exposed.add(e.sessionId),
  routine_days: (g, e) => {
    const days = String(e.props.days);
    if (days in g.days) g.days[days] += 1;
  },
  routine_limit: (g, e) => {
    if (e.props.step === 'reached') g.limitReached.add(e.sessionId);
    if (e.props.step === 'extra_given') g.extraGiven += 1;
    if (e.props.step === 'see_pro') g.seePro += 1;
  },
  routine_created: (g) => void (g.created += 1),
  routine_deleted: (g) => void (g.deleted += 1),
};

/** The routine limit test per group. Day milestones are sent once per device: a per-device funnel without knowing who anyone is. */
const routineLimit = (events: SummaryEvent[]) => {
  const groups = new Map<string, RoutineGroup>();
  const group = (variant: unknown) => {
    const key = String(variant);
    if (!groups.has(key)) groups.set(key, { variant: key, exposed: new Set(), days: { 1: 0, 7: 0, 28: 0 }, limitReached: new Set(), extraGiven: 0, seePro: 0, created: 0, deleted: 0 });
    return groups.get(key)!;
  };
  for (const e of events) {
    const step = ROUTINE_STEPS[e.name];
    if (!step || e.props.variant === undefined) continue;
    if (e.name === 'experiment_exposure' && e.props.experiment !== ROUTINE_TEST) continue;
    step(group(e.props.variant), e);
  }
  return [...groups.values()]
    .map((g) => ({
      variant: g.variant,
      exposed: g.exposed.size,
      reached1Day: g.days[1],
      reached7Days: g.days[7],
      reached28Days: g.days[28],
      from7To28: g.days[7] ? g.days[28] / g.days[7] : 0,
      limitReachedSessions: g.limitReached.size,
      extraGiven: g.extraGiven,
      seePro: g.seePro,
      created: g.created,
      deleted: g.deleted,
    }))
    .sort((a, b) => a.variant.localeCompare(b.variant));
};

const ads = (events: SummaryEvent[]) => {
  const rows = new Map<string, { provider: string; placement: string; impressions: number; clicks: number }>();
  for (const e of events) {
    if (e.name !== 'ad_impression' && e.name !== 'ad_click') continue;
    const key = `${e.props.provider}\u0000${e.props.placement}`;
    const row = rows.get(key) ?? { provider: String(e.props.provider), placement: String(e.props.placement), impressions: 0, clicks: 0 };
    if (e.name === 'ad_impression') row.impressions += 1;
    else row.clicks += 1;
    rows.set(key, row);
  }
  return [...rows.values()].map((r) => ({ ...r, ctr: r.impressions ? r.clicks / r.impressions : 0 }));
};

const daily = (events: SummaryEvent[]) => {
  const days = new Map<string, { day: string; events: number; sessions: Set<string> }>();
  for (const e of events) {
    const d = dayOf(e.receivedAt);
    const row = days.get(d) ?? { day: d, events: 0, sessions: new Set<string>() };
    row.events += 1;
    row.sessions.add(e.sessionId);
    days.set(d, row);
  }
  return [...days.values()].map((r) => ({ day: r.day, events: r.events, sessions: r.sessions.size })).sort((a, b) => a.day.localeCompare(b.day));
};

export const summarize = (events: SummaryEvent[], window: { from: number; to: number }) => ({
  from: new Date(window.from).toISOString(),
  to: new Date(window.to).toISOString(),
  events: events.length,
  sessions: new Set(events.map((e) => e.sessionId)).size,
  signedInSessions: sessionsBy(events, (e) => e.signedIn).size,
  totals: totals(events),
  funnel: funnel(events),
  experiments: experiments(events),
  routineLimit: routineLimit(events),
  ads: ads(events),
  daily: daily(events),
});
