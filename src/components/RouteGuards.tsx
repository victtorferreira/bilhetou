import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useParticipantSession } from '../hooks/useParticipantSession';
import BackendState from './BackendState';

export function RequireParticipant() {
  const { participant, initialized, loading, error } = useParticipantSession();
  if (!initialized || loading || error) return <BackendState/>;
  return participant ? <Outlet/> : <Navigate to="/" replace/>;
}

export function RequireSelection() {
  const { selectedIds, orders } = useParticipantSession();
  const { pathname } = useLocation();
  return selectedIds.length ? <Outlet/> : <Navigate to={pathname === '/confirmar-pedido' && orders.length ? '/confirmacao' : '/bilhetes'} replace/>;
}
