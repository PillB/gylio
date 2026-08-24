import { authHeaders } from '../../../core/utils/authToken';
import { apiUrl } from '../../../core/utils/apiUrl';

export type SocialSuggestion = {
  steps: string[];
  notes?: string;
};

type FetchSocialSuggestionsArgs = {
  templateSummary: string;
  energyLevel: 'LOW' | 'MED' | 'HIGH';
  locale: string;
};

const ensureStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
};

const parseSuggestion = (payload: unknown): SocialSuggestion | null => {
  if (!payload || typeof payload !== 'object') return null;

  const parsed = payload as { steps?: unknown; notes?: unknown };
  const steps = ensureStringArray(parsed.steps).slice(0, 5);
  if (steps.length < 3) return null;

  const notes = typeof parsed.notes === 'string' ? parsed.notes.trim() : undefined;
  return { steps, notes };
};

export const fetchSocialSuggestions = async ({
  templateSummary,
  energyLevel,
  locale
}: FetchSocialSuggestionsArgs): Promise<SocialSuggestion | null> => {
  const response = await fetch(apiUrl('/api/ai/social-suggestions'), {
    method: 'POST',
    headers: await authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      templateSummary,
      energyLevel,
      locale
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as unknown;
  return parseSuggestion(data);
};
