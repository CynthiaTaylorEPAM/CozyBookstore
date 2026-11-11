import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { RACES, TIERS } from '../lore';
import { formatMoney, when } from '../money';
import type { Patron } from '../types';
import { useLoad } from '../useLoad';

export function PatronDetail() {
  const { id } = useParams();
  const { isOwner } = useAuth();
  const patron = useLoad<Patron>(`/patrons/${id}`);
  const [error, setError] = useState<string | null>(null);

  async function changeTier(tier: string) {
    try {
      await api(`/patrons/${id}`, { method: 'PATCH', body: { tier } });
      patron.reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (patron.error) return <p className="error">{patron.error}</p>;
  if (!patron.data) return null;
  const { data } = patron;
  const sales = data.sales ?? [];

  return (
    <>
      <Link to="/shop/patrons" className="text-link">
        ← All patrons
      </Link>
      <header className="page-header">
        <div className="patron-head">
          <span className="patron-head__icon">{RACES[data.race]?.icon ?? '🧙'}</span>
          <div>
            <p className="eyebrow capitalise">
              {data.race}
              {data.home && ` of ${data.home}`}
            </p>
            <h1>{data.name}</h1>
          </div>
        </div>
        <div className="tier-box">
          <span className="stat__label">Membership</span>
          {isOwner ? (
            <select value={data.tier} onChange={(e) => changeTier(e.target.value)} aria-label="Membership tier">
              {Object.entries(TIERS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          ) : (
            <span className={`badge badge--${data.tier}`}>{TIERS[data.tier] ?? data.tier}</span>
          )}
        </div>
      </header>
      {error && <p className="error">{error}</p>}

      {data.notes && (
        <section className="panel note">
          <p className="eyebrow">Shopkeeper's notes</p>
          <p>{data.notes}</p>
        </section>
      )}

      <section className="panel">
        <h2>Purchases</h2>
        {sales.length === 0 ? (
          <p className="muted">Nothing yet. Still browsing.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tome</th>
                <th>When</th>
                <th>Sold by</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <strong>{sale.tomeTitle}</strong>
                    {sale.quantity > 1 && <span className="muted"> × {sale.quantity}</span>}
                  </td>
                  <td>{when(sale.soldAt)}</td>
                  <td className="capitalise">{sale.soldBy}</td>
                  <td className="num">{formatMoney(sale.totalCp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
