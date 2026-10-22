import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clover, ListFilter, LoaderCircle, Minus, Plus, Search, Ticket, Trophy } from 'lucide-react';
import TicketCard from '../components/TicketCard';
import { useParticipantSession } from '../hooks/useParticipantSession';
import { money } from '../lib/format';
import { participantServices } from '../services/session';
import { ticketsService, type TicketPage } from '../services/tickets';
import type { SelectionMode } from '../types';

export default function TicketSelection() {
  const session = useParticipantSession();
  const { participant, selectedIds, campaign, availableCount } = session;
  const [mode, setMode] = useState<SelectionMode>('quantity');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [result, setResult] = useState<TicketPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const initialized = useRef(false);
  const available = availableCount;
  const [changing, setChanging] = useState(false);
  const actionLock = useRef(false);
  const count = selectedIds.length;

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      if (!selectedIds.length && available) void participantServices.selectQuantity(1).catch(error => setError(error.message));
    }
  }, [selectedIds.length, available]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    ticketsService.list({ query, page, selectedOnly }).then(data => { if (active) setResult(data); }).catch(() => { if (active) setError('Não foi possível carregar os bilhetes. Tente novamente.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, page, selectedOnly, session]);

  async function changeQuantity(quantity: number) {
    if (actionLock.current) return;
    actionLock.current = true;
    setChanging(true);
    try { await participantServices.selectQuantity(Math.max(1, Math.min(available, quantity))); setError(''); }
    catch (error) { setError(error instanceof Error ? error.message : 'Falha ao alterar a quantidade.'); }
    finally { actionLock.current = false; setChanging(false); }
  }

  async function toggle(id: string) {
    if (actionLock.current) return;
    actionLock.current = true;
    setChanging(true);
    try { await participantServices.select(selectedIds.includes(id) ? selectedIds.filter(value => value !== id) : [...selectedIds, id]); setError(''); }
    catch (error) { setError(error instanceof Error ? error.message : 'Falha ao selecionar o bilhete.'); }
    finally { actionLock.current = false; setChanging(false); }
  }

  if (!campaign) return <section className="empty"><h1>Nenhuma campanha disponível</h1><p>Aguarde a abertura de uma campanha.</p><Link className="btn outline" to="/">Voltar ao início</Link></section>;

  return <section className="selection-page"><div className="flow-heading"><span className="eyebrow">SEUS NÚMEROS, SUA ESCOLHA</span><h1>Olá, {participant?.name.split(' ')[0]}! <span className="gold-text">✦</span></h1><p>Escolha seus bilhetes e confira seus números da sorte.</p></div>
    <div className="selection-layout"><div><div className="campaign-mini"><div className="campaign-mini-heading"><span className="campaign-badge"><Clover size={16}/> CAMPANHA</span><Trophy size={27}/></div><h2>{campaign.name}</h2><div className="campaign-prize"><small>PRÊMIO</small><strong>{campaign.prizeCents == null ? 'Não informado' : money(campaign.prizeCents)}</strong></div><div className="campaign-mini-meta"><span><CalendarDays size={16}/>{campaign.drawDate}</span><span><Ticket size={16}/>{available} disponíveis na campanha</span></div></div>
      <div className="selection-modes" role="group" aria-label="Modo de seleção"><button className={mode === 'quantity' ? 'selected' : ''} aria-pressed={mode === 'quantity'} onClick={() => setMode('quantity')}><Plus size={17}/> Por quantidade</button><button className={mode === 'manual' ? 'selected' : ''} aria-pressed={mode === 'manual'} onClick={() => setMode('manual')}><ListFilter size={17}/> Escolher bilhetes</button></div>
      {!available ? <div className="empty"><Ticket size={32}/><h2>Todos os bilhetes foram atribuídos</h2><p>Veja seus bilhetes na sua área.</p><Link className="btn primary" to="/meus-bilhetes">Meus bilhetes</Link></div> : mode === 'quantity' ? <div className="flow-card quantity-card"><span className="eyebrow">ESCOLHA A QUANTIDADE</span><h2>Quantos bilhetes para você?</h2><p className="muted">Os bilhetes são escolhidos entre os números já cadastrados.</p><div className="large-stepper"><button className="btn outline" aria-label="Diminuir quantidade" disabled={changing || count <= 1} onClick={() => changeQuantity(count - 1)}><Minus size={22}/></button><output aria-live="polite">{count}<small>{count === 1 ? 'bilhete' : 'bilhetes'}</small></output><button className="btn outline" aria-label="Aumentar quantidade" disabled={changing || count >= Math.min(1000, available)} onClick={() => changeQuantity(count + 1)}><Plus size={22}/></button></div><div className="quantity-shortcuts">{[1, 5, 10, 20].map(quantity => <button key={quantity} className={count === quantity ? 'selected' : ''} aria-pressed={count === quantity} disabled={changing || quantity > available} onClick={() => changeQuantity(quantity)}>{quantity} {quantity === 1 ? 'bilhete' : 'bilhetes'}</button>)}</div><p className="quantity-note"><Check size={16}/> {money(campaign.ticketPriceCents)} por bilhete</p></div> : <div className="manual-selection"><div className="selection-filters"><label className="search"><Search size={18}/><input aria-label="Buscar bilhete por serial ou número" placeholder="Buscar serial ou número..." value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}/></label><label className="selected-filter"><input type="checkbox" checked={selectedOnly} onChange={event => { setSelectedOnly(event.target.checked); setPage(1); }}/> Só selecionados</label></div>
        {loading ? <p className="loading-message" role="status"><LoaderCircle size={18} className="spin"/> Carregando bilhetes...</p> : <><p className="muted result-count" role="status">{result?.total ?? 0} bilhete(s) encontrado(s)</p><div className="selection-ticket-grid">{result?.items.map(ticket => <TicketCard key={ticket.serial} ticket={ticket} selected={selectedIds.includes(ticket.id)} onToggle={() => toggle(ticket.id)}/>)}</div>{result?.total === 0 && <div className="empty compact-empty"><h3>Nenhum bilhete encontrado</h3><p>Altere a busca ou o filtro de selecionados.</p></div>}<nav className="pagination" aria-label="Páginas de bilhetes"><button className="btn outline" aria-label="Página anterior" disabled={!result || result.page === 1} onClick={() => setPage((result?.page ?? 1) - 1)}><ChevronLeft size={18}/></button><span>Página {result?.page ?? 1} de {result?.totalPages ?? 1}</span><button className="btn outline" aria-label="Próxima página" disabled={!result || result.page >= result.totalPages} onClick={() => setPage((result?.page ?? 1) + 1)}><ChevronRight size={18}/></button></nav></>}
      </div>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div><aside className="flow-card selection-summary"><span className="eyebrow">SUA SELEÇÃO</span><h2>Um passo de cada vez.</h2><div className="summary-line"><span>Bilhetes selecionados</span><strong>{count}</strong></div><div className="summary-line"><span>Valor unitário</span><strong>{money(campaign.ticketPriceCents)}</strong></div><div className="summary-line grand-total"><span>Total do pedido</span><strong>{money(count * campaign.ticketPriceCents)}</strong></div><p className="muted">Confira os números antes de registrar seu pedido.</p>{count ? <Link className="btn primary wide desktop-proceed" to="/resumo">PROSSEGUIR <ArrowRight size={18}/></Link> : <button className="btn primary wide desktop-proceed" disabled>Selecione um bilhete</button>}</aside></div>
    <div className="selection-bar"><div className="container selection-bar-inner"><div aria-live="polite"><small>TOTAL DO PEDIDO</small><strong>{count} {count === 1 ? 'bilhete' : 'bilhetes'} <span>— {money(count * campaign.ticketPriceCents)}</span></strong></div>{count ? <Link className="btn primary" to="/resumo">PROSSEGUIR <ArrowRight size={17}/></Link> : <button className="btn primary" disabled>PROSSEGUIR</button>}</div></div>
  </section>;
}
