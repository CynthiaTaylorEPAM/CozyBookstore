import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { MOODS, MONSTERS } from '../lore';
import { formatMoney, when } from '../money';
import type { Incident, Sale, SalesSummary, ShopStatus, Tome } from '../types';
import { useLoad } from '../useLoad';

const LOW_STOCK = 2;

export function Dashboard() {
  const { staff, isOwner } = useAuth();
  const status = useLoad<ShopStatus>('/public/shop-status');
  const tomes = useLoad<Tome[]>('/tomes');
  const sales = useLoad<Sale[]>('/sales');
  const incidents = useLoad<Incident[]>('/incidents?status=open');
  // Only the owner may see the takings, so only the owner asks for them.
  const summary = useLoad<SalesSummary>(isOwner ? '/sales/summary' : null);

  const lowStock = (tomes.data ?? []).filter((tome) => tome.stock <= LOW_STOCK);
  const mood = status.data ? MOODS[status.data.mood] : null;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">The counter</p>
          <h1>Good day, {staff?.displayName.split(' ')[0]}</h1>
        </div>
        {mood && status.data && (
          <div className={`mood mood--${status.data.mood}`}>
            <strong>{mood.label}</strong>
            <span>{mood.line}</span>
          </div>
        )}
      </header>

      <section className="stat-row">
        {isOwner ? (
          <>
            <div className="stat">
              <span className="stat__label">Takings, last 7 days</span>
              <span className="stat__value">{summary.data ? formatMoney(summary.data.last7DaysCp) : '…'}</span>
            </div>
            <div className="stat">
              <span className="stat__label">Takings, all time</span>
              <span className="stat__value">{summary.data ? formatMoney(summary.data.allTimeCp) : '…'}</span>
            </div>
          </>
        ) : (
          <div className="stat stat--locked">
            <span className="stat__label">Takings</span>
            <span className="stat__note">🔒 The strongbox is the owner's business.</span>
          </div>
        )}
        <div className="stat">
          <span className="stat__label">Tomes on the shelves</span>
          <span className="stat__value">{tomes.data ? tomes.data.reduce((sum, tome) => sum + tome.stock, 0) : '…'}</span>
        </div>
        <div className="stat">
          <span className="stat__label">Open incidents</span>
          <span className="stat__value">{incidents.data?.length ?? '…'}</span>
        </div>
      </section>

      <div className="grid-2">
        <section className="panel">
          <h2>Creatures at large</h2>
          {incidents.data?.length === 0 && <p className="muted">Not a claw, tentacle or footnote out of place.</p>}
          <ul className="plain-list">
            {incidents.data?.map((incident) => (
              <li key={incident.id}>
                <span className="list-icon">{MONSTERS[incident.monster]?.icon ?? '❓'}</span>
                <div>
                  <strong className="capitalise">{incident.monster}</strong> <span className={`badge badge--${incident.severity}`}>{incident.severity}</span>
                  <p>{incident.description}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/shop/incidents" className="text-link">
            Go to the incident board →
          </Link>
        </section>

        <section className="panel">
          <h2>Running low</h2>
          {lowStock.length === 0 && <p className="muted">Every shelf is comfortably full.</p>}
          <ul className="plain-list">
            {lowStock.map((tome) => (
              <li key={tome.id}>
                <span className="list-icon">📕</span>
                <div>
                  <strong>{tome.title}</strong>
                  <p>{tome.stock === 0 ? 'None left' : `${tome.stock} left`}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link to="/shop/tomes" className="text-link">
            Go to the shelves →
          </Link>
        </section>

        <section className="panel">
          <h2>Latest sales</h2>
          <table className="table">
            <tbody>
              {sales.data?.slice(0, 6).map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <strong>{sale.tomeTitle}</strong>
                    <br />
                    <span className="muted">
                      {sale.quantity} × to <Link to={`/shop/patrons/${sale.patronId}`}>{sale.patronName}</Link> · {when(sale.soldAt)}
                    </span>
                  </td>
                  <td className="num">{formatMoney(sale.totalCp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {isOwner && (
          <section className="panel">
            <h2>Best sellers</h2>
            <table className="table">
              <tbody>
                {summary.data?.bestSellers.map((row) => (
                  <tr key={row.tomeTitle}>
                    <td>
                      <strong>{row.tomeTitle}</strong>
                      <br />
                      <span className="muted">{row.copies} sold</span>
                    </td>
                    <td className="num">{formatMoney(row.totalCp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </>
  );
}
