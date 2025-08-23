export function tryParseJsonStrict(raw) {
  if (!raw) return null;
  const cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*$/gi, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to extract the first JSON object with a regex (best effort)
    const match = cleaned.match(/\{[\s\S]*\}$/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
