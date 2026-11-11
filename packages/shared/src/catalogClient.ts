import { HttpError } from './errors';

/** The slice of a tome that other services need to know about. */
export interface TomeSummary {
  id: number;
  title: string;
  priceCp: number;
  stock: number;
}

/**
 * How the patrons and incidents services talk to the catalog service.
 * They never touch catalog tables directly; they go through its API,
 * forwarding the signed-in staff member's token.
 */
export interface CatalogClient {
  getTome(id: number, token: string): Promise<TomeSummary>;
  adjustStock(id: number, delta: number, reason: string, token: string): Promise<TomeSummary>;
}

export function createHttpCatalogClient(baseUrl: string): CatalogClient {
  async function call(path: string, token: string, init: RequestInit = {}): Promise<TomeSummary> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      });
    } catch {
      throw new HttpError(503, 'The catalog is not answering — try again in a moment');
    }
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new HttpError(response.status, body.error ?? 'The catalog refused the request');
    return body as TomeSummary;
  }

  return {
    getTome: (id, token) => call(`/tomes/${id}`, token),
    adjustStock: (id, delta, reason, token) =>
      call(`/tomes/${id}/stock-adjustments`, token, { method: 'POST', body: JSON.stringify({ delta, reason }) }),
  };
}
