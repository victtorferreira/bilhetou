import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { apiRequest } from '../services/api';

export default function AdminSession({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { apiRequest('/admin/session').then(() => setAuthenticated(true)).catch(() => {}).finally(() => setLoading(false)); }, []);
  async function login(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('');
    try { await apiRequest('/admin/session', { secret }); setSecret(''); setAuthenticated(true); }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível entrar.'); }
    finally { setLoading(false); }
  }
  if (loading) return <p role="status">Verificando acesso administrativo...</p>;
  if (!authenticated) return <form className="flow-card" onSubmit={login}><h1>Acesso administrativo</h1><p>Informe a credencial da sua organização.</p><label>Credencial<input type="password" autoComplete="current-password" value={secret} required maxLength={512} onChange={event => setSecret(event.target.value)}/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn primary">Entrar</button></form>;
  return <><button className="btn outline" onClick={async () => { try { await apiRequest('/admin/session/logout', {}); } finally { setAuthenticated(false); } }}>Sair da administração</button>{children}</>;
}
