export type SocialSuggestion = {
  steps: string[];
  notes?: string;
};

type FetchSocialSuggestionsArgs = {
  templateSummary: string;
  energyLevel: 'LOW' | 'MED' | 'HIGH';
  locale: string;
};

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL ?? 'gpt-4o-mini';

const ensureStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
};

const parseSuggestion = (payload: string): SocialSuggestion | null => {
  try {
    const parsed = JSON.parse(payload) as { steps?: unknown; notes?: unknown };
    const steps = ensureStringArray(parsed.steps);
    if (!steps.length) return null;
    const notes = typeof parsed.notes === 'string' ? parsed.notes.trim() : undefined;
    return { steps, notes };
  } catch (error) {
    return null;
  }
};

export const fetchSocialSuggestions = async ({
  templateSummary,
  energyLevel,
  locale
}: FetchSocialSuggestionsArgs): Promise<SocialSuggestion | null> => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) return null;

  const systemPrompt =
    'You are helping generate short, supportive social planning steps. ' +
    'Do not include any personal data, names, or contact info. ' +
    'Keep outputs concise and low-pressure.';

  const userPrompt =
    `Locale: ${locale}. Energy level: ${energyLevel}. ` +
    `Template summary: ${templateSummary}. ` +
    'Return JSON with keys "steps" (array of 3-5 short steps) and optional "notes". ' +
    'Avoid personal data and keep tone gentle.';

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? '';
  return parseSuggestion(content);
};
