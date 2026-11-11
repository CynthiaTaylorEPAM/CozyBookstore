import { type FormEvent, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Modal } from '../components/Modal';
import { MONSTERS, SEVERITIES } from '../lore';
import { when } from '../money';
import type { Incident, Tome, Ward } from '../types';
import { useLoad } from '../useLoad';

export function Incidents() {
  const { isOwner } = useAuth();
  const incidents = useLoad<Incident[]>('/incidents');
  const wards = useLoad<Ward[]>('/wards');
  const [reporting, setReporting] = useState(false);
  const [resolving, setResolving] = useState<Incident | null>(null);

  const open = (incidents.data ?? []).filter((incident) => incident.status === 'open');
  const resolved = (incidents.data ?? []).filter((incident) => incident.status === 'resolved');

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">Claws, teeth and footnotes</p>
          <h1>Incidents</h1>
        </div>
        <button className="button button--danger" onClick={() => setReporting(true)}>
          🔔 Report a monster
        </button>
      </header>

      <section className="ward-row">
        {wards.data?.map((ward) => (
          <div key={ward.id} className={`ward ward--${ward.status}`}>
            <span className="ward__dot" />
            <div>
              <strong>{ward.name}</strong>
              <span className="muted">
                {ward.location} · {ward.status}
              </span>
            </div>
          </div>
        ))}
      </section>

      <h2 className="section-title">At large ({open.length})</h2>
      {open.length === 0 && <p className="muted">Nothing lurking. Enjoy it while it lasts.</p>}
      <div className="incident-list">
        {open.map((incident) => (
          <IncidentCard key={incident.id} incident={incident}>
            {isOwner ? (
              <button className="button button--small" onClick={() => setResolving(incident)}>
                Mark as dealt with
              </button>
            ) : (
              <span className="muted">Only the owner can close this.</span>
            )}
          </IncidentCard>
        ))}
      </div>

      <h2 className="section-title">Dealt with ({resolved.length})</h2>
      <div className="incident-list">
        {resolved.map((incident) => (
          <IncidentCard key={incident.id} incident={incident} />
        ))}
      </div>

      {reporting && (
        <ReportDialog
          onClose={() => setReporting(false)}
          onDone={() => {
            setReporting(false);
            incidents.reload();
          }}
        />
      )}
      {resolving && (
        <ResolveDialog
          incident={resolving}
          onClose={() => setResolving(null)}
          onDone={() => {
            setResolving(null);
            incidents.reload();
          }}
        />
      )}
    </>
  );
}

function IncidentCard({ incident, children }: { incident: Incident; children?: React.ReactNode }) {
  return (
    <article className={`incident incident--${incident.status}`}>
      <span className="incident__icon">{MONSTERS[incident.monster]?.icon ?? '❓'}</span>
      <div className="incident__body">
        <header>
          <strong className="capitalise">{incident.monster}</strong>
          <span className={`badge badge--${incident.severity}`}>{incident.severity}</span>
          <span className="muted">
            reported by {incident.reportedBy} · {when(incident.reportedAt)}
          </span>
        </header>
        <p>{incident.description}</p>
        {incident.copiesDamaged > 0 && (
          <p className="incident__damage">
            📕 {incident.copiesDamaged} {incident.copiesDamaged === 1 ? 'copy' : 'copies'} of <em>{incident.tomeTitle}</em> lost
          </p>
        )}
        {incident.resolution && (
          <p className="incident__resolution">
            ✔ {incident.resolution} <span className="muted">— {incident.resolvedBy}</span>
          </p>
        )}
        {children && <footer>{children}</footer>}
      </div>
    </article>
  );
}

function ReportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const tomes = useLoad<Tome[]>('/tomes');
  const [form, setForm] = useState({ monster: 'bookwyrm', severity: 'minor', description: '', tomeId: '', copiesDamaged: 0 });
  const [error, setError] = useState<string | null>(null);
  const damagedTome = tomes.data?.find((tome) => String(tome.id) === form.tomeId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api('/incidents', {
        method: 'POST',
        body: {
          monster: form.monster,
          severity: form.severity,
          description: form.description,
          ...(form.tomeId ? { tomeId: Number(form.tomeId), copiesDamaged: form.copiesDamaged } : {}),
        },
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal title="Report a monster" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="form__row">
          <label>
            What is it?
            <select value={form.monster} onChange={(e) => setForm({ ...form, monster: e.target.value })}>
              {Object.entries(MONSTERS).map(([monster, { icon }]) => (
                <option key={monster} value={monster}>
                  {icon} {monster}
                </option>
              ))}
            </select>
          </label>
          <label>
            How bad?
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              {SEVERITIES.map((severity) => (
                <option key={severity}>{severity}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="hint">{MONSTERS[form.monster]?.habit}</p>
        <label>
          What happened?
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </label>
        <div className="form__row">
          <label>
            Tome damaged (if any)
            <select value={form.tomeId} onChange={(e) => setForm({ ...form, tomeId: e.target.value, copiesDamaged: e.target.value ? 1 : 0 })}>
              <option value="">No stock damaged</option>
              {tomes.data
                ?.filter((tome) => tome.stock > 0)
                .map((tome) => (
                  <option key={tome.id} value={tome.id}>
                    {tome.title} ({tome.stock})
                  </option>
                ))}
            </select>
          </label>
          {damagedTome && (
            <label>
              Copies lost
              <input type="number" min={0} max={damagedTome.stock} value={form.copiesDamaged} onChange={(e) => setForm({ ...form, copiesDamaged: Number(e.target.value) })} />
            </label>
          )}
        </div>
        {damagedTome && form.copiesDamaged > 0 && <p className="hint">These copies will be taken out of stock in the catalog.</p>}
        {error && <p className="error">{error}</p>}
        <button className="button button--danger">Raise the alarm</button>
      </form>
    </Modal>
  );
}

function ResolveDialog({ incident, onClose, onDone }: { incident: Incident; onClose: () => void; onDone: () => void }) {
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await api(`/incidents/${incident.id}/resolve`, { method: 'POST', body: { resolution } });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Modal title={`Deal with the ${incident.monster}`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          How was it dealt with?
          <textarea rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} required autoFocus placeholder="Bribed with biscuits, banished, hired as staff…" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button button--primary">Close the incident</button>
      </form>
    </Modal>
  );
}
