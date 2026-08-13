// Thin client for the Metorik API. Read-only. The API key is per store and
// lives in METORIK_API_KEY (Railway variable), never in the repo.
const BASE_URL = "https://app.metorik.com/api/v1/store";

export function metorikConfigured(): boolean {
  return Boolean(process.env.METORIK_API_KEY);
}

export async function metorikGet(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<Response> {
  const key = process.env.METORIK_API_KEY;
  if (!key) throw new Error("METORIK_API_KEY is not set.");

  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  return fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
}
