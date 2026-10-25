import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Copy, LoaderCircle, RefreshCw } from 'lucide-react';
import { zettpayCheckout, type ZettpayCheckout as Checkout } from '../services/zettpay';
import { participantServices } from '../services/session';
import { maskPayerDocument, money } from '../lib/format';
import { copyText, selectCopyText } from '../lib/clipboard';
import './payments.css';

export default function ZettpayCheckout() {
  const { orderId = '' } = useParams();
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [document, setDocument] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [copying, setCopying] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);
  const pixCode = useRef<HTMLTextAreaElement>(null);
  const copyLocked = useRef(false);
  const locked = useRef(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setCheckout(null); setError('');
    zettpayCheckout.get(orderId).then(data => { if (active) setCheckout(data); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : 'Não foi possível carregar o pagamento.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId, reload]);

  const paid = checkout?.order.paymentStatus === 'PAID';
  const pending = !!checkout?.payment && !paid;
  useEffect(() => {
    if (!pending) return;
    let active = true;
    let checking = false;
    const timer = setInterval(async () => {
      if (checking || locked.current) return;
      checking = true;
      try {
        const data = await zettpayCheckout.check(orderId);
        if (active) { setCheckout(data); setError(''); }
      } catch (error) { if (active) setError(error instanceof Error ? error.message : 'Consulta temporariamente indisponível.'); }
      finally { checking = false; }
    }, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [pending, orderId]);
  useEffect(() => { if (paid) void participantServices.refresh(); }, [paid]);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { setCheckout(await zettpayCheckout.create(orderId, email.trim(), document.replace(/\D/g, ''))); setDocument(''); }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível gerar o Pix. Consulte o pedido antes de repetir.'); }
    finally { locked.current = false; setBusy(false); }
  }
  async function check() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try { setCheckout(await zettpayCheckout.check(orderId)); }
    catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível consultar.'); }
    finally { locked.current = false; setBusy(false); }
  }

  async function copyPix() {
    const field = pixCode.current;
    const value = checkout?.payment?.qrCode;
    if (!field || !value || copyLocked.current) return;
    copyLocked.current = true;
    setCopying(true);
    setFeedback('');
    try {
      const copied = await copyText(value, field);
      setManualCopy(!copied);
      setFeedback(copied ? 'Código Pix copiado.' : 'A cópia automática foi bloqueada. Toque e segure no código selecionado e escolha “Copiar”.');
      if (!copied) field.scrollIntoView({ block: 'nearest' });
    } finally {
      copyLocked.current = false;
      setCopying(false);
    }
  }

  return <section aria-busy={loading || busy}>
    <div className="flow-heading"><span className="eyebrow">PAGAMENTO PIX</span><h1>{paid ? 'Pagamento confirmado!' : 'Pague seu pedido com Pix'}</h1><p>{paid ? 'Seu pagamento foi confirmado e os bilhetes estão disponíveis na sua área.' : 'Confira o valor e gere o código para concluir o pagamento.'}</p></div>
    {loading && <p role="status"><LoaderCircle size={18} className="spin"/> Carregando pedido...</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!loading && !checkout && <button className="btn outline" onClick={() => setReload(value => value + 1)}>Carregar pedido novamente</button>}
    {checkout && <>
      <div className="flow-card"><p className="pix-charge-id">Pedido: {checkout.order.id}</p><h2>{money(checkout.order.totalCents)}</h2><p>{checkout.order.quantity} bilhete(s)</p></div>
      {!checkout.order.paymentRequired && !paid && <p>Este pedido foi registrado antes da ativação do pagamento Pix.</p>}
      {!paid && !checkout.payment && checkout.order.paymentRequired && <form className="flow-card payer-form" onSubmit={create}>
        <h2>Dados do pagador</h2><p>Os dados abaixo serão enviados à Zettpay para gerar a cobrança.</p>
        <div className="creation-fields">
          <label htmlFor="payer-email">E-mail do pagador<input id="payer-email" name="payerEmail" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" placeholder="seuemail@exemplo.com" required maxLength={254} disabled={busy} value={email} onChange={event => setEmail(event.target.value)}/></label>
          <label htmlFor="payer-document">CPF ou CNPJ do pagador<input id="payer-document" name="payerDocument" type="text" inputMode="numeric" autoComplete="off" enterKeyHint="done" aria-describedby="payer-document-help" placeholder="000.000.000-00" required maxLength={18} disabled={busy} value={document} onChange={event => setDocument(maskPayerDocument(event.target.value))}/></label>
        </div>
        <p id="payer-document-help" className="payer-document-help">Digite os 11 dígitos do CPF ou os 14 do CNPJ.</p>
        <button className="btn primary wide" disabled={busy} type="submit">{busy ? 'Gerando Pix...' : 'Gerar Pix para pagamento'}</button>
      </form>}
      {!paid && checkout.payment && <div className="flow-card pix-charge">
        {checkout.payment.qrCode && <div className="pix-qr"><QRCodeSVG value={checkout.payment.qrCode} size={220} marginSize={4} title="QR Code Pix do pedido"/></div>}
        <div className="pix-details"><h2>Aguardando confirmação</h2>{checkout.payment.qrCode ? <><p>Escaneie o QR Code no aplicativo do seu banco ou use o Pix Copia e Cola. Confira o valor e o recebedor antes de pagar.</p><label htmlFor="order-pix-code">Pix Copia e Cola</label><textarea ref={pixCode} id="order-pix-code" readOnly spellCheck={false} autoCapitalize="off" aria-describedby="pix-copy-feedback" rows={4} value={checkout.payment.qrCode}/><div className="pix-copy-actions"><button type="button" className="btn outline" disabled={copying} onClick={copyPix}><Copy size={18}/> {copying ? 'Copiando...' : 'Copiar código Pix'}</button>{manualCopy && <button type="button" className="btn outline" onClick={() => { if (pixCode.current) selectCopyText(pixCode.current); }}>Selecionar código</button>}</div><p id="pix-copy-feedback" className="pix-copy-feedback" role="status">{feedback}</p></> : <p>A cobrança está sendo conferida. Consulte novamente; não faça outro pedido para repetir o pagamento.</p>}
          {checkout.payment.lastError && <p role="status">{checkout.payment.lastError}</p>}<div className="creation-actions"><button className="btn primary" disabled={busy} onClick={check}><RefreshCw size={18}/> Consultar pagamento</button></div><p className="muted">A confirmação é verificada automaticamente enquanto esta página estiver aberta. O comprovante enviado pelo cliente não substitui a confirmação do pagamento.</p>
        </div>
      </div>}
      {paid && <div className="flow-card"><CheckCircle2 size={32}/><p role="status">Pagamento confirmado pela Zettpay.</p><Link className="btn primary" to="/meus-bilhetes">Ver meus bilhetes</Link></div>}
    </>}
    <div className="creation-actions"><Link className="btn outline" to="/meus-bilhetes">Voltar à minha área</Link></div>
  </section>;
}
