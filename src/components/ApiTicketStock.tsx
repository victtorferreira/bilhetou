import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, LoaderCircle, Search } from 'lucide-react';
import { getTicketStatistics, listApiStock, type TicketStatistics, type ApiStockPage } from '../services/ticketCreationApi';

export default function ApiTicketStock({ campaignId, refresh }: { campaignId: string; refresh: number }) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ApiStockPage | null>(null);
  const [statistics, setStatistics] = useState<TicketStatistics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([listApiStock(campaignId, page, query), getTicketStatistics(campaignId)]).then(([data, stats]) => { if (active) { setResult(data); setStatistics(stats); } }).catch(error => { if (active) setError(error instanceof Error ? error.message : 'Falha ao carregar o estoque.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [campaignId, refresh, page, query]);
  return <section className="api-stock"><h3>Estoque no PostgreSQL</h3>{statistics && <div className="admin-metrics">{[["Números possíveis", statistics.possible], ["Números utilizados", statistics.used], ["Números disponíveis", statistics.available], ["Bilhetes cadastrados", statistics.tickets], ["Capacidade restante", statistics.remainingTickets]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}<label className="search"><Search size={18}/><input aria-label="Buscar no estoque da API" placeholder="Buscar serial ou número de quatro dígitos..." value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}/></label>{error && <p className="form-error" role="alert">{error}</p>}{loading ? <p className="loading-message" role="status"><LoaderCircle size={18} className="spin"/> Consultando o banco...</p> : result && <><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Serial</th><th>Quatro números</th><th>Campanha</th><th>Status</th><th>Participante</th><th>Cadastro</th></tr></thead><tbody>{result.items.map(ticket => <tr key={ticket.id}><td>{ticket.serial}</td><td>{ticket.numbers.map(number => number.value).join(' · ')}</td><td>{ticket.campaign}</td><td>{ticket.status === 'AVAILABLE' ? 'Disponível' : ticket.status === 'ASSIGNED_DEMO' ? 'Atribuído · demo' : 'Cancelado'}</td><td>{ticket.participant ?? '—'}</td><td>{new Date(ticket.createdAt).toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div><nav className="pagination" aria-label="Páginas do estoque da API"><button className="btn outline" aria-label="Página anterior da API" disabled={result.page <= 1} onClick={() => setPage(result.page - 1)}><ChevronLeft size={18}/></button><span>{result.page} de {result.totalPages} · {result.total} registros no banco</span><button className="btn outline" aria-label="Próxima página da API" disabled={result.page >= result.totalPages} onClick={() => setPage(result.page + 1)}><ChevronRight size={18}/></button></nav></>}</section>;
}
