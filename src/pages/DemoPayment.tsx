import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useDemoSession } from '../hooks/useDemoSession';
import { money } from '../lib/format';
import { demoOrdersService } from '../services/demoOrders';

export default function DemoPayment() {
  const { participant, selectedIds, selectionKey, campaign } = useDemoSession();
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
      await demoOrdersService.confirm({ participantId: participant.id, ticketIds: selectedIds, idempotencyKey: selectionKey });
      navigate('/confirmacao', { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível confirmar. Tente novamente.');
      locked.current = false;
      setBusy(false);
    }
  }

  if (!campaign) return null;
  return <section className="centered-step"><div className="flow-heading"><span className="eyebrow">ÚLTIMO PASSO</span><h1>Resumo da simulação</h1><p>Esta é uma demonstração da plataforma. Nenhum pagamento será realizado.</p></div><div className="flow-card payment-card" aria-busy={busy}><div className="payment-symbol"><ShieldCheck size={36}/></div><span className="pill green">SEM COBRANÇA</span><h2>Pronto para simular?</h2><p className="muted">{selectedIds.length} bilhete(s) · {campaign.name}</p><div className="payment-total"><span>Total ilustrativo</span><strong>{money(selectedIds.length * campaign.ticketPriceCents)}</strong><small>Valor apenas para visualização</small></div><div className="simulation-notice"><CheckCircle2 size={20}/><p>A confirmação salva seu pedido demonstrativo no servidor. A seleção não reserva bilhetes; a disponibilidade será conferida novamente.</p></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn primary wide" disabled={busy || !selectedIds.length} onClick={confirm}>{busy ? <><LoaderCircle className="spin" size={19}/> Confirmando...</> : <>CONFIRMAR SIMULAÇÃO <CheckCircle2 size={18}/></>}</button>{!busy && <Link className="btn outline wide" to="/resumo"><ArrowLeft size={17}/> Voltar ao resumo</Link>}</div></section>;
}
