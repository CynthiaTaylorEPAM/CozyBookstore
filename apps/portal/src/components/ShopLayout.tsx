import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Crest } from './Crest';

/** The frame around every staff page: sidebar, who is signed in, sign out. */
export function ShopLayout() {
  const { staff, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="shop">
      <aside className="shop__sidebar">
        <Link to="/" className="shop__brand">
          <Crest size={36} />
          <span>The Gilded Griffin</span>
        </Link>
        <nav className="shop__nav">
          <NavLink to="/shop" end>
            🕯️ Counter
          </NavLink>
          <NavLink to="/shop/tomes">📚 Tomes</NavLink>
          <NavLink to="/shop/patrons">🧝 Patrons</NavLink>
          <NavLink to="/shop/incidents">🐉 Incidents</NavLink>
        </nav>
        <div className="shop__who">
          <strong>{staff?.displayName}</strong>
          <span className={`badge badge--${staff?.role}`}>{staff?.role}</span>
          <button
            className="button button--quiet"
            onClick={() => {
              logout();
              navigate('/');
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="shop__main">
        <Outlet />
      </main>
    </div>
  );
}
