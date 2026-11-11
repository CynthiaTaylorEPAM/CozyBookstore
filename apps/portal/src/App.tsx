import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { ShopLayout } from './components/ShopLayout';
import { Dashboard } from './pages/Dashboard';
import { Incidents } from './pages/Incidents';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { PatronDetail } from './pages/PatronDetail';
import { Patrons } from './pages/Patrons';
import { Tomes } from './pages/Tomes';

/** Everything under /shop is behind the staff door. */
function StaffOnly() {
  const { staff } = useAuth();
  return staff ? <ShopLayout /> : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/shop" element={<StaffOnly />}>
        <Route index element={<Dashboard />} />
        <Route path="tomes" element={<Tomes />} />
        <Route path="patrons" element={<Patrons />} />
        <Route path="patrons/:id" element={<PatronDetail />} />
        <Route path="incidents" element={<Incidents />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
