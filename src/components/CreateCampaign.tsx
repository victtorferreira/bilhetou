import { useState, type FormEvent } from 'react';
import { apiRequest } from '../services/api';

export default function CreateCampaign({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [prize, setPrize] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      await apiRequest('/admin/campaigns', { name: name.trim(), ticketPriceCents: Math.round(Number(price) * 100), ...(prize ? { prizeCents: Math.round(Number(prize) * 100) } : {}), ...(closesAt ? { closesAt: new Date(closesAt).toISOString() } : {}), status });
      setName(''); setPrice(''); setPrize(''); setClosesAt(''); onCreated();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível cadastrar a campanha.'); }
    finally { setBusy(false); }
  }
  return <form className="flow-card" onSubmit={submit}><h2>Cadastrar campanha</h2><fieldset disabled={busy}><label>Nome da campanha<input value={name} minLength={3} maxLength={120} required onChange={e => setName(e.target.value)}/></label><div className="creation-fields"><label>Valor por bilhete (R$)<input type="number" min="0.01" max="1000000" step="0.01" value={price} required onChange={e => setPrice(e.target.value)}/></label><label>Prêmio (R$, opcional)<input type="number" min="0" max="20000000" step="0.01" value={prize} onChange={e => setPrize(e.target.value)}/></label></div><div className="creation-fields"><label>Encerramento (opcional)<input type="datetime-local" value={closesAt} onChange={e => setClosesAt(e.target.value)}/></label><label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="OPEN">Aberta</option><option value="DRAFT">Rascunho</option></select></label></div>{error && <p role="alert" className="form-error">{error}</p>}<button className="btn primary">{busy ? 'Cadastrando...' : 'Cadastrar campanha'}</button></fieldset><p className="muted">Depois de cadastrar, crie ou importe os bilhetes para abastecer a campanha.</p></form>;
}
