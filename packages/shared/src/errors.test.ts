import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { HttpError, notFound, registerErrorHandler } from './errors';

function appThatFails() {
  const app = Fastify();
  registerErrorHandler(app);
  app.post('/validate', async (request) => z.object({ name: z.string() }).parse(request.body));
  app.get('/teapot', async () => {
    throw new HttpError(418, 'I am a teapot');
  });
  app.get('/missing', async () => {
    throw notFound('Tome');
  });
  app.get('/crash', async () => {
    throw new Error('password=hunter2 leaked from the database driver');
  });
  return app;
}

describe('error responses', () => {
  it('answers a failed validation with 400 and says what was wrong', async () => {
    const response = await appThatFails().inject({ method: 'POST', url: '/validate', payload: { name: 42 } });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('Invalid request');
    expect(response.json().details[0].path).toEqual(['name']);
  });

  it('sends an HttpError with its own status and message', async () => {
    const response = await appThatFails().inject({ method: 'GET', url: '/teapot' });
    expect(response.statusCode).toBe(418);
    expect(response.json()).toEqual({ error: 'I am a teapot' });
  });

  it('builds a 404 with notFound', async () => {
    const response = await appThatFails().inject({ method: 'GET', url: '/missing' });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Tome not found' });
  });

  it('keeps the same shape for errors raised by Fastify itself', async () => {
    const response = await appThatFails().inject({
      method: 'POST',
      url: '/validate',
      headers: { 'content-type': 'application/json' },
      payload: '{ not json',
    });
    expect(response.statusCode).toBe(400);
    expect(Object.keys(response.json())).toEqual(['error']);
  });

  it('hides the details of an unexpected failure', async () => {
    const response = await appThatFails().inject({ method: 'GET', url: '/crash' });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: 'Something went awry behind the counter' });
    expect(response.body).not.toContain('hunter2');
  });
});
