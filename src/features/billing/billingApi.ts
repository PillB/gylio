/**
 * billingApi — typed calls to the billing, feedback and admin endpoints.
 * Every call carries the Clerk session token; the server decides entitlement.
 */
import { authHeaders } from '../../core/utils/authToken';
import { apiUrl } from '../../core/utils/apiUrl';

export type Currency = 'USD' | 'PEN';

export type CatalogPlan = {
  id: 'pro_monthly' | 'pro_yearly';
  interval: 'month' | 'year';
  prices: Record<Currency, number>;
  available: boolean;
};

export type CatalogPass = { id: string; days: number; currency: Currency; amountMinor: number; available: boolean };

export type Catalog = { trialDays: number; plans: CatalogPlan[]; passes: CatalogPass[] };

export type Entitlement = {
  plan: 'pro' | 'free';
  source: 'subscription' | 'gift' | 'trial' | null;
  expiresAt: string | null;
  renews: boolean;
  isAdmin?: boolean;
  trial: { eligible: boolean; endsAt: string | null };
  subscription: null | {
    provider: string;
    status: string;
    interval: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
};

export class ApiRequestError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers = await authHeaders(init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined);
  const response = await fetch(apiUrl(path), {
    method: init.method ?? 'GET',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error ?? {};
    throw new ApiRequestError(response.status, error.code ?? 'HTTP_ERROR', error.message ?? `HTTP ${response.status}`);
  }
  return payload as T;
}

// Fallback so the pricing page still shows prices when the API is unreachable.
export const FALLBACK_CATALOG: Catalog = {
  trialDays: 7,
  plans: [
    { id: 'pro_monthly', interval: 'month', prices: { USD: 699, PEN: 1490 }, available: false },
    { id: 'pro_yearly', interval: 'year', prices: { USD: 4999, PEN: 9900 }, available: false },
  ],
  passes: [],
};

export const billingApi = {
  plans: () => request<Catalog>('/api/billing/plans'),
  entitlement: () => request<Entitlement>('/api/billing/entitlement'),
  startTrial: () => request<Entitlement>('/api/billing/trial', { method: 'POST', body: {} }),
  checkout: (planId: CatalogPlan['id']) =>
    request<{ transactionId: string }>('/api/billing/checkout', { method: 'POST', body: { planId } }),
  passCheckout: (passId: string, returnUrl: string) =>
    request<{ url: string }>('/api/billing/pass-checkout', { method: 'POST', body: { passId, returnUrl } }),
  portal: () => request<{ url: string }>('/api/billing/portal', { method: 'POST', body: {} }),
};

export type FeedbackKind = 'bug' | 'idea' | 'question' | 'praise';
export type FeedbackStatus = 'new' | 'triaged' | 'in_progress' | 'fixed' | 'wont_fix' | 'duplicate';
export type Severity = 'blocker' | 'high' | 'medium' | 'low';

export type FeedbackInput = {
  kind: FeedbackKind;
  title: string;
  description: string;
  severity?: Severity | null;
  stepsToReproduce?: string;
  expected?: string;
  actual?: string;
  route?: string;
  context?: Record<string, unknown>;
};

export type FeedbackReport = FeedbackInput & {
  id: string;
  status: FeedbackStatus;
  userId?: string | null;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const feedbackApi = {
  submit: (input: FeedbackInput) => request<FeedbackReport>('/api/feedback', { method: 'POST', body: input }),
  mine: () => request<{ reports: FeedbackReport[] }>('/api/feedback/mine'),
};

export type Gift = {
  id: string;
  userId: string | null;
  email: string | null;
  startsAt: string;
  endsAt: string | null;
  reason: string;
  note: string | null;
  grantedBy: string;
  grantedAt: string;
  revokedAt: string | null;
  state: 'active' | 'scheduled' | 'ended' | 'revoked';
};

export type ProUser = Entitlement & { userId: string; email: string | null };

export type GiftRequest = { email?: string; userId?: string; days: number | null; reason: string; note?: string };

export const adminApi = {
  proAccess: () => request<{ users: ProUser[]; gifts: Gift[] }>('/api/admin/pro-access'),
  grantGift: (gift: GiftRequest) => request<Gift>('/api/admin/gifts', { method: 'POST', body: gift }),
  revokeGift: (id: string) => request<Gift>(`/api/admin/gifts/${encodeURIComponent(id)}/revoke`, { method: 'POST', body: {} }),
  feedback: (filters: { status?: string; kind?: string } = {}) => {
    const query = new URLSearchParams(Object.entries(filters).filter(([, v]) => Boolean(v)) as [string, string][]);
    const qs = query.toString();
    return request<{ reports: FeedbackReport[] }>(`/api/admin/feedback${qs ? `?${qs}` : ''}`);
  },
  triage: (id: string, patch: { status?: FeedbackStatus; adminNote?: string; severity?: Severity | null }) =>
    request<FeedbackReport>(`/api/admin/feedback/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch }),
};
