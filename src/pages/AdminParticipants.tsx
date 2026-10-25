import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, LoaderCircle, MessageCircle, RefreshCw, Search, Users } from 'lucide-react';
import { displayDate, maskPhone, money } from '../lib/format';
import { getAdminParticipant, listAdminParticipants, listParticipantOrders, listParticipantTickets, type AdminPage, type ParticipantDetail, type ParticipantOrder, type ParticipantsPage, type ParticipantTicket } from '../services/adminParticipants';
import { listApiCampaigns, type ApiCampaign } from '../services/ticketCreationApi';

function Pagination({ result, onPage, label }: { result: { page: number; totalPages: number; total: number }; onPage: (page: number) => void; label: string }) {
  return <nav className="pagination" aria-label={label}><button className="btn outline" aria-label={`Página anterior: ${label}`} disabled={result.page <= 1} onClick={() => onPage(result.page - 1)}><ChevronLeft size={18}/></button><span>{result.page} de {result.totalPages} · {result.total} registro(s)</span><button className="btn outline" aria-label={`Próxima página: ${label}`} disabled={result.page >= result.totalPages} onClick={() => onPage(result.page + 1)}><ChevronRight size={18}/></button></nav>;
}
const errorMessage = (e: unknown) => e instanceof Error ? e.message : 'Não foi possível consultar os participantes.';

function ParticipantHistory({ id, onBack }: { id: string; onBack: () => void }) {
  const [detail, setDetail] = useState<ParticipantDetail | null>(null);
  const [tab, setTab] = useState<'orders' | 'tickets'>('orders');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<AdminPage<ParticipantOrder> | null>(null);
  const [tickets, setTickets] = useState<AdminPage<ParticipantTicket> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setOrders(null); setTickets(null);
    Promise.all([getAdminParticipant(id), tab === 'orders' ? listParticipantOrders(id, page) : listParticipantTickets(id, page)]).then(([person, result]) => {
      if (!active) return; setDetail(person);
      if (tab === 'orders') setOrders(result as AdminPage<ParticipantOrder>); else setTickets(result as AdminPage<ParticipantTicket>);
    }).catch(e => { if (active) { setDetail(null); setError(errorMessage(e)); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, page, tab, reload]);
  return <section aria-label="Detalhes do participante"><div className="creation-actions"><button className="btn outline" onClick={onBack}><ArrowLeft size={17}/> Voltar aos participantes</button><button className="btn outline" disabled={loading} onClick={() => setReload(n => n + 1)}><RefreshCw size={17}/> Atualizar detalhes</button></div>{error && <p className="form-error" role="alert">{error}</p>}{detail && <><div className="flow-card"><span className="eyebrow">CADASTRO DO PARTICIPANTE</span><h2>{detail.name}</h2><p>WhatsApp: {maskPhone(detail.phone)}</p><p className="muted">Telefone não verificado · Cadastro em {displayDate(detail.createdAt)}</p><a className="btn outline" href={`https://wa.me/55${detail.phone}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={17}/> Abrir WhatsApp</a></div><div className="admin-metrics">{[['Pedidos registrados', detail.summary.orders], ['Bilhetes nos pedidos', detail.summary.tickets], ['Valor dos pedidos', money(detail.summary.orderValueCents)]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p className="muted">O valor dos pedidos não representa pagamento confirmado. O histórico mostra todas as campanhas da organização para este cadastro.</p></>}<div className="selection-modes" role="group" aria-label="Histórico do participante"><button aria-pressed={tab === 'orders'} className={tab === 'orders' ? 'selected' : ''} onClick={() => { setTab('orders'); setPage(1); }}>Pedidos</button><button aria-pressed={tab === 'tickets'} className={tab === 'tickets' ? 'selected' : ''} onClick={() => { setTab('tickets'); setPage(1); }}>Bilhetes</button></div>{loading && <p role="status" className="loading-message"><LoaderCircle size={18} className="spin"/> Carregando histórico...</p>}{!loading && orders && <><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Pedido</th><th>Campanha</th><th>Data</th><th>Bilhetes</th><th>Valor</th><th>Pagamento</th></tr></thead><tbody>{orders.items.map(order => <tr key={order.id}><td><span title={order.id}>{order.id.slice(0, 8)}</span></td><td>{order.campaign.name}</td><td>{displayDate(order.createdAt)}</td><td>{order.quantity}</td><td>{money(order.totalCents)}</td><td><span className={order.paymentStatus === 'PAID' ? 'pill green' : 'pill amber'}>{order.paymentStatus === 'PAID' ? 'Pago' : 'Não confirmado'}</span></td></tr>)}</tbody></table></div>{!orders.items.length && <p>Nenhum pedido registrado para este participante.</p>}<Pagination result={orders} onPage={setPage} label="Pedidos do participante"/></>}{!loading && tickets && <><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Serial</th><th>Quatro números</th><th>Campanha</th><th>Status</th><th>Atribuição</th></tr></thead><tbody>{tickets.items.map(ticket => <tr key={ticket.id}><td>{ticket.serial}</td><td>{ticket.numbers.map(n => n.value).join(' · ')}</td><td>{ticket.campaign.name}</td><td>{ticket.status === 'ASSIGNED' ? 'Atribuído' : ticket.status === 'VOID' ? 'Cancelado' : 'Disponível'}</td><td>{ticket.assignedAt ? displayDate(ticket.assignedAt) : '—'}</td></tr>)}</tbody></table></div>{!tickets.items.length && <p>Nenhum bilhete vinculado a este participante.</p>}<Pagination result={tickets} onPage={setPage} label="Bilhetes do participante"/></>}</section>;
}

export default function AdminParticipants() {
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [activity, setActivity] = useState('all');
  const [campaignId, setCampaignId] = useState('');
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [campaignError, setCampaignError] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ParticipantsPage | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => { let active = true; setCampaignError(''); listApiCampaigns().then(items => { if (active) setCampaigns(items); }).catch(() => { if (active) setCampaignError('Não foi possível carregar o filtro de campanhas. A busca geral continua disponível.'); }); return () => { active = false; }; }, [reload]);
  useEffect(() => {
    if (selected) return;
    let active = true; setLoading(true); setError(''); setResult(null);
    listAdminParticipants({ page, query, activity, campaignId }).then(data => { if (active) setResult(data); }).catch(e => { if (active) setError(errorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, query, activity, campaignId, reload, selected]);
  function search(event: FormEvent) { event.preventDefault(); setPage(1); setQuery(draft.trim()); setReload(n => n + 1); }
  if (selected) return <ParticipantHistory key={selected} id={selected} onBack={() => setSelected(null)}/>;
  return <section aria-label="Gestão de participantes"><div className="creation-actions"><p className="muted">Consulte os cadastros, pedidos e bilhetes da sua organização.</p><button className="btn outline" disabled={loading} onClick={() => setReload(n => n + 1)}><RefreshCw size={17}/> Atualizar participantes</button></div><form onSubmit={search}><div className="creation-fields"><label>Buscar por nome ou WhatsApp<div className="search"><Search size={18}/><input aria-label="Buscar participante por nome ou WhatsApp" value={draft} maxLength={120} placeholder="Nome ou número com DDD" onChange={e => setDraft(e.target.value)}/></div></label><label>Pedidos<select value={activity} onChange={e => { setActivity(e.target.value); setPage(1); }}><option value="all">Todos os cadastros</option><option value="with_orders">Com pedidos</option><option value="without_orders">Sem pedidos</option></select></label><label>Campanha<select value={campaignId} onChange={e => { setCampaignId(e.target.value); setPage(1); }}><option value="">Todas as campanhas</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div><button className="btn primary" disabled={loading}><Search size={17}/> Buscar participantes</button></form>{campaignError && <p className="muted" role="status">{campaignError}</p>}{error && <p role="alert" className="form-error">{error}</p>}{loading && <p className="loading-message" role="status"><LoaderCircle className="spin" size={18}/> Consultando participantes...</p>}{!loading && result && <><div className="admin-metrics">{[['Participantes encontrados', result.summary.participants], ['Pedidos registrados', result.summary.orders], ['Bilhetes nos pedidos', result.summary.tickets]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Nome</th><th>WhatsApp</th><th>Cadastro</th><th>Pedidos</th><th>Bilhetes</th><th>Ações</th></tr></thead><tbody>{result.items.map(person => <tr key={person.id}><td>{person.name}</td><td>{person.phoneMasked}</td><td>{displayDate(person.createdAt)}</td><td>{person.orders}</td><td>{person.tickets}</td><td><button className="btn outline" aria-label={`Ver detalhes de ${person.name}`} onClick={() => setSelected(person.id)}>Ver detalhes</button></td></tr>)}</tbody></table></div>{!result.items.length && <div className="empty compact-empty"><Users size={28}/><h2>Nenhum participante encontrado</h2><p>Altere os filtros ou aguarde novos cadastros.</p></div>}<Pagination result={result} onPage={setPage} label="Participantes"/><p className="table-caption">Contatos completos ficam nos detalhes do cadastro. Os totais respeitam os filtros selecionados e não incluem os dados de preparação arquivados.</p></>}</section>;
}
