import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Modal } from '../components/Modal';
import { RACES, TIERS } from '../lore';
import { formatMoney } from '../money';
import type { Patron } from '../types';
import { useLoad } from '../useLoad';

export function Patrons() {
  const patrons = useLoad<Patron[]>('/patrons');
  const [adding, setAdding] = useState(false);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">The guest book</p>
          <h1>Patrons</h1>
        </div>
        <button className="button button--primary" onClick={() => setAdding(true)}>
          + Register a patron
        </button>
      </header>

      {patrons.error && <p className="error">{patrons.error}</p>}
      <div className="card-grid">
        {patrons.data?.map((patron) => (
          <Link key={patron.id} to={`/shop/patrons/${patron.id}`} className="patron-card">
            <span className="patron-card__icon">{RACES[patron.race]?.icon ?? '🧙'}</span>
            <div>
              <strong>{patron.name}</strong>
              <span className="muted capitalise">
                {patron.race}
                {patron.home && ` · ${patron.home}`}
              </span>
              <span className="patron-card__foot">
                <span className={`badge badge--${patron.tier}`}>{TIERS[patron.tier] ?? patron.tier}</span>
                <span>{formatMoney(patron.totalSpentCp ?? 0)} spent</span>
              </span>
            </div>
          </Link>
        ))}
      </div>

      {adding && (
        <AddPatronDialog
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            patrons.reload();
          }}
        />
      )}
    </>
  );
}

function AddPatronDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', race: 'human', home: '', notes: '' });
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api('/patrons', { method: 'POST', body: form });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal title="Register a patron" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
        </label>
        <div className="form__row">
          <label>
            Folk
            <select value={form.race} onChange={(e) => setForm({ ...form, race: e.target.value })}>
              {Object.keys(RACES).map((race) => (
                <option key={race}>{race}</option>
              ))}
            </select>
          </label>
          <label>
            Hails from
            <input value={form.home} onChange={(e) => setForm({ ...form, home: e.target.value })} />
          </label>
        </div>
        <label>
          Notes
          <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Likes, dislikes, known curses…" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button button--primary">Add to the guest book</button>
      </form>
    </Modal>
  );
}
