import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Check, Ticket } from 'lucide-react';
import TicketCard from '../components/TicketCard';
import { useParticipantSession } from '../hooks/useParticipantSession';
import { displayDate } from '../lib/format';

export default function Confirmation() {
  const { orders } = useParticipantSession();
  const order = orders[0];
  if (!order) return <Navigate to="/bilhetes" replace/>;
  if (order.paymentRequired && order.paymentStatus !== 'PAID') return <Navigate to={`/pagamento/${order.id}`} replace/>;
  const tickets = order.tickets;
  return <section className="confirmation-page"><div className="success-symbol"><Check size={40} strokeWidth={3}/></div><div className="flow-heading"><span className="eyebrow">TUDO CERTO POR AQUI</span><h1>Pedido registrado!</h1><p>Seus bilhetes foram vinculados ao pedido e estão disponíveis na sua área.</p></div><div className="flow-card confirmation-details"><div><small>NÚMERO DO PEDIDO</small><strong>{order.id}</strong></div><div><small>BILHETES</small><strong>{tickets.length}</strong></div><div><small>DATA DO PEDIDO</small><strong>{displayDate(order.createdAt)}</strong></div></div><p className="order-payment-note">{order.paymentStatus === 'PAID' ? 'Pagamento confirmado pela Zettpay.' : 'Pagamento não confirmado. O registro do pedido não é um comprovante de pagamento.'}</p><div className="confirmation-actions"><Link className="btn primary" to="/meus-bilhetes"><Ticket size={18}/> Visualizar meus bilhetes <ArrowRight size={18}/></Link><Link className="btn outline" to="/">Voltar ao início</Link></div><div className="ticket-grid">{tickets.map(ticket => <TicketCard key={ticket.serial} ticket={ticket} assigned issuedAt={order.createdAt}/>)}</div></section>;
}
