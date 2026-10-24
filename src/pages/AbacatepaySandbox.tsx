import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Copy, FlaskConical, LoaderCircle, RefreshCw } from 'lucide-react';
import { abacatepaySandbox, type SandboxCharge, type SandboxStatus } from '../services/abacatepaySandbox';
import { money } from '../lib/format';
import './abacatepay-sandbox.css';

const labels: Record<SandboxStatus, string> = { PENDING: 'Aguardando simulação', PAID: 'Pagamento simulado confirmado', EXPIRED: 'Pix expirado', CANCELLED: 'Pix cancelado' };
export default function AbacatepaySandbox() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [charge, setCharge] = useState<SandboxCharge | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    let active = true;
    setReady(false); setLoading(true); setError('');
    abacatepaySandbox.configuration().then(() => { if (active) setReady(true); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : 'Não foi possível verificar a integração.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  async function run(action: 'create' | 'check' | 'simulate') {
    if (busy) return;
    setBusy(true); setError(''); setFeedback('');
    try {
      if (action === 'create') setCharge(await abacatepaySandbox.create());
      else if (charge) {
        const result = await abacatepaySandbox[action](charge.token);
        setCharge({ ...charge, ...result });
        if (action === 'simulate' && result.status === 'PENDING') setFeedback('Simulação solicitada. Clique em Consultar status em alguns segundos.');
      }
    } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível concluir o teste.'); }
    finally { setBusy(false); }
  }

  async function copy() {
    if (!charge) return;
    try { await navigator.clipboard.writeText(charge.brCode); setFeedback('Código de teste copiado.'); }
    catch { setFeedback('Selecione o código abaixo para copiar manualmente.'); }
  }

  return <section className="sandbox-page" aria-busy={loading || busy}>
    <div className="admin-view-title"><h1>Teste de pagamento Pix</h1><span className="pill amber">SANDBOX</span></div>
    <div className="flow-card sandbox-intro"><FlaskConical size={28}/><div><h2>AbacatePay · ambiente de testes</h2><p>Gere um Pix de R$ 2,00 e simule a confirmação aqui no painel. Use o botão de simulação; não pague pelo aplicativo do banco. Este teste não movimenta dinheiro nem altera pedidos ou bilhetes.</p></div></div>
    {loading && <p className="loading-message" role="status"><LoaderCircle className="spin" size={18}/> Verificando configuração...</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!ready && !loading && <button className="btn outline" onClick={() => setReload(value => value + 1)}><RefreshCw size={18}/> Verificar configuração</button>}
    {ready && <>
      <div className="creation-actions"><button className="btn primary" disabled={busy} onClick={() => run('create')}>{busy ? <LoaderCircle size={18} className="spin"/> : <FlaskConical size={18}/>} {charge ? 'Gerar outro Pix de teste' : 'Gerar Pix de teste de R$ 2,00'}</button></div>
      {charge && <div className="flow-card sandbox-charge"><div className="sandbox-qr"><QRCodeSVG value={charge.brCode} size={220} marginSize={4} title="QR Code Pix de sandbox"/></div><div className="sandbox-details"><span className={`pill ${charge.status === 'PAID' ? 'green' : 'amber'}`} role="status">{charge.status === 'PAID' && <CheckCircle2 size={16}/>} {labels[charge.status]}</span><h2>{money(charge.amountCents)} · teste</h2><p className="muted">Expira em {new Date(charge.expiresAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília).</p><p className="sandbox-charge-id">Referência: {charge.id}</p><label htmlFor="sandbox-pix-code">Pix Copia e Cola de teste</label><textarea id="sandbox-pix-code" readOnly value={charge.brCode} rows={4}/><div className="creation-actions"><button className="btn outline" onClick={copy}><Copy size={17}/> Copiar código</button><button className="btn outline" disabled={busy} onClick={() => run('check')}><RefreshCw size={17}/> Consultar status</button><button className="btn primary" disabled={busy || charge.status !== 'PENDING'} onClick={() => run('simulate')}>Simular pagamento</button></div>{charge.status === 'PAID' && <p className="lookup-feedback">Confirmação consultada na API do AbacatePay. Este é um pagamento simulado.</p>}</div></div>}
    </>}
    {feedback && <p role="status" className="lookup-feedback">{feedback}</p>}
  </section>;
}
