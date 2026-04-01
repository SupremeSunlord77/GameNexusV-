export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Strips markdown code fences (```json ... ```) from a model response
 * and parses the result as JSON. Throws ParseError on failure.
 */
export function parseModelJson(raw: string): unknown {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  try {
    return JSON.parse(stripped);
  } catch (e) {
    throw new ParseError(
      `Failed to parse model JSON: ${(e as Error).message}\nRaw: ${raw}`
    );
  }
}
