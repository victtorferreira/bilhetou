import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useParticipantSession } from '../hooks/useParticipantSession';
import { money } from '../lib/format';
import { ordersService } from '../services/orders';

export default function ConfirmOrder() {
  const { participant, selectedIds, selectionKey, campaign } = useParticipantSession();
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function confirm() {
    if (locked.current || !participant || !selectedIds.length) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await ordersService.confirm({ participantId: participant.id, ticketIds: selectedIds, idempotencyKey: selectionKey });
      navigate('/confirmacao', { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível confirmar. Tente novamente.');
      locked.current = false;
      setBusy(false);
    }
  }

  if (!campaign) return null;
  return <section className="centered-step"><div className="flow-heading"><span className="eyebrow">ÚLTIMO PASSO</span><h1>Confirmar pedido</h1><p>Confira sua seleção e registre o pedido.</p></div><div className="flow-card payment-card" aria-busy={busy}><div className="payment-symbol"><ShieldCheck size={36}/></div><span className="pill green">CONFIRMAÇÃO DO PEDIDO</span><h2>Deseja confirmar seu pedido?</h2><p className="muted">{selectedIds.length} bilhete(s) · {campaign.name}</p><div className="payment-total"><span>Total do pedido</span><strong>{money(selectedIds.length * campaign.ticketPriceCents)}</strong><small>Pagamento não confirmado</small></div><div className="order-notice"><CheckCircle2 size={20}/><p>A disponibilidade será conferida ao confirmar o pedido. Esta confirmação não comprova pagamento.</p></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn primary wide" disabled={busy || !selectedIds.length} onClick={confirm}>{busy ? <><LoaderCircle className="spin" size={19}/> Confirmando...</> : <>CONFIRMAR PEDIDO <CheckCircle2 size={18}/></>}</button>{!busy && <Link className="btn outline wide" to="/resumo"><ArrowLeft size={17}/> Voltar ao resumo</Link>}</div></section>;
}
