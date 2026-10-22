import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Clover, LogOut, ShieldCheck } from 'lucide-react';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';
import { useDemoSession } from '../hooks/useDemoSession';
import { demoServices } from '../services/session';
import { useEffect, useState } from 'react';

const steps = ['Cadastro', 'Bilhetes', 'Resumo', 'Simulação'];
const stepPaths = ['/', '/bilhetes', '/resumo', '/pagamento'];

export default function PublicLayout() {
  const { participant, error } = useDemoSession();
  const [logoutError, setLogoutError] = useState('');
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const step = stepPaths.indexOf(pathname);
  useEffect(() => { void demoServices.refresh(); }, [pathname]);
  async function logout() {
    try { await demoServices.endSession(); setLogoutError(''); navigate('/', { replace: true }); }
    catch (error) { setLogoutError(error instanceof Error ? error.message : 'Não foi possível sair.'); }
  }
  return <div className={`public-app ${pathname === '/bilhetes' ? 'has-selection-bar' : ''}`}>
    <header className="header public-header"><div className="container header-inner"><Link className="brand-button" to="/" aria-label="Bilhetou — início"><Logo/></Link><div className="header-actions"><ThemeToggle/>{participant && <button className="icon-btn session-exit" title="Sair" aria-label="Sair" onClick={logout}><LogOut size={19}/></button>}</div></div></header>
    {participant && pathname !== '/' && <nav className="participant-nav container" aria-label="Navegação do participante"><NavLink to="/bilhetes">Escolher bilhetes</NavLink><NavLink to="/meus-bilhetes">Meus bilhetes</NavLink><NavLink to="/resultados">Resultados</NavLink></nav>}
    {step >= 0 && <ol className="checkout-steps container" aria-label="Etapas da demonstração">{steps.map((label, index) => <li key={label} className={index <= step ? 'reached' : ''} aria-current={index === step ? 'step' : undefined}><span>{index + 1}</span><b>{label}</b></li>)}</ol>}
    {(error || logoutError) && <p className="form-error container" role="alert">{logoutError || error}</p>}
    <main id="main-content" className="flow-main container"><Outlet/></main>
    <footer className="public-footer container"><ShieldCheck size={17}/><p>Ambiente demonstrativo. Cadastro, estoque e pedidos salvos no servidor. Sem pagamento ou sorteio real.</p><Clover size={17}/></footer>
  </div>;
}
