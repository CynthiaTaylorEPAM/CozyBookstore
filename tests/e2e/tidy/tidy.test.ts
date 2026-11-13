import { describe, expect, it } from 'vitest';
import { DEV_DATABASE_URL } from '@griffin/shared';
import { decideTidy, runTidyUp } from './tidy';

describe('deciding whether to tidy up', () => {
  it('skips, and says so, when E2E_KEEP_DATA=1', () => {
    const decision = decideTidy({ E2E_KEEP_DATA: '1' });
    expect(decision.run).toBe(false);
    if (!decision.run) expect(decision.message).toContain('E2E_KEEP_DATA=1');
  });

  it.each(['https://griffin.onrender.com', 'http://localhost.example.com:8080', 'not a url'])(
    'skips for a shop that is not on this machine: %s',
    (E2E_BASE_URL) => {
      expect(decideTidy({ E2E_BASE_URL }).run).toBe(false);
    },
  );

  it('skips for a database elsewhere and names only its host', () => {
    const decision = decideTidy({ E2E_DATABASE_URL: 'postgres://u:secret@db.example.com/griffin' });
    expect(decision.run).toBe(false);
    if (!decision.run) {
      expect(decision.message).toContain('db.example.com');
      expect(decision.message).not.toContain('secret');
    }
  });

  it.each(['host', 'hostaddr'])('skips when a %s query sends a local-looking address elsewhere', (param) => {
    const decision = decideTidy({ E2E_DATABASE_URL: `postgres://u:secret@localhost/griffin?${param}=db.example.com` });
    expect(decision.run).toBe(false);
    if (!decision.run) {
      expect(decision.message).toContain('db.example.com');
      expect(decision.message).not.toContain('secret');
    }
  });

  it('tidies when a host query also points at this machine', () => {
    const databaseUrl = 'postgres://u:p@localhost/griffin?host=127.0.0.1';
    expect(decideTidy({ E2E_DATABASE_URL: databaseUrl }).run).toBe(true);
  });

  it('skips for a database address it cannot read', () => {
    expect(decideTidy({ E2E_DATABASE_URL: 'not a url' }).run).toBe(false);
  });

  it('tidies the local shop and database by default', () => {
    expect(decideTidy({})).toEqual({ run: true, databaseUrl: DEV_DATABASE_URL, host: 'localhost' });
  });

  it('tidies when both are at 127.0.0.1', () => {
    const databaseUrl = 'postgres://griffin:griffin@127.0.0.1:5432/griffin';
    expect(decideTidy({ E2E_BASE_URL: 'http://127.0.0.1:8080', E2E_DATABASE_URL: databaseUrl })).toEqual({
      run: true,
      databaseUrl,
      host: '127.0.0.1',
    });
  });

  it('never reads DATABASE_URL', () => {
    expect(decideTidy({ DATABASE_URL: 'postgres://u:p@far.example.com/x' })).toEqual({
      run: true,
      databaseUrl: DEV_DATABASE_URL,
      host: 'localhost',
    });
  });
});

describe('running the tidy-up', () => {
  it('gives one warning, and does not fail, when the database cannot be reached', async () => {
    const lines: string[] = [];

    await expect(
      runTidyUp('end', { E2E_DATABASE_URL: 'postgres://griffin:griffin@localhost:1/griffin' }, (line) => lines.push(line)),
    ).resolves.toBeUndefined();

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('localhost');
    expect(lines[0]).not.toContain('griffin:griffin');
    expect(lines[0]).not.toContain('postgres://');
  }, 15_000);

  it('says why it skipped, in one line', async () => {
    const lines: string[] = [];
    await runTidyUp('start', { E2E_KEEP_DATA: '1' }, (line) => lines.push(line));
    expect(lines).toEqual([expect.stringContaining('E2E_KEEP_DATA=1')]);
  });

  it('says E2E_KEEP_DATA=1 skipped it only once across both hooks of a run', async () => {
    const lines: string[] = [];
    const env = { E2E_KEEP_DATA: '1' };
    await runTidyUp('start', env, (line) => lines.push(line));
    await runTidyUp('end', env, (line) => lines.push(line));
    expect(lines).toEqual([expect.stringContaining('E2E_KEEP_DATA=1')]);
  });
});
