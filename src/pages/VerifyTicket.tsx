import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoaderCircle, ShieldCheck, ShieldAlert } from 'lucide-react';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import { ApiError } from '../services/api';
import { verifyTicket, type TicketVerification } from '../services/verification';
import './verification.css';

const descriptions: Record<TicketVerification['status'], { title: string; text: string }> = {
  VALID: { title: 'Bilhete válido', text: 'Bilhete registrado no sistema e com participação confirmada. Confira se os quatro números correspondem ao seu bilhete.' },
  VOID: { title: 'Bilhete cancelado', text: 'Este bilhete foi cancelado e não está válido para participação.' },
  NOT_ISSUED: { title: 'Bilhete não emitido', text: 'O número do bilhete existe no sistema, mas não está vinculado a uma participação confirmada.' },
  EXPIRED: { title: 'Reserva expirada', text: 'A reserva deste bilhete expirou. A participação não está confirmada.' },
  REVIEW_REQUIRED: { title: 'Pagamento em conferência', text: 'A participação ainda não está confirmada. Consulte o pedido na sua área ou entre em contato com a organização.' },
  PENDING_PAYMENT: { title: 'Pagamento não confirmado', text: 'O bilhete está registrado, mas a participação depende da confirmação do pagamento.' },
};

function date(value: string | null, time = false) {
  return value ? new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', ...(time ? { timeStyle: 'short' as const } : {}) }) : 'Data a definir';
}

export default function VerifyTicket() {
  const { id = '' } = useParams();
  const [ticket, setTicket] = useState<TicketVerification | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setTicket(null);
    const request = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      ? verifyTicket(id) : Promise.reject(new ApiError('Referência inválida.', 400));
    request.then(value => { if (active) setTicket(value); }).catch(reason => {
      if (active) setError(reason instanceof ApiError && [400, 404].includes(reason.status)
        ? 'Bilhete não encontrado. Confira o QR code ou procure a organização.'
        : 'Não foi possível consultar o sistema agora. Tente novamente para conferir a validade.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, attempt]);
  const result = ticket ? descriptions[ticket.status] : null;
  return <div className="public-app">
    <header className="header public-header"><div className="container header-inner"><Link className="brand-button" to="/" aria-label="Bilhetou — início"><Logo/></Link><ThemeToggle/></div></header>
    <main id="main-content" className="flow-main container verification-page">
      <div className="flow-heading"><span className="eyebrow">CONFERÊNCIA DO BILHETE</span><h1>Confira seu bilhete</h1><p>Consulta ao registro atual do Bilhetou.</p></div>
      {loading && <p role="status"><LoaderCircle className="spin" size={20}/> Consultando bilhete...</p>}
      {error && <div className="flow-card" role="alert"><h2>Consulta não concluída</h2><p>{error}</p></div>}
      {!loading && ticket && result && <div className="flow-card verification-result">
        <div className={`verification-status ${ticket.status === 'VALID' ? 'is-valid' : ''}`} role="status">{ticket.status === 'VALID' ? <ShieldCheck size={28}/> : <ShieldAlert size={28}/>}<h2>{result.title}</h2></div>
        <p>{result.text}</p>
        <dl className="verification-details"><div><dt>Nº do bilhete</dt><dd>{ticket.serial}</dd></div><div><dt>Campanha</dt><dd>{ticket.campaignName}</dd></div><div><dt>Apuração</dt><dd>{date(ticket.drawAt)}</dd></div><div><dt>Pagamento</dt><dd>{ticket.paymentStatus === 'PAID' ? 'Confirmado' : ticket.paymentStatus === 'NOT_REQUIRED' ? 'Não exigido' : 'Não confirmado'}</dd></div>{ticket.issuedAt && <div><dt>Emissão</dt><dd>{date(ticket.issuedAt, true)}</dd></div>}</dl>
        <h3>Números registrados</h3><div className="ticket-numbers" aria-label="Números registrados">{ticket.numbers.map((number, index) => <div key={index}>{number}</div>)}</div>
        <p className="muted">Consultado em {date(ticket.checkedAt, true)} (horário de Brasília).</p>
      </div>}
      {!loading && <button className="btn outline" onClick={() => setAttempt(value => value + 1)}>Consultar novamente</button>}
      <p className="verification-notice">Confira o endereço oficial do Bilhetou no navegador. Esta consulta não comprova a titularidade do bilhete nem autoriza o recebimento de prêmio. Um QR code pode ser copiado.</p>
    </main>
    <footer className="public-footer container"><ShieldCheck size={17}/><p>Bilhetou — conferência de bilhetes.</p></footer>
  </div>;
}
