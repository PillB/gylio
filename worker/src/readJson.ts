export const MAX_BODY_BYTES = 64 * 1024;

/**
 * A request body as a JSON object, or null when it is not one or is over the limit.
 *
 * The limit is in bytes and is applied twice: to the size the request declares, before anything is
 * read, and to what actually arrives. It used to be applied to the decoded text's length, which
 * counts UTF-16 units: a body in an alphabet that takes three bytes a character passed at up to
 * three times the limit, and any body, however large, was read into memory before it was refused.
 */
export const readJson = async (req: Request, maxBytes = MAX_BODY_BYTES): Promise<Record<string, unknown> | null> => {
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (!Number.isFinite(declared) || declared > maxBytes) return null;
  const bytes = await req.arrayBuffer();
  if (bytes.byteLength > maxBytes) return null;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
