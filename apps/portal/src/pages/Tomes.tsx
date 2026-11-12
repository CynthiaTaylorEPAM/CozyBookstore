import { type FormEvent, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { BookCover } from '../components/BookCover';
import { Modal } from '../components/Modal';
import { CONDITIONS, GENRES } from '../lore';
import { formatMoney, goldToCopper } from '../money';
import type { Patron, Tome } from '../types';
import { useLoad } from '../useLoad';

type Dialog = { kind: 'sell' | 'restock' | 'edit'; tome: Tome } | { kind: 'add' } | null;

export function Tomes() {
  const { isOwner } = useAuth();
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);

  const query = new URLSearchParams();
  if (search) query.set('q', search);
  if (genre) query.set('genre', genre);
  const tomes = useLoad<Tome[]>(`/tomes?${query}`);

  function done() {
    setDialog(null);
    tomes.reload();
  }

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">The shelves</p>
          <h1>Tomes</h1>
        </div>
        {isOwner && (
          <button className="button button--primary" onClick={() => setDialog({ kind: 'add' })}>
            + Add a tome
          </button>
        )}
      </header>

      <div className="toolbar">
        <input type="search" placeholder="Search by title or author…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={genre} onChange={(e) => setGenre(e.target.value)} aria-label="Genre">
          <option value="">All genres</option>
          {GENRES.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>

      {tomes.error && <p className="error">{tomes.error}</p>}
      <section className="panel panel--flush">
        <table className="table table--roomy">
          <thead>
            <tr>
              <th colSpan={2}>Tome</th>
              <th>Genre</th>
              <th>Condition</th>
              <th className="num">Price</th>
              <th className="num">In stock</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tomes.data?.map((tome) => (
              <tr key={tome.id}>
                <td className="cover-cell">
                  <BookCover title={tome.title} author={tome.author} genre={tome.genre} small />
                </td>
                <td>
                  <strong>{tome.title}</strong>
                  {tome.restricted && <span className="badge badge--dire">locked cabinet</span>}
                  {tome.featured && <span className="badge badge--gold">shop window</span>}
                  <br />
                  <span className="muted">{tome.author}</span>
                </td>
                <td className="capitalise">{tome.genre}</td>
                <td>{tome.condition}</td>
                <td className="num">{formatMoney(tome.priceCp)}</td>
                <td className={`num${tome.stock === 0 ? ' out' : ''}`}>{tome.stock === 0 ? 'Sold out' : tome.stock}</td>
                <td className="actions">
                  <button className="button button--small" disabled={tome.stock === 0} onClick={() => setDialog({ kind: 'sell', tome })}>
                    Sell
                  </button>
                  <button className="button button--small button--quiet" onClick={() => setDialog({ kind: 'restock', tome })}>
                    Restock
                  </button>
                  {isOwner && (
                    <button className="button button--small button--quiet" onClick={() => setDialog({ kind: 'edit', tome })}>
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tomes.data?.length === 0 && <p className="muted pad">No tomes match. Perhaps the poltergeist moved them.</p>}
      </section>

      {dialog?.kind === 'sell' && <SellDialog tome={dialog.tome} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === 'restock' && <RestockDialog tome={dialog.tome} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === 'add' && <TomeDialog onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === 'edit' && <TomeDialog tome={dialog.tome} onClose={() => setDialog(null)} onDone={done} />}
    </>
  );
}

interface DialogProps {
  onClose: () => void;
  onDone: () => void;
}

function SellDialog({ tome, onClose, onDone }: DialogProps & { tome: Tome }) {
  const patrons = useLoad<Patron[]>('/patrons');
  const [patronId, setPatronId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api('/sales', { method: 'POST', body: { patronId: Number(patronId), tomeId: tome.id, quantity } });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal title={`Sell “${tome.title}”`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Patron
          <select value={patronId} onChange={(e) => setPatronId(e.target.value)} required>
            <option value="">Who is buying?</option>
            {patrons.data?.map((patron) => (
              <option key={patron.id} value={patron.id}>
                {patron.name} ({patron.race})
              </option>
            ))}
          </select>
        </label>
        <label>
          Copies ({tome.stock} on the shelf)
          <input type="number" min={1} max={tome.stock} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
        </label>
        <p className="total">
          Total <strong>{formatMoney(tome.priceCp * (quantity || 0))}</strong>
        </p>
        {error && <p className="error">{error}</p>}
        <button className="button button--primary" disabled={!patronId}>
          Ring it up
        </button>
      </form>
    </Modal>
  );
}

function RestockDialog({ tome, onClose, onDone }: DialogProps & { tome: Tome }) {
  const [copies, setCopies] = useState(1);
  const [reason, setReason] = useState("Delivery from the scribes' guild");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api(`/tomes/${tome.id}/stock-adjustments`, { method: 'POST', body: { delta: copies, reason } });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal title={`Restock “${tome.title}”`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Copies arriving
          <input type="number" min={1} max={500} value={copies} onChange={(e) => setCopies(Number(e.target.value))} />
        </label>
        <label>
          Note for the ledger
          <input value={reason} onChange={(e) => setReason(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button button--primary">Shelve them</button>
      </form>
    </Modal>
  );
}

/** Add a new tome, or edit an existing one (owner only). */
function TomeDialog({ tome, onClose, onDone }: DialogProps & { tome?: Tome }) {
  const [form, setForm] = useState({
    title: tome?.title ?? '',
    author: tome?.author ?? '',
    genre: tome?.genre ?? GENRES[0],
    description: tome?.description ?? '',
    priceGold: tome ? String(tome.priceCp / 100) : '',
    stock: 1,
    condition: tome?.condition ?? CONDITIONS[0],
    restricted: tome?.restricted ?? false,
    featured: tome?.featured ?? false,
    // 2 mirrors the catalog's default reorder level.
    reorderLevel: String(tome?.reorderLevel ?? 2),
  });
  const [error, setError] = useState<string | null>(null);
  const set = (changes: Partial<typeof form>) => setForm({ ...form, ...changes });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const { priceGold, stock, reorderLevel, ...details } = form;
    // Kept as text while typing so a cleared field stays blank (and `required` stops the save) instead of becoming 0.
    const body = { ...details, reorderLevel: Number(reorderLevel), priceCp: goldToCopper(priceGold) };
    try {
      if (tome) await api(`/tomes/${tome.id}`, { method: 'PATCH', body });
      else await api('/tomes', { method: 'POST', body: { ...body, stock } });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal title={tome ? 'Edit tome' : 'Add a tome'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Title
          <input value={form.title} onChange={(e) => set({ title: e.target.value })} required />
        </label>
        <label>
          Author
          <input value={form.author} onChange={(e) => set({ author: e.target.value })} required />
        </label>
        <div className="form__row">
          <label>
            Genre
            <select value={form.genre} onChange={(e) => set({ genre: e.target.value })}>
              {GENRES.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label>
            Condition
            <select value={form.condition} onChange={(e) => set({ condition: e.target.value })}>
              {CONDITIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form__row">
          <label>
            Price (gold pieces)
            <input type="number" min={0} step={0.01} value={form.priceGold} onChange={(e) => set({ priceGold: e.target.value })} required />
          </label>
          {!tome && (
            <label>
              Copies
              <input type="number" min={0} value={form.stock} onChange={(e) => set({ stock: Number(e.target.value) })} />
            </label>
          )}
          <label>
            Reorder at
            <input
              type="number"
              min={0}
              step={1}
              value={form.reorderLevel}
              onChange={(e) => set({ reorderLevel: e.target.value })}
              required
            />
          </label>
        </div>
        <label>
          Description
          <textarea rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} />
        </label>
        <label className="check">
          <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} />
          Display in the shop window (public landing page)
        </label>
        <label className="check">
          <input type="checkbox" checked={form.restricted} onChange={(e) => set({ restricted: e.target.checked })} />
          Keep in the locked cabinet
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button button--primary">{tome ? 'Save changes' : 'Add to the catalog'}</button>
      </form>
    </Modal>
  );
}
