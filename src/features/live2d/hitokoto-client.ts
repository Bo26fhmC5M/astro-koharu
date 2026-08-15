export interface HitokotoResult {
  text: string;
  from?: string;
  creator?: string;
}

export async function fetchHitokoto(url: string, signal: AbortSignal): Promise<HitokotoResult> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = (await response.json()) as { hitokoto?: unknown; from?: unknown; creator?: unknown };
  if (typeof result.hitokoto !== 'string' || !result.hitokoto.trim()) {
    throw new TypeError('Hitokoto response does not contain text.');
  }
  return {
    text: result.hitokoto,
    from: typeof result.from === 'string' ? result.from : undefined,
    creator: typeof result.creator === 'string' ? result.creator : undefined,
  };
}
