import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Download, LoaderCircle, Plus, RefreshCw, Ticket } from 'lucide-react';
import { maxBatchSize, type TicketBatchDraft } from '../services/ticketCreation';
import type { TicketEntry } from '../types';
import { createApiTicketService, listApiCampaigns, type ApiCampaign } from '../services/ticketCreationApi';
import ApiTicketStock from './ApiTicketStock';

export default function CreateTickets() {
  const [apiCampaigns, setApiCampaigns] = useState<ApiCampaign[]>([]);
  const [apiCampaignId, setApiCampaignId] = useState('');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiReload, setApiReload] = useState(0);
  const [stockVersion, setStockVersion] = useState(0);
  const [quantity, setQuantity] = useState('10');
  const [prefix, setPrefix] = useState('BIL');
  const uniqueNumbers = true;
  const [draft, setDraft] = useState<TicketBatchDraft | null>(null);
  const [saved, setSaved] = useState<TicketEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);

  useEffect(() => {
    let active = true;
    setApiLoading(true);
    setError('');
    listApiCampaigns().then(data => {
      if (!active) return;
      data = data.filter(campaign => ['DRAFT', 'OPEN'].includes(campaign.status));
      setApiCampaigns(data);
      setApiCampaignId(data[0]?.id ?? '');
      if (!data.length) setError('Nenhuma campanha demonstrativa encontrada. Execute import:demo no backend para cadastrar uma.');
    }).catch(error => { if (active) { setApiCampaigns([]); setApiCampaignId(''); setError(error instanceof Error ? error.message : 'Não foi possível conectar à API.'); } }).finally(() => { if (active) setApiLoading(false); });
    return () => { active = false; };
  }, [apiReload]);

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    setSaved([]);
    try {
      if (!apiCampaignId) throw new Error('Selecione uma campanha da API.');
      const service = createApiTicketService(apiCampaignId);
      setDraft(await service.preview({ quantity: Number(quantity), prefix, uniqueNumbers }));
    }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível gerar os bilhetes.'); }
    finally { locked.current = false; setBusy(false); }
  }

  async function confirm() {
    if (locked.current || !draft) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const service = createApiTicketService(draft.api.campaignId);
      setSaved(await service.confirm(draft)); setDraft(null); setStockVersion(current => current + 1);
    }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível adicionar o lote.'); }
    finally { locked.current = false; setBusy(false); }
  }

  function exportCsv() {
    const csv = ['serial,number1,number2,number3,number4', ...saved.map(ticket => [ticket.serial, ...ticket.numbers].join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `bilhetou-${saved[0].serial}-${saved.length}-bilhetes.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="ticket-creation flow-card" aria-label="Criação de bilhetes"><div className="creation-heading"><span className="detail-icon"><Ticket size={22}/></span><div><span className="eyebrow">ABASTECER O ESTOQUE</span><h2>Criar bilhetes</h2></div></div><p className="muted">Gere um lote, confira os números e adicione os bilhetes à campanha demonstrativa. Eles só entram no estoque após sua confirmação.</p>
    <div className="creation-api-campaign"><label htmlFor="api-campaign">Campanha no backend<select id="api-campaign" value={apiCampaignId} disabled={apiLoading || busy || !!draft} onChange={event => { setApiCampaignId(event.target.value); setSaved([]); }}><option value="">{apiLoading ? 'Conectando...' : 'Selecione uma campanha'}</option>{apiCampaigns.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{!draft && <button className="btn outline" disabled={apiLoading || busy} onClick={() => setApiReload(value => value + 1)}><RefreshCw size={16}/> Reconectar</button>}</div>
    <form onSubmit={generate} noValidate><fieldset disabled={busy || !!draft || apiLoading || !apiCampaignId}><div className="creation-fields"><label htmlFor="batch-quantity">Quantidade de bilhetes<input id="batch-quantity" type="number" inputMode="numeric" min={1} max={maxBatchSize} step={1} required value={quantity} onChange={event => setQuantity(event.target.value)} aria-describedby="batch-limit"/></label><label htmlFor="batch-prefix">Prefixo do serial<input id="batch-prefix" value={prefix} maxLength={12} required onChange={event => setPrefix(event.target.value.toUpperCase())} placeholder="BIL"/></label></div><p id="batch-limit" className="creation-help">De 1 a 1.000 por lote. Seriais sequenciais, como BIL-000001, sem duplicar o estoque existente.</p><p className="creation-help">Exclusividade obrigatória: cada número pertence a um único bilhete da campanha. Máximo de 2.500 bilhetes por campanha.</p>{!draft && <button className="btn primary" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={18} className="spin"/> Gerando...</> : <><Plus size={18}/> Gerar prévia</>}</button>}</fieldset></form>
    {error && <p className="form-error" role="alert">{error}</p>}
    {draft && <div className="batch-preview"><div className="batch-preview-heading"><h3>Prévia de {draft.tickets.length} bilhete(s)</h3><span className="pill amber">Ainda não adicionado</span></div><p className="muted">{draft.tickets[0].serial} até {draft.tickets[draft.tickets.length - 1].serial}. Exibindo os primeiros {Math.min(10, draft.tickets.length)} registros.</p><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Serial</th><th>Quatro números</th></tr></thead><tbody>{draft.tickets.slice(0, 10).map(ticket => <tr key={ticket.serial}><td>{ticket.serial}</td><td>{ticket.numbers.join(' · ')}</td></tr>)}</tbody></table></div><div className="creation-actions"><button className="btn primary" disabled={busy} onClick={confirm}>{busy ? <><LoaderCircle size={18} className="spin"/> Adicionando...</> : <><CheckCircle2 size={18}/> Adicionar {draft.tickets.length} bilhete(s) ao estoque</>}</button><button className="btn outline" disabled={busy} onClick={() => { setDraft(null); setError(''); }}><RefreshCw size={17}/> Descartar e alterar</button></div></div>}
    {!!saved.length && <div className="batch-success" role="status"><CheckCircle2 size={22}/><div><strong>{saved.length} bilhete(s) criado(s) e adicionado(s) ao estoque demonstrativo.</strong><p>{saved[0].serial} até {saved[saved.length - 1].serial}. Salvos no banco de dados e disponíveis para os participantes.</p><button className="btn outline" onClick={exportCsv}><Download size={17}/> Baixar lote em CSV</button></div></div>}
    {apiCampaignId && <ApiTicketStock key={apiCampaignId} campaignId={apiCampaignId} refresh={stockVersion}/>}
    <p className="creation-help creation-local-notice">Os bilhetes são criados e salvos pelo servidor. A prévia expira em 15 minutos e não reserva estoque.</p>
  </section>;
}
