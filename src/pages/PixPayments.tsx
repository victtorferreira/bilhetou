import { useEffect, useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, LoaderCircle, RefreshCw } from 'lucide-react';
import { pixPayments, type PixPayment, type PixConfiguration } from '../services/pixPayments';
import { money } from '../lib/format';
import './abacatepay-sandbox.css';

const labels: Record<PixPayment['status'], string> = {
  CREATING: 'Gerando cobrança', PENDING: 'Aguardando pagamento', PAID: 'Pagamento confirmado',
  EXPIRED: 'Pix expirado', CANCELLED: 'Cancelado', FAILED: 'Falha', UNKNOWN: 'Conferir no AbacatePay',
};

export default function PixPayments() {
  const [config, setConfig] = useState<PixConfiguration | null>(null);
  const [rows, setRows] = useState<PixPayment[]>([]);
  const [selected, setSelected] = useState<PixPayment | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('2,00');
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.allSettled([pixPayments.configuration(), pixPayments.list()]).then(([configuration, history]) => {
      if (!active) return;
      setConfig(configuration.status === 'fulfilled' ? configuration.value : null);
      if (history.status === 'fulfilled') setRows(history.value);
      const failure = configuration.status === 'rejected' ? configuration.reason : history.status === 'rejected' ? history.reason : null;
      if (failure) setError(failure instanceof Error ? failure.message : 'Não foi possível carregar as cobranças.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [reload]);

  async function create(event: FormEvent) {
    event.preventDefault();
    const normalized = amount.trim().replace(',', '.');
    if (!/^\d{1,5}(\.\d{1,2})?$/.test(normalized)) { setError('Informe um valor em reais, como 2,00.'); return; }
    const amountCents = Math.round(Number(normalized) * 100);
    if (amountCents < 100 || amountCents > 1000000) { setError('Informe um valor entre R$ 1,00 e R$ 10.000,00.'); return; }
    setBusy(true); setSubmitted(true); setError(''); setFeedback('');
    try {
      const payment = await pixPayments.create({ requestKey, description: description.trim(), amountCents });
      setSelected(payment);
      setRows(current => [payment, ...current.filter(row => row.id !== payment.id)].slice(0, 50));
    } catch (error) { setError(error instanceof Error ? error.message : 'Falha ao gerar cobrança. Consulte o histórico antes de tentar novamente.'); }
    finally { setBusy(false); }
  }

  async function open(id: string, refresh = false) {
    setBusy(true); setError(''); setFeedback('');
    try {
      const payment = await (refresh ? pixPayments.check(id) : pixPayments.get(id));
      setSelected(payment);
      setRows(current => current.map(row => row.id === id ? payment : row));
    } catch (error) { setError(error instanceof Error ? error.message : 'Falha ao consultar a cobrança.'); }
    finally { setBusy(false); }
  }

  function newCharge() {
    setSelected(null); setSubmitted(false); setRequestKey(crypto.randomUUID()); setDescription(''); setError(''); setFeedback('');
  }

  return <section aria-busy={loading || busy}>
    <div className="admin-view-title"><h1>Cobranças Pix</h1>{config && <span className={`pill ${config.environment === 'production' ? 'green' : 'amber'}`}>{config.environment === 'production' ? 'PAGAMENTO REAL' : 'SANDBOX'}</span>}</div>
    <p>Crie cobranças avulsas com a descrição e o valor do produto ou serviço. Os registros ficam no histórico da organização.</p>
    {config?.environment === 'production' && <p className="order-payment-note">Ambiente de produção: este QR Code recebe dinheiro real. Confira a descrição e o valor antes de gerar.</p>}
    {config?.environment === 'sandbox' && <p className="order-payment-note">Ambiente de testes: pagamentos simulados. A simulação é feita no painel sandbox do AbacatePay.</p>}
    {loading && <p role="status"><LoaderCircle className="spin" size={18}/> Carregando cobranças...</p>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="creation-actions"><button className="btn outline" disabled={busy || loading} onClick={() => setReload(value => value + 1)}><RefreshCw size={17}/> Atualizar histórico</button>{submitted && selected && <button className="btn outline" disabled={busy} onClick={newCharge}>Nova cobrança</button>}</div>
    {config && !loading && !selected && <form className="flow-card" onSubmit={create}>
      <label>Descrição do produto ou serviço<input required minLength={3} maxLength={140} value={description} disabled={submitted} onChange={event => setDescription(event.target.value)} placeholder="Informe o que está sendo cobrado"/></label>
      <label>Valor (R$)<input required inputMode="decimal" value={amount} disabled={submitted} onChange={event => setAmount(event.target.value)} aria-describedby="pix-value-help"/></label>
      <p className="muted" id="pix-value-help">De R$ 1,00 a R$ 10.000,00. A descrição deve corresponder ao produto ou serviço vendido.</p>
      <button className="btn primary" disabled={busy || description.trim().length < 3} type="submit">{busy ? <><LoaderCircle className="spin" size={17}/> Gerando...</> : submitted ? 'Consultar solicitação anterior' : config.environment === 'production' ? 'Gerar Pix real' : 'Gerar Pix de sandbox'}</button>
      {submitted && <p className="muted">Esta solicitação mantém a mesma referência para evitar cobranças duplicadas. Confira também o histórico.</p>}
    </form>}
    {selected && <div className="flow-card sandbox-charge">
      {selected.brCode && selected.status === 'PENDING' && <div className="sandbox-qr"><QRCodeSVG value={selected.brCode} size={220} marginSize={4} title="QR Code da cobrança Pix"/></div>}
      <div className="sandbox-details"><span className={`pill ${selected.status === 'PAID' ? 'green' : 'amber'}`} role="status">{labels[selected.status]} · {selected.environment === 'production' ? 'Real' : 'Sandbox'}</span><h2>{money(selected.amountCents)}</h2><p>{selected.description}</p><p className="sandbox-charge-id">Referência: {selected.id}</p>
        {selected.expiresAt && <p>Validade: {new Date(selected.expiresAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília)</p>}
        {selected.status === 'PAID' && <p>Confirmação registrada pelo AbacatePay.</p>}
        {selected.brCode && selected.status === 'PENDING' && <><label htmlFor="real-pix-code">Pix Copia e Cola</label><textarea id="real-pix-code" readOnly value={selected.brCode} rows={4}/><button className="btn outline" onClick={async () => { try { await navigator.clipboard.writeText(selected.brCode!); setFeedback('Código copiado.'); } catch { setFeedback('Selecione o código para copiar manualmente.'); } }}><Copy size={17}/> Copiar código Pix</button></>}
        {selected.lastError && <p role="alert" className="form-error">{selected.lastError}</p>}
        {selected.status === 'CREATING' && <p>Se a geração não terminar, confira a referência no painel AbacatePay antes de gerar outra cobrança.</p>}
        <div className="creation-actions"><button className="btn outline" disabled={busy || !config || selected.environment !== config.environment} onClick={() => open(selected.id, true)}><RefreshCw size={17}/> Consultar pagamento</button><button className="btn outline" disabled={busy} onClick={newCharge}>Voltar ao formulário</button></div>
      </div>
    </div>}
    {feedback && <p role="status">{feedback}</p>}
    <h2>Últimas 50 cobranças</h2>
    {!rows.length && !loading && <p>Nenhuma cobrança registrada.</p>}
    {!!rows.length && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Descrição</th><th>Valor</th><th>Ambiente</th><th>Status</th><th>Ação</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.description}</td><td>{money(row.amountCents)}</td><td>{row.environment === 'production' ? 'Real' : 'Sandbox'}</td><td>{labels[row.status]}</td><td><button className="btn outline" disabled={busy} onClick={() => open(row.id)}>Abrir cobrança</button></td></tr>)}</tbody></table></div>}
  </section>;
}
