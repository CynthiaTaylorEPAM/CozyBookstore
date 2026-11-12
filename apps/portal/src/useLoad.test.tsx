import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { pretendApi, refuse } from './test/harness';
import { useLoad } from './useLoad';

describe('useLoad', () => {
  it('starts empty, then holds what the API sent', async () => {
    pretendApi({ 'GET /tomes': [{ id: 1 }] });
    const { result } = renderHook(() => useLoad<{ id: number }[]>('/tomes'));
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.data).toEqual([{ id: 1 }]));
    expect(result.current.error).toBeNull();
  });

  it("holds the API's message when the request is refused", async () => {
    pretendApi({ 'GET /tomes': refuse(503, 'The catalog is not answering') });
    const { result } = renderHook(() => useLoad('/tomes'));
    await waitFor(() => expect(result.current.error).toBe('The catalog is not answering'));
    expect(result.current.data).toBeNull();
  });

  it('asks nothing when given no path', async () => {
    const gateway = pretendApi({});
    const { result } = renderHook(() => useLoad(null));
    await act(async () => result.current.reload());
    expect(gateway.calls).toEqual([]);
  });

  it('fetches again on reload, and clears an earlier error', async () => {
    const gateway = pretendApi({ 'GET /tomes': refuse(503, 'Not answering') });
    const { result } = renderHook(() => useLoad<number[]>('/tomes'));
    await waitFor(() => expect(result.current.error).toBe('Not answering'));

    gateway.answers['GET /tomes'] = [1, 2];
    await act(async () => result.current.reload());
    await waitFor(() => expect(result.current.data).toEqual([1, 2]));
    expect(result.current.error).toBeNull();
  });

  it('fetches again when the path changes', async () => {
    const gateway = pretendApi({ 'GET /tomes?q=tea': ['tea'], 'GET /tomes?q=ale': ['ale'] });
    const { result, rerender } = renderHook(({ path }) => useLoad<string[]>(path), { initialProps: { path: '/tomes?q=tea' } });
    await waitFor(() => expect(result.current.data).toEqual(['tea']));
    rerender({ path: '/tomes?q=ale' });
    await waitFor(() => expect(result.current.data).toEqual(['ale']));
    expect(gateway.calls.map((call) => call.path)).toEqual(['/tomes?q=tea', '/tomes?q=ale']);
  });
});
