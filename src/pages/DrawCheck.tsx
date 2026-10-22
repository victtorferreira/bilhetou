import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../services/api';
import { listApiCampaigns, type ApiCampaign } from '../services/ticketCreationApi';
interface Check { id: string; reference: string; number: string; actor: string; createdAt: string; snapshot: { serial: string | null; status: string | null; historicalStatus: string | null; assignedBeforeClose: boolean; message: string; note: string } }
const labels: Record<string, string> = { AVAILABLE: 'Disponível', ASSIGNED_DEMO: 'Atribuído', ASSIGNED: 'Atribuído', VOID: 'Cancelado', UNKNOWN: 'Histórico indisponível' };
export default function DrawCheck() {
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [campaign, setCampaign] = useState('');
  const [number, setNumber] = useState('');
  const [reference, setReference] = useState('');
  const [history, setHistory] = useState<Check[]>([]);
  const [result, setResult] = useState<Check | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const path = `/admin/campaigns/${encodeURIComponent(campaign)}/draws/check`;
  useEffect(() => { let active = true; listApiCampaigns().then(items => { if (active) { setCampaigns(items); setCampaign(items[0]?.id || ''); } }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  useEffect(() => {
    setResult(null); setHistory([]);
    if (!campaign) { setLoading(false); return; }
    let active = true; setLoading(true); setError('');
    apiRequest<Check[]>(path).then(items => { if (active) setHistory(items); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [campaign, path]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(''); setResult(null);
    try { const check = await apiRequest<Check>(path, { reference: reference.trim(), number }); setResult(check); setHistory(items => [check, ...items.filter(item => item.id !== check.id)].slice(0, 100)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha na conferência.'); }
    finally { setBusy(false); }
  }
  return <section className="flow-card"><span className="eyebrow">VALIDAÇÃO ADMINISTRATIVA</span><h1>Conferência de sorteio</h1><p>Confira um número de uma campanha encerrada. A conferência registra a correspondência para análise administrativa.</p><form onSubmit={submit}><fieldset disabled={busy}><label>Campanha<select value={campaign} onChange={e => setCampaign(e.target.value)}><option value="">Selecione uma campanha</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name} · {c.status}</option>)}</select></label><div className="creation-fields"><label>Referência do sorteio<input value={reference} maxLength={80} pattern="[A-Za-z0-9][A-Za-z0-9._/\-]*" placeholder="federal-2026-10-21-1" required onChange={e => setReference(e.target.value)}/></label><label>Número de quatro dígitos<input inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={number} placeholder="0038" required onChange={e => setNumber(e.target.value)}/></label></div><button className="btn primary" disabled={!campaign || loading}>{busy ? 'Conferindo...' : 'Conferir número'}</button></fieldset></form>{error && <p className="form-error" role="alert">{error}</p>}{result && <div className="flow-card" role="status"><span className={`pill ${result.snapshot.serial ? 'amber' : ''}`}>{result.number}</span><h2>{result.snapshot.message}</h2><p>Bilhete: {result.snapshot.serial ?? 'Não encontrado'}</p><p>Status atual: {labels[result.snapshot.status || ''] ?? '—'}</p><p>No encerramento: {labels[result.snapshot.historicalStatus || ''] ?? '—'}</p><p>Participante: consulte os dados do pedido no painel.</p><p className="muted">{result.snapshot.note}</p></div>}<h2>Histórico das conferências</h2><p className="muted">Uma referência identifica uma conferência. Repetir a mesma referência preserva o resultado original.</p>{loading ? <p role="status">Carregando histórico...</p> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Referência</th><th>Número</th><th>Bilhete</th><th>Status no encerramento</th><th>Administrador</th><th>Data</th></tr></thead><tbody>{history.map(c => <tr key={c.id}><td>{c.reference}</td><td>{c.number}</td><td>{c.snapshot.serial ?? 'Não encontrado'}</td><td>{labels[c.snapshot.historicalStatus || ''] ?? '—'}</td><td>{c.actor}</td><td>{new Date(c.createdAt).toLocaleString('pt-BR')}</td></tr>)}</tbody></table>{!history.length && <p>Nenhuma conferência registrada.</p>}</div>}</section>;
}
