import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, ClipboardList, LoaderCircle, RefreshCw, Users } from 'lucide-react';
import { getAdminDashboard, importApiTickets, listApiCampaigns, type AdminDashboard, type ApiCampaign } from '../services/ticketCreationApi';
import { money } from '../lib/format';
import ImportCsv from '../components/ImportCsv';
import DrawCheck from './DrawCheck';
import AdminParticipants from './AdminParticipants';
import CreateCampaign from '../components/CreateCampaign';
import CreateTickets from '../components/CreateTickets';

const titles: Record<string, string> = {
  '/admin/conferencia': 'Conferência de sorteio', '/admin': 'Visão geral', '/admin/campanhas': 'Campanhas', '/admin/bilhetes': 'Estoque de bilhetes', '/admin/importacao': 'Importação CSV',
  '/admin/participantes': 'Participantes', '/admin/vendedores': 'Vendedores', '/admin/apuracoes': 'Apurações', '/admin/relatorios': 'Relatórios',
};

export default function AdminBackend() {
  const { pathname } = useLocation();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!['/admin', '/admin/campanhas', '/admin/importacao'].includes(pathname)) return;
    let active = true;
    setLoading(true); setError('');
    const load = pathname === '/admin' ? getAdminDashboard().then(data => { if (active) setDashboard(data); }) : listApiCampaigns().then(data => { if (active) { setCampaigns(data); setCampaignId(data.find(campaign => ['OPEN', 'DRAFT'].includes(campaign.status))?.id ?? ''); } });
    load.catch(error => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pathname, reload]);

  return <><div className="admin-view-title"><h1>{titles[pathname]}</h1><span className="pill amber">ADMINISTRAÇÃO</span></div>
    {loading && <p className="loading-message" role="status"><LoaderCircle className="spin" size={20}/> Consultando o servidor...</p>}
    {error && <div role="alert"><p className="form-error">{error}</p><button className="btn outline" onClick={() => setReload(value => value + 1)}><RefreshCw size={17}/> Tentar novamente</button></div>}
    {!loading && !error && pathname === '/admin' && dashboard && <><div className="admin-metrics">{[
      ['Bilhetes no estoque', dashboard.tickets], ['Bilhetes disponíveis', dashboard.available], ['Bilhetes atribuídos', dashboard.assigned], ['Campanhas', dashboard.campaigns], ['Pedidos', dashboard.orders], ['Participantes cadastrados', dashboard.participants],
    ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value ?? '?'}</strong><small>Dados do PostgreSQL</small></div>)}</div><div className="admin-help"><ClipboardList size={25}/><div><h2>Estoque centralizado</h2><p>Cadastro, bilhetes e pedidos são consultados no servidor. Crie os bilhetes em Estoque de bilhetes ou importe um CSV para a campanha.</p></div></div></>}
    {pathname === '/admin/conferencia' && <DrawCheck/>}
    {pathname === '/admin/participantes' && <AdminParticipants/>}
    {pathname === '/admin/bilhetes' && <CreateTickets/>}
    {!loading && !error && pathname === '/admin/importacao' && <><label className="creation-api-campaign">Campanha<select aria-label="Campanha da importação" value={campaignId} onChange={event => { setCampaignId(event.target.value); setFeedback(''); }}><option value="">Selecione uma campanha</option>{campaigns.filter(campaign => ['OPEN', 'DRAFT'].includes(campaign.status)).map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label>{campaignId ? <ImportCsv key={campaignId} onImport={async rows => { const result = await importApiTickets(campaignId, rows); setFeedback(`${result.created} bilhete(s) importado(s); ${result.rejected} rejeitado(s).`); return result; }}/> : <p className="muted">Cadastre uma campanha no painel para importar bilhetes.</p>}{feedback && <p className="lookup-feedback" role="status">{feedback}</p>}</>}
    {!loading && !error && pathname === '/admin/campanhas' && <><CreateCampaign onCreated={() => setReload(value => value + 1)}/>{!campaigns.length && <p className="muted">Nenhuma campanha cadastrada no servidor.</p>}{campaigns.map(campaign => <div className="flow-card admin-campaign" key={campaign.id}><CalendarDays size={24}/><h2>{campaign.name}</h2><p>Status: {campaign.status} · {campaign._count.tickets} bilhete(s)</p><p>Prêmio: {campaign.prizeCents == null ? 'Não informado' : money(campaign.prizeCents)}</p><p>Valor por bilhete: {money(campaign.ticketPriceCents)}</p><p>Apuração: {campaign.closesAt ? new Date(campaign.closesAt).toLocaleDateString('pt-BR') : 'Data a definir'}</p></div>)}</>}
    {!['/admin', '/admin/bilhetes', '/admin/importacao', '/admin/campanhas', '/admin/conferencia', '/admin/participantes'].includes(pathname) && <div className="empty admin-empty"><div className="empty-icon"><Users size={29}/></div><h2>{titles[pathname]}</h2><p>Esta funcionalidade ainda não está disponível.</p><Link className="btn outline" to="/admin">Voltar à visão geral</Link></div>}
  </>;
}
