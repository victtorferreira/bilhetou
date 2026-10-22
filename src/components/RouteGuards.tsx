import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useDemoSession } from '../hooks/useDemoSession';
import BackendState from './BackendState';

export function RequireParticipant() {
  const { participant, initialized, loading, error } = useDemoSession();
  if (!initialized || loading || error) return <BackendState/>;
  return participant ? <Outlet/> : <Navigate to="/" replace/>;
}

export function RequireSelection() {
  const { selectedIds, orders } = useDemoSession();
  const { pathname } = useLocation();
  return selectedIds.length ? <Outlet/> : <Navigate to={pathname === '/pagamento' && orders.length ? '/confirmacao' : '/bilhetes'} replace/>;
}
