import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';
import { apiRequest } from '../services/api';

export default function AdminSession({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const expired = () => { setAuthenticated(false); setError('Sua sessão administrativa expirou. Entre novamente.'); };
    window.addEventListener('bilhetou-admin-session-expired', expired);
    apiRequest('/admin/session').then(() => { if (active) setAuthenticated(true); }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.removeEventListener('bilhetou-admin-session-expired', expired); };
  }, []);
  async function login(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try { await apiRequest('/admin/session', { secret }); await apiRequest('/admin/session'); setSecret(''); setAuthenticated(true); }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível entrar.'); }
    finally { setLoading(false); }
  }
  if (loading) return <p role="status">Verificando acesso administrativo...</p>;
  if (!authenticated) return <form className="flow-card" onSubmit={login}><h1>Acesso administrativo</h1><p>Informe a credencial da sua organização.</p><label>Credencial<input type="password" autoComplete="current-password" value={secret} required maxLength={512} onChange={event => setSecret(event.target.value)}/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn primary">Entrar</button></form>;
  const sessionActions = document.getElementById('admin-session-actions');
  return <>{sessionActions && createPortal(<button type="button" className="btn outline" onClick={async () => { try { await apiRequest('/admin/session/logout', {}); } finally { setAuthenticated(false); } }}><LogOut size={17}/> Sair da administração</button>, sessionActions)}{children}</>;
}
