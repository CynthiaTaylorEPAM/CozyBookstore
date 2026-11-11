import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Crest } from '../components/Crest';

// Demo accounts, shown on the page so anyone at the offsite can sign in.
const DEMO_ACCOUNTS = [
  { username: 'mirabel', password: 'griffin', who: 'Mirabel Thistlewick', role: 'Owner', can: 'Everything: prices, takings, tiers, resolving incidents' },
  { username: 'pip', password: 'quill', who: 'Pip Underbough', role: 'Clerk', can: 'Sell tomes, register patrons, report monsters' },
];

export function Login() {
  const { staff, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (staff) return <Navigate to="/shop" replace />;

  async function signIn(name: string, pass: string) {
    setBusy(true);
    setError(null);
    try {
      await login(name, pass);
      navigate('/shop');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void signIn(username, password);
  }

  return (
    <div className="login">
      <div className="login__card">
        <Link to="/" className="login__brand">
          <Crest size={56} />
        </Link>
        <h1>The staff door</h1>
        <p className="muted">Knock twice, then say who you are.</p>

        <form onSubmit={onSubmit} className="form">
          <label>
            Name
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="button button--primary" disabled={busy || !username || !password}>
            {busy ? 'Unlocking…' : 'Come in'}
          </button>
        </form>

        <div className="login__demo">
          <p className="eyebrow">Demo accounts</p>
          {DEMO_ACCOUNTS.map((account) => (
            <button key={account.username} className="login__account" disabled={busy} onClick={() => signIn(account.username, account.password)}>
              <span>
                <strong>{account.who}</strong> · {account.role}
                <small>{account.can}</small>
              </span>
              <code>
                {account.username} / {account.password}
              </code>
            </button>
          ))}
        </div>
        <Link to="/" className="login__back">
          ← Back to the shop front
        </Link>
      </div>
    </div>
  );
}
