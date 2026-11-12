import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpCatalogClient } from './catalogClient';

const tome = { id: 7, title: 'Dragons at Tea', priceCp: 1000, stock: 3 };

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the HTTP catalog client', () => {
  const client = createHttpCatalogClient('http://catalog.test');

  it('looks a tome up, passing the staff token along', async () => {
    const fetchMock = stubFetch(json(tome));
    await expect(client.getTome(7, 'staff-token')).resolves.toEqual(tome);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://catalog.test/tomes/7');
    expect(init?.method).toBeUndefined();
    expect(init?.headers).toMatchObject({ authorization: 'Bearer staff-token' });
  });

  it('posts a stock adjustment with its reason', async () => {
    const fetchMock = stubFetch(json({ ...tome, stock: 1 }));
    await expect(client.adjustStock(7, -2, 'Sold to Thrain', 'staff-token')).resolves.toMatchObject({ stock: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://catalog.test/tomes/7/stock-adjustments');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ delta: -2, reason: 'Sold to Thrain' });
    expect(init?.headers).toMatchObject({ authorization: 'Bearer staff-token', 'content-type': 'application/json' });
  });

  it("passes on the catalog's refusal, status and message", async () => {
    stubFetch(json({ error: 'Only 3 left on the shelf' }, 409));
    await expect(client.adjustStock(7, -4, 'Sold', 't')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Only 3 left on the shelf',
    });
  });

  it('gives a plain message when the catalog refuses without explaining', async () => {
    stubFetch(new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(client.getTome(7, 't')).rejects.toMatchObject({
      statusCode: 502,
      message: 'The catalog refused the request',
    });
  });

  it('reports 503 when the catalog cannot be reached', async () => {
    stubFetch(new TypeError('fetch failed'));
    await expect(client.getTome(7, 't')).rejects.toMatchObject({
      statusCode: 503,
      message: expect.stringContaining('not answering'),
    });
  });
});
