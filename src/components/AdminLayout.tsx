import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, ClipboardList, LayoutDashboard, LockKeyhole, Ticket, TrendingUp, Trophy, Upload, UserRound, Users } from 'lucide-react';
import Logo from './Logo';
import AdminSession from './AdminSession';
import ThemeToggle from './ThemeToggle';

const links = [
  { to: '/admin/conferencia', label: 'Conferência de sorteio', Icon: Trophy },
  { to: '/admin', label: 'Visão geral', Icon: LayoutDashboard },
  { to: '/admin/campanhas', label: 'Campanhas', Icon: CalendarDays },
  { to: '/admin/bilhetes', label: 'Estoque de bilhetes', Icon: Ticket },
  { to: '/admin/importacao', label: 'Importação CSV', Icon: Upload },
  { to: '/admin/participantes', label: 'Participantes', Icon: Users },
  { to: '/admin/vendedores', label: 'Vendedores', Icon: UserRound },
  { to: '/admin/apuracoes', label: 'Apurações', Icon: Trophy },
  { to: '/admin/relatorios', label: 'Relatórios', Icon: TrendingUp },
];

export default function AdminLayout() {
  return <div className="admin-app"><header className="header"><div className="container header-inner"><Logo/><div className="admin-header-label"><ClipboardList size={17}/><span>Administração</span><ThemeToggle/></div></div></header><div className="container admin-workspace"><div className="admin-access-notice"><LockKeyhole size={24}/><div><strong>Administração da organização</strong><p>Gerencie as campanhas, os bilhetes e os pedidos da sua organização.</p></div></div><div className="admin-layout"><aside className="admin-sidebar"><nav aria-label="Navegação administrativa">{links.map(({ to, label, Icon }) => <NavLink to={to} key={to} end={to === '/admin'} className={({ isActive }) => isActive ? 'selected' : ''}><Icon size={18}/>{label}</NavLink>)}</nav><p>ACESSO RESTRITO<br/>Sessão administrativa</p></aside><main id="main-content" className="admin-main"><AdminSession><Outlet/></AdminSession></main></div></div></div>;
}
