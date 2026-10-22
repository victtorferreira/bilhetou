import { useEffect, useState } from 'react';
import { CalendarDays, Search, ShieldCheck, Trophy } from 'lucide-react';
import { apiRequest } from '../services/api';
import { useParticipantSession } from '../hooks/useParticipantSession';

interface Draw { id: string; reference: string; createdAt: string; results: { number: string; position: number }[] }
export default function ResultsBackend() {
  const { orders, campaign } = useParticipantSession();
  const [draws, setDraws] = useState<Draw[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    let active = true;
    apiRequest<Draw[]>('/participant/results').then(data => { if (active) setDraws(data); }).catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [campaign?.id]);
  function check() {
    const found = orders.flatMap(order => order.tickets).find(ticket => ticket.campaignId === campaign?.id && ticket.serial.toLowerCase() === query.trim().toLowerCase());
    if (!found) { setFeedback('Bilhete não encontrado entre os seus bilhetes dessa campanha.'); return; }
    if (!draws[0]) { setFeedback('Ainda não há apuração cadastrada para conferir esse bilhete.'); return; }
    const matches = found.numbers.filter(number => draws[0].results.some(result => result.number === number));
    setFeedback(matches.length ? `Correspondência: ${matches.join(', ')}. Aguarde a validação administrativa.` : 'Nenhuma correspondência com a última apuração.');
  }
  return <section><div className="flow-heading"><span className="eyebrow">TRANSPARÊNCIA</span><h1>Resultados</h1><p>Resultados cadastrados para {campaign?.name}.</p></div><div className="results-warning"><ShieldCheck size={22}/><div><b>Conferência de resultados</b><p>Correspondências aguardam validação administrativa.</p></div></div>{error && <p className="form-error" role="alert">{error}</p>}{loading && <p role="status">Consultando apurações...</p>}<div className="results-columns"><div className="flow-card"><Trophy size={30}/><h2>{draws[0]?.reference || 'Nenhuma apuração cadastrada'}</h2>{draws[0] ? <><div className="ticket-numbers">{draws[0].results.map(result => <div key={result.position}>{result.number}</div>)}</div><p className="muted"><CalendarDays size={15}/> {new Date(draws[0].createdAt).toLocaleDateString('pt-BR')}</p></> : <p className="muted">Os resultados aparecerão aqui quando forem registrados no backend.</p>}</div><div className="lookup-panel"><div className="lookup-icon"><Search size={25}/></div><h3>Consultar meu bilhete</h3><p>A consulta considera apenas os bilhetes vinculados ao seu cadastro.</p><form onSubmit={event => { event.preventDefault(); check(); }}><label className="search"><Search size={18}/><input aria-label="Serial do meu bilhete" required placeholder="Informe o serial" value={query} onChange={event => setQuery(event.target.value)}/></label><button className="btn primary wide">Conferir bilhete</button></form>{feedback && <p className="lookup-feedback" role="status">{feedback}</p>}</div></div>{draws.length > 1 && <section className="results-history"><h2>Histórico de apurações</h2>{draws.slice(1).map(draw => <div className="history-item" key={draw.id}><Trophy size={18}/><b>{draw.reference}</b><span className="history-number">{draw.results.map(result => result.number).join(' · ')}</span></div>)}</section>}</section>;
}
