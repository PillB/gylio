const express = require('express');

const router = express.Router();

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const VALID_ENERGY_LEVELS = new Set(['LOW', 'MED', 'HIGH']);
const MAX_TEMPLATE_SUMMARY_LENGTH = 500;
const MAX_LOCALE_LENGTH = 20;

const sanitizeInlineText = (value, maxLength) => {
  if (typeof value !== 'string') return '';

  return value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
};

const parseSocialSuggestionPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return null;

  const stepsRaw = payload.steps;
  if (!Array.isArray(stepsRaw)) return null;

  const steps = stepsRaw
    .map((step) => sanitizeInlineText(step, 140))
    .filter(Boolean)
    .slice(0, 5);

  if (steps.length < 3) return null;

  const notes = sanitizeInlineText(payload.notes, 280);
  return {
    steps,
    ...(notes ? { notes } : {})
  };
};

const extractMessageContent = (data) => {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) return null;

  try {
    return JSON.parse(content);
  } catch (_error) {
    return null;
  }
};

router.post('/social-suggestions', async (req, res) => {
  const templateSummary = sanitizeInlineText(req.body?.templateSummary, MAX_TEMPLATE_SUMMARY_LENGTH);
  const energyLevel = sanitizeInlineText(req.body?.energyLevel, 4);
  const locale = sanitizeInlineText(req.body?.locale, MAX_LOCALE_LENGTH);

  if (!templateSummary || !VALID_ENERGY_LEVELS.has(energyLevel) || !locale) {
    return res.status(400).json({
      error: 'Invalid social suggestion request payload'
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'AI service unavailable' });
  }

  const systemPrompt =
    'You generate short, supportive social planning steps. ' +
    'Do not include personal data, names, contact details, or sensitive financial details. ' +
    'Keep outputs concise, practical, and low-pressure.';

  const userPrompt =
    `Locale: ${locale}. Energy level: ${energyLevel}. ` +
    `Template summary: ${templateSummary}. ` +
    'Return JSON with keys "steps" (array of 3-5 short steps) and optional "notes".';

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'social_suggestion',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                steps: {
                  type: 'array',
                  minItems: 3,
                  maxItems: 5,
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 140
                  }
                },
                notes: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 280
                }
              },
              required: ['steps']
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenAI social suggestion request failed', response.status, errorBody);
      return res.status(502).json({ error: 'Failed to generate social suggestions' });
    }

    const data = await response.json();
    const parsed = extractMessageContent(data);
    const validated = parseSocialSuggestionPayload(parsed);

    if (!validated) {
      return res.status(502).json({ error: 'Invalid AI response format' });
    }

    return res.json(validated);
  } catch (error) {
    console.error('OpenAI social suggestion request error', error);
    return res.status(502).json({ error: 'Failed to generate social suggestions' });
  }
});

module.exports = router;
