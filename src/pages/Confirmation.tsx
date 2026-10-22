import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Check, Ticket } from 'lucide-react';
import TicketCard from '../components/TicketCard';
import { useDemoSession } from '../hooks/useDemoSession';
import { displayDate } from '../lib/format';

export default function Confirmation() {
  const { orders } = useDemoSession();
  const order = orders[orders.length - 1];
  if (!order) return <Navigate to="/bilhetes" replace/>;
  const tickets = order.tickets;
  return <section className="confirmation-page"><div className="success-symbol"><Check size={40} strokeWidth={3}/></div><div className="flow-heading"><span className="eyebrow">TUDO CERTO POR AQUI</span><h1>Simulação concluída!</h1><p>Seus bilhetes demonstrativos foram adicionados à sua área.</p></div><div className="flow-card confirmation-details"><div><small>PEDIDO FICTÍCIO</small><strong>{order.id}</strong></div><div><small>BILHETES</small><strong>{tickets.length}</strong></div><div><small>DATA DA SIMULAÇÃO</small><strong>{displayDate(order.createdAt)}</strong></div></div><p className="simulation-disclaimer">Não ocorreu pagamento nem participação em sorteio real.</p><div className="confirmation-actions"><Link className="btn primary" to="/meus-bilhetes"><Ticket size={18}/> Visualizar meus bilhetes <ArrowRight size={18}/></Link><Link className="btn outline" to="/">Voltar ao início</Link></div><div className="ticket-grid">{tickets.map(ticket => <TicketCard key={ticket.serial} ticket={ticket} assigned issuedAt={order.createdAt}/>)}</div></section>;
}
