import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Search, Ticket } from 'lucide-react';
import TicketCard from '../components/TicketCard';
import { useParticipantSession } from '../hooks/useParticipantSession';
import { money } from '../lib/format';

export default function MyTickets() {
  const { orders } = useParticipantSession();
  const pending = orders.filter(order => order.paymentRequired && order.paymentStatus !== 'PAID');
  const released = orders.filter(order => !order.paymentRequired || order.paymentStatus === 'PAID');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const issued = new Map(released.flatMap(order => order.ticketIds.map(id => [id, order.createdAt] as const)));
  const tickets = released.flatMap(order => order.tickets).filter(ticket => (ticket.serial.toLowerCase().includes(query.trim().toLowerCase()) || ticket.numbers.some(number => number.includes(query.trim()))));
  const totalPages = Math.max(1, Math.ceil(tickets.length / 12));
  const currentPage = Math.min(page, totalPages);
  return <section><div className="flow-heading heading-with-action"><div><span className="eyebrow">SUA ÁREA</span><h1>Meus bilhetes</h1><p>Os números que você escolheu, salvos no Bilhetou.</p></div><Link className="btn primary" to="/bilhetes"><Plus size={18}/> Escolher mais bilhetes</Link></div>{pending.map(order => <div className="flow-card" key={order.id}><span className="pill amber">AGUARDANDO PAGAMENTO</span><h2>{order.quantity} bilhete(s) · {money(order.totalCents)}</h2><Link className="btn primary" to={`/pagamento/${order.id}`}>Pagar ou consultar Pix</Link></div>)}<div className="owned-summary"><Ticket size={21}/><strong>{issued.size} bilhete(s)</strong><span>{orders.length} pedido(s) registrado(s)</span></div>{issued.size ? <><label className="search owned-search"><Search size={18}/><input aria-label="Buscar meus bilhetes" placeholder="Buscar por serial ou número..." value={query} onChange={event => { setQuery(event.target.value); setPage(1); }}/></label><div className="ticket-grid">{tickets.slice((currentPage - 1) * 12, currentPage * 12).map(ticket => <TicketCard key={ticket.serial} ticket={ticket} assigned issuedAt={issued.get(ticket.id)}/>)}</div>{!tickets.length && <p className="muted" role="status">Nenhum bilhete corresponde à busca.</p>}<nav className="pagination" aria-label="Páginas dos meus bilhetes"><button className="btn outline" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18}/></button><span>Página {currentPage} de {totalPages}</span><button className="btn outline" aria-label="Próxima página" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={18}/></button></nav></> : <div className="empty"><div className="empty-icon"><Ticket size={30}/></div><h2>Seus primeiros bilhetes esperam por você</h2><p>Escolha os bilhetes e confirme o pedido para vê-los aqui.</p><Link className="btn primary" to="/bilhetes">Escolher bilhetes</Link></div>}</section>;
}
