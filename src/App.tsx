import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import PublicLayout from './components/PublicLayout';
import { RequireParticipant, RequireSelection } from './components/RouteGuards';
import Register from './pages/Register';
import TicketSelection from './pages/TicketSelection';
import OrderSummary from './pages/OrderSummary';
import ConfirmOrder from './pages/ConfirmOrder';
import Confirmation from './pages/Confirmation';
import MyTickets from './pages/MyTickets';
import Results from './pages/Results';

const AdminLayout = lazy(() => import('./components/AdminLayout'));
const Admin = lazy(() => import('./pages/Admin'));
const titles: Record<string, string> = {
  '/': 'Cadastro', '/bilhetes': 'Escolher bilhetes', '/resumo': 'Resumo do pedido',
  '/confirmar-pedido': 'Pedido', '/confirmacao': 'Pedido registrado',
  '/meus-bilhetes': 'Meus bilhetes', '/resultados': 'Resultados',
};

function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${pathname.startsWith('/admin') ? 'Administração' : titles[pathname] ?? 'Página não encontrada'} | Bilhetou`;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export default function App() {
  return <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><a className="skip-link" href="#main-content">Pular para o conteúdo</a><RouteEffects/><Suspense fallback={<div className="route-loading" role="status"><LoaderCircle className="spin"/> Carregando...</div>}><Routes>
    <Route element={<PublicLayout/>}>
      <Route index element={<Register/>}/>
      <Route element={<RequireParticipant/>}>
        <Route path="bilhetes" element={<TicketSelection/>}/>
        <Route element={<RequireSelection/>}>
          <Route path="resumo" element={<OrderSummary/>}/>
          <Route path="confirmar-pedido" element={<ConfirmOrder/>}/><Route path="pagamento" element={<Navigate to="/confirmar-pedido" replace/>}/>
        </Route>
        <Route path="confirmacao" element={<Confirmation/>}/>
        <Route path="meus-bilhetes" element={<MyTickets/>}/>
        <Route path="resultados" element={<Results/>}/>
      </Route>
      <Route path="*" element={<section className="empty"><h1>Página não encontrada</h1><p>Continue pelo cadastro.</p><Link className="btn primary" to="/">Voltar ao início</Link></section>}/>
    </Route>
    <Route path="admin" element={<AdminLayout/>}>
      {['', 'campanhas', 'bilhetes', 'importacao', 'vendedores', 'participantes', 'relatorios', 'apuracoes', 'conferencia'].map(path => path ? <Route key={path} path={path} element={<Admin key={path}/>}/> : <Route key="index" index element={<Admin/>}/>)}
      <Route path="*" element={<div className="empty"><h1>Seção não encontrada</h1><Link className="btn outline" to="/admin">Visão geral</Link></div>}/>
    </Route>
  </Routes></Suspense></BrowserRouter>;
}
