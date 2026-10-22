import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, UserRound } from 'lucide-react';
import TicketCard from '../components/TicketCard';
import { useDemoSession } from '../hooks/useDemoSession';
import { money, privatePhone } from '../lib/format';

export default function OrderSummary() {
  const { participant, selectedTickets: tickets, campaign } = useDemoSession();
  if (!participant || !campaign) return null;
  return <section><div className="flow-heading"><span className="eyebrow">CONFIRA SUA ESCOLHA</span><h1>Está tudo certo?</h1><p>Revise os dados e os números antes de continuar.</p></div><div className="order-layout"><div><div className="flow-card participant-details"><span className="detail-icon"><UserRound size={23}/></span><div><span className="eyebrow">PARTICIPANTE DESTA SESSÃO</span><h2>{participant.name}</h2><p>{privatePhone(participant.phone)}</p><small>Identidade não verificada · demonstração</small></div></div><h2 className="section-subtitle">Seus {tickets.length} bilhetes selecionados</h2><div className="selection-ticket-grid">{tickets.map(ticket => <TicketCard key={ticket.serial} ticket={ticket}/>)}</div></div><aside className="flow-card order-totals"><span className="eyebrow">RESUMO DO PEDIDO</span><h2>{campaign.name}</h2><div className="summary-line"><span>Apuração fictícia</span><strong>{campaign.drawDate}</strong></div><div className="summary-line"><span>{tickets.length} bilhete(s) × {money(campaign.ticketPriceCents)}</span><strong>{money(tickets.length * campaign.ticketPriceCents)}</strong></div><div className="summary-line grand-total"><span>Total demonstrativo</span><strong>{money(tickets.length * campaign.ticketPriceCents)}</strong></div><p className="muted">Os valores são ilustrativos. Não há cobrança nesta demonstração.</p><Link className="btn primary wide" to="/pagamento">PROSSEGUIR <ArrowRight size={18}/></Link><Link className="btn outline wide" to="/bilhetes"><ArrowLeft size={17}/> Voltar e alterar</Link></aside></div></section>;
}
